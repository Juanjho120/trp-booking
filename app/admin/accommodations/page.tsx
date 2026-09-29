import type { Metadata } from "next";

import { AdminAccommodationManagement } from "@/features/admin/components/admin-accommodation-management";
import { getAdminAccommodationContentSettings } from "@/lib/admin/accommodation-content";
import { getAdminPreparationBufferSettings } from "@/lib/admin/preparation-buffer-management";
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
  const [content, preparationSettings] = await Promise.all([
    getAdminAccommodationContentSettings(),
    getAdminPreparationBufferSettings(),
  ]);

  return (
    <AdminAccommodationManagement
      initialContent={content}
      initialPreparationSettings={preparationSettings}
    />
  );
}
