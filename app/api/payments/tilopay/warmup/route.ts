import { warmTilopaySdkToken } from "@/lib/payments/tilopay-sdk-token-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "cache-control": "no-store, max-age=0",
} as const;

type TilopayWarmupExecutor = typeof warmTilopaySdkToken;

export async function handleTilopaySdkTokenWarmupRequest(
  warmup: TilopayWarmupExecutor = warmTilopaySdkToken,
): Promise<Response> {
  try {
    const result = await warmup();

    return Response.json(
      {
        ready: true,
        source: result.source,
      },
      {
        headers: noStoreHeaders,
        status: 200,
      },
    );
  } catch {
    return Response.json(
      {
        ready: false,
        error: { code: "TILOPAY_SDK_TOKEN_WARMUP_UNAVAILABLE" },
      },
      {
        headers: noStoreHeaders,
        status: 502,
      },
    );
  }
}

export async function POST(): Promise<Response> {
  return handleTilopaySdkTokenWarmupRequest();
}
