import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminReservationPaymentReviewShell } from "@/features/admin";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import {
  getAdminPreparationBufferManagement,
  getAdminReservationPaymentReview,
} from "@/lib/admin";
import { esMessages } from "@/messages";

const messages = esMessages;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages.seo.admin.title,
  description: messages.seo.admin.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await auth();
  const adminUser = session?.user;

  if (!adminUser || adminUser.role !== ADMIN_ROLE) {
    redirect("/");
  }

  const [review, preparationBuffers] = await Promise.all([
    getAdminReservationPaymentReview(),
    getAdminPreparationBufferManagement(),
  ]);

  return (
    <AdminReservationPaymentReviewShell
      adminEmail={adminUser.email ?? null}
      adminName={
        adminUser.name ?? adminUser.email ?? messages.admin.shell.fallbackUserName
      }
      preparationBuffers={preparationBuffers}
      review={review}
    />
  );
}
