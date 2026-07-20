import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminAccommodationContentEditor } from "@/features/admin";
import { getAdminAccommodationContentById } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.content.seoTitle,
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

export default async function AdminAccommodationContentPage({ params }: PageProps) {
  const { propertyId } = await params;
  const property = await getAdminAccommodationContentById(propertyId);

  if (!property) {
    notFound();
  }

  return <AdminAccommodationContentEditor initialProperty={property} />;
}
