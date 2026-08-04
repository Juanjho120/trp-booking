import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AdminReservationCancellationSection,
  AdminReservationDateMutationSection,
  AdminReservationDetailPage,
  AdminReservationRefundSection,
} from "@/features/admin";
import { AdminReservationLifecycleAdjustmentRefundSection } from "@/features/admin/components/admin-reservation-lifecycle-adjustment-refund-section";
import { getAdminReservationDetail } from "@/lib/admin";
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
  const reservation = (await getAdminReservationDetail(
    reservationId,
  )) as AdminReservationDetailData | null;

  if (!reservation) {
    notFound();
  }

  const standardRefundReservation: AdminReservationDetailData = {
    ...reservation,
    payments: reservation.payments.filter(
      (payment) => payment.purpose === "INITIAL_RESERVATION",
    ),
    refunds: reservation.refunds.filter(
      (refund) => refund.authorizationType !== "LIFECYCLE_ADJUSTMENT",
    ),
  };

  return (
    <>
      <AdminReservationDetailPage reservation={reservation} />
      <AdminReservationCancellationSection reservation={reservation} />
      <AdminReservationDateMutationSection reservation={reservation} />
      <AdminReservationRefundSection reservation={standardRefundReservation} />
      <AdminReservationLifecycleAdjustmentRefundSection
        reservation={reservation}
      />
    </>
  );
}
