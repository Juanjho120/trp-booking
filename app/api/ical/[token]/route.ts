import { generateAirbnbIcalExportFeed } from "@/lib/airbnb-ical/export-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IcalExportRouteContext = Readonly<{
  params: Promise<{
    token: string;
  }>;
}>;

function buildCalendarResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function buildNotFoundResponse(): Response {
  return new Response("Calendar feed not found.\n", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

export async function GET(
  _request: Request,
  context: IcalExportRouteContext,
): Promise<Response> {
  try {
    const { token } = await context.params;
    const exportFeed = await generateAirbnbIcalExportFeed({
      token,
    });

    return buildCalendarResponse(exportFeed.content);
  } catch {
    return buildNotFoundResponse();
  }
}
