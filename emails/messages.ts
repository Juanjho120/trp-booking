import { enMessages, esMessages } from "@/messages";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type { TransactionalEmailMessages } from "@/types/email-template";

const transactionalEmailMessages = {
  es: esMessages.emails,
  en: enMessages.emails,
} satisfies Readonly<
  Record<TransactionalEmailLocale, TransactionalEmailMessages>
>;

export function getTransactionalEmailMessages(
  locale: TransactionalEmailLocale,
): TransactionalEmailMessages {
  return transactionalEmailMessages[locale];
}
