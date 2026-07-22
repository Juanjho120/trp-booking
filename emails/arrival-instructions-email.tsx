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
import {
  buildPlainTextHouseRules,
  EmailHouseRules,
} from "@/emails/components/email-house-rules";
import { buildPlainTextEmail, buildPlainTextRows } from "@/emails/email-text";
import { getTransactionalEmailMessages } from "@/emails/messages";
import {
  buildArrivalInstructionsEmailTemplateViewModel,
  EmailTemplateDataError,
} from "@/emails/template-data";
import type {
  ArrivalInstructionsEmailTemplateInput,
  TransactionalEmailContent,
} from "@/types/email-template";

function MultilineInstructions({ text }: Readonly<{ text: string }>) {
  return (
    <div
      style={{
        color: "#666666",
        fontSize: 15,
        lineHeight: "24px",
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  );
}

export async function buildArrivalInstructionsEmail(
  input: ArrivalInstructionsEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildArrivalInstructionsEmailTemplateViewModel(input);

  if (view.locale !== view.guestPreferredLocale) {
    throw new EmailTemplateDataError();
  }

  const messages = getTransactionalEmailMessages(view.locale);
  const subject = `${messages.arrivalInstructions.subjectPrefix} · ${view.propertyName}`;
  const previewText = `${messages.arrivalInstructions.previewPrefix} ${view.checkInDate}.`;

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.common.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={previewText}
    >
      <EmailEyebrow>{messages.arrivalInstructions.eyebrow}</EmailEyebrow>
      <EmailTitle>{messages.arrivalInstructions.title}</EmailTitle>
      <EmailParagraph>
        {messages.arrivalInstructions.greetingPrefix} {view.guestName}.
      </EmailParagraph>
      <EmailParagraph>{messages.arrivalInstructions.introduction}</EmailParagraph>

      <EmailSection>
        <EmailSectionTitle>
          {messages.arrivalInstructions.scheduleTitle}
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
          label={messages.common.checkInTime}
          last
          value={view.checkInTime}
        />
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.arrivalInstructions.locationTitle}
        </EmailSectionTitle>
        <EmailDetailRow
          label={messages.common.exactAddress}
          last
          value={view.exactAddress}
        />
        {view.mapUrl ? (
          <>
            <EmailButton href={view.mapUrl}>
              {messages.arrivalInstructions.mapActionLabel}
            </EmailButton>
            <EmailParagraph>
              {messages.arrivalInstructions.mapActionFallback} {view.mapUrl}
            </EmailParagraph>
          </>
        ) : null}
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.arrivalInstructions.instructionsTitle}
        </EmailSectionTitle>
        <MultilineInstructions text={view.instructions} />
      </EmailSection>

      {view.houseRules.length > 0 ? (
        <EmailSection>
          <EmailSectionTitle>{messages.common.houseRules}</EmailSectionTitle>
          <EmailHouseRules rules={view.houseRules} />
        </EmailSection>
      ) : null}

      <EmailSuccessNote>
        {messages.arrivalInstructions.securityNote}
      </EmailSuccessNote>

      <div style={{ marginTop: 28 }}>
        <EmailParagraph>
          {messages.arrivalInstructions.supportDescription}{" "}
          <a
            href={`mailto:${view.supportEmail}`}
            style={{ color: "#171717", fontWeight: 700 }}
          >
            {view.supportEmail}
          </a>
        </EmailParagraph>
        <EmailParagraph>{messages.arrivalInstructions.closing}</EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    messages.arrivalInstructions.title,
    `${messages.arrivalInstructions.greetingPrefix} ${view.guestName}.`,
    messages.arrivalInstructions.introduction,
    buildPlainTextRows([
      {
        label: messages.common.reservationReference,
        value: view.reservationId,
      },
      { label: messages.common.accommodation, value: view.propertyName },
      { label: messages.common.checkIn, value: view.checkInDate },
      { label: messages.common.checkInTime, value: view.checkInTime },
      { label: messages.common.exactAddress, value: view.exactAddress },
    ]),
    view.mapUrl
      ? `${messages.arrivalInstructions.mapActionLabel}: ${view.mapUrl}`
      : null,
    `${messages.arrivalInstructions.instructionsTitle}\n${view.instructions}`,
    buildPlainTextHouseRules(messages.common.houseRules, view.houseRules),
    messages.arrivalInstructions.securityNote,
    `${messages.common.supportLabel}: ${view.supportEmail}`,
    messages.arrivalInstructions.closing,
    messages.common.footer,
  ]);

  return {
    subject,
    html,
    text,
  };
}
