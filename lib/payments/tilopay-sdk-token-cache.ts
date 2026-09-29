import { getTilopayEnv } from "@/lib/env/server";

const TILOPAY_API_BASE_URL = "https://app.tilopay.com/api/v1";
export const TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS = 90_000;

type JsonRecord = Record<string, unknown>;

export type TilopaySdkTokenCacheSource =
  | "cache-hit"
  | "provider-refresh"
  | "provider-refresh-uncached";

export type TilopaySdkTokenProviderResponse = Readonly<{
  accessToken: string;
  expiresIn: unknown;
}>;

export type TilopaySdkTokenCacheResult = Readonly<{
  token: string;
  source: TilopaySdkTokenCacheSource;
}>;

type TilopaySdkTokenCacheOptions = Readonly<{
  requestToken: () => Promise<TilopaySdkTokenProviderResponse>;
  now?: () => number;
  safetyBufferMs?: number;
}>;

export class TilopaySdkTokenCacheError extends Error {
  constructor() {
    super("TILOPAY_SDK_TOKEN_UNAVAILABLE");
    this.name = "TilopaySdkTokenCacheError";
  }
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumericSeconds(value: number, nowMs: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return nowMs + Math.floor(value * 1_000);
}

function parseProviderDateTime(value: string): number | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    const parsed = Date.parse(`${normalized.replace(" ", "T")}Z`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveTilopaySdkTokenUsableUntil(
  expiresIn: unknown,
  nowMs: number = Date.now(),
  safetyBufferMs: number = TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
): number | null {
  const providerExpiresAt =
    typeof expiresIn === "number"
      ? parseNumericSeconds(expiresIn, nowMs)
      : typeof expiresIn === "string" && expiresIn.trim()
        ? Number.isFinite(Number(expiresIn.trim()))
          ? parseNumericSeconds(Number(expiresIn.trim()), nowMs)
          : parseProviderDateTime(expiresIn)
        : null;

  if (providerExpiresAt === null) {
    return null;
  }

  const usableUntil = providerExpiresAt - safetyBufferMs;
  return usableUntil > nowMs ? usableUntil : null;
}

function readAccessToken(payload: unknown): string {
  if (!isJsonRecord(payload) || typeof payload.access_token !== "string") {
    throw new TilopaySdkTokenCacheError();
  }

  const accessToken = payload.access_token.trim();

  if (!accessToken) {
    throw new TilopaySdkTokenCacheError();
  }

  return accessToken;
}

async function requestTilopaySdkTokenFromProvider(): Promise<TilopaySdkTokenProviderResponse> {
  const env = getTilopayEnv();
  let response: Response;

  try {
    response = await fetch(`${TILOPAY_API_BASE_URL}/loginSdk`, {
      body: JSON.stringify({
        apiuser: env.TILOPAY_API_USER,
        password: env.TILOPAY_API_PASSWORD,
        key: env.TILOPAY_API_KEY,
      }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      method: "POST",
    });
  } catch {
    throw new TilopaySdkTokenCacheError();
  }

  if (!response.ok) {
    throw new TilopaySdkTokenCacheError();
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new TilopaySdkTokenCacheError();
  }

  return {
    accessToken: readAccessToken(payload),
    expiresIn: isJsonRecord(payload) ? payload.expires_in : undefined,
  };
}

export function createTilopaySdkTokenCache({
  requestToken,
  now = () => Date.now(),
  safetyBufferMs = TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS,
}: TilopaySdkTokenCacheOptions): Readonly<{
  getToken: () => Promise<TilopaySdkTokenCacheResult>;
}> {
  let cachedToken: string | null = null;
  let cachedUsableUntilMs = 0;
  let inFlightRefresh: Promise<TilopaySdkTokenCacheResult> | null = null;

  async function refreshToken(): Promise<TilopaySdkTokenCacheResult> {
    const providerToken = await requestToken();
    const usableUntilMs = resolveTilopaySdkTokenUsableUntil(
      providerToken.expiresIn,
      now(),
      safetyBufferMs,
    );

    if (usableUntilMs === null) {
      cachedToken = null;
      cachedUsableUntilMs = 0;
      return {
        token: providerToken.accessToken,
        source: "provider-refresh-uncached",
      };
    }

    cachedToken = providerToken.accessToken;
    cachedUsableUntilMs = usableUntilMs;

    return {
      token: providerToken.accessToken,
      source: "provider-refresh",
    };
  }

  return {
    async getToken(): Promise<TilopaySdkTokenCacheResult> {
      if (cachedToken && cachedUsableUntilMs > now()) {
        return {
          token: cachedToken,
          source: "cache-hit",
        };
      }

      if (inFlightRefresh) {
        return inFlightRefresh;
      }

      inFlightRefresh = refreshToken().finally(() => {
        inFlightRefresh = null;
      });

      return inFlightRefresh;
    },
  };
}

const tilopaySdkTokenCache = createTilopaySdkTokenCache({
  requestToken: requestTilopaySdkTokenFromProvider,
});

export async function getCachedTilopaySdkToken(): Promise<string> {
  const result = await tilopaySdkTokenCache.getToken();
  return result.token;
}

export async function warmTilopaySdkToken(): Promise<
  Omit<TilopaySdkTokenCacheResult, "token">
> {
  const result = await tilopaySdkTokenCache.getToken();
  return { source: result.source };
}
