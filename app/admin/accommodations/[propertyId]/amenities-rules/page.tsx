import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminAmenitiesHouseRulesManager } from "@/features/admin";
import { getAdminAmenityHouseRuleSettings } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.amenitiesRules.seoTitle,
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

export default async function AdminAmenitiesHouseRulesPage({
  params,
}: PageProps) {
  const { propertyId } = await params;
  const settings = await getAdminAmenityHouseRuleSettings(propertyId);

  if (!settings) {
    notFound();
  }

  return <AdminAmenitiesHouseRulesManager initialSettings={settings} />;
}
