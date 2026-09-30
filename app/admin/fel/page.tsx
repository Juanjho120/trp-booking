import type { Metadata } from "next";

import { AdminFelPageView } from "@/features/admin/components/admin-fel-page";
import { getAdminFelPage } from "@/lib/admin/fel";
import { esMessages } from "@/messages";

type AdminFelPageProps = Readonly<{
  searchParams: Promise<{
    page?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.felPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminFelPage({
  searchParams,
}: AdminFelPageProps) {
  const params = await searchParams;
  const data = await getAdminFelPage({
    page: Number(params.page),
  });

  return <AdminFelPageView data={data} />;
}
