import {
  CalendarBlockSource,
  PaymentStatus,
  ReservationStatus,
} from "@prisma/client";

import { dateOnlyFromDate, dateOnlyToUtcDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AdminDashboardSummary } from "@/types/admin-dashboard";

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const now = new Date();
  const today = dateOnlyToUtcDate(dateOnlyFromDate(now));
  const [
    activePendingReservations,
    upcomingConfirmedReservations,
    paymentIssues,
    activeManualBlocks,
    upcomingArrivals,
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        status: ReservationStatus.PENDING_PAYMENT,
        expiresAt: {
          gt: now,
        },
      },
    }),
    prisma.reservation.count({
      where: {
        status: ReservationStatus.CONFIRMED,
        checkInDate: {
          gte: today,
        },
      },
    }),
    prisma.payment.count({
      where: {
        status: {
          in: [PaymentStatus.REJECTED, PaymentStatus.FAILED],
        },
      },
    }),
    prisma.calendarBlock.count({
      where: {
        source: CalendarBlockSource.MANUAL_BLOCK,
        deletedAt: null,
        endDate: {
          gt: today,
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        checkInDate: {
          gte: today,
        },
      },
      orderBy: [
        {
          checkInDate: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: 5,
      select: {
        id: true,
        guestName: true,
        guestCount: true,
        checkInDate: true,
        checkOutDate: true,
        property: {
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
          },
        },
      },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      activePendingReservations,
      upcomingConfirmedReservations,
      paymentIssues,
      activeManualBlocks,
    },
    upcomingArrivals: upcomingArrivals.map((reservation) => ({
      id: reservation.id,
      property: reservation.property,
      guestName: reservation.guestName,
      checkInDate: dateOnlyFromDate(reservation.checkInDate),
      checkOutDate: dateOnlyFromDate(reservation.checkOutDate),
      guestCount: reservation.guestCount,
    })),
  };
}
