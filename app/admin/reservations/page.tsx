import type { Metadata } from "next";

import { AdminReservationsPageView } from "@/features/admin";
import { getAdminReservationsPage } from "@/lib/admin";
import { esMessages } from "@/messages";

type AdminReservationsPageProps = Readonly<{
  searchParams: Promise<{
    search?: string;
    propertyId?: string;
    status?: string;
    page?: string;
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

export default async function AdminReservationsPage({
  searchParams,
}: AdminReservationsPageProps) {
  const params = await searchParams;
  const data = await getAdminReservationsPage({
    search: params.search,
    propertyId: params.propertyId,
    status: params.status,
    page: Number(params.page),
  });

  return <AdminReservationsPageView data={data} />;
}