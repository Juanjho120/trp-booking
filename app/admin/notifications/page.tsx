import type { Metadata } from "next";

import { AdminNotificationsPageView } from "@/features/admin";
import { getAdminNotificationCenter, getAdminSessionActor } from "@/lib/admin";
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
