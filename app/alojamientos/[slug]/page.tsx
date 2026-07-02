import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAccommodationBySlug,
  getAccommodationSlugs,
} from "@/config/accommodations";
import { PropertyDetailPage } from "@/features/properties";

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
    return {
      title: "Alojamiento no encontrado | Tu Refugio Perfecto",
    };
  }

  return {
    title: `${accommodation.name.es} | Tu Refugio Perfecto`,
    description: accommodation.shortDescription.es,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const accommodation = getAccommodationBySlug(slug, "es");

  if (!accommodation) {
    notFound();
  }

  return <PropertyDetailPage accommodation={accommodation} />;
}
