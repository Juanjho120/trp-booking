import type { Metadata } from "next";

import { AdminPublicLocationPage } from "@/features/admin";
import { getAdminPublicLocationPage } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.publicLocation.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPublicLocationRoute() {
  const data = await getAdminPublicLocationPage();

  return <AdminPublicLocationPage initialData={data} />;
}
