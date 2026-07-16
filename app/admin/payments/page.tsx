import type { Metadata } from "next";

import { AdminPaymentsPageView } from "@/features/admin";
import { getAdminPaymentsPage } from "@/lib/admin";
import { esMessages } from "@/messages";
import type { AdminPaymentsView } from "@/types/admin-payments";

type AdminPaymentsPageProps = Readonly<{
  searchParams: Promise<{
    view?: string;
    search?: string;
    propertyId?: string;
    status?: string;
    page?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.paymentsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const params = await searchParams;
  const data = await getAdminPaymentsPage({
    view: params.view === "events" ? ("events" as AdminPaymentsView) : "payments",
    search: params.search,
    propertyId: params.propertyId,
    status: params.status,
    page: Number(params.page),
  });

  return <AdminPaymentsPageView data={data} />;
}
