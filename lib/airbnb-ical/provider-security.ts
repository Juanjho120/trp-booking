import { isIP } from "node:net";

import { parseAirbnbIcalContent } from "./parser";
import type { AirbnbIcalFetchClient } from "./types";

export const AIRBNB_ICAL_URL_MAX_LENGTH = 4_096;
export const AIRBNB_ICAL_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const AIRBNB_ICAL_MAX_REDIRECTS = 3;
export const AIRBNB_ICAL_DEFAULT_TIMEOUT_MS = 10_000;

const AIRBNB_HOST = "airbnb.com";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ICAL_PATH_PATTERN = /^\/calendar\/ical\/.+\.ics$/i;

export type AirbnbIcalProviderErrorCode =
  | "ICAL_URL_NOT_ALLOWED"
  | "ICAL_REDIRECT_NOT_ALLOWED"
  | "ICAL_TOO_MANY_REDIRECTS"
  | "ICAL_RESPONSE_TOO_LARGE"
  | "ICAL_RESPONSE_INVALID"
  | "ICAL_PROVIDER_TIMEOUT"
  | "ICAL_PROVIDER_UNAVAILABLE";

export class AirbnbIcalProviderError extends Error {
  constructor(public readonly code: AirbnbIcalProviderErrorCode) {
    super(code);
    this.name = code;
  }
}

function isAllowedAirbnbHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === AIRBNB_HOST || normalized.endsWith(`.${AIRBNB_HOST}`);
}

export function assertAllowedAirbnbIcalUrl(value: string): URL {
  const candidate = value.trim();

  if (!candidate || candidate.length > AIRBNB_ICAL_URL_MAX_LENGTH) {
    throw new AirbnbIcalProviderError("ICAL_URL_NOT_ALLOWED");
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new AirbnbIcalProviderError("ICAL_URL_NOT_ALLOWED");
  }

  const hostnameForIpCheck = url.hostname.replace(/^\[|\]$/g, "");

  if (
    url.protocol !== "https:" ||
    Boolean(url.username) ||
    Boolean(url.password) ||
    Boolean(url.hash) ||
    Boolean(url.port) ||
    isIP(hostnameForIpCheck) !== 0 ||
    !isAllowedAirbnbHost(url.hostname) ||
    !ICAL_PATH_PATTERN.test(url.pathname)
  ) {
    throw new AirbnbIcalProviderError("ICAL_URL_NOT_ALLOWED");
  }

  return url;
}

function safeHttpError(status: number): Error {
  const error = new Error(`ICAL_HTTP_${status}`);
  error.name = `ICAL_HTTP_${status}`;
  return error;
}

async function readBoundedText(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (
      Number.isFinite(parsedLength) &&
      parsedLength > AIRBNB_ICAL_MAX_RESPONSE_BYTES
    ) {
      throw new AirbnbIcalProviderError("ICAL_RESPONSE_TOO_LARGE");
    }
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    bytesRead += value.byteLength;
    if (bytesRead > AIRBNB_ICAL_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new AirbnbIcalProviderError("ICAL_RESPONSE_TOO_LARGE");
    }

    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();
  return result;
}

function assertCalendarEnvelope(content: string): void {
  const normalized = content.toUpperCase();
  if (!normalized.includes("BEGIN:VCALENDAR") || !normalized.includes("END:VCALENDAR")) {
    throw new AirbnbIcalProviderError("ICAL_RESPONSE_INVALID");
  }
}

export const fetchAirbnbIcalTextSecurely: AirbnbIcalFetchClient = async (
  value,
  options,
) => {
  const timeoutMs = Math.min(
    Math.max(options.timeoutMs, 1),
    AIRBNB_ICAL_DEFAULT_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = assertAllowedAirbnbIcalUrl(value);

    for (let redirectCount = 0; ; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1",
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new AirbnbIcalProviderError("ICAL_PROVIDER_TIMEOUT");
        }
        if (error instanceof AirbnbIcalProviderError) {
          throw error;
        }
        throw new AirbnbIcalProviderError("ICAL_PROVIDER_UNAVAILABLE");
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount >= AIRBNB_ICAL_MAX_REDIRECTS) {
          throw new AirbnbIcalProviderError("ICAL_TOO_MANY_REDIRECTS");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new AirbnbIcalProviderError("ICAL_REDIRECT_NOT_ALLOWED");
        }

        let redirectedUrl: URL;
        try {
          redirectedUrl = new URL(location, currentUrl);
        } catch {
          throw new AirbnbIcalProviderError("ICAL_REDIRECT_NOT_ALLOWED");
        }

        try {
          currentUrl = assertAllowedAirbnbIcalUrl(redirectedUrl.toString());
        } catch {
          throw new AirbnbIcalProviderError("ICAL_REDIRECT_NOT_ALLOWED");
        }
        continue;
      }

      if (!response.ok) {
        throw safeHttpError(response.status);
      }

      const content = await readBoundedText(response);
      assertCalendarEnvelope(content);
      return content;
    }
  } finally {
    clearTimeout(timeout);
  }
};

export async function testAirbnbIcalConnection(value: string): Promise<
  Readonly<{
    eventsFound: number;
    eventsSkipped: number;
  }>
> {
  const content = await fetchAirbnbIcalTextSecurely(value, {
    timeoutMs: AIRBNB_ICAL_DEFAULT_TIMEOUT_MS,
  });
  const parsed = parseAirbnbIcalContent(content);

  return {
    eventsFound: parsed.events.length,
    eventsSkipped: parsed.skippedEvents,
  };
}
