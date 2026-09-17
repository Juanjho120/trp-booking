import React from "react";

import {
  EmailButton,
  EmailDetailRow,
  EmailEyebrow,
  EmailLayout,
  EmailParagraph,
  EmailSection,
  EmailSectionTitle,
  EmailSuccessNote,
  EmailTitle,
  renderEmailDocument,
} from "@/emails/components/email-layout";
import { buildPlainTextEmail, buildPlainTextRows } from "@/emails/email-text";
import { buildAdditionalChargePaymentRequiredEmailView } from "@/emails/additional-charge-payment-template-data";
import { getTransactionalEmailMessages } from "@/emails/messages";
import type { AdditionalChargePaymentRequiredEmailTemplateInput } from "@/types/additional-charge-email-template";
import type { TransactionalEmailContent } from "@/types/email-template";

const FOOTER_STYLE = { marginTop: 24 } as const;
const ITEM_STYLE = {
  borderTop: "1px solid #e5e7eb",
  padding: "12px 0",
} as const;

export async function buildAdditionalChargePaymentRequiredEmail(
  input: AdditionalChargePaymentRequiredEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargePaymentRequiredEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.additionalChargePaymentRequired;

  const rows = [
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.requestLabel, value: view.requestId },
    { label: copy.totalLabel, value: view.totalAmount },
    { label: copy.expiresAtLabel, value: view.expiresAt },
  ];

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.common.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={copy.preview}
    >
      <EmailEyebrow>{copy.eyebrow}</EmailEyebrow>
      <EmailTitle>{copy.title}</EmailTitle>
      <EmailParagraph>
        {messages.reservationConfirmed.greetingPrefix} {view.guestName}.
      </EmailParagraph>
      <EmailParagraph>{copy.introduction}</EmailParagraph>
      <EmailSuccessNote>{copy.pendingNotice}</EmailSuccessNote>
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {rows.map((row, index) => (
          <EmailDetailRow
            key={row.label}
            label={row.label}
            last={index === rows.length - 1}
            value={row.value}
          />
        ))}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.itemsTitle}</EmailSectionTitle>
        {view.items.map((item, index) => (
          <div
            key={`${item.category}-${index}`}
            style={{
              ...ITEM_STYLE,
              borderTop: index === 0 ? "none" : ITEM_STYLE.borderTop,
            }}
          >
            <EmailDetailRow
              label={copy.categories[item.category]}
              last={false}
              value={item.amount}
            />
            <EmailParagraph>{item.description}</EmailParagraph>
          </div>
        ))}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailButton href={view.paymentUrl}>{copy.actionLabel}</EmailButton>
        <EmailParagraph>
          {copy.actionFallback} {view.paymentUrl}
        </EmailParagraph>
      </div>
      <div style={FOOTER_STYLE}>
        <EmailParagraph>
          {copy.securityNote} {copy.supportDescription} {view.supportEmail}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const itemRows = view.items.flatMap((item) => [
    `${copy.categories[item.category]}: ${item.amount}`,
    item.description,
  ]);

  const text = buildPlainTextEmail([
    copy.title,
    `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    copy.introduction,
    copy.pendingNotice,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.itemsTitle,
    itemRows.join("\n"),
    `${copy.actionLabel}: ${view.paymentUrl}`,
    `${copy.securityNote} ${copy.supportDescription} ${view.supportEmail}`,
    messages.common.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}
