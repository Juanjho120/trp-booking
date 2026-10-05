import {
  GuestPaymentRequestStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type GuestPaymentRequestExpirationClient = Readonly<{
  guestPaymentRequest: Pick<PrismaClient["guestPaymentRequest"], "updateMany">;
}>;

export type ExpirePendingGuestPaymentRequestsResult = Readonly<{
  expiredCount: number;
  expiredAt: string;
}>;

export async function expirePendingGuestPaymentRequests(
  input: Readonly<{
    now?: Date;
    reservationId?: string;
    accessTokenHash?: string;
    client?: GuestPaymentRequestExpirationClient;
  }> = {},
): Promise<ExpirePendingGuestPaymentRequestsResult> {
  const now = input.now ?? new Date();
  const client = input.client ?? prisma;
  const where: Prisma.GuestPaymentRequestWhereInput = {
    status: GuestPaymentRequestStatus.PENDING,
    expiresAt: { lte: now },
  };
  const reservationId = input.reservationId?.trim();
  const accessTokenHash = input.accessTokenHash?.trim();

  if (reservationId) {
    where.reservationId = reservationId;
  }

  if (accessTokenHash) {
    where.accessTokenHash = accessTokenHash;
  }

  const expired = await client.guestPaymentRequest.updateMany({
    where,
    data: {
      status: GuestPaymentRequestStatus.EXPIRED,
    },
  });

  return {
    expiredCount: expired.count,
    expiredAt: now.toISOString(),
  };
}
