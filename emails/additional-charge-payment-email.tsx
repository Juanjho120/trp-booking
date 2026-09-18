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
import {
  buildAdditionalChargeAdminPaymentApprovedEmailView,
  buildAdditionalChargeAdminPaymentRequiredEmailView,
  buildAdditionalChargeAdminRefundProcessedEmailView,
  buildAdditionalChargePaymentApprovedEmailView,
  buildAdditionalChargePaymentRequiredEmailView,
  buildAdditionalChargeRefundProcessedEmailView,
} from "@/emails/additional-charge-payment-template-data";
import { getTransactionalEmailMessages } from "@/emails/messages";
import type {
  AdditionalChargeAdminPaymentApprovedEmailTemplateInput,
  AdditionalChargeAdminPaymentRequiredEmailTemplateInput,
  AdditionalChargeAdminRefundProcessedEmailTemplateInput,
  AdditionalChargePaymentApprovedEmailTemplateInput,
  AdditionalChargePaymentRequiredEmailTemplateInput,
  AdditionalChargeRefundProcessedEmailTemplateInput,
} from "@/types/additional-charge-email-template";
import type { AdditionalChargeCategory } from "@/types/additional-charge";
import type { TransactionalEmailContent } from "@/types/email-template";

const FOOTER_STYLE = { marginTop: 24 } as const;
const ITEM_STYLE = {
  borderTop: "1px solid #e5e7eb",
  padding: "12px 0",
} as const;

type DetailRow = Readonly<{
  label: string;
  value: string | null | undefined;
}>;
type VisibleDetailRow = Readonly<{
  label: string;
  value: string;
}>;

type ChargeItemView = Readonly<{
  category: AdditionalChargeCategory;
  description: string;
  amount: string;
  status: string | null;
}>;

function nonEmptyRows(rows: readonly DetailRow[]): VisibleDetailRow[] {
  return rows.flatMap((row) =>
    row.value === null || row.value === undefined
      ? []
      : [{ label: row.label, value: row.value }],
  );
}

function renderRows(rows: readonly DetailRow[]) {
  const visibleRows = nonEmptyRows(rows);

  return visibleRows.map((row, index) => (
    <EmailDetailRow
      key={row.label}
      label={row.label}
      last={index === visibleRows.length - 1}
      value={row.value ?? ""}
    />
  ));
}

function chargePlainTextRows(
  items: readonly ChargeItemView[],
  categories: Readonly<Record<AdditionalChargeCategory, string>>,
): string[] {
  return items.flatMap((item) => [
    `${categories[item.category]}: ${item.amount}`,
    item.status ? `${item.description} (${item.status})` : item.description,
  ]);
}

function renderChargeItems(
  items: readonly ChargeItemView[],
  categories: Readonly<Record<AdditionalChargeCategory, string>>,
  statusLabel?: string,
) {
  return items.map((item, index) => (
    <div
      key={`${item.category}-${index}`}
      style={{
        ...ITEM_STYLE,
        borderTop: index === 0 ? "none" : ITEM_STYLE.borderTop,
      }}
      >
        <EmailDetailRow
          label={categories[item.category]}
          last={!(item.status && statusLabel)}
          value={item.amount}
        />
      {item.status && statusLabel ? (
        <EmailDetailRow label={statusLabel} last value={item.status} />
      ) : null}
      <EmailParagraph>{item.description}</EmailParagraph>
    </div>
  ));
}

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
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.itemsTitle}</EmailSectionTitle>
        {renderChargeItems(view.items, copy.categories)}
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

  const text = buildPlainTextEmail([
    copy.title,
    `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    copy.introduction,
    copy.pendingNotice,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.itemsTitle,
    chargePlainTextRows(view.items, copy.categories).join("\n"),
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

export async function buildAdditionalChargeAdminPaymentRequiredEmail(
  input: AdditionalChargeAdminPaymentRequiredEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargeAdminPaymentRequiredEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.adminAdditionalChargePaymentRequired;
  const categories = messages.additionalChargePaymentRequired.categories;

  const rows = nonEmptyRows([
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.guestName, value: view.guestName },
    { label: messages.common.guestEmail, value: view.guestEmail },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.requestLabel, value: view.requestId },
    { label: copy.statusLabel, value: view.requestStatus },
    { label: copy.createdAtLabel, value: view.createdAt },
    { label: copy.expiresAtLabel, value: view.expiresAt },
    { label: copy.intendedRecipientLabel, value: view.intendedGuestRecipient },
    { label: copy.createdByLabel, value: view.createdByAdmin },
    { label: copy.totalLabel, value: view.totalAmount },
  ]);

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={copy.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={copy.preview}
    >
      <EmailEyebrow>{copy.eyebrow}</EmailEyebrow>
      <EmailTitle>{copy.title}</EmailTitle>
      <EmailParagraph>{copy.introduction}</EmailParagraph>
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.itemsTitle}</EmailSectionTitle>
        {renderChargeItems(view.items, categories)}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailButton href={view.adminReservationUrl}>
          {copy.actionLabel}
        </EmailButton>
        <EmailParagraph>
          {copy.actionFallback} {view.adminReservationUrl}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    copy.title,
    copy.introduction,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.itemsTitle,
    chargePlainTextRows(view.items, categories).join("\n"),
    `${copy.actionLabel}: ${view.adminReservationUrl}`,
    copy.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}

export async function buildAdditionalChargePaymentApprovedEmail(
  input: AdditionalChargePaymentApprovedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargePaymentApprovedEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.additionalChargePaymentApproved;
  const categories = messages.additionalChargePaymentRequired.categories;
  const rows = [
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.paidAtLabel, value: view.paidAt },
    { label: copy.totalLabel, value: view.totalAmount },
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
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.itemsTitle}</EmailSectionTitle>
        {renderChargeItems(view.items, categories)}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailParagraph>
          {copy.supportDescription} {view.supportEmail}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    copy.title,
    `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    copy.introduction,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.itemsTitle,
    chargePlainTextRows(view.items, categories).join("\n"),
    `${copy.supportDescription} ${view.supportEmail}`,
    messages.common.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}

export async function buildAdditionalChargeAdminPaymentApprovedEmail(
  input: AdditionalChargeAdminPaymentApprovedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargeAdminPaymentApprovedEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.adminAdditionalChargePaymentApproved;
  const categories = messages.additionalChargePaymentRequired.categories;
  const rows = nonEmptyRows([
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.guestName, value: view.guestName },
    { label: messages.common.guestEmail, value: view.guestEmail },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.requestLabel, value: view.requestId },
    { label: copy.requestStatusLabel, value: view.requestStatus },
    { label: copy.paymentLabel, value: view.paymentId },
    { label: copy.paymentStatusLabel, value: view.paymentStatus },
    { label: copy.providerReferenceLabel, value: view.providerReference },
    { label: copy.paidAtLabel, value: view.paidAt },
    { label: copy.totalLabel, value: view.totalAmount },
  ]);

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={copy.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={copy.preview}
    >
      <EmailEyebrow>{copy.eyebrow}</EmailEyebrow>
      <EmailTitle>{copy.title}</EmailTitle>
      <EmailParagraph>{copy.introduction}</EmailParagraph>
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.itemsTitle}</EmailSectionTitle>
        {renderChargeItems(view.items, categories, copy.chargeStatusLabel)}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailButton href={view.adminReservationUrl}>
          {copy.actionLabel}
        </EmailButton>
        <EmailParagraph>
          {copy.actionFallback} {view.adminReservationUrl}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    copy.title,
    copy.introduction,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.itemsTitle,
    chargePlainTextRows(view.items, categories).join("\n"),
    `${copy.actionLabel}: ${view.adminReservationUrl}`,
    copy.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}

export async function buildAdditionalChargeRefundProcessedEmail(
  input: AdditionalChargeRefundProcessedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargeRefundProcessedEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.additionalChargeRefundProcessed;
  const categories = messages.additionalChargePaymentRequired.categories;
  const rows = [
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.refundLabel, value: view.refundId },
    { label: copy.approvedAtLabel, value: view.approvedAt },
    { label: copy.totalLabel, value: view.totalAmount },
  ];

  const allocationText = view.allocations.flatMap((allocation) => [
    `${categories[allocation.category]}: ${allocation.allocatedAmount}`,
    allocation.description,
    `${copy.originalAmountLabel}: ${allocation.originalAmount}`,
    allocation.remainingAmount
      ? `${copy.remainingAmountLabel}: ${allocation.remainingAmount}`
      : "",
    allocation.resultingStatus
      ? `${copy.resultingStatusLabel}: ${allocation.resultingStatus}`
      : "",
  ]).filter(Boolean);

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
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.allocationsTitle}</EmailSectionTitle>
        {view.allocations.map((allocation, index) => (
          <div
            key={`${allocation.category}-${index}`}
            style={{
              ...ITEM_STYLE,
              borderTop: index === 0 ? "none" : ITEM_STYLE.borderTop,
            }}
          >
            <EmailDetailRow
              label={categories[allocation.category]}
              value={allocation.allocatedAmount}
            />
            <EmailDetailRow
              label={copy.originalAmountLabel}
              value={allocation.originalAmount}
            />
            {allocation.remainingAmount ? (
              <EmailDetailRow
                label={copy.remainingAmountLabel}
                value={allocation.remainingAmount}
              />
            ) : null}
            {allocation.resultingStatus ? (
              <EmailDetailRow
                label={copy.resultingStatusLabel}
                last
                value={allocation.resultingStatus}
              />
            ) : null}
            <EmailParagraph>{allocation.description}</EmailParagraph>
          </div>
        ))}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailParagraph>
          {copy.supportDescription} {view.supportEmail}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    copy.title,
    `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    copy.introduction,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.allocationsTitle,
    allocationText.join("\n"),
    `${copy.supportDescription} ${view.supportEmail}`,
    messages.common.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}

export async function buildAdditionalChargeAdminRefundProcessedEmail(
  input: AdditionalChargeAdminRefundProcessedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdditionalChargeAdminRefundProcessedEmailView(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const copy = messages.adminAdditionalChargeRefundProcessed;
  const categories = messages.additionalChargePaymentRequired.categories;
  const rows = nonEmptyRows([
    { label: messages.common.reservationReference, value: view.reservationId },
    { label: messages.common.guestName, value: view.guestName },
    { label: messages.common.guestEmail, value: view.guestEmail },
    { label: messages.common.accommodation, value: view.propertyName },
    { label: copy.refundLabel, value: view.refundId },
    { label: copy.requestLabel, value: view.guestPaymentRequestId },
    { label: copy.paymentLabel, value: view.paymentId },
    { label: copy.paymentStatusLabel, value: view.paymentStatus },
    { label: copy.processingModeLabel, value: view.processingMode },
    { label: copy.providerReferenceLabel, value: view.providerRefundId },
    { label: copy.reasonLabel, value: view.reason },
    { label: copy.requestedByLabel, value: view.requestedByAdmin },
    { label: copy.approvedAtLabel, value: view.approvedAt },
    { label: copy.totalLabel, value: view.totalAmount },
  ]);

  const allocationText = view.allocations.flatMap((allocation) => [
    `${copy.chargeLabel}: ${allocation.additionalChargeId ?? ""}`,
    `${categories[allocation.category]}: ${allocation.description}`,
    `${copy.originalAmountLabel}: ${allocation.originalAmount}`,
    `${copy.refundedAmountLabel}: ${allocation.allocatedAmount}`,
    allocation.cumulativeRefundedAmount
      ? `${copy.cumulativeRefundedLabel}: ${allocation.cumulativeRefundedAmount}`
      : "",
    allocation.remainingAmount
      ? `${copy.remainingAmountLabel}: ${allocation.remainingAmount}`
      : "",
    allocation.resultingStatus
      ? `${copy.resultingStatusLabel}: ${allocation.resultingStatus}`
      : "",
  ]).filter(Boolean);

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={copy.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={copy.preview}
    >
      <EmailEyebrow>{copy.eyebrow}</EmailEyebrow>
      <EmailTitle>{copy.title}</EmailTitle>
      <EmailParagraph>{copy.introduction}</EmailParagraph>
      <EmailSection>
        <EmailSectionTitle>{copy.summaryTitle}</EmailSectionTitle>
        {renderRows(rows)}
      </EmailSection>
      <EmailSection>
        <EmailSectionTitle>{copy.allocationsTitle}</EmailSectionTitle>
        {view.allocations.map((allocation, index) => (
          <div
            key={`${allocation.additionalChargeId ?? allocation.category}-${index}`}
            style={{
              ...ITEM_STYLE,
              borderTop: index === 0 ? "none" : ITEM_STYLE.borderTop,
            }}
          >
            {allocation.additionalChargeId ? (
              <EmailDetailRow
                label={copy.chargeLabel}
                value={allocation.additionalChargeId}
              />
            ) : null}
            <EmailDetailRow
              label={categories[allocation.category]}
              value={allocation.description}
            />
            <EmailDetailRow
              label={copy.originalAmountLabel}
              value={allocation.originalAmount}
            />
            <EmailDetailRow
              label={copy.refundedAmountLabel}
              value={allocation.allocatedAmount}
            />
            {allocation.cumulativeRefundedAmount ? (
              <EmailDetailRow
                label={copy.cumulativeRefundedLabel}
                value={allocation.cumulativeRefundedAmount}
              />
            ) : null}
            {allocation.remainingAmount ? (
              <EmailDetailRow
                label={copy.remainingAmountLabel}
                value={allocation.remainingAmount}
              />
            ) : null}
            {allocation.resultingStatus ? (
              <EmailDetailRow
                label={copy.resultingStatusLabel}
                last
                value={allocation.resultingStatus}
              />
            ) : null}
          </div>
        ))}
      </EmailSection>
      <div style={FOOTER_STYLE}>
        <EmailButton href={view.adminReservationUrl}>
          {copy.actionLabel}
        </EmailButton>
        <EmailParagraph>
          {copy.actionFallback} {view.adminReservationUrl}
        </EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    copy.title,
    copy.introduction,
    copy.summaryTitle,
    buildPlainTextRows(rows),
    copy.allocationsTitle,
    allocationText.join("\n"),
    `${copy.actionLabel}: ${view.adminReservationUrl}`,
    copy.footer,
  ]);

  return {
    subject: `${copy.subjectPrefix} · ${view.propertyName}`,
    html,
    text,
  };
}
