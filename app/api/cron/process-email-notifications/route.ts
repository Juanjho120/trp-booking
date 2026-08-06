import { handleScheduledCronRequest } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleScheduledCronRequest(request, "process-email-notifications");
}
