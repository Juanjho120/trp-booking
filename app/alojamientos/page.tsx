import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { AccommodationsPage } from "@/features/properties/components/accommodations-page";
import { getPublicAccommodations } from "@/lib/properties";
import { esMessages } from "@/messages";

export const revalidate = 300;

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.accommodations.title,
  description: esMessages.seo.accommodations.description,
  path: "/alojamientos",
});

export default async function Page() {
  const accommodations = await getPublicAccommodations();

  return <AccommodationsPage accommodations={accommodations} />;
}
