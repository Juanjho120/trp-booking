import { z } from "zod";

import { environmentConfig } from "@/config/site";

const REQUIRED_DATABASE_SCHEMA = "trp_booking";
const CLOUDINARY_REQUIRED_FOLDER_PREFIX = "trp-booking/";
const TRANSACTIONAL_RECIPIENT_MAX_LENGTH = 160;

const TEST_APPLICATION_DOMAIN = environmentConfig.test.applicationDomain;
const TEST_SENDING_DOMAIN = environmentConfig.test.sendingDomain;
const PRODUCTION_APPLICATION_DOMAIN =
  environmentConfig.production.applicationDomain;
const PRODUCTION_SENDING_DOMAIN = environmentConfig.production.sendingDomain;

const placeholderValueSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (value) =>
      !/CHANGE_ME|REPLACE_ME|REPLACE_WITH|REPLACE-WITH|YOUR_|PLACEHOLDER|EXAMPLE/i.test(
        value,
      ),
    "Replace the placeholder value with a real environment value.",
  );

const postgresConnectionStringSchema = placeholderValueSchema
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "Must be a PostgreSQL connection string.",
  )
  .refine(
    (value) => value.includes(`schema=${REQUIRED_DATABASE_SCHEMA}`),
    `Must include schema=${REQUIRED_DATABASE_SCHEMA}.`,
  );

const authSecretSchema = placeholderValueSchema.min(
  32,
  "Must be at least 32 characters long.",
);

const authTrustHostSchema = z
  .enum(["true", "false"], {
    message: "Must be either true or false.",
  })
  .default("false")
  .transform((value) => value === "true");

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

const optionalUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().url("Must be a valid URL.").optional(),
);

const optionalPublicAssetUrlSchema = z.preprocess(
  emptyStringToUndefined,
  placeholderValueSchema
    .refine(
      (value) => z.string().url().safeParse(value).success,
      "Must be a valid URL.",
    )
    .optional(),
);

const requiredUrlSchema = placeholderValueSchema.refine(
  (value) => z.string().url().safeParse(value).success,
  "Must be a valid URL.",
);

const providerCredentialValueSchema = placeholderValueSchema.refine(
  (value) => /^[^\s]+$/.test(value),
  "Must not contain whitespace.",
);

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .email("Must be a valid email address.")
    .transform((value) => value.toLowerCase())
    .optional(),
);

const vercelEnvironmentSchema = z
  .enum(["development", "preview", "production"], {
    message: "Must be development, preview, or production.",
  })
  .optional();

function parseEmailList(
  value: string,
  context: z.RefinementCtx,
  emptyMessage: string,
  invalidMessage: string,
): string[] | typeof z.NEVER {
  const emails = value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    context.addIssue({ code: "custom", message: emptyMessage });
    return z.NEVER;
  }

  const invalidEmails = emails.filter(
    (email) => !z.string().email().safeParse(email).success,
  );

  if (invalidEmails.length > 0) {
    context.addIssue({ code: "custom", message: invalidMessage });
    return z.NEVER;
  }

  return Array.from(new Set(emails));
}

const adminEmailListSchema = z
  .string()
  .trim()
  .min(1, "At least one admin email is required.")
  .transform((value, context) => {
    const emails = parseEmailList(
      value,
      context,
      "At least one admin email is required.",
      "All admin allowlist entries must be valid email addresses.",
    );

    if (emails === z.NEVER) {
      return z.NEVER;
    }

    if (emails.some((email) => email.endsWith("@example.com"))) {
      context.addIssue({
        code: "custom",
        message: "Replace example.com admin emails with real allowed admin emails.",
      });
      return z.NEVER;
    }

    return emails;
  });

const optionalEmailListSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .transform((value, context) => {
      const emails = parseEmailList(
        value,
        context,
        "At least one email recipient is required.",
        "All entries must be valid email addresses.",
      );

      if (emails === z.NEVER) {
        return z.NEVER;
      }

      if (
        emails.some(
          (email) => email.length > TRANSACTIONAL_RECIPIENT_MAX_LENGTH,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: `Email recipients must not exceed ${TRANSACTIONAL_RECIPIENT_MAX_LENGTH} characters.`,
        });
        return z.NEVER;
      }

      return emails;
    })
    .optional(),
);

function extractSenderEmail(value: string): string | null {
  const bracketMatch = value.match(/<([^<>]+)>\s*$/);
  const candidate = bracketMatch?.[1] ?? value;
  const parsed = z.string().email().safeParse(candidate.trim());
  return parsed.success ? parsed.data.toLowerCase() : null;
}

const optionalEmailSenderSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .max(320, "Must not exceed 320 characters.")
    .refine(
      (value) => extractSenderEmail(value) !== null,
      "Must contain a valid email address.",
    )
    .optional(),
);

function getEmailDomain(value: string): string | null {
  return value.toLowerCase().split("@")[1] ?? null;
}

function matchesDomain(value: string, domain: string): boolean {
  const normalizedValue = value.toLowerCase();
  return normalizedValue === domain || normalizedValue.endsWith(`.${domain}`);
}

function emailUsesExactDomain(value: string, domain: string): boolean {
  return getEmailDomain(value) === domain;
}

function emailUsesDomain(value: string, domain: string): boolean {
  const emailDomain = getEmailDomain(value);
  return emailDomain !== null && matchesDomain(emailDomain, domain);
}

function senderUsesExactDomain(value: string, domain: string): boolean {
  const email = extractSenderEmail(value);
  return email !== null && emailUsesExactDomain(email, domain);
}

function urlUsesDomain(value: string, domain: string): boolean {
  return matchesDomain(new URL(value).hostname.toLowerCase(), domain);
}

function isLocalDevelopmentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

const resendApiKeySchema = providerCredentialValueSchema
  .min(10, "Must be a valid Resend API key.")
  .refine((value) => value.startsWith("re_"), "Must start with re_.");

const optionalResendApiKeySchema = z.preprocess(
  emptyStringToUndefined,
  resendApiKeySchema.optional(),
);

const cloudinaryCloudNameSchema = placeholderValueSchema.refine(
  (value) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value),
  "Must use lowercase letters, numbers, and hyphens only.",
);

const cloudinaryApiKeySchema = placeholderValueSchema.refine(
  (value) => /^[A-Za-z0-9_-]{6,}$/.test(value),
  "Must be a valid Cloudinary API key value.",
);

const cloudinaryApiSecretSchema = providerCredentialValueSchema.min(
  8,
  "Must be at least 8 characters long.",
);

const cloudinaryUploadFolderSchema = placeholderValueSchema
  .refine(
    (value) => value.startsWith(CLOUDINARY_REQUIRED_FOLDER_PREFIX),
    `Must start with ${CLOUDINARY_REQUIRED_FOLDER_PREFIX}.`,
  )
  .refine(
    (value) => !value.startsWith("/") && !value.endsWith("/"),
    "Must not start or end with a slash.",
  )
  .refine(
    (value) => !value.includes("//"),
    "Must not contain empty path segments.",
  )
  .refine(
    (value) => /^[a-z0-9/-]+$/.test(value),
    "Must use lowercase letters, numbers, hyphens, and slashes only.",
  );

const tilopayCallbackUrlKeys = [
  "TILOPAY_REDIRECT_URL",
  "TILOPAY_SUCCESS_URL",
  "TILOPAY_CANCEL_URL",
  "TILOPAY_ERROR_URL",
  "TILOPAY_WEBHOOK_URL",
] as const;

const emailRequiredKeys = [
  "RESEND_API_KEY",
  "EMAIL_FROM_ES",
  "EMAIL_FROM_EN",
  "EMAIL_REPLY_TO_ES",
  "EMAIL_REPLY_TO_EN",
  "EMAIL_ADMIN_RECIPIENTS",
  "EMAIL_PUBLIC_BASE_URL",
  "EMAIL_BRAND_LOGO_URL",
] as const;

const rawServerEnvSchema = z.object({
  TRP_ENVIRONMENT: z.enum(["local", "test", "production"], {
    message: "Must be local, test, or production.",
  }),
  DATABASE_URL: postgresConnectionStringSchema,
  DIRECT_URL: postgresConnectionStringSchema,
  AUTH_SECRET: authSecretSchema,
  AUTH_TRUST_HOST: authTrustHostSchema,
  AUTH_GOOGLE_ID: placeholderValueSchema,
  AUTH_GOOGLE_SECRET: placeholderValueSchema,
  AUTH_ALLOWED_ADMIN_EMAILS: adminEmailListSchema,
  AUTH_URL: optionalUrlSchema,
  CLOUDINARY_CLOUD_NAME: cloudinaryCloudNameSchema,
  CLOUDINARY_API_KEY: cloudinaryApiKeySchema,
  CLOUDINARY_API_SECRET: cloudinaryApiSecretSchema,
  CLOUDINARY_UPLOAD_FOLDER: cloudinaryUploadFolderSchema,
  TILOPAY_ENVIRONMENT: z.enum(["sandbox", "production"], {
    message: "Must be either sandbox or production.",
  }),
  TILOPAY_API_KEY: providerCredentialValueSchema,
  TILOPAY_API_USER: providerCredentialValueSchema,
  TILOPAY_API_PASSWORD: providerCredentialValueSchema,
  TILOPAY_REDIRECT_URL: requiredUrlSchema,
  TILOPAY_SUCCESS_URL: requiredUrlSchema,
  TILOPAY_CANCEL_URL: requiredUrlSchema,
  TILOPAY_ERROR_URL: requiredUrlSchema,
  TILOPAY_WEBHOOK_URL: requiredUrlSchema,
  EMAIL_DELIVERY_MODE: z
    .enum(["disabled", "test", "production"], {
      message: "Must be disabled, test, or production.",
    })
    .default("disabled"),
  RESEND_API_KEY: optionalResendApiKeySchema,
  EMAIL_FROM_ES: optionalEmailSenderSchema,
  EMAIL_FROM_EN: optionalEmailSenderSchema,
  EMAIL_REPLY_TO_ES: optionalEmailSchema,
  EMAIL_REPLY_TO_EN: optionalEmailSchema,
  EMAIL_ADMIN_RECIPIENTS: optionalEmailListSchema,
  EMAIL_ADMIN_LOCALE: z
    .enum(["es", "en"], { message: "Must be es or en." })
    .default("es"),
  EMAIL_PUBLIC_BASE_URL: optionalUrlSchema,
  EMAIL_BRAND_LOGO_URL: optionalPublicAssetUrlSchema,
  EMAIL_TEST_RECIPIENT: optionalEmailSchema,
  VERCEL_ENV: vercelEnvironmentSchema,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function validateEnvironmentUrl(
  context: z.RefinementCtx,
  path: string,
  value: string,
  trpEnvironment: "local" | "test" | "production",
): void {
  const url = new URL(value);

  if (trpEnvironment === "local") {
    if (
      isLocalDevelopmentUrl(value) ||
      (url.protocol === "https:" && url.hostname === TEST_APPLICATION_DOMAIN)
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      path: [path],
      message: `Local URLs must use localhost or https://${TEST_APPLICATION_DOMAIN}.`,
    });
    return;
  }

  if (url.protocol !== "https:") {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "Must use HTTPS outside local development.",
    });
    return;
  }

  const expectedDomain =
    trpEnvironment === "test"
      ? TEST_APPLICATION_DOMAIN
      : PRODUCTION_APPLICATION_DOMAIN;

  const matchesExpectedDomain =
    trpEnvironment === "test"
      ? url.hostname === expectedDomain
      : urlUsesDomain(value, expectedDomain);

  if (!matchesExpectedDomain) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: `Must use ${expectedDomain}${
        trpEnvironment === "production" ? " or one of its subdomains" : ""
      }.`,
    });
  }
}

const serverEnvSchema = rawServerEnvSchema.superRefine((env, context) => {
  for (const key of tilopayCallbackUrlKeys) {
    validateEnvironmentUrl(context, key, env[key], env.TRP_ENVIRONMENT);
  }

  const expectedTilopayEnvironment =
    env.TRP_ENVIRONMENT === "production" ? "production" : "sandbox";

  if (env.TILOPAY_ENVIRONMENT !== expectedTilopayEnvironment) {
    context.addIssue({
      code: "custom",
      path: ["TILOPAY_ENVIRONMENT"],
      message: `TRP_ENVIRONMENT=${env.TRP_ENVIRONMENT} requires TILOPAY_ENVIRONMENT=${expectedTilopayEnvironment}.`,
    });
  }

  if (
    env.TRP_ENVIRONMENT === "production" &&
    env.VERCEL_ENV !== undefined &&
    env.VERCEL_ENV !== "production"
  ) {
    context.addIssue({
      code: "custom",
      path: ["VERCEL_ENV"],
      message: "TRP production must run as a Vercel production deployment.",
    });
  }

  if (env.EMAIL_DELIVERY_MODE === "disabled") {
    return;
  }

  const expectedEmailMode =
    env.TRP_ENVIRONMENT === "production" ? "production" : "test";

  if (env.EMAIL_DELIVERY_MODE !== expectedEmailMode) {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_DELIVERY_MODE"],
      message: `TRP_ENVIRONMENT=${env.TRP_ENVIRONMENT} requires EMAIL_DELIVERY_MODE=${expectedEmailMode} or disabled.`,
    });
  }

  for (const key of emailRequiredKeys) {
    if (env[key] === undefined) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `Required when EMAIL_DELIVERY_MODE=${env.EMAIL_DELIVERY_MODE}.`,
      });
    }
  }

  if (env.EMAIL_DELIVERY_MODE === "test" && !env.EMAIL_TEST_RECIPIENT) {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_TEST_RECIPIENT"],
      message: "Required when EMAIL_DELIVERY_MODE=test.",
    });
  }

  if (env.EMAIL_DELIVERY_MODE === "production" && env.EMAIL_TEST_RECIPIENT) {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_TEST_RECIPIENT"],
      message: "Must be empty when EMAIL_DELIVERY_MODE=production.",
    });
  }

  if (env.EMAIL_PUBLIC_BASE_URL) {
    validateEnvironmentUrl(
      context,
      "EMAIL_PUBLIC_BASE_URL",
      env.EMAIL_PUBLIC_BASE_URL,
      env.TRP_ENVIRONMENT,
    );
  }

  if (env.EMAIL_BRAND_LOGO_URL) {
    const brandLogoUrl = new URL(env.EMAIL_BRAND_LOGO_URL);

    if (
      brandLogoUrl.protocol !== "https:" ||
      brandLogoUrl.username ||
      brandLogoUrl.password ||
      isLocalDevelopmentUrl(env.EMAIL_BRAND_LOGO_URL)
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_BRAND_LOGO_URL"],
        message:
          "Must be a publicly reachable HTTPS URL without embedded credentials.",
      });
    }
  }

  const expectedSendingDomain =
    env.TRP_ENVIRONMENT === "production"
      ? PRODUCTION_SENDING_DOMAIN
      : TEST_SENDING_DOMAIN;

  for (const key of ["EMAIL_FROM_ES", "EMAIL_FROM_EN"] as const) {
    const sender = env[key];

    if (sender && !senderUsesExactDomain(sender, expectedSendingDomain)) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `Must use the verified sending domain ${expectedSendingDomain}.`,
      });
    }
  }

  for (const key of ["EMAIL_REPLY_TO_ES", "EMAIL_REPLY_TO_EN"] as const) {
    const email = env[key];

    if (!email) {
      continue;
    }

    const valid =
      env.TRP_ENVIRONMENT === "production"
        ? emailUsesDomain(email, PRODUCTION_APPLICATION_DOMAIN)
        : emailUsesDomain(email, TEST_SENDING_DOMAIN);

    if (!valid) {
      context.addIssue({
        code: "custom",
        path: [key],
        message:
          env.TRP_ENVIRONMENT === "production"
            ? `Must use ${PRODUCTION_APPLICATION_DOMAIN} or one of its subdomains.`
            : `Must use the isolated test domain ${TEST_SENDING_DOMAIN}.`,
      });
    }
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type TrpEnvironment = ServerEnv["TRP_ENVIRONMENT"];

export type CloudinaryEnv = Pick<
  ServerEnv,
  | "CLOUDINARY_CLOUD_NAME"
  | "CLOUDINARY_API_KEY"
  | "CLOUDINARY_API_SECRET"
  | "CLOUDINARY_UPLOAD_FOLDER"
>;

export type TilopayEnv = Pick<
  ServerEnv,
  | "TILOPAY_ENVIRONMENT"
  | "TILOPAY_API_KEY"
  | "TILOPAY_API_USER"
  | "TILOPAY_API_PASSWORD"
  | "TILOPAY_REDIRECT_URL"
  | "TILOPAY_SUCCESS_URL"
  | "TILOPAY_CANCEL_URL"
  | "TILOPAY_ERROR_URL"
  | "TILOPAY_WEBHOOK_URL"
>;

export type EmailDeliveryMode = "disabled" | "test" | "production";

export type DisabledEmailEnv = Readonly<{
  deliveryMode: "disabled";
}>;

type EnabledEmailEnvBase = Readonly<{
  apiKey: string;
  from: Readonly<Record<"es" | "en", string>>;
  replyTo: Readonly<Record<"es" | "en", string>>;
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
  publicBaseUrl: string;
  brandLogoUrl: string;
}>;

export type TestEmailEnv = EnabledEmailEnvBase &
  Readonly<{
    deliveryMode: "test";
    testRecipient: string;
  }>;

export type ProductionEmailEnv = EnabledEmailEnvBase &
  Readonly<{
    deliveryMode: "production";
  }>;

export type EnabledEmailEnv = TestEmailEnv | ProductionEmailEnv;
export type EmailEnv = DisabledEmailEnv | EnabledEmailEnv;

export function validateServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return serverEnvSchema.parse({
    TRP_ENVIRONMENT: source.TRP_ENVIRONMENT,
    DATABASE_URL: source.DATABASE_URL,
    DIRECT_URL: source.DIRECT_URL,
    AUTH_SECRET: source.AUTH_SECRET,
    AUTH_TRUST_HOST: source.AUTH_TRUST_HOST,
    AUTH_GOOGLE_ID: source.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: source.AUTH_GOOGLE_SECRET,
    AUTH_ALLOWED_ADMIN_EMAILS: source.AUTH_ALLOWED_ADMIN_EMAILS,
    AUTH_URL: source.AUTH_URL,
    CLOUDINARY_CLOUD_NAME: source.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: source.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: source.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER: source.CLOUDINARY_UPLOAD_FOLDER,
    TILOPAY_ENVIRONMENT: source.TILOPAY_ENVIRONMENT,
    TILOPAY_API_KEY: source.TILOPAY_API_KEY,
    TILOPAY_API_USER: source.TILOPAY_API_USER,
    TILOPAY_API_PASSWORD: source.TILOPAY_API_PASSWORD,
    TILOPAY_REDIRECT_URL: source.TILOPAY_REDIRECT_URL,
    TILOPAY_SUCCESS_URL: source.TILOPAY_SUCCESS_URL,
    TILOPAY_CANCEL_URL: source.TILOPAY_CANCEL_URL,
    TILOPAY_ERROR_URL: source.TILOPAY_ERROR_URL,
    TILOPAY_WEBHOOK_URL: source.TILOPAY_WEBHOOK_URL,
    EMAIL_DELIVERY_MODE: source.EMAIL_DELIVERY_MODE,
    RESEND_API_KEY: source.RESEND_API_KEY,
    EMAIL_FROM_ES: source.EMAIL_FROM_ES,
    EMAIL_FROM_EN: source.EMAIL_FROM_EN,
    EMAIL_REPLY_TO_ES: source.EMAIL_REPLY_TO_ES,
    EMAIL_REPLY_TO_EN: source.EMAIL_REPLY_TO_EN,
    EMAIL_ADMIN_RECIPIENTS: source.EMAIL_ADMIN_RECIPIENTS,
    EMAIL_ADMIN_LOCALE: source.EMAIL_ADMIN_LOCALE,
    EMAIL_PUBLIC_BASE_URL: source.EMAIL_PUBLIC_BASE_URL,
    EMAIL_BRAND_LOGO_URL: source.EMAIL_BRAND_LOGO_URL,
    EMAIL_TEST_RECIPIENT: source.EMAIL_TEST_RECIPIENT,
    VERCEL_ENV: source.VERCEL_ENV,
    NODE_ENV: source.NODE_ENV,
  });
}

export function getAllowedAdminEmails(
  source: NodeJS.ProcessEnv = process.env,
): string[] {
  return validateServerEnv(source).AUTH_ALLOWED_ADMIN_EMAILS;
}

export function getCloudinaryEnv(
  source: NodeJS.ProcessEnv = process.env,
): CloudinaryEnv {
  const env = validateServerEnv(source);

  return {
    CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER: env.CLOUDINARY_UPLOAD_FOLDER,
  };
}

export function getTilopayEnv(
  source: NodeJS.ProcessEnv = process.env,
): TilopayEnv {
  const env = validateServerEnv(source);

  return {
    TILOPAY_ENVIRONMENT: env.TILOPAY_ENVIRONMENT,
    TILOPAY_API_KEY: env.TILOPAY_API_KEY,
    TILOPAY_API_USER: env.TILOPAY_API_USER,
    TILOPAY_API_PASSWORD: env.TILOPAY_API_PASSWORD,
    TILOPAY_REDIRECT_URL: env.TILOPAY_REDIRECT_URL,
    TILOPAY_SUCCESS_URL: env.TILOPAY_SUCCESS_URL,
    TILOPAY_CANCEL_URL: env.TILOPAY_CANCEL_URL,
    TILOPAY_ERROR_URL: env.TILOPAY_ERROR_URL,
    TILOPAY_WEBHOOK_URL: env.TILOPAY_WEBHOOK_URL,
  };
}

export function getEmailEnv(source: NodeJS.ProcessEnv = process.env): EmailEnv {
  const env = validateServerEnv(source);

  if (env.EMAIL_DELIVERY_MODE === "disabled") {
    return { deliveryMode: "disabled" };
  }

  if (
    !env.RESEND_API_KEY ||
    !env.EMAIL_FROM_ES ||
    !env.EMAIL_FROM_EN ||
    !env.EMAIL_REPLY_TO_ES ||
    !env.EMAIL_REPLY_TO_EN ||
    !env.EMAIL_ADMIN_RECIPIENTS ||
    !env.EMAIL_PUBLIC_BASE_URL ||
    !env.EMAIL_BRAND_LOGO_URL
  ) {
    throw new Error("Validated email configuration is incomplete.");
  }

  const enabledEmailEnvBase: EnabledEmailEnvBase = {
    apiKey: env.RESEND_API_KEY,
    from: { es: env.EMAIL_FROM_ES, en: env.EMAIL_FROM_EN },
    replyTo: { es: env.EMAIL_REPLY_TO_ES, en: env.EMAIL_REPLY_TO_EN },
    adminRecipients: env.EMAIL_ADMIN_RECIPIENTS,
    adminLocale: env.EMAIL_ADMIN_LOCALE,
    publicBaseUrl: env.EMAIL_PUBLIC_BASE_URL,
    brandLogoUrl: env.EMAIL_BRAND_LOGO_URL,
  };

  if (env.EMAIL_DELIVERY_MODE === "test") {
    if (!env.EMAIL_TEST_RECIPIENT) {
      throw new Error("Validated test email configuration is incomplete.");
    }

    return {
      ...enabledEmailEnvBase,
      deliveryMode: "test",
      testRecipient: env.EMAIL_TEST_RECIPIENT,
    };
  }

  return { ...enabledEmailEnvBase, deliveryMode: "production" };
}

export function formatEnvValidationError(error: unknown): string {
  if (!(error instanceof z.ZodError)) {
    return "Unknown environment validation error.";
  }

  return error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "ENV";
      return `- ${key}: ${issue.message}`;
    })
    .join("\n");
}
