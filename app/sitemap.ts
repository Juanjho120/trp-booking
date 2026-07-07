import type { MetadataRoute } from "next";

import { accommodations } from "@/config/accommodations";
import { absoluteUrl } from "@/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/alojamientos"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...accommodations.map((accommodation) => ({
      url: absoluteUrl(`/alojamientos/${accommodation.slug.es}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: accommodation.kind === "composed" ? 0.85 : 0.8,
    })),
  ];
}
