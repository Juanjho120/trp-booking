import { z } from "zod";

import { environmentConfig } from "@/config/site";

const adminRecipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

export type AdminNotificationRouting = Readonly<{
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
}>;

export function normalizeAdminNotificationRecipient(value: string): string {
  const parsed = adminRecipientSchema.safeParse(value);

  if (!parsed.success) {
    throw new TypeError("Invalid admin notification recipient.");
  }

  return parsed.data;
}

function getConfiguredAdminRecipients(source: NodeJS.ProcessEnv): string[] {
  const configuredRecipients = source.EMAIL_ADMIN_RECIPIENTS?.split(",") ?? [];
  const validRecipients = configuredRecipients.flatMap((recipient) => {
    const parsedRecipient = adminRecipientSchema.safeParse(recipient);

    return parsedRecipient.success ? [parsedRecipient.data] : [];
  });

  return Array.from(new Set(validRecipients));
}

function getEnvironmentAdminFallback(source: NodeJS.ProcessEnv): string {
  return source.TRP_ENVIRONMENT === "production"
    ? environmentConfig.production.adminEmail
    : environmentConfig.test.adminEmail;
}

export function resolveAdminNotificationRouting(
  source: NodeJS.ProcessEnv = process.env,
): AdminNotificationRouting {
  const configuredRecipients = getConfiguredAdminRecipients(source);

  return {
    adminRecipients:
      configuredRecipients.length > 0
        ? configuredRecipients
        : [getEnvironmentAdminFallback(source)],
    adminLocale: source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es",
  };
}
