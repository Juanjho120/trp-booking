import { ReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type ExpirePendingReservationHoldsInput = Readonly<{
  now?: Date;
}>;

export type ExpirePendingReservationHoldsResult = Readonly<{
  expiredCount: number;
  expiredAt: string;
}>;

export async function expirePendingReservationHolds(
  input: ExpirePendingReservationHoldsInput = {},
): Promise<ExpirePendingReservationHoldsResult> {
  const now = input.now ?? new Date();

  const result = await prisma.reservation.updateMany({
    where: {
      status: ReservationStatus.PENDING_PAYMENT,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: ReservationStatus.EXPIRED,
    },
  });

  return {
    expiredCount: result.count,
    expiredAt: now.toISOString(),
  };
}
