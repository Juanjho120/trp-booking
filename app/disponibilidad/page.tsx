import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { PublicAvailabilityPage } from "@/features/availability/components/public-availability-page";
import { getPublicAccommodations } from "@/lib/properties";
import { esMessages } from "@/messages";

export const revalidate = 300;

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.availability.title,
  description: esMessages.seo.availability.description,
  path: "/disponibilidad",
});

export default async function AvailabilityPage() {
  const accommodations = await getPublicAccommodations();

  return <PublicAvailabilityPage accommodations={accommodations} />;
}
