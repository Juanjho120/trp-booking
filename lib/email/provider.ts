import type { EmailProviderErrorCode } from "@/types/email-provider";

const SAFE_PROVIDER_ERROR_MESSAGES: Readonly<
  Record<EmailProviderErrorCode, string>
> = {
  EMAIL_PROVIDER_DISABLED: "Email delivery is disabled.",
  EMAIL_PROVIDER_CONFIGURATION_ERROR:
    "Email provider configuration is invalid.",
  EMAIL_PROVIDER_INVALID_REQUEST: "The email request is invalid.",
  EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT:
    "The email idempotency request conflicts with a previous request.",
  EMAIL_PROVIDER_RATE_LIMITED: "The email provider rate limit was reached.",
  EMAIL_PROVIDER_TEMPORARY_FAILURE:
    "The email provider is temporarily unavailable.",
  EMAIL_PROVIDER_REJECTED: "The email provider rejected the request.",
  EMAIL_PROVIDER_UNEXPECTED_ERROR:
    "The email provider returned an unexpected error.",
};

export class EmailProviderError extends Error {
  readonly code: EmailProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: EmailProviderErrorCode, retryable: boolean) {
    super(SAFE_PROVIDER_ERROR_MESSAGES[code]);
    this.name = "EmailProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}
