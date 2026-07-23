import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AdminReservationCancellationSection,
  AdminReservationDetailPage,
  AdminReservationRefundSection,
} from "@/features/admin";
import { getAdminReservationDetail } from "@/lib/admin";
import { esMessages } from "@/messages";

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
  const reservation = await getAdminReservationDetail(reservationId);

  if (!reservation) {
    notFound();
  }

  return (
    <>
      <AdminReservationDetailPage reservation={reservation} />
      <AdminReservationCancellationSection reservation={reservation} />
      <AdminReservationRefundSection reservation={reservation} />
    </>
  );
}
