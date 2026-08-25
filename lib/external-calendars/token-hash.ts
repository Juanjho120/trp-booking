import { createHash } from "node:crypto";

export function hashExternalCalendarExportToken(token: string): string {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("External calendar export token is required.");
  }

  return createHash("sha256")
    .update(normalizedToken, "utf8")
    .digest("hex");
}
