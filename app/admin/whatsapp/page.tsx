import type { Metadata } from "next";

import { AdminWhatsAppPageView } from "@/features/admin";
import { getAdminWhatsAppPage } from "@/lib/admin";
import { esMessages } from "@/messages";

type AdminWhatsAppPageProps = Readonly<{
  searchParams: Promise<{
    conversationId?: string;
    page?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.whatsappPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminWhatsAppPage({
  searchParams,
}: AdminWhatsAppPageProps) {
  const params = await searchParams;
  const data = await getAdminWhatsAppPage({
    conversationId: params.conversationId,
    page: Number(params.page),
  });

  return <AdminWhatsAppPageView data={data} />;
}
