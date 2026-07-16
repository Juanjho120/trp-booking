import type { Metadata } from "next";

import { AdminAccommodationSettings } from "@/features/admin";
import { getAdminPreparationBufferSettings } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAccommodationsPage() {
  const settings = await getAdminPreparationBufferSettings();
  return <AdminAccommodationSettings initialSettings={settings} />;
}
