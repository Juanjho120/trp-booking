import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPricingManager } from "@/features/admin";
import { getAdminPricingSettings } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.pricing.seoTitle,
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

export default async function AdminPricingPage({ params }: PageProps) {
  const { propertyId } = await params;
  const settings = await getAdminPricingSettings(propertyId);

  if (!settings) {
    notFound();
  }

  return <AdminPricingManager initialSettings={settings} />;
}
