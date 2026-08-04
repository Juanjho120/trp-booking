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
  buildAdminLifecycleAdjustmentPaymentDeliveryStatusEmailView,
  buildLifecycleAdjustmentPaymentRequiredEmailView,
} from "@/emails/lifecycle-adjustment-payment-template-data";
import { getLifecycleEmailMessages } from "@/emails/lifecycle-messages";
import type { TransactionalEmailContent } from "@/types/email-template";
import type {
  AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
  LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
} from "@/types/lifecycle-email-template";

const FOOTER_STYLE = { marginTop: 24 } as const;
type Row = Readonly<{ label: string; value: string }>;

async function renderDocument(input: Readonly<{
  locale: "es" | "en";
  subject: string;
  preview: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  introduction: string;
  note: string;
  noteTone?: "success" | "neutral";
  brandName: string;
  logoUrl: string;
  publicHomeUrl: string;
  footer: string;
  sectionTitle: string;
  rows: readonly Row[];
  actionUrl?: string;
  actionLabel?: string;
  actionFallback?: string;
  closing?: string;
}>): Promise<TransactionalEmailContent> {
  const html = await renderEmailDocument(
    <EmailLayout
      brandName={input.brandName}
      brandUrl={input.publicHomeUrl}
      footerText={input.footer}
      locale={input.locale}
      logoUrl={input.logoUrl}
      previewText={input.preview}
    >
      <EmailEyebrow>{input.eyebrow}</EmailEyebrow>
      <EmailTitle>{input.title}</EmailTitle>
      {input.greeting ? <EmailParagraph>{input.greeting}</EmailParagraph> : null}
      <EmailParagraph>{input.introduction}</EmailParagraph>
      {input.noteTone === "neutral" ? (
        <EmailParagraph>{input.note}</EmailParagraph>
      ) : (
        <EmailSuccessNote>{input.note}</EmailSuccessNote>
      )}
      <EmailSection>
        <EmailSectionTitle>{input.sectionTitle}</EmailSectionTitle>
        {input.rows.map((row, index) => (
          <EmailDetailRow
            key={`${row.label}-${index}`}
            label={row.label}
            last={index === input.rows.length - 1}
            value={row.value}
          />
        ))}
      </EmailSection>
      {input.actionUrl && input.actionLabel ? (
        <div style={FOOTER_STYLE}>
          <EmailButton href={input.actionUrl}>{input.actionLabel}</EmailButton>
          {input.actionFallback ? (
            <EmailParagraph>
              {input.actionFallback} {input.actionUrl}
            </EmailParagraph>
          ) : null}
        </div>
      ) : null}
      {input.closing ? (
        <div style={FOOTER_STYLE}>
          <EmailParagraph>{input.closing}</EmailParagraph>
        </div>
      ) : null}
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    input.title,
    input.greeting,
    input.introduction,
    input.note,
    input.sectionTitle,
    buildPlainTextRows(input.rows),
    input.actionUrl && input.actionLabel
      ? `${input.actionLabel}: ${input.actionUrl}`
      : null,
    input.closing,
    input.footer,
  ]);

  return { subject: input.subject, html, text };
}

async function buildGuestPaymentRequiredEmail(
  input: LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildLifecycleAdjustmentPaymentRequiredEmailView(input);
  const messages = getLifecycleEmailMessages(view.locale);
  const copy = messages.lifecycleAdjustmentPayment.guest;
  const isDateChange = view.requestType === "DATE_CHANGE";
  const title = isDateChange ? copy.dateChangeTitle : copy.stayExtensionTitle;
  const subjectPrefix = isDateChange
    ? copy.dateChangeSubjectPrefix
    : copy.stayExtensionSubjectPrefix;

  return renderDocument({
    locale: view.locale,
    subject: `${subjectPrefix} · ${view.propertyName}`,
    preview: copy.preview,
    eyebrow: copy.eyebrow,
    title,
    greeting: `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    introduction: copy.introduction,
    note: copy.pendingNotice,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footer: messages.common.footer,
    sectionTitle: copy.summaryTitle,
    rows: [
      { label: messages.common.reservationReference, value: view.reservationId },
      { label: messages.common.accommodation, value: view.propertyName },
      { label: messages.dateMutation.labels.originalStay, value: `${view.originalCheckInDate} — ${view.originalCheckOutDate}` },
      { label: messages.dateMutation.labels.requestedStay, value: `${view.requestedCheckInDate} — ${view.requestedCheckOutDate}` },
      { label: copy.amountLabel, value: view.amount },
      { label: copy.holdExpiresAtLabel, value: view.holdExpiresAt },
    ],
    actionUrl: view.paymentUrl,
    actionLabel: copy.actionLabel,
    actionFallback: copy.actionFallback,
    closing: `${copy.securityNote} ${copy.supportDescription} ${view.supportEmail}`,
  });
}

export function buildDateChangePaymentRequiredEmail(
  input: LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  return buildGuestPaymentRequiredEmail(input);
}

export function buildStayExtensionPaymentRequiredEmail(
  input: LifecycleAdjustmentPaymentRequiredEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  return buildGuestPaymentRequiredEmail(input);
}

async function buildAdminDeliveryStatusEmail(
  input: AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdminLifecycleAdjustmentPaymentDeliveryStatusEmailView(input);
  const messages = getLifecycleEmailMessages(view.locale);
  const copy = messages.lifecycleAdjustmentPayment.adminStatus;
  const sent = view.outcome === "SENT";
  const requestLabel = messages.dateMutation.requestTypes[view.requestType];

  return renderDocument({
    locale: view.locale,
    subject: `${sent ? copy.sentSubjectPrefix : copy.failedSubjectPrefix} · ${view.reservationId}`,
    preview: sent ? copy.sentIntroduction : copy.failedIntroduction,
    eyebrow: messages.adminBrandLabel,
    title: sent ? copy.sentTitle : copy.failedTitle,
    introduction: sent ? copy.sentIntroduction : copy.failedIntroduction,
    note: sent ? copy.sentNote : copy.failedNote,
    noteTone: sent ? "success" : "neutral",
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footer: messages.adminNewReservation.footer,
    sectionTitle: copy.sourceTitle,
    rows: [
      { label: messages.common.reservationReference, value: view.reservationId },
      { label: messages.common.guestName, value: view.guestName },
      { label: copy.requestTypeLabel, value: requestLabel },
      { label: copy.guestRecipientLabel, value: view.intendedGuestRecipient },
      { label: copy.sourceNotificationLabel, value: view.sourceNotificationId },
      { label: copy.attemptsLabel, value: String(view.attemptCount) },
      { label: copy.observedAtLabel, value: view.observedAt },
      ...(view.errorCode
        ? [{ label: copy.errorCodeLabel, value: view.errorCode }]
        : []),
    ],
    actionUrl: view.adminReservationUrl,
    actionLabel: messages.adminNewReservation.actionLabel,
    actionFallback: messages.adminNewReservation.actionFallback,
  });
}

export function buildAdminDateChangePaymentLinkDeliveryStatusEmail(
  input: AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  return buildAdminDeliveryStatusEmail(input);
}

export function buildAdminStayExtensionPaymentLinkDeliveryStatusEmail(
  input: AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  return buildAdminDeliveryStatusEmail(input);
}
