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
import { getTransactionalEmailMessages } from "@/emails/messages";
import { buildReservationEmailTemplateViewModel } from "@/emails/template-data";
import type {
  ReservationEmailTemplateInput,
  TransactionalEmailContent,
} from "@/types/email-template";

function formatNights(
  nights: number,
  singular: string,
  plural: string,
): string {
  return `${nights} ${nights === 1 ? singular : plural}`;
}

function formatGuests(
  guests: number,
  singular: string,
  plural: string,
): string {
  return `${guests} ${guests === 1 ? singular : plural}`;
}

export function buildAdminNewReservationEmail(
  input: ReservationEmailTemplateInput,
): TransactionalEmailContent {
  const view = buildReservationEmailTemplateViewModel(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const nights = formatNights(
    view.nights,
    messages.common.nightSingular,
    messages.common.nightPlural,
  );
  const guests = formatGuests(
    view.guestCount,
    messages.common.guestSingular,
    messages.common.guestPlural,
  );
  const arrivalTime = view.arrivalTimeEstimate ?? messages.common.notProvided;
  const guestPhone = view.guestPhone ?? messages.common.notProvided;
  const guestCountry = view.guestCountry ?? messages.common.notProvided;
  const guestPreferredLanguage =
    view.guestPreferredLocale === "es"
      ? messages.common.spanish
      : messages.common.english;
  const subject = `${messages.adminNewReservation.subjectPrefix} · ${view.propertyName} · ${view.guestName}`;
  const previewText = `${messages.adminNewReservation.previewPrefix} ${view.checkInDate}.`;

  const html = renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.adminNewReservation.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={previewText}
    >
      <EmailEyebrow>{messages.adminNewReservation.eyebrow}</EmailEyebrow>
      <EmailTitle>{messages.adminNewReservation.title}</EmailTitle>
      <EmailParagraph>
        {messages.adminNewReservation.introduction}
      </EmailParagraph>
      <EmailSuccessNote>
        {messages.adminNewReservation.paymentNote}
      </EmailSuccessNote>

      <EmailSection>
        <EmailSectionTitle>
          {messages.adminNewReservation.reservationTitle}
        </EmailSectionTitle>
        <EmailDetailRow
          label={messages.common.reservationReference}
          value={view.reservationId}
        />
        <EmailDetailRow
          label={messages.common.accommodation}
          value={view.propertyName}
        />
        <EmailDetailRow
          label={messages.common.checkIn}
          value={view.checkInDate}
        />
        <EmailDetailRow
          label={messages.common.checkOut}
          value={view.checkOutDate}
        />
        <EmailDetailRow label={messages.common.nights} value={nights} />
        <EmailDetailRow label={messages.common.guests} value={guests} />
        <EmailDetailRow
          label={messages.common.arrivalTime}
          value={arrivalTime}
        />
        <EmailDetailRow label={messages.common.total} value={view.total} />
        <EmailDetailRow
          label={messages.common.confirmedAt}
          last
          value={view.confirmedAt}
        />
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.adminNewReservation.guestTitle}
        </EmailSectionTitle>
        <EmailDetailRow
          label={messages.common.guestName}
          value={view.guestName}
        />
        <EmailDetailRow
          label={messages.common.guestEmail}
          value={view.guestEmail}
        />
        <EmailDetailRow label={messages.common.guestPhone} value={guestPhone} />
        <EmailDetailRow
          label={messages.common.guestCountry}
          value={guestCountry}
        />
        <EmailDetailRow
          label={messages.common.preferredLanguage}
          last
          value={guestPreferredLanguage}
        />
      </EmailSection>

      <EmailButton href={view.adminReservationUrl}>
        {messages.adminNewReservation.actionLabel}
      </EmailButton>
      <EmailParagraph>
        {messages.adminNewReservation.actionFallback} {view.adminReservationUrl}
      </EmailParagraph>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    messages.adminNewReservation.title,
    messages.adminNewReservation.introduction,
    messages.adminNewReservation.paymentNote,
    buildPlainTextRows([
      {
        label: messages.common.reservationReference,
        value: view.reservationId,
      },
      { label: messages.common.accommodation, value: view.propertyName },
      { label: messages.common.checkIn, value: view.checkInDate },
      { label: messages.common.checkOut, value: view.checkOutDate },
      { label: messages.common.nights, value: nights },
      { label: messages.common.guests, value: guests },
      { label: messages.common.arrivalTime, value: arrivalTime },
      { label: messages.common.total, value: view.total },
      { label: messages.common.confirmedAt, value: view.confirmedAt },
    ]),
    buildPlainTextRows([
      { label: messages.common.guestName, value: view.guestName },
      { label: messages.common.guestEmail, value: view.guestEmail },
      { label: messages.common.guestPhone, value: guestPhone },
      { label: messages.common.guestCountry, value: guestCountry },
      {
        label: messages.common.preferredLanguage,
        value: guestPreferredLanguage,
      },
    ]),
    `${messages.adminNewReservation.actionLabel}: ${view.adminReservationUrl}`,
    messages.adminNewReservation.footer,
  ]);

  return {
    subject,
    html,
    text,
  };
}
