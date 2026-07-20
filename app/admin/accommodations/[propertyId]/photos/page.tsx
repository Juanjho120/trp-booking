import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPropertyPhotoManager } from "@/features/admin";
import { getAdminPropertyPhotoSettings } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.photos.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = Readonly<{
  params: Promise<{
    propertyId: string;
  }>;
}>;

export default async function AdminPropertyPhotosPage({ params }: PageProps) {
  const { propertyId } = await params;
  const settings = await getAdminPropertyPhotoSettings(propertyId);

  if (!settings) {
    notFound();
  }

  return <AdminPropertyPhotoManager initialSettings={settings} />;
}
