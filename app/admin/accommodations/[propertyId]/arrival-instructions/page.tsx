import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminArrivalInstructionsEditor } from "@/features/admin";
import { getAdminArrivalInstructionsByPropertyId } from "@/lib/admin";
import { esMessages } from "@/messages";

type AdminArrivalInstructionsRouteProps = Readonly<{
  params: Promise<{
    propertyId: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.accommodations.arrivalInstructions.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminArrivalInstructionsRoute({
  params,
}: AdminArrivalInstructionsRouteProps) {
  const { propertyId } = await params;
  const settings = await getAdminArrivalInstructionsByPropertyId(propertyId);

  if (!settings) {
    notFound();
  }

  return <AdminArrivalInstructionsEditor initialSettings={settings} />;
}
