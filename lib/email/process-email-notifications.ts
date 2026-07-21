import {
  EmailNotificationStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getEmailEnv } from "@/lib/env/server";
import type { EmailProvider } from "@/types/email-provider";
import type {
  EmailDeliveryMode,
  EmailNotificationClaim,
  EmailNotificationProcessingSummary,
} from "@/types/email-notification";

import {
  deliverClaimedEmailNotification,
} from "./reservation-confirmation-notifications";
import { createResendEmailProvider } from "./resend-provider";
import {
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
  EMAIL_NOTIFICATION_RETRY_BATCH_SIZE,
  EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_CODE,
  EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_MESSAGE,
  getEmailNotificationStaleProcessingCutoff,
  RETRYABLE_EMAIL_NOTIFICATION_ERROR_CODES,
} from "./retry-policy";

type ProcessEmailNotificationsOptions = Readonly<{
  source?: NodeJS.ProcessEnv;
  provider?: EmailProvider;
  now?: () => Date;
}>;

type RetryCandidate = Readonly<{
  id: string;
  status: EmailNotificationStatus;
}>;

type ClaimedRetryCandidate = Readonly<{
  claim: EmailNotificationClaim;
  recoveredStaleProcessing: boolean;
}>;

function buildEmptySummary(
  deliveryMode: EmailDeliveryMode,
  processedAt: Date,
): EmailNotificationProcessingSummary {
  return {
    deliveryMode,
    processedAt: processedAt.toISOString(),
    batchSize: EMAIL_NOTIFICATION_RETRY_BATCH_SIZE,
    candidates: 0,
    claimed: 0,
    staleRecovered: 0,
    staleExhausted: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    retryScheduled: 0,
    skipped: 0,
  };
}

function buildDueAtFilter(
  now: Date,
): Prisma.EmailNotificationWhereInput {
  return {
    OR: [
      { nextAttemptAt: null },
      { nextAttemptAt: { lte: now } },
    ],
  };
}

function buildStaleProcessingFilter(
  staleProcessingCutoff: Date,
): Prisma.EmailNotificationWhereInput {
  return {
    OR: [
      { processingStartedAt: null },
      { processingStartedAt: { lte: staleProcessingCutoff } },
    ],
  };
}

async function markExhaustedStaleProcessingNotifications(
  staleProcessingCutoff: Date,
): Promise<number> {
  const result = await prisma.emailNotification.updateMany({
    where: {
      status: EmailNotificationStatus.PROCESSING,
      ...buildStaleProcessingFilter(staleProcessingCutoff),
      attemptCount: {
        gte: EMAIL_NOTIFICATION_MAX_ATTEMPTS,
      },
    },
    data: {
      status: EmailNotificationStatus.FAILED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_CODE,
      errorMessage: EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_MESSAGE,
    },
  });

  return result.count;
}

async function findEligibleRetryCandidates(
  now: Date,
  staleProcessingCutoff: Date,
): Promise<readonly RetryCandidate[]> {
  return prisma.emailNotification.findMany({
    where: {
      attemptCount: {
        lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS,
      },
      OR: [
        {
          status: EmailNotificationStatus.PENDING,
          ...buildDueAtFilter(now),
        },
        {
          status: EmailNotificationStatus.FAILED,
          errorCode: {
            in: [...RETRYABLE_EMAIL_NOTIFICATION_ERROR_CODES],
          },
          ...buildDueAtFilter(now),
        },
        {
          status: EmailNotificationStatus.PROCESSING,
          ...buildStaleProcessingFilter(staleProcessingCutoff),
        },
      ],
    },
    orderBy: [
      { nextAttemptAt: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    take: EMAIL_NOTIFICATION_RETRY_BATCH_SIZE,
    select: {
      id: true,
      status: true,
    },
  });
}

async function claimRetryCandidate(
  candidate: RetryCandidate,
  claimedAt: Date,
  staleProcessingCutoff: Date,
): Promise<ClaimedRetryCandidate | null> {
  const dueAtFilter = buildDueAtFilter(claimedAt);
  const statusFilter =
    candidate.status === EmailNotificationStatus.PENDING
      ? {
          status: EmailNotificationStatus.PENDING,
          ...dueAtFilter,
        }
      : candidate.status === EmailNotificationStatus.FAILED
        ? {
            status: EmailNotificationStatus.FAILED,
            errorCode: {
              in: [...RETRYABLE_EMAIL_NOTIFICATION_ERROR_CODES],
            },
            ...dueAtFilter,
          }
        : {
            status: EmailNotificationStatus.PROCESSING,
            ...buildStaleProcessingFilter(staleProcessingCutoff),
          };

  const result = await prisma.emailNotification.updateMany({
    where: {
      id: candidate.id,
      attemptCount: {
        lt: EMAIL_NOTIFICATION_MAX_ATTEMPTS,
      },
      ...statusFilter,
    },
    data: {
      status: EmailNotificationStatus.PROCESSING,
      attemptCount: {
        increment: 1,
      },
      lastAttemptAt: claimedAt,
      processingStartedAt: claimedAt,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  if (result.count !== 1) {
    return null;
  }

  return {
    claim: {
      notificationId: candidate.id,
      processingStartedAt: claimedAt,
    },
    recoveredStaleProcessing:
      candidate.status === EmailNotificationStatus.PROCESSING,
  };
}

export async function processEmailNotifications(
  options: ProcessEmailNotificationsOptions = {},
): Promise<EmailNotificationProcessingSummary> {
  const source = options.source ?? process.env;
  const now = options.now ?? (() => new Date());
  const startedAt = now();

  let emailEnv: ReturnType<typeof getEmailEnv>;

  try {
    emailEnv = getEmailEnv(source);
  } catch {
    return buildEmptySummary("unavailable", startedAt);
  }

  if (emailEnv.deliveryMode === "disabled") {
    return buildEmptySummary("disabled", startedAt);
  }

  let provider: EmailProvider;

  try {
    provider = options.provider ?? createResendEmailProvider(source);
  } catch {
    return buildEmptySummary("unavailable", startedAt);
  }

  const staleProcessingCutoff = getEmailNotificationStaleProcessingCutoff(
    startedAt,
  );

  let staleExhausted: number;
  let candidates: readonly RetryCandidate[];

  try {
    staleExhausted = await markExhaustedStaleProcessingNotifications(
      staleProcessingCutoff,
    );
    candidates = await findEligibleRetryCandidates(
      startedAt,
      staleProcessingCutoff,
    );
  } catch {
    return buildEmptySummary("unavailable", startedAt);
  }

  let claimed = 0;
  let staleRecovered = 0;
  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    try {
      const retryClaim = await claimRetryCandidate(
        candidate,
        now(),
        staleProcessingCutoff,
      );

      if (!retryClaim) {
        skipped += 1;
        continue;
      }

      claimed += 1;
      attempted += 1;

      if (retryClaim.recoveredStaleProcessing) {
        staleRecovered += 1;
      }

      const outcome = await deliverClaimedEmailNotification({
        claim: retryClaim.claim,
        provider,
        publicBaseUrl: emailEnv.publicBaseUrl,
        brandLogoUrl: emailEnv.brandLogoUrl,
        now,
      });

      if (outcome.outcome === "sent") {
        sent += 1;
      } else if (outcome.outcome === "failed") {
        failed += 1;

        if (outcome.retryScheduled) {
          retryScheduled += 1;
        }
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    deliveryMode: emailEnv.deliveryMode,
    processedAt: startedAt.toISOString(),
    batchSize: EMAIL_NOTIFICATION_RETRY_BATCH_SIZE,
    candidates: candidates.length,
    claimed,
    staleRecovered,
    staleExhausted,
    attempted,
    sent,
    failed,
    retryScheduled,
    skipped,
  };
}
