import {
  GuestPaymentRequestStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { environmentConfig } from "@/config/site";
import { prisma } from "@/lib/db/prisma";
import { validateServerEnv } from "@/lib/env/server";
import { AdminAdditionalChargeError } from "@/lib/admin/additional-charges";
import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { buildGuestPaymentRequestPaymentPath } from "@/lib/payments/guest-payment-request-link";
import {
  decryptGuestPaymentRequestAccessToken,
  hashGuestPaymentRequestAccessToken,
} from "@/lib/payments/guest-payment-request-token";
import type { AdminActor } from "@/types/admin";

function amountCents(amount: Prisma.Decimal): number {
  const numericAmount = Number(amount.toString());

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_LINK_UNAVAILABLE",
    );
  }

  const cents = Math.round(numericAmount * 100);

  if (!Number.isSafeInteger(cents)) {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_LINK_UNAVAILABLE",
    );
  }

  return cents;
}

function buildGuestPaymentRequestPaymentUrl(
  rawToken: string,
  baseUrl: string,
): string {
  return new URL(
    buildGuestPaymentRequestPaymentPath(rawToken),
    baseUrl,
  ).toString();
}

function resolvePaymentLinkBaseUrl(
  requestOrigin: string | null,
  envSource: NodeJS.ProcessEnv = process.env,
): string {
  const environment = validateServerEnv(envSource).TRP_ENVIRONMENT;

  if (environment === "local" && requestOrigin) {
    return new URL(requestOrigin).origin;
  }

  return environment === "test"
    ? environmentConfig.test.applicationUrl
    : environmentConfig.production.applicationUrl;
}

export async function getAdminGuestPaymentRequestPaymentLink(
  input: Readonly<{
    requestId: string;
    requestOrigin: string | null;
    env?: NodeJS.ProcessEnv;
  }>,
  actor: AdminActor,
): Promise<string> {
  const requestId = input.requestId.trim();

  if (!requestId) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  const now = new Date();
  const request = await prisma.guestPaymentRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      reservationId: true,
      status: true,
      totalAmount: true,
      currency: true,
      accessTokenHash: true,
      accessTokenEncrypted: true,
      expiresAt: true,
      payment: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!request) {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_NOT_FOUND",
    );
  }

  if (
    request.status === GuestPaymentRequestStatus.PENDING &&
    request.expiresAt <= now
  ) {
    await prisma.guestPaymentRequest.updateMany({
      where: {
        id: request.id,
        status: GuestPaymentRequestStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: GuestPaymentRequestStatus.EXPIRED,
      },
    });

    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
    );
  }

  if (
    request.status !== GuestPaymentRequestStatus.PENDING ||
    request.payment?.status === PaymentStatus.APPROVED
  ) {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
    );
  }

  let rawToken: string;

  try {
    rawToken = decryptGuestPaymentRequestAccessToken(
      request.reservationId,
      request.accessTokenEncrypted,
    );
  } catch {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_LINK_UNAVAILABLE",
    );
  }

  try {
    if (
      hashGuestPaymentRequestAccessToken(rawToken) !== request.accessTokenHash
    ) {
      throw new Error("Guest payment request token hash mismatch");
    }
  } catch {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_LINK_UNAVAILABLE",
    );
  }

  const paymentUrl = buildGuestPaymentRequestPaymentUrl(
    rawToken,
    resolvePaymentLinkBaseUrl(input.requestOrigin, input.env ?? process.env),
  );

  const adminActor = await resolveAdminActor(prisma, actor);

  await prisma.adminAuditLog.create({
    data: {
      userId: adminActor.id,
      action: "GUEST_PAYMENT_REQUEST_LINK_COPIED",
      entityType: "GuestPaymentRequest",
      entityId: request.id,
      metadata: {
        actorEmail: adminActor.email,
        reservationId: request.reservationId,
        guestPaymentRequestId: request.id,
        paymentId: request.payment?.id ?? null,
        requestStatus: request.status,
        paymentStatus: request.payment?.status ?? null,
        amountCents: amountCents(request.totalAmount),
        currency: request.currency,
        expiresAt: request.expiresAt.toISOString(),
      },
    },
  });

  return paymentUrl;
}
