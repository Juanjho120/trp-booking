import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { AccommodationsPage } from "@/features/properties";
import { esMessages } from "@/messages";

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.accommodations.title,
  description: esMessages.seo.accommodations.description,
  path: "/alojamientos",
});

export default function Page() {
  return <AccommodationsPage />;
}
