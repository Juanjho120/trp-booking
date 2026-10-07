import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminPaymentSubmissionAttemptsForReservation,
  getAdminReservationChangesTab,
  getAdminReservationEmailsTab,
  getAdminReservationFinancialTab,
  getAdminReservationHistoryTab,
  getAdminReservationLifecycleTab,
  getAdminReservationOverviewTab,
  getAdminReservationRefundsTab,
  getAdminSessionActor,
} from "@/lib/admin";
import type { AdminReservationDetailServerTab } from "@/types/admin-reservation-detail-tabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    reservationId: z.string().trim().min(1).max(160),
    tab: z.enum([
      "reservation",
      "financial",
      "payment-attempts",
      "emails",
      "lifecycle",
      "refunds",
      "changes",
      "history",
    ]),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    reservationId: string;
    tab: string;
  }>;
}>;

async function loadTab(
  reservationId: string,
  tab: AdminReservationDetailServerTab,
) {
  switch (tab) {
    case "reservation":
      return getAdminReservationOverviewTab(reservationId);
    case "financial":
      return getAdminReservationFinancialTab(reservationId);
    case "payment-attempts":
      return getAdminPaymentSubmissionAttemptsForReservation(reservationId);
    case "emails":
      return getAdminReservationEmailsTab(reservationId);
    case "lifecycle":
      return getAdminReservationLifecycleTab(reservationId);
    case "refunds":
      return getAdminReservationRefundsTab(reservationId);
    case "changes":
      return getAdminReservationChangesTab(reservationId);
    case "history":
      return getAdminReservationHistoryTab(reservationId);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return adminApiErrorResponse("INVALID_ADMIN_RESERVATION_TAB_REQUEST", 400);
  }

  const { reservationId, tab } = parsedParams.data;
  const data = await loadTab(reservationId, tab);

  if (!data) {
    return adminApiErrorResponse("ADMIN_RESERVATION_NOT_FOUND", 404);
  }

  return adminApiSuccessResponse({ tab, data });
}
