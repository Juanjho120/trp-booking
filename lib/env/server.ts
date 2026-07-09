import { z } from "zod";

const REQUIRED_DATABASE_SCHEMA = "trp_booking";
const CLOUDINARY_REQUIRED_FOLDER_PREFIX = "trp-booking/";

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
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
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

const optionalUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  },
  z.string().url("Must be a valid URL.").optional(),
);

const requiredUrlSchema = placeholderValueSchema.refine(
  (value) => z.string().url().safeParse(value).success,
  "Must be a valid URL.",
);

const providerCredentialValueSchema = placeholderValueSchema.refine(
  (value) => /^[^\s]+$/.test(value),
  "Must not contain whitespace.",
);

const vercelEnvironmentSchema = z
  .enum(["development", "preview", "production"], {
    message: "Must be development, preview, or production.",
  })
  .optional();

const adminEmailListSchema = z
  .string()
  .trim()
  .min(1, "At least one admin email is required.")
  .transform((value, context) => {
    const emails = value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one admin email is required.",
      });

      return z.NEVER;
    }

    const invalidEmails = emails.filter(
      (email) => !z.string().email().safeParse(email).success,
    );

    if (invalidEmails.length > 0) {
      context.addIssue({
        code: "custom",
        message: "All admin allowlist entries must be valid email addresses.",
      });

      return z.NEVER;
    }

    const placeholderEmails = emails.filter((email) => email.endsWith("@example.com"));

    if (placeholderEmails.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Replace example.com admin emails with real allowed admin emails.",
      });

      return z.NEVER;
    }

    return Array.from(new Set(emails));
  });

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
  .refine((value) => !value.includes("//"), "Must not contain empty path segments.")
  .refine(
    (value) => /^[a-z0-9/-]+$/.test(value),
    "Must use lowercase letters, numbers, hyphens, and slashes only.",
  );

const tilopayCallbackUrlKeys = [
  "TILOPAY_SUCCESS_URL",
  "TILOPAY_CANCEL_URL",
  "TILOPAY_ERROR_URL",
  "TILOPAY_WEBHOOK_URL",
] as const;

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

const rawServerEnvSchema = z.object({
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
  TILOPAY_SUCCESS_URL: requiredUrlSchema,
  TILOPAY_CANCEL_URL: requiredUrlSchema,
  TILOPAY_ERROR_URL: requiredUrlSchema,
  TILOPAY_WEBHOOK_URL: requiredUrlSchema,
  VERCEL_ENV: vercelEnvironmentSchema,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const serverEnvSchema = rawServerEnvSchema.superRefine((env, context) => {
  const isVercelProductionDeployment = env.VERCEL_ENV === "production";

  for (const key of tilopayCallbackUrlKeys) {
    const value = env[key];

    if (value.startsWith("https://")) {
      continue;
    }

    if (!isVercelProductionDeployment && isLocalDevelopmentUrl(value)) {
      continue;
    }

    context.addIssue({
      code: "custom",
      path: [key],
      message: "Must use HTTPS outside local development.",
    });
  }

  if (isVercelProductionDeployment && env.TILOPAY_ENVIRONMENT !== "production") {
    context.addIssue({
      code: "custom",
      path: ["TILOPAY_ENVIRONMENT"],
      message: "Production deployments must use TILOPAY_ENVIRONMENT=production.",
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

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
  | "TILOPAY_SUCCESS_URL"
  | "TILOPAY_CANCEL_URL"
  | "TILOPAY_ERROR_URL"
  | "TILOPAY_WEBHOOK_URL"
>;

export function validateServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return serverEnvSchema.parse({
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
    TILOPAY_SUCCESS_URL: source.TILOPAY_SUCCESS_URL,
    TILOPAY_CANCEL_URL: source.TILOPAY_CANCEL_URL,
    TILOPAY_ERROR_URL: source.TILOPAY_ERROR_URL,
    TILOPAY_WEBHOOK_URL: source.TILOPAY_WEBHOOK_URL,
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
    TILOPAY_SUCCESS_URL: env.TILOPAY_SUCCESS_URL,
    TILOPAY_CANCEL_URL: env.TILOPAY_CANCEL_URL,
    TILOPAY_ERROR_URL: env.TILOPAY_ERROR_URL,
    TILOPAY_WEBHOOK_URL: env.TILOPAY_WEBHOOK_URL,
  };
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
