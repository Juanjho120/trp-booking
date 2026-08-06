import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AdminPaymentDetailPage,
  AdminPaymentSubmissionAttemptHistory,
} from "@/features/admin";
import {
  getAdminPaymentDetail,
  getAdminPaymentSubmissionAttemptsForPayment,
} from "@/lib/admin";
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
  const [payment, attemptHistory] = await Promise.all([
    getAdminPaymentDetail(paymentId),
    getAdminPaymentSubmissionAttemptsForPayment(paymentId),
  ]);

  if (!payment) {
    notFound();
  }

  return (
    <>
      <AdminPaymentDetailPage payment={payment} />
      <AdminPaymentSubmissionAttemptHistory history={attemptHistory} />
    </>
  );
}
