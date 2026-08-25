import type { Metadata } from "next";

import { AdminCalendarIntegrationsPage } from "@/features/admin";
import { getAdminExternalCalendarIntegrationsPage } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.calendarIntegrations.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCalendarIntegrationsRoute() {
  const initialData = await getAdminExternalCalendarIntegrationsPage();

  return <AdminCalendarIntegrationsPage initialData={initialData} />;
}
