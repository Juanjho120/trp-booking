import { prisma } from "@/lib/db/prisma";

function normalizeReservationId(value: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized || normalized.length > 128) {
    return null;
  }

  return normalized;
}

export async function getReservationCodeById(
  reservationId: string | null,
): Promise<string | null> {
  const normalizedReservationId = normalizeReservationId(reservationId);

  if (!normalizedReservationId) {
    return null;
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: normalizedReservationId },
    select: { reservationCode: true },
  });

  return reservation?.reservationCode ?? null;
}
