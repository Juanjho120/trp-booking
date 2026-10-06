import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminReservationDetailPage } from "@/features/admin/components/admin-reservation-detail-page";
import { getAdminPaymentSubmissionAttemptsForReservation } from "@/lib/admin/payment-submission-attempts";
import { getAdminReservationDetail } from "@/lib/admin/reservation-detail";
import { parseAdminReservationDetailFocusQuery } from "@/lib/admin/reservation-detail-focus";
import { esMessages } from "@/messages";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";

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
  const [reservationResult, attemptHistory] = await Promise.all([
    getAdminReservationDetail(reservationId),
    getAdminPaymentSubmissionAttemptsForReservation(reservationId),
  ]);
  const reservation = reservationResult as AdminReservationDetailData | null;

  if (!reservation) {
    notFound();
  }

  return (
    <AdminReservationDetailPage
      initialFocus={initialFocus}
      paymentAttemptHistory={attemptHistory}
      reservation={reservation}
    />
  );
}
