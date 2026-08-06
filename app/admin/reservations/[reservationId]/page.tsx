import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminReservationDetailPage } from "@/features/admin";
import {
  getAdminPaymentSubmissionAttemptsForReservation,
  getAdminReservationDetail,
} from "@/lib/admin";
import { esMessages } from "@/messages";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";

type AdminReservationDetailRouteProps = Readonly<{
  params: Promise<{
    reservationId: string;
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
}: AdminReservationDetailRouteProps) {
  const { reservationId } = await params;
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
      paymentAttemptHistory={attemptHistory}
      reservation={reservation}
    />
  );
}
