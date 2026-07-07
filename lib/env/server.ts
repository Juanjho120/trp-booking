import { z } from "zod";

const REQUIRED_DATABASE_SCHEMA = "trp_booking";
const CLOUDINARY_REQUIRED_FOLDER_PREFIX = "trp-booking/";

const placeholderValueSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (value) => !/CHANGE_ME|REPLACE_ME|YOUR_/i.test(value),
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

const cloudinaryApiSecretSchema = placeholderValueSchema
  .min(8, "Must be at least 8 characters long.")
  .refine(
    (value) => /^[^\s]+$/.test(value),
    "Must not contain whitespace.",
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

const serverEnvSchema = z.object({
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
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type CloudinaryEnv = Pick<
  ServerEnv,
  | "CLOUDINARY_CLOUD_NAME"
  | "CLOUDINARY_API_KEY"
  | "CLOUDINARY_API_SECRET"
  | "CLOUDINARY_UPLOAD_FOLDER"
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
