import type { Metadata } from "next";

import { AdminDashboardPage } from "@/features/admin/components/admin-dashboard-page";
import { getAdminDashboardSummary } from "@/lib/admin/dashboard";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.seo.admin.title,
  description: esMessages.seo.admin.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const summary = await getAdminDashboardSummary();
  return <AdminDashboardPage summary={summary} />;
}
