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
import { buildReviewInvitationEmailTemplateViewModel } from "@/emails/review-invitation-template-data";
import type { TransactionalEmailContent } from "@/types/email-template";
import type { ReviewInvitationEmailTemplateInput } from "@/types/review-invitation-email-template";

export async function buildReviewInvitationEmail(
  input: ReviewInvitationEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildReviewInvitationEmailTemplateViewModel(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const subject = `${messages.reviewInvitation.subjectPrefix} · ${view.propertyName}`;
  const previewText = `${messages.reviewInvitation.preview} ${view.propertyName}.`;

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.common.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={previewText}
    >
      <EmailEyebrow>{messages.reviewInvitation.eyebrow}</EmailEyebrow>
      <EmailTitle>{messages.reviewInvitation.title}</EmailTitle>
      <EmailParagraph>
        {messages.reviewInvitation.greetingPrefix} {view.guestName}.
      </EmailParagraph>
      <EmailParagraph>{messages.reviewInvitation.introduction}</EmailParagraph>

      <EmailSection>
        <EmailSectionTitle>
          {messages.reviewInvitation.summaryTitle}
        </EmailSectionTitle>
        <EmailDetailRow
          label={messages.common.accommodation}
          value={view.propertyName}
        />
        <EmailDetailRow
          label={messages.reviewInvitation.checkoutLabel}
          value={view.checkoutAt}
        />
        <EmailDetailRow
          label={messages.reviewInvitation.expiresAtLabel}
          last
          value={view.expiresAt}
        />
      </EmailSection>

      <EmailButton href={view.reviewUrl}>
        {messages.reviewInvitation.actionLabel}
      </EmailButton>
      <EmailParagraph>
        {messages.reviewInvitation.actionFallback} {view.reviewUrl}
      </EmailParagraph>

      <EmailSuccessNote>
        {messages.reviewInvitation.securityNote}
      </EmailSuccessNote>

      <div style={{ marginTop: 28 }}>
        <EmailParagraph>
          {messages.reviewInvitation.supportDescription}{" "}
          <a
            href={`mailto:${view.supportEmail}`}
            style={{ color: "#171717", fontWeight: 700 }}
          >
            {view.supportEmail}
          </a>
        </EmailParagraph>
        <EmailParagraph>{messages.reviewInvitation.closing}</EmailParagraph>
      </div>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    messages.reviewInvitation.title,
    `${messages.reviewInvitation.greetingPrefix} ${view.guestName}.`,
    messages.reviewInvitation.introduction,
    buildPlainTextRows([
      { label: messages.common.accommodation, value: view.propertyName },
      {
        label: messages.reviewInvitation.checkoutLabel,
        value: view.checkoutAt,
      },
      {
        label: messages.reviewInvitation.expiresAtLabel,
        value: view.expiresAt,
      },
    ]),
    `${messages.reviewInvitation.actionLabel}: ${view.reviewUrl}`,
    messages.reviewInvitation.securityNote,
    `${messages.common.supportLabel}: ${view.supportEmail}`,
    messages.reviewInvitation.closing,
    messages.common.footer,
  ]);

  return {
    subject,
    html,
    text,
  };
}
