import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

const defaultOpenGraphImage = "/images/accommodations/complete-retreat/cover.webp";

type SeoMetadataInput = Readonly<{
  title: string;
  description: string;
  path: string;
  imagePath?: string;
}>;

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${siteConfig.url}${normalizedPath}`;
}

export function createSeoMetadata({
  title,
  description,
  path,
  imagePath = defaultOpenGraphImage,
}: SeoMetadataInput): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(imagePath);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.publicName,
      locale: "es_GT",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: siteConfig.publicName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
