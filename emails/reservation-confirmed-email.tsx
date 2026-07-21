import {
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
import {
  buildReservationEmailTemplateViewModel,
  EmailTemplateDataError,
} from "@/emails/template-data";
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

export function buildReservationConfirmedEmail(
  input: ReservationEmailTemplateInput,
): TransactionalEmailContent {
  const view = buildReservationEmailTemplateViewModel(input);

  if (view.locale !== view.guestPreferredLocale) {
    throw new EmailTemplateDataError();
  }

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
  const subject = `${messages.reservationConfirmed.subjectPrefix} · ${view.propertyName}`;
  const previewText = `${messages.reservationConfirmed.previewPrefix} ${view.checkInDate}.`;

  const html = renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.common.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={previewText}
    >
      <EmailEyebrow>{messages.reservationConfirmed.eyebrow}</EmailEyebrow>
      <EmailTitle>{messages.reservationConfirmed.title}</EmailTitle>
      <EmailParagraph>
        {messages.reservationConfirmed.greetingPrefix} {view.guestName}.
      </EmailParagraph>
      <EmailParagraph>
        {messages.reservationConfirmed.introduction}
      </EmailParagraph>
      <EmailSuccessNote>
        {messages.reservationConfirmed.paymentNote}
      </EmailSuccessNote>

      <EmailSection>
        <EmailSectionTitle>
          {messages.reservationConfirmed.summaryTitle}
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
        <EmailDetailRow label={messages.common.total} last value={view.total} />
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.reservationConfirmed.dateChangesTitle}
        </EmailSectionTitle>
        <EmailParagraph>
          {messages.reservationConfirmed.dateChangesDescription}
        </EmailParagraph>
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.reservationConfirmed.arrivalTitle}
        </EmailSectionTitle>
        <EmailParagraph>
          {messages.reservationConfirmed.arrivalDescription}
        </EmailParagraph>
      </EmailSection>

      <div style={{ marginTop: 28 }}>
        <EmailParagraph>
          {messages.reservationConfirmed.supportDescription}{" "}
          <a
            href={`mailto:${view.supportEmail}`}
            style={{ color: "#171717", fontWeight: 700 }}
          >
            {view.supportEmail}
          </a>
        </EmailParagraph>
        <EmailParagraph>{messages.reservationConfirmed.closing}</EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    messages.reservationConfirmed.title,
    `${messages.reservationConfirmed.greetingPrefix} ${view.guestName}.`,
    messages.reservationConfirmed.introduction,
    messages.reservationConfirmed.paymentNote,
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
    ]),
    `${messages.reservationConfirmed.dateChangesTitle}\n${messages.reservationConfirmed.dateChangesDescription}`,
    `${messages.reservationConfirmed.arrivalTitle}\n${messages.reservationConfirmed.arrivalDescription}`,
    `${messages.common.supportLabel}: ${view.supportEmail}`,
    messages.reservationConfirmed.closing,
    messages.common.footer,
  ]);

  return {
    subject,
    html,
    text,
  };
}
