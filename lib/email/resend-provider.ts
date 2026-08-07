import { Resend } from "resend";
import { z } from "zod";

import { getEmailEnv, type TrpEnvironment } from "@/lib/env/server";
import type {
  EmailAudience,
  EmailProvider,
  EmailProviderSendInput,
  EmailProviderSendResult,
} from "@/types/email-provider";

import { EmailProviderError } from "./provider";

const MAX_IDEMPOTENCY_KEY_LENGTH = 256;
const MAX_RECIPIENT_LENGTH = 160;

const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(MAX_RECIPIENT_LENGTH)
  .transform((value) => value.toLowerCase());

const retryableResendErrorNames = new Set([
  "application_error",
  "concurrent_idempotent_requests",
  "daily_quota_exceeded",
  "internal_server_error",
  "rate_limit_exceeded",
]);

const configurationResendErrorNames = new Set([
  "invalid_access",
  "invalid_api_key",
  "invalid_from_address",
  "missing_api_key",
  "restricted_api_key",
  "security_error",
]);

const invalidRequestResendErrorNames = new Set([
  "invalid_attachment",
  "invalid_parameter",
  "invalid_region",
  "missing_required_field",
  "validation_error",
]);

const idempotencyResendErrorNames = new Set([
  "invalid_idempotency_key",
  "invalid_idempotent_request",
]);

type ResendErrorLike = Readonly<{
  name?: unknown;
  statusCode?: unknown;
}>;

type DeliveryRecipientInput = Readonly<{
  trpEnvironment: TrpEnvironment;
  audience: EmailAudience;
  intendedRecipient: string;
  testRecipient?: string;
}>;

function normalizeRecipient(recipient: string): string {
  const parsedRecipient = recipientSchema.safeParse(recipient);

  if (!parsedRecipient.success) {
    throw new EmailProviderError("EMAIL_PROVIDER_INVALID_REQUEST", false);
  }

  return parsedRecipient.data;
}

export function resolveEmailDeliveryRecipient(
  input: DeliveryRecipientInput,
): string {
  const intendedRecipient = normalizeRecipient(input.intendedRecipient);

  if (input.trpEnvironment !== "local" || input.audience === "admin") {
    return intendedRecipient;
  }

  if (!input.testRecipient) {
    throw new EmailProviderError("EMAIL_PROVIDER_CONFIGURATION_ERROR", false);
  }

  return normalizeRecipient(input.testRecipient);
}

export function getTransactionalEmailSubjectPrefix(
  trpEnvironment: TrpEnvironment,
): string {
  if (trpEnvironment === "local") {
    return "[LOCAL] ";
  }

  if (trpEnvironment === "test") {
    return "[TEST] ";
  }

  return "";
}

function validateSendInput(input: EmailProviderSendInput): void {
  if (
    (input.audience !== "guest" && input.audience !== "admin") ||
    !input.subject.trim() ||
    !input.html.trim() ||
    !input.text.trim()
  ) {
    throw new EmailProviderError("EMAIL_PROVIDER_INVALID_REQUEST", false);
  }

  const idempotencyKey = input.idempotencyKey.trim();

  if (
    idempotencyKey.length === 0 ||
    idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throw new EmailProviderError("EMAIL_PROVIDER_INVALID_REQUEST", false);
  }
}

function mapResendError(error: ResendErrorLike): EmailProviderError {
  const name = typeof error.name === "string" ? error.name : "";
  const statusCode =
    typeof error.statusCode === "number" && Number.isFinite(error.statusCode)
      ? error.statusCode
      : null;

  if (name === "rate_limit_exceeded" || statusCode === 429) {
    return new EmailProviderError("EMAIL_PROVIDER_RATE_LIMITED", true);
  }

  if (idempotencyResendErrorNames.has(name)) {
    return new EmailProviderError("EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT", false);
  }

  if (
    configurationResendErrorNames.has(name) ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return new EmailProviderError("EMAIL_PROVIDER_CONFIGURATION_ERROR", false);
  }

  if (invalidRequestResendErrorNames.has(name)) {
    return new EmailProviderError("EMAIL_PROVIDER_INVALID_REQUEST", false);
  }

  if (name === "monthly_quota_exceeded") {
    return new EmailProviderError("EMAIL_PROVIDER_REJECTED", false);
  }

  if (
    retryableResendErrorNames.has(name) ||
    (statusCode !== null && statusCode >= 500)
  ) {
    return new EmailProviderError("EMAIL_PROVIDER_TEMPORARY_FAILURE", true);
  }

  if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
    return new EmailProviderError("EMAIL_PROVIDER_REJECTED", false);
  }

  return new EmailProviderError("EMAIL_PROVIDER_UNEXPECTED_ERROR", true);
}

export function createResendEmailProvider(
  source: NodeJS.ProcessEnv = process.env,
): EmailProvider {
  const emailEnv = getEmailEnv(source);

  if (emailEnv.deliveryMode === "disabled") {
    return {
      async send(): Promise<never> {
        throw new EmailProviderError("EMAIL_PROVIDER_DISABLED", false);
      },
    };
  }

  const resend = new Resend(emailEnv.apiKey);

  return {
    async send(
      input: EmailProviderSendInput,
    ): Promise<EmailProviderSendResult> {
      validateSendInput(input);

      const deliveredRecipient = resolveEmailDeliveryRecipient({
        trpEnvironment: emailEnv.trpEnvironment,
        audience: input.audience,
        intendedRecipient: input.intendedRecipient,
        testRecipient:
          emailEnv.trpEnvironment === "local"
            ? emailEnv.testRecipient
            : undefined,
      });
      const subject = `${getTransactionalEmailSubjectPrefix(
        emailEnv.trpEnvironment,
      )}${input.subject}`;

      let response: Awaited<ReturnType<typeof resend.emails.send>>;

      try {
        response = await resend.emails.send(
          {
            from: emailEnv.from[input.locale],
            to: deliveredRecipient,
            replyTo: emailEnv.replyTo[input.locale],
            subject,
            html: input.html,
            text: input.text,
          },
          {
            idempotencyKey: input.idempotencyKey.trim(),
          },
        );
      } catch {
        throw new EmailProviderError("EMAIL_PROVIDER_TEMPORARY_FAILURE", true);
      }

      if (response.error) {
        throw mapResendError(response.error);
      }

      if (!response.data?.id) {
        throw new EmailProviderError("EMAIL_PROVIDER_UNEXPECTED_ERROR", true);
      }

      return {
        provider: "resend",
        providerMessageId: response.data.id,
        deliveryMode: emailEnv.deliveryMode,
        deliveredRecipient,
      };
    },
  };
}
