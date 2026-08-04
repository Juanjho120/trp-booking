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
import { getLifecycleEmailMessages } from "@/emails/lifecycle-messages";
import {
  buildRefundProcessedEmailView,
  buildReservationCancelledEmailView,
  buildReservationDatesUpdatedEmailView,
  buildStayExtensionConfirmedEmailView,
} from "@/emails/lifecycle-template-data";
import { EmailTemplateDataError } from "@/emails/template-data";
import type { TransactionalEmailContent } from "@/types/email-template";
import type {
  RefundProcessedEmailTemplateInput,
  ReservationCancelledEmailTemplateInput,
  ReservationDatesUpdatedEmailTemplateInput,
  StayExtensionConfirmedEmailTemplateInput,
} from "@/types/lifecycle-email-template";

const ADMIN_FOOTER_STYLE = { marginTop: 24 } as const;

type DetailRow = Readonly<{ label: string; value: string }>;
type DetailSection = Readonly<{
  title: string;
  rows: readonly DetailRow[];
  paragraph?: string | null;
}>;
type LifecycleEmailDocument = Readonly<{
  locale: "es" | "en";
  subject: string;
  previewText: string;
  eyebrow: string;
  title: string;
  introduction: string;
  successNote: string;
  greeting?: string;
  brandName: string;
  logoUrl: string;
  publicHomeUrl: string;
  footerText: string;
  sections: readonly DetailSection[];
  supportDescription?: string;
  supportEmail?: string;
  closing?: string;
  adminReservationUrl?: string;
  adminActionLabel?: string;
  adminActionFallback?: string;
}>;

function removeEmptyRows(rows: readonly (DetailRow | null)[]): DetailRow[] {
  return rows.filter((row): row is DetailRow => Boolean(row?.value.trim()));
}

async function buildLifecycleEmailDocument(
  document: LifecycleEmailDocument,
): Promise<TransactionalEmailContent> {
  const html = await renderEmailDocument(
    <EmailLayout
      brandName={document.brandName}
      brandUrl={document.publicHomeUrl}
      footerText={document.footerText}
      locale={document.locale}
      logoUrl={document.logoUrl}
      previewText={document.previewText}
    >
      <EmailEyebrow>{document.eyebrow}</EmailEyebrow>
      <EmailTitle>{document.title}</EmailTitle>
      {document.greeting ? (
        <EmailParagraph>{document.greeting}</EmailParagraph>
      ) : null}
      <EmailParagraph>{document.introduction}</EmailParagraph>
      <EmailSuccessNote>{document.successNote}</EmailSuccessNote>

      {document.sections.map((section) => (
        <EmailSection key={section.title}>
          <EmailSectionTitle>{section.title}</EmailSectionTitle>
          {section.paragraph ? (
            <EmailParagraph>{section.paragraph}</EmailParagraph>
          ) : null}
          {section.rows.map((row, index) => (
            <EmailDetailRow
              key={`${section.title}-${row.label}-${index}`}
              label={row.label}
              last={index === section.rows.length - 1}
              value={row.value}
            />
          ))}
        </EmailSection>
      ))}

      {document.adminReservationUrl && document.adminActionLabel ? (
        <div style={ADMIN_FOOTER_STYLE}>
          <EmailButton href={document.adminReservationUrl}>
            {document.adminActionLabel}
          </EmailButton>
          {document.adminActionFallback ? (
            <EmailParagraph>
              {document.adminActionFallback} {document.adminReservationUrl}
            </EmailParagraph>
          ) : null}
        </div>
      ) : null}

      {document.supportDescription && document.supportEmail ? (
        <div style={ADMIN_FOOTER_STYLE}>
          <EmailParagraph>
            {document.supportDescription}{" "}
            <a
              href={`mailto:${document.supportEmail}`}
              style={{ color: "#171717", fontWeight: 700 }}
            >
              {document.supportEmail}
            </a>
          </EmailParagraph>
          {document.closing ? (
            <EmailParagraph>{document.closing}</EmailParagraph>
          ) : null}
        </div>
      ) : null}
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    document.title,
    document.greeting,
    document.introduction,
    document.successNote,
    ...document.sections.map((section) =>
      buildPlainTextEmail([
        section.title,
        section.paragraph,
        buildPlainTextRows(section.rows),
      ]).trim(),
    ),
    document.adminReservationUrl && document.adminActionLabel
      ? `${document.adminActionLabel}: ${document.adminReservationUrl}`
      : null,
    document.supportEmail
      ? `${document.supportDescription}: ${document.supportEmail}`
      : null,
    document.closing,
    document.footerText,
  ]);

  return { subject: document.subject, html, text };
}

function requireGuestLocale(view: Readonly<{ locale: "es" | "en"; guestPreferredLocale: "es" | "en" }>) {
  if (view.locale !== view.guestPreferredLocale) throw new EmailTemplateDataError();
}

function getAdminSubject(prefix: string, adminBrandLabel: string, reservationId: string): string {
  return `${adminBrandLabel} · ${prefix} · ${reservationId}`;
}

function formatAddedNights(
  value: number,
  singular: string,
  plural: string,
): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export async function buildReservationCancelledEmail(
  input: ReservationCancelledEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildReservationCancelledEmailView(input);
  requireGuestLocale(view);
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.RESERVATION_CANCELLED;
  const policyReason = messages.cancellation.policyReasons[view.policyReasonCode];

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: `${typeLabel} · ${view.propertyName}`,
    previewText: messages.cancellation.success.cancelled,
    eyebrow: typeLabel,
    title: typeLabel,
    introduction: typeLabel,
    successNote: view.refundExpected
      ? messages.refunds.success.authorized
      : messages.cancellation.success.cancelled,
    greeting: `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.common.footer,
    sections: [
      {
        title: messages.cancellation.labels.request,
        rows: [
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.checkInDate },
          { label: messages.common.checkOut, value: view.checkOutDate },
          { label: messages.cancellation.labels.decidedAt, value: view.cancelledAt },
        ],
      },
      {
        title: messages.cancellation.labels.policyOutcome,
        paragraph: messages.cancellation.notes.policyCalculation,
        rows: [
          { label: messages.cancellation.labels.policyOutcome, value: policyReason },
          {
            label: messages.cancellation.labels.standardRefund,
            value: `${view.refundPercentage}% · ${view.refundAmount}`,
          },
        ],
      },
    ],
    supportDescription: messages.reservationConfirmed.supportDescription,
    supportEmail: view.supportEmail,
    closing: messages.reservationConfirmed.closing,
  });
}

export async function buildAdminReservationCancelledEmail(
  input: ReservationCancelledEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildReservationCancelledEmailView(input);
  if (!view.admin) throw new EmailTemplateDataError();
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.RESERVATION_CANCELLED;
  const policyReason = messages.cancellation.policyReasons[view.policyReasonCode];

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: getAdminSubject(typeLabel, messages.adminBrandLabel, view.reservationId),
    previewText: messages.cancellation.description,
    eyebrow: messages.adminBrandLabel,
    title: typeLabel,
    introduction: messages.cancellation.description,
    successNote: messages.cancellation.notes.availabilityRelease,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.adminNewReservation.footer,
    sections: [
      {
        title: messages.cancellation.labels.request,
        rows: removeEmptyRows([
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.guestName, value: view.guestName },
          { label: messages.common.guestEmail, value: view.guestEmail },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.checkInDate },
          { label: messages.common.checkOut, value: view.checkOutDate },
          {
            label: messages.cancellation.labels.channel,
            value: messages.cancellation.channels[view.admin.channel],
          },
          view.admin.requestNote
            ? { label: messages.cancellation.labels.requestReason, value: view.admin.requestNote }
            : null,
          view.admin.createdByAdminName
            ? { label: messages.cancellation.labels.createdBy, value: view.admin.createdByAdminName }
            : null,
          view.admin.reviewedByAdminName
            ? { label: messages.cancellation.labels.reviewedBy, value: view.admin.reviewedByAdminName }
            : null,
          view.admin.decisionNote
            ? { label: messages.cancellation.labels.decisionNote, value: view.admin.decisionNote }
            : null,
          { label: messages.cancellation.labels.decidedAt, value: view.cancelledAt },
        ]),
      },
      {
        title: messages.cancellation.labels.policyOutcome,
        rows: [
          { label: messages.cancellation.labels.policyOutcome, value: policyReason },
          {
            label: messages.cancellation.labels.standardRefund,
            value: `${view.refundPercentage}% · ${view.refundAmount}`,
          },
        ],
      },
    ],
    adminReservationUrl: view.adminReservationUrl,
    adminActionLabel: messages.adminNewReservation.actionLabel,
    adminActionFallback: messages.adminNewReservation.actionFallback,
  });
}

export async function buildReservationDatesUpdatedEmail(
  input: ReservationDatesUpdatedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildReservationDatesUpdatedEmailView(input);
  requireGuestLocale(view);
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.RESERVATION_DATES_UPDATED;
  const completionDescription =
    view.financialBranch === "ZERO"
      ? messages.lifecycleAdjustment.completedZeroDescription
      : view.financialBranch === "NEGATIVE"
        ? messages.lifecycleAdjustment.completedNegativeDescription
        : messages.lifecycleAdjustment.completedDescription;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: `${typeLabel} · ${view.propertyName}`,
    previewText: completionDescription,
    eyebrow: typeLabel,
    title: messages.lifecycleAdjustment.completedTitle,
    introduction: completionDescription,
    successNote: messages.lifecycleAdjustment.completedNote,
    greeting: `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.common.footer,
    sections: [
      {
        title: messages.dateMutation.labels.originalStay,
        rows: [
          { label: messages.common.checkIn, value: view.originalCheckInDate },
          { label: messages.common.checkOut, value: view.originalCheckOutDate },
          { label: messages.common.total, value: view.originalTotal },
        ],
      },
      {
        title: messages.dateMutation.labels.requestedStay,
        rows: removeEmptyRows([
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.requestedCheckInDate },
          { label: messages.common.checkOut, value: view.requestedCheckOutDate },
          { label: messages.common.total, value: view.requestedTotal },
          {
            label: messages.dateMutation.labels.financialDifference,
            value: view.financialDifference,
          },
          view.refundAmount
            ? { label: messages.refunds.labels.amount, value: view.refundAmount }
            : null,
        ]),
        paragraph:
          view.refundStatus && view.refundStatus !== "APPROVED"
            ? messages.refunds.success.authorized
            : null,
      },
    ],
    supportDescription: messages.reservationConfirmed.supportDescription,
    supportEmail: view.supportEmail,
    closing: messages.reservationConfirmed.closing,
  });
}

export async function buildAdminReservationDatesUpdatedEmail(
  input: ReservationDatesUpdatedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildReservationDatesUpdatedEmailView(input);
  if (!view.admin) throw new EmailTemplateDataError();
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.RESERVATION_DATES_UPDATED;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: getAdminSubject(typeLabel, messages.adminBrandLabel, view.reservationId),
    previewText: messages.dateMutation.description,
    eyebrow: messages.adminBrandLabel,
    title: typeLabel,
    introduction: messages.dateMutation.description,
    successNote: messages.lifecycleAdjustment.completedNote,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.adminNewReservation.footer,
    sections: [
      {
        title: messages.dateMutation.labels.originalStay,
        rows: [
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.guestName, value: view.guestName },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.originalCheckInDate },
          { label: messages.common.checkOut, value: view.originalCheckOutDate },
          { label: messages.common.total, value: view.originalTotal },
        ],
      },
      {
        title: messages.dateMutation.labels.requestedStay,
        rows: removeEmptyRows([
          { label: messages.common.checkIn, value: view.requestedCheckInDate },
          { label: messages.common.checkOut, value: view.requestedCheckOutDate },
          { label: messages.common.total, value: view.requestedTotal },
          { label: messages.dateMutation.labels.financialDifference, value: view.financialDifference },
          view.adjustmentPaymentStatus
            ? {
                label: messages.refunds.labels.paymentStatus,
                value: messages.paymentStatuses[view.adjustmentPaymentStatus],
              }
            : null,
          view.refundStatus
            ? { label: messages.notifications.labels.status, value: messages.refunds.statuses[view.refundStatus] }
            : null,
          view.refundAmount
            ? { label: messages.refunds.labels.amount, value: view.refundAmount }
            : null,
          { label: messages.cancellation.labels.decidedAt, value: view.completedAt },
        ]),
      },
      {
        title: messages.cancellation.labels.request,
        rows: removeEmptyRows([
          {
            label: messages.dateMutation.labels.channel,
            value: messages.dateMutation.channels[view.admin.channel],
          },
          view.admin.requestNote
            ? { label: messages.dateMutation.labels.requestReason, value: view.admin.requestNote }
            : null,
          view.admin.createdByAdminName
            ? { label: messages.dateMutation.labels.createdBy, value: view.admin.createdByAdminName }
            : null,
          view.admin.reviewedByAdminName
            ? { label: messages.cancellation.labels.reviewedBy, value: view.admin.reviewedByAdminName }
            : null,
          view.admin.decisionNote
            ? { label: messages.dateMutation.labels.decisionNote, value: view.admin.decisionNote }
            : null,
        ]),
      },
    ],
    adminReservationUrl: view.adminReservationUrl,
    adminActionLabel: messages.adminNewReservation.actionLabel,
    adminActionFallback: messages.adminNewReservation.actionFallback,
  });
}

export async function buildStayExtensionConfirmedEmail(
  input: StayExtensionConfirmedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildStayExtensionConfirmedEmailView(input);
  requireGuestLocale(view);
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.STAY_EXTENSION_CONFIRMED;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: `${typeLabel} · ${view.propertyName}`,
    previewText: messages.lifecycleAdjustment.completedDescription,
    eyebrow: typeLabel,
    title: typeLabel,
    introduction: messages.lifecycleAdjustment.completedDescription,
    successNote: messages.lifecycleAdjustment.completedNote,
    greeting: `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.common.footer,
    sections: [
      {
        title: messages.dateMutation.requestTypes.STAY_EXTENSION,
        rows: [
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.checkInDate },
          { label: messages.dateMutation.labels.originalStay, value: view.originalCheckOutDate },
          { label: messages.dateMutation.labels.requestedStay, value: view.requestedCheckOutDate },
          {
            label: messages.common.nights,
            value: formatAddedNights(
              view.addedNights,
              messages.common.nightSingular,
              messages.common.nightPlural,
            ),
          },
          { label: messages.dateMutation.labels.financialDifference, value: view.additionalAmount },
          { label: messages.common.total, value: view.requestedTotal },
        ],
      },
    ],
    supportDescription: messages.reservationConfirmed.supportDescription,
    supportEmail: view.supportEmail,
    closing: messages.reservationConfirmed.closing,
  });
}

export async function buildAdminStayExtensionConfirmedEmail(
  input: StayExtensionConfirmedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildStayExtensionConfirmedEmailView(input);
  if (!view.admin) throw new EmailTemplateDataError();
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.STAY_EXTENSION_CONFIRMED;
  const holdStatus = view.holdStatus
    ? view.holdStatus === "ACTIVE"
      ? messages.dateMutation.statuses.AWAITING_ADJUSTMENT_PAYMENT
      : view.holdStatus === "EXPIRED"
        ? messages.dateMutation.statuses.EXPIRED
        : messages.dateMutation.statuses.COMPLETED
    : null;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: getAdminSubject(typeLabel, messages.adminBrandLabel, view.reservationId),
    previewText: messages.dateMutation.description,
    eyebrow: messages.adminBrandLabel,
    title: typeLabel,
    introduction: messages.dateMutation.description,
    successNote: messages.lifecycleAdjustment.completedNote,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.adminNewReservation.footer,
    sections: [
      {
        title: messages.dateMutation.requestTypes.STAY_EXTENSION,
        rows: removeEmptyRows([
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.guestName, value: view.guestName },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.common.checkIn, value: view.checkInDate },
          { label: messages.dateMutation.labels.originalStay, value: view.originalCheckOutDate },
          { label: messages.dateMutation.labels.requestedStay, value: view.requestedCheckOutDate },
          {
            label: messages.common.nights,
            value: formatAddedNights(
              view.addedNights,
              messages.common.nightSingular,
              messages.common.nightPlural,
            ),
          },
          { label: messages.common.total, value: view.originalTotal },
          { label: messages.dateMutation.labels.financialDifference, value: view.additionalAmount },
          { label: messages.dateMutation.labels.requestedStay, value: view.requestedTotal },
          view.adjustmentPaymentStatus
            ? {
                label: messages.refunds.labels.paymentStatus,
                value: messages.paymentStatuses[view.adjustmentPaymentStatus],
              }
            : null,
          holdStatus
            ? { label: messages.notifications.labels.status, value: holdStatus }
            : null,
          { label: messages.cancellation.labels.decidedAt, value: view.completedAt },
        ]),
      },
      {
        title: messages.cancellation.labels.request,
        rows: removeEmptyRows([
          {
            label: messages.dateMutation.labels.channel,
            value: messages.dateMutation.channels[view.admin.channel],
          },
          view.admin.requestNote
            ? { label: messages.dateMutation.labels.requestReason, value: view.admin.requestNote }
            : null,
          view.admin.createdByAdminName
            ? { label: messages.dateMutation.labels.createdBy, value: view.admin.createdByAdminName }
            : null,
          view.admin.reviewedByAdminName
            ? { label: messages.cancellation.labels.reviewedBy, value: view.admin.reviewedByAdminName }
            : null,
          view.admin.decisionNote
            ? { label: messages.dateMutation.labels.decisionNote, value: view.admin.decisionNote }
            : null,
        ]),
      },
    ],
    adminReservationUrl: view.adminReservationUrl,
    adminActionLabel: messages.adminNewReservation.actionLabel,
    adminActionFallback: messages.adminNewReservation.actionFallback,
  });
}

function getAuthorizationLabel(
  messages: ReturnType<typeof getLifecycleEmailMessages>,
  authorizationType: "STANDARD_POLICY" | "EXTRAORDINARY" | "LIFECYCLE_ADJUSTMENT",
): string {
  return authorizationType === "LIFECYCLE_ADJUSTMENT"
    ? messages.dateMutation.title
    : messages.refunds.authorizationTypes[authorizationType];
}

export async function buildRefundProcessedEmail(
  input: RefundProcessedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildRefundProcessedEmailView(input);
  requireGuestLocale(view);
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.REFUND_PROCESSED;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: `${typeLabel} · ${view.propertyName}`,
    previewText: messages.refunds.success.reconciledApproved,
    eyebrow: typeLabel,
    title: typeLabel,
    introduction: typeLabel,
    successNote: messages.refunds.success.reconciledApproved,
    greeting: `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.common.footer,
    sections: [
      {
        title: messages.refunds.labels.refund,
        rows: [
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.refunds.labels.amount, value: view.amount },
          {
            label: messages.refunds.labels.authorizationType,
            value: getAuthorizationLabel(messages, view.authorizationType),
          },
          {
            label: messages.refunds.labels.paymentStatus,
            value: messages.paymentStatuses[view.paymentStatus],
          },
          { label: messages.cancellation.labels.decidedAt, value: view.approvedAt },
        ],
      },
    ],
    supportDescription: messages.reservationConfirmed.supportDescription,
    supportEmail: view.supportEmail,
    closing: messages.reservationConfirmed.closing,
  });
}

export async function buildAdminRefundProcessedEmail(
  input: RefundProcessedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildRefundProcessedEmailView(input);
  const messages = getLifecycleEmailMessages(view.locale);
  const typeLabel = messages.notifications.types.REFUND_PROCESSED;

  return buildLifecycleEmailDocument({
    locale: view.locale,
    subject: getAdminSubject(typeLabel, messages.adminBrandLabel, view.reservationId),
    previewText: messages.refunds.description,
    eyebrow: messages.adminBrandLabel,
    title: typeLabel,
    introduction: messages.refunds.description,
    successNote: messages.refunds.success.reconciledApproved,
    brandName: messages.common.brandName,
    logoUrl: view.logoUrl,
    publicHomeUrl: view.publicHomeUrl,
    footerText: messages.adminNewReservation.footer,
    sections: [
      {
        title: messages.refunds.labels.refund,
        rows: removeEmptyRows([
          { label: messages.common.reservationReference, value: view.reservationId },
          { label: messages.common.guestName, value: view.guestName },
          { label: messages.common.guestEmail, value: view.guestEmail },
          { label: messages.common.accommodation, value: view.propertyName },
          { label: messages.refunds.labels.amount, value: view.amount },
          {
            label: messages.refunds.labels.authorizationType,
            value: getAuthorizationLabel(messages, view.authorizationType),
          },
          {
            label: messages.refunds.labels.processingMode,
            value: messages.refunds.processingModes[view.processingMode],
          },
          {
            label: messages.refunds.labels.paymentStatus,
            value: messages.paymentStatuses[view.paymentStatus],
          },
          view.providerRefundId
            ? { label: messages.refunds.labels.providerRefundId, value: view.providerRefundId }
            : null,
          view.reason
            ? { label: messages.refunds.labels.reason, value: view.reason }
            : null,
          view.admin?.requestedByAdminName
            ? { label: messages.refunds.labels.requestedBy, value: view.admin.requestedByAdminName }
            : null,
          view.admin?.reconciledByAdminName
            ? { label: messages.cancellation.labels.reviewedBy, value: view.admin.reconciledByAdminName }
            : null,
          { label: messages.cancellation.labels.decidedAt, value: view.approvedAt },
        ]),
      },
    ],
    adminReservationUrl: view.adminReservationUrl,
    adminActionLabel: messages.adminNewReservation.actionLabel,
    adminActionFallback: messages.adminNewReservation.actionFallback,
  });
}
