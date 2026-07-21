import type { Metadata } from "next";

import { AdminCatalogManager } from "@/features/admin";
import { getAdminCatalogSettings } from "@/lib/admin";
import { esMessages } from "@/messages";
import type { AdminCatalogTab } from "@/types/admin-catalogs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.catalogs.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = Readonly<{
  searchParams: Promise<{
    catalog?: string;
  }>;
}>;

function resolveCatalogTab(value: string | undefined): AdminCatalogTab {
  return value === "house-rules" ? "house-rules" : "amenities";
}

export default async function AdminCatalogsPage({ searchParams }: PageProps) {
  const { catalog } = await searchParams;
  const settings = await getAdminCatalogSettings();

  return (
    <AdminCatalogManager
      initialSettings={settings}
      selectedCatalog={resolveCatalogTab(catalog)}
    />
  );
}
