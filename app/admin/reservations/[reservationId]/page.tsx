import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminReservationDetailPage } from "@/features/admin/components/admin-reservation-detail-page";
import {
  getAdminReservationDetailShell,
  resolveAdminReservationRefundFocusTab,
} from "@/lib/admin/reservation-detail";
import {
  parseAdminReservationDetailFocusQuery,
  type AdminReservationDetailTab,
} from "@/lib/admin/reservation-detail-focus";
import { esMessages } from "@/messages";

type AdminReservationDetailRouteProps = Readonly<{
  params: Promise<{
    reservationId: string;
  }>;
  searchParams?: Promise<{
    focus?: string | string[];
    focusId?: string | string[];
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.reservationsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminReservationDetailRoute({
  params,
  searchParams,
}: AdminReservationDetailRouteProps) {
  const { reservationId } = await params;
  const focusParams = searchParams ? await searchParams : {};
  const initialFocus = parseAdminReservationDetailFocusQuery(focusParams);
  const reservation = await getAdminReservationDetailShell(reservationId);

  if (!reservation) {
    notFound();
  }

  let initialTab: AdminReservationDetailTab = "reservation";

  if (initialFocus?.kind === "additionalChargePaymentRequest") {
    initialTab = "additionalCharges";
  } else if (initialFocus?.kind === "lifecycleAdjustment") {
    initialTab = "changes";
  } else if (initialFocus?.kind === "refund") {
    initialTab = await resolveAdminReservationRefundFocusTab({
      reservationId,
      refundId: initialFocus.focusId,
    });
  }

  return (
    <AdminReservationDetailPage
      initialActiveTab={initialTab}
      initialFocus={initialFocus}
      reservationShell={reservation}
    />
  );
}
