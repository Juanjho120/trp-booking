import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createSeoMetadata } from "@/config/seo";
import { PropertyDetailPage } from "@/features/properties";
import { getPublicAccommodationBySlug } from "@/lib/properties";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  params: Promise<{
    slug: string;
  }>;
}>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const accommodation = await getPublicAccommodationBySlug(slug);

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
  const accommodation = await getPublicAccommodationBySlug(slug);

  if (!accommodation) {
    notFound();
  }

  return <PropertyDetailPage accommodation={accommodation} />;
}
