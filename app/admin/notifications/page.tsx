import type { Metadata } from "next";

import { AdminNotificationsPageView } from "@/features/admin/components/admin-notifications-page";
import { getAdminSessionActor } from "@/lib/admin/session";
import { getAdminNotificationCenter } from "@/lib/admin-notifications";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.notificationsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminNotificationsPage() {
  const actor = await getAdminSessionActor();
  const notificationCenter = await getAdminNotificationCenter(actor);

  return <AdminNotificationsPageView notificationCenter={notificationCenter} />;
}
