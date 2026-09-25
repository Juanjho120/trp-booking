import type { Metadata } from "next";

import { AdminNotificationsPageView } from "@/features/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.notificationsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminNotificationsPage() {
  return <AdminNotificationsPageView />;
}
