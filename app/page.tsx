import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { HomePage } from "@/features/marketing";
import { getPublicLocationSettings } from "@/lib/public-location";
import { getPublicAccommodations } from "@/lib/properties";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.home.title,
  description: esMessages.seo.home.description,
  path: "/",
});

export default async function Page() {
  const [accommodations, publicLocation] = await Promise.all([
    getPublicAccommodations(),
    getPublicLocationSettings(),
  ]);

  return (
    <HomePage
      accommodations={accommodations}
      publicLocation={publicLocation}
    />
  );
}
