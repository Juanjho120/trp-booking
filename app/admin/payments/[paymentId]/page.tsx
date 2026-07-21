import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPaymentDetailPage } from "@/features/admin";
import { getAdminPaymentDetail } from "@/lib/admin";
import { esMessages } from "@/messages";

type AdminPaymentDetailRouteProps = Readonly<{
  params: Promise<{
    paymentId: string;
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

export default async function AdminPaymentDetailRoute({
  params,
}: AdminPaymentDetailRouteProps) {
  const { paymentId } = await params;
  const payment = await getAdminPaymentDetail(paymentId);

  if (!payment) {
    notFound();
  }

  return <AdminPaymentDetailPage payment={payment} />;
}
