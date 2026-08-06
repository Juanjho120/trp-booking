import type { Metadata } from "next";

import { AdminCronJobsPage } from "@/features/admin";
import { getAdminCronJobsPage } from "@/lib/admin";
import { esMessages } from "@/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.cronJobs.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

type AdminCronJobsRouteProps = Readonly<{
  searchParams: Promise<{
    page?: string | string[];
  }>;
}>;

function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminCronJobsRoute({
  searchParams,
}: AdminCronJobsRouteProps) {
  const params = await searchParams;
  const data = await getAdminCronJobsPage({ page: parsePage(params.page) });

  return <AdminCronJobsPage data={data} />;
}
