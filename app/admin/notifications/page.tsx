import type { Metadata } from "next";

import { AdminNotificationsPageView } from "@/features/admin/components/admin-notifications-page";
import { getAdminSessionActor } from "@/lib/admin/session";
import {
  getAdminNotificationCenter,
  normalizeAdminNotificationId,
  resolveAdminNotificationInitialOpenId,
} from "@/lib/admin-notifications";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.notificationsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

type AdminNotificationsPageProps = Readonly<{
  searchParams?: Promise<{
    notification?: string | string[];
  }>;
}>;

export default async function AdminNotificationsPage({
  searchParams,
}: AdminNotificationsPageProps) {
  const actor = await getAdminSessionActor();
  const params = searchParams ? await searchParams : {};
  const rawNotificationId = Array.isArray(params.notification)
    ? params.notification[0]
    : params.notification;
  const requestedNotificationId = normalizeAdminNotificationId(rawNotificationId);
  const notificationCenter = await getAdminNotificationCenter(actor, {
    requestedNotificationId,
  });
  const initialNotificationId = resolveAdminNotificationInitialOpenId({
    requestedNotificationId,
    notifications: notificationCenter.notifications,
  });

  return (
    <AdminNotificationsPageView
      initialNotificationId={initialNotificationId}
      notificationCenter={notificationCenter}
    />
  );
}
