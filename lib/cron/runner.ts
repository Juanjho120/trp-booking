import {
  CronJobExecutionStatus,
  CronJobKey,
  CronJobTriggerSource,
  Prisma,
} from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { prisma } from "@/lib/db/prisma";
import { validateServerEnv } from "@/lib/env/server";
import type { AdminActor } from "@/types/admin";
import type {
  CronJobExecutionResult,
  CronJobExecutionSnapshot,
  CronJobKeyValue,
  CronJobSafeJson,
  CronJobTriggerSourceValue,
} from "@/types/cron-job";

import {
  getCronJobDefinitionByKey,
  getCronJobDefinitionBySlug,
} from "./registry";

const STALE_EXECUTION_THRESHOLD_MS = 30 * 60 * 1000;
const SERIALIZABLE_RETRY_LIMIT = 2;

type CompletedCronJobExecutionStatus =
  | typeof CronJobExecutionStatus.SUCCESS
  | typeof CronJobExecutionStatus.PARTIAL_SUCCESS
  | typeof CronJobExecutionStatus.FAILED;

export type CronJobRunnerErrorCode =
  | "CRON_JOB_NOT_FOUND"
  | "CRON_JOB_ALREADY_RUNNING"
  | "CRON_JOB_UNEXPECTED_ERROR";

export class CronJobRunnerError extends Error {
  readonly code: CronJobRunnerErrorCode;

  constructor(code: CronJobRunnerErrorCode) {
    super(code);
    this.name = "CronJobRunnerError";
    this.code = code;
  }
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

function toPrismaJobKey(value: CronJobKeyValue): CronJobKey {
  return value as CronJobKey;
}

function toPrismaTriggerSource(
  value: CronJobTriggerSourceValue,
): CronJobTriggerSource {
  return value as CronJobTriggerSource;
}

function toInputJson(value: CronJobSafeJson): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toPrismaCompletedStatus(
  status: CronJobExecutionResult["status"],
): CompletedCronJobExecutionStatus {
  switch (status) {
    case "SUCCESS":
      return CronJobExecutionStatus.SUCCESS;
    case "PARTIAL_SUCCESS":
      return CronJobExecutionStatus.PARTIAL_SUCCESS;
    case "FAILED":
      return CronJobExecutionStatus.FAILED;
  }
}

function serializeExecution(execution: Readonly<{
  id: string;
  jobKey: CronJobKey;
  triggerSource: CronJobTriggerSource;
  businessEnvironment: string;
  status: CronJobExecutionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  resultJson: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  adminActor: Readonly<{
    id: string;
    email: string;
    name: string | null;
  }> | null;
}>): CronJobExecutionSnapshot {
  return {
    id: execution.id,
    jobKey: execution.jobKey as CronJobKeyValue,
    triggerSource: execution.triggerSource as CronJobTriggerSourceValue,
    businessEnvironment: execution.businessEnvironment,
    status: execution.status,
    startedAt: execution.startedAt.toISOString(),
    finishedAt: execution.finishedAt?.toISOString() ?? null,
    durationMs: execution.durationMs,
    result: execution.resultJson as CronJobSafeJson,
    errorCode: execution.errorCode,
    errorMessage: execution.errorMessage,
    createdAt: execution.createdAt.toISOString(),
    adminActor: execution.adminActor,
  };
}

async function createRunningExecution(input: Readonly<{
  jobKey: CronJobKeyValue;
  triggerSource: CronJobTriggerSourceValue;
  actor?: AdminActor;
}>) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_EXECUTION_THRESHOLD_MS);
  const businessEnvironment = validateServerEnv().TRP_ENVIRONMENT;

  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const staleExecution = await tx.cronJobExecution.findFirst({
            where: {
              jobKey: toPrismaJobKey(input.jobKey),
              status: CronJobExecutionStatus.RUNNING,
              startedAt: { lt: staleBefore },
            },
            select: { id: true, startedAt: true },
          });

          if (staleExecution) {
            await tx.cronJobExecution.update({
              where: { id: staleExecution.id },
              data: {
                status: CronJobExecutionStatus.FAILED,
                finishedAt: now,
                durationMs: Math.max(
                  0,
                  now.getTime() - staleExecution.startedAt.getTime(),
                ),
                resultJson: toInputJson({
                  recovery: "STALE_EXECUTION",
                  staleThresholdMs: STALE_EXECUTION_THRESHOLD_MS,
                  recoveredAt: now.toISOString(),
                }),
                errorCode: "CRON_JOB_STALE_EXECUTION_RECOVERED",
                errorMessage:
                  "The previous execution exceeded the safe running window and was recovered.",
              },
            });
          }

          const adminActor = input.actor
            ? await resolveAdminActor(tx, input.actor)
            : null;

          return tx.cronJobExecution.create({
            data: {
              jobKey: toPrismaJobKey(input.jobKey),
              triggerSource: toPrismaTriggerSource(input.triggerSource),
              adminActorId: adminActor?.id ?? null,
              businessEnvironment,
              status: CronJobExecutionStatus.RUNNING,
              startedAt: now,
            },
            include: {
              adminActor: {
                select: { id: true, email: true, name: true },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isKnownPrismaError(error, "P2002")) {
        const runningExecution = await prisma.cronJobExecution.findFirst({
          where: {
            jobKey: toPrismaJobKey(input.jobKey),
            status: CronJobExecutionStatus.RUNNING,
          },
          select: { id: true },
        });

        if (runningExecution) {
          throw new CronJobRunnerError("CRON_JOB_ALREADY_RUNNING");
        }
      }

      if (
        isKnownPrismaError(error, "P2034") &&
        attempt < SERIALIZABLE_RETRY_LIMIT
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new CronJobRunnerError("CRON_JOB_UNEXPECTED_ERROR");
}

async function finishExecution(input: Readonly<{
  executionId: string;
  startedAt: Date;
  status: CompletedCronJobExecutionStatus;
  result: CronJobSafeJson;
  errorCode: string | null;
  errorMessage: string | null;
}>): Promise<CronJobExecutionSnapshot> {
  const finishedAt = new Date();
  const durationMs = Math.max(0, finishedAt.getTime() - input.startedAt.getTime());
  const execution = await prisma.cronJobExecution.update({
    where: { id: input.executionId },
    data: {
      status: input.status,
      finishedAt,
      durationMs,
      resultJson: toInputJson(input.result),
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    },
    include: {
      adminActor: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return serializeExecution(execution);
}

export async function runCronJob(input: Readonly<{
  jobKey: CronJobKeyValue;
  triggerSource: CronJobTriggerSourceValue;
  actor?: AdminActor;
}>): Promise<CronJobExecutionSnapshot> {
  const definition = getCronJobDefinitionByKey(input.jobKey);

  if (!definition) {
    throw new CronJobRunnerError("CRON_JOB_NOT_FOUND");
  }

  const execution = await createRunningExecution(input);

  try {
    const outcome = await definition.execute(input.triggerSource);

    return finishExecution({
      executionId: execution.id,
      startedAt: execution.startedAt,
      status: toPrismaCompletedStatus(outcome.status),
      result: outcome.result,
      errorCode: outcome.errorCode,
      errorMessage: outcome.errorMessage,
    });
  } catch {
    return finishExecution({
      executionId: execution.id,
      startedAt: execution.startedAt,
      status: CronJobExecutionStatus.FAILED,
      result: {},
      errorCode: definition.safeUnexpectedErrorCode,
      errorMessage: definition.safeUnexpectedErrorMessage,
    });
  }
}

export async function runCronJobBySlug(input: Readonly<{
  slug: string;
  triggerSource: CronJobTriggerSourceValue;
  actor?: AdminActor;
}>): Promise<CronJobExecutionSnapshot> {
  const definition = getCronJobDefinitionBySlug(input.slug);

  if (!definition) {
    throw new CronJobRunnerError("CRON_JOB_NOT_FOUND");
  }

  return runCronJob({
    jobKey: definition.key,
    triggerSource: input.triggerSource,
    actor: input.actor,
  });
}

export function getCronJobStaleThresholdMs(): number {
  return STALE_EXECUTION_THRESHOLD_MS;
}
