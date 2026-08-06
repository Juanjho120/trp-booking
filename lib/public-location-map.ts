export const PUBLIC_LOCATION_MAP_URL_MAX_LENGTH = 2_048;

const SENSITIVE_QUERY_PARAMETERS = new Set([
  "access_token",
  "api_key",
  "apikey",
  "key",
  "secret",
  "token",
]);

export class PublicLocationMapUrlError extends Error {
  constructor() {
    super("PUBLIC_LOCATION_MAP_URL_NOT_ALLOWED");
    this.name = "PublicLocationMapUrlError";
  }
}

function isAllowedGoogleMapsEmbedUrl(url: URL): boolean {
  if (url.hostname === "www.google.com") {
    return url.pathname === "/maps/embed";
  }

  return (
    url.hostname === "maps.google.com" &&
    url.pathname === "/maps" &&
    url.searchParams.get("output")?.toLowerCase() === "embed"
  );
}

function isAllowedOpenStreetMapEmbedUrl(url: URL): boolean {
  return (
    (url.hostname === "www.openstreetmap.org" ||
      url.hostname === "openstreetmap.org") &&
    url.pathname === "/export/embed.html"
  );
}

export function normalizePublicLocationMapEmbedUrl(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length > PUBLIC_LOCATION_MAP_URL_MAX_LENGTH) {
    throw new PublicLocationMapUrlError();
  }

  try {
    const url = new URL(normalized);
    const hasSensitiveParameter = Array.from(url.searchParams.keys()).some(
      (parameter) => SENSITIVE_QUERY_PARAMETERS.has(parameter.toLowerCase()),
    );

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      hasSensitiveParameter ||
      (!isAllowedGoogleMapsEmbedUrl(url) &&
        !isAllowedOpenStreetMapEmbedUrl(url))
    ) {
      throw new PublicLocationMapUrlError();
    }

    return url.toString();
  } catch (error) {
    if (error instanceof PublicLocationMapUrlError) {
      throw error;
    }

    throw new PublicLocationMapUrlError();
  }
}
