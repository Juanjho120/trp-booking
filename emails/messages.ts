import { enMessages, esMessages } from "@/messages";
import type { TransactionalEmailLocale } from "@/types/email-provider";
import type { TransactionalEmailMessages } from "@/types/email-template";

function buildTransactionalEmailMessages(
  messages: typeof esMessages | typeof enMessages,
): TransactionalEmailMessages {
  return {
    ...messages.emails,
    common: {
      ...messages.emails.common,
      checkOutTime: messages.admin.accommodations.content.fields.checkOutTime,
      flexibleCheckOut:
        messages.admin.accommodations.content.placeholders.noCheckOutTime,
    },
  };
}

const transactionalEmailMessages = {
  es: buildTransactionalEmailMessages(esMessages),
  en: buildTransactionalEmailMessages(enMessages),
} satisfies Readonly<
  Record<TransactionalEmailLocale, TransactionalEmailMessages>
>;

export function getTransactionalEmailMessages(
  locale: TransactionalEmailLocale,
): TransactionalEmailMessages {
  return transactionalEmailMessages[locale];
}
