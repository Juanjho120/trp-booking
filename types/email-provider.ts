export type TransactionalEmailLocale = "es" | "en";

export type EmailProviderErrorCode =
  | "EMAIL_PROVIDER_DISABLED"
  | "EMAIL_PROVIDER_CONFIGURATION_ERROR"
  | "EMAIL_PROVIDER_INVALID_REQUEST"
  | "EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT"
  | "EMAIL_PROVIDER_RATE_LIMITED"
  | "EMAIL_PROVIDER_TEMPORARY_FAILURE"
  | "EMAIL_PROVIDER_REJECTED"
  | "EMAIL_PROVIDER_UNEXPECTED_ERROR";

export type EmailProviderSendInput = Readonly<{
  intendedRecipient: string;
  locale: TransactionalEmailLocale;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}>;

export type EmailProviderSendResult = Readonly<{
  provider: "resend";
  providerMessageId: string;
  deliveryMode: "test" | "production";
  deliveredRecipient: string;
}>;

export interface EmailProvider {
  send(input: EmailProviderSendInput): Promise<EmailProviderSendResult>;
}
