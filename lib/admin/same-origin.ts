import { environmentConfig } from "@/config/site";
import { validateServerEnv } from "@/lib/env/server";

function isLocalDevelopmentOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

export function isValidAdminMutationOrigin(
  request: Request,
  envSource: NodeJS.ProcessEnv = process.env,
): boolean {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    return false;
  }

  const environment = validateServerEnv(envSource).TRP_ENVIRONMENT;

  if (environment === "local") {
    return isLocalDevelopmentOrigin(origin);
  }

  const expectedOrigin =
    environment === "test"
      ? environmentConfig.test.applicationUrl
      : environmentConfig.production.applicationUrl;

  return origin === expectedOrigin;
}
