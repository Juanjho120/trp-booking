import {
  PaymentStatus,
  type Prisma,
} from "@prisma/client";

import {
  adminAccommodationIds,
  isAdminAccommodationId,
} from "@/lib/admin/accommodations";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminPaymentDiagnostics,
  AdminPaymentFilters,
  AdminPaymentsPageData,
  AdminPaymentsView,
} from "@/types/admin-payments";

const PAGE_SIZE = 20;
const MAX_DIAGNOSTIC_LENGTH = 180;

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function normalizeSearch(value: string | undefined): string | undefined {
  const search = value?.trim();
  return search ? search.slice(0, 120) : undefined;
}

function normalizeView(value: AdminPaymentsView | undefined): AdminPaymentsView {
  return value === "events" ? "events" : "payments";
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus | undefined {
  return value && Object.values(PaymentStatus).includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadRoot(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const response = value.response;

  if (Array.isArray(response) && isRecord(response[0])) {
    return response[0];
  }

  return value;
}

function readString(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, MAX_DIAGNOSTIC_LENGTH);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).slice(0, MAX_DIAGNOSTIC_LENGTH);
    }
  }

  return null;
}

function extractDiagnostics(payload: unknown): AdminPaymentDiagnostics {
  const root = getPayloadRoot(payload);

  return {
    providerCode: readString(root, ["code", "responseCode", "response_code"]),
    providerMessage: readString(root, ["description", "message", "responseMessage"]),
    authorization: readString(root, ["auth", "authorization", "authorizationCode"]),
    providerOrder: readString(root, ["order", "orderNumber", "external_order_id", "externalOrderId"]),
    tilopayTransaction: readString(root, [
      "tilopay-transaction",
      "tilopayTransaction",
      "tpt",
      "orderId",
    ]),
    orderHashStatus: readString(root, [
      "orderHashStatus",
      "order_hash_status",
      "hashStatus",
      "phaseBoundary",
    ]),
  };
}

export async function getAdminPaymentsPage(
  input: AdminPaymentFilters,
): Promise<AdminPaymentsPageData> {
  const view = normalizeView(input.view);
  const requestedPage = normalizePage(input.page);
  const search = normalizeSearch(input.search);
  const status = normalizePaymentStatus(input.status);
  const propertyId = input.propertyId && isAdminAccommodationId(input.propertyId)
    ? input.propertyId
    : undefined;
  const propertiesPromise = prisma.property.findMany({
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
  });

  if (view === "events") {
    const where: Prisma.PaymentClientEventWhereInput = {
      ...(propertyId
        ? {
            reservation: {
              propertyId,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                paymentId: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                reservationId: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                sdkMessage: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                reservation: {
                  guestName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [properties, totalItems] = await Promise.all([
      propertiesPromise,
      prisma.paymentClientEvent.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const events = await prisma.paymentClientEvent.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        paymentId: true,
        reservationId: true,
        eventType: true,
        environment: true,
        locale: true,
        paymentMethodName: true,
        paymentMethodType: true,
        detectedCardBrand: true,
        sdkMessage: true,
        preflightStatus: true,
        preflightExpiresAt: true,
        createdAt: true,
        reservation: {
          select: {
            guestName: true,
            property: {
              select: {
                id: true,
                nameEs: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      properties,
      filters: {
        view,
        search,
        propertyId,
        page,
      },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages,
      },
      payments: [],
      events: events.map((event) => ({
        id: event.id,
        paymentId: event.paymentId,
        reservationId: event.reservationId,
        property: event.reservation.property,
        guestName: event.reservation.guestName,
        eventType: event.eventType,
        environment: event.environment,
        locale: event.locale,
        paymentMethodName: event.paymentMethodName,
        paymentMethodType: event.paymentMethodType,
        detectedCardBrand: event.detectedCardBrand,
        sdkMessage: event.sdkMessage,
        preflightStatus: event.preflightStatus,
        preflightExpiresAt: event.preflightExpiresAt?.toISOString() ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status } : {}),
    ...(propertyId
      ? {
          reservation: {
            propertyId,
          },
        }
      : {}),
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
              providerReference: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              providerTransactionId: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              reservation: {
                id: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              reservation: {
                guestName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const [properties, totalItems] = await Promise.all([
    propertiesPromise,
    prisma.payment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const payments = await prisma.payment.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      provider: true,
      providerReference: true,
      providerTransactionId: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      failedAt: true,
      rawPayload: true,
      createdAt: true,
      updatedAt: true,
      reservation: {
        select: {
          id: true,
          guestName: true,
          property: {
            select: {
              id: true,
              nameEs: true,
              nameEn: true,
            },
          },
        },
      },
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    properties,
    filters: {
      view,
      search,
      propertyId,
      status,
      page,
    },
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      reservationId: payment.reservation.id,
      property: payment.reservation.property,
      guestName: payment.reservation.guestName,
      provider: payment.provider,
      providerReference: payment.providerReference,
      providerTransactionId: payment.providerTransactionId,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      failedAt: payment.failedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      diagnostics: extractDiagnostics(payment.rawPayload),
    })),
    events: [],
  };
}
