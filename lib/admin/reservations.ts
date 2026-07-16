import {
  ReservationStatus,
  type Prisma,
} from "@prisma/client";

import {
  adminAccommodationIds,
  isAdminAccommodationId,
} from "@/lib/admin/accommodations";
import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminReservationFilters,
  AdminReservationsPageData,
} from "@/types/admin-reservations";

const PAGE_SIZE = 20;

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function normalizeSearch(value: string | undefined): string | undefined {
  const search = value?.trim();
  return search ? search.slice(0, 120) : undefined;
}

function normalizeReservationStatus(value: string | undefined): ReservationStatus | undefined {
  return value && Object.values(ReservationStatus).includes(value as ReservationStatus)
    ? (value as ReservationStatus)
    : undefined;
}

export async function getAdminReservationsPage(
  input: AdminReservationFilters,
): Promise<AdminReservationsPageData> {
  const page = normalizePage(input.page);
  const search = normalizeSearch(input.search);
  const status = normalizeReservationStatus(input.status);
  const propertyId = isAdminAccommodationId(input.propertyId)
    ? input.propertyId
    : undefined;
  const where: Prisma.ReservationWhereInput = {
    ...(propertyId ? { propertyId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            {
              id: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              guestName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              guestEmail: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const [properties, totalItems] = await Promise.all([
    prisma.property.findMany({
      where: {
        id: {
          in: [...adminAccommodationIds],
        },
        deletedAt: null,
      },
      orderBy: {
        nameEs: "asc",
      },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
      },
    }),
    prisma.reservation.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      guestCountry: true,
      checkInDate: true,
      checkOutDate: true,
      guestCount: true,
      status: true,
      total: true,
      currency: true,
      expiresAt: true,
      confirmedAt: true,
      createdAt: true,
      property: {
        select: {
          id: true,
          nameEs: true,
          nameEn: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          status: true,
        },
      },
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    properties,
    filters: {
      search,
      propertyId,
      status,
      page: safePage,
    },
    pagination: {
      page: safePage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
    },
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      property: reservation.property,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      guestPhone: reservation.guestPhone,
      guestCountry: reservation.guestCountry,
      checkInDate: dateOnlyFromDate(reservation.checkInDate),
      checkOutDate: dateOnlyFromDate(reservation.checkOutDate),
      guestCount: reservation.guestCount,
      status: reservation.status,
      total: reservation.total.toFixed(2),
      currency: reservation.currency,
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
      latestPaymentStatus: reservation.payments[0]?.status ?? null,
    })),
  };
}
