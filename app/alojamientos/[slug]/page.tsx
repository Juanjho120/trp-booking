import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAccommodationBySlug,
  getAccommodationSlugs,
} from "@/config/accommodations";
import { createSeoMetadata } from "@/config/seo";
import { PropertyDetailPage } from "@/features/properties";
import { esMessages } from "@/messages";

type PageProps = Readonly<{
  params: Promise<{
    slug: string;
  }>;
}>;

export function generateStaticParams() {
  return getAccommodationSlugs("es").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const accommodation = getAccommodationBySlug(slug, "es");

  if (!accommodation) {
    return createSeoMetadata({
      title: esMessages.seo.notFoundAccommodation.title,
      description: esMessages.seo.notFoundAccommodation.description,
      path: "/alojamientos",
    });
  }

  return createSeoMetadata({
    title: `${accommodation.name.es} | Tu Refugio Perfecto`,
    description: accommodation.shortDescription.es,
    path: `/alojamientos/${accommodation.slug.es}`,
    imagePath: accommodation.coverImage.src,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const accommodation = getAccommodationBySlug(slug, "es");

  if (!accommodation) {
    notFound();
  }

  return <PropertyDetailPage accommodation={accommodation} />;
}
