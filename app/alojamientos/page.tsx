import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { AccommodationsPage } from "@/features/properties";
import { getPublicAccommodations } from "@/lib/properties";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.accommodations.title,
  description: esMessages.seo.accommodations.description,
  path: "/alojamientos",
});

export default async function Page() {
  const accommodations = await getPublicAccommodations();

  return <AccommodationsPage accommodations={accommodations} />;
}
