import { z } from "zod";

const REQUIRED_DATABASE_SCHEMA = "trp_booking";

const postgresConnectionStringSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "Must be a PostgreSQL connection string.",
  )
  .refine(
    (value) => value.includes(`schema=${REQUIRED_DATABASE_SCHEMA}`),
    `Must include schema=${REQUIRED_DATABASE_SCHEMA}.`,
  );

const serverEnvSchema = z.object({
  DATABASE_URL: postgresConnectionStringSchema,
  DIRECT_URL: postgresConnectionStringSchema,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    DIRECT_URL: source.DIRECT_URL,
    NODE_ENV: source.NODE_ENV,
  });
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
