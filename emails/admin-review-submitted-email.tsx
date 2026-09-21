import {
  EmailButton,
  EmailDetailRow,
  EmailEyebrow,
  EmailLayout,
  EmailParagraph,
  EmailSection,
  EmailSectionTitle,
  EmailTitle,
  renderEmailDocument,
} from "@/emails/components/email-layout";
import { buildPlainTextEmail, buildPlainTextRows } from "@/emails/email-text";
import { getTransactionalEmailMessages } from "@/emails/messages";
import { buildAdminReviewSubmittedEmailTemplateViewModel } from "@/emails/admin-review-submitted-template-data";
import type {
  AdminReviewSubmittedEmailTemplateInput,
} from "@/types/admin-review-submitted-email-template";
import type { TransactionalEmailContent } from "@/types/email-template";

const commentStyle = {
  margin: 0,
  color: "#171717",
  fontSize: 14,
  lineHeight: "22px",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
} as const;

export async function buildAdminReviewSubmittedEmail(
  input: AdminReviewSubmittedEmailTemplateInput,
): Promise<TransactionalEmailContent> {
  const view = buildAdminReviewSubmittedEmailTemplateViewModel(input);
  const messages = getTransactionalEmailMessages(view.locale);
  const subject = `${messages.adminReviewSubmitted.subjectPrefix} · ${view.propertyName}`;
  const previewText = `${messages.adminReviewSubmitted.preview} ${view.propertyName}.`;

  const html = await renderEmailDocument(
    <EmailLayout
      brandName={messages.common.brandName}
      brandUrl={view.publicHomeUrl}
      footerText={messages.adminReviewSubmitted.footer}
      locale={view.locale}
      logoUrl={view.logoUrl}
      previewText={previewText}
    >
      <EmailEyebrow>{messages.adminReviewSubmitted.eyebrow}</EmailEyebrow>
      <EmailTitle>{messages.adminReviewSubmitted.title}</EmailTitle>
      <EmailParagraph>
        {messages.adminReviewSubmitted.introduction}
      </EmailParagraph>

      <EmailSection>
        <EmailSectionTitle>
          {messages.adminReviewSubmitted.summaryTitle}
        </EmailSectionTitle>
        <EmailDetailRow
          label={messages.common.accommodation}
          value={view.propertyName}
        />
        <EmailDetailRow
          label={messages.adminReviewSubmitted.guestLabel}
          value={view.guestDisplayName}
        />
        <EmailDetailRow
          label={messages.adminReviewSubmitted.ratingLabel}
          value={view.rating}
        />
        <EmailDetailRow
          label={messages.adminReviewSubmitted.submittedAtLabel}
          last
          value={view.submittedAt}
        />
      </EmailSection>

      <EmailSection>
        <EmailSectionTitle>
          {messages.adminReviewSubmitted.commentTitle}
        </EmailSectionTitle>
        <p style={commentStyle}>{view.comment}</p>
      </EmailSection>

      <EmailButton href={view.adminReviewsUrl}>
        {messages.adminReviewSubmitted.actionLabel}
      </EmailButton>
      <EmailParagraph>
        {messages.adminReviewSubmitted.actionFallback} {view.adminReviewsUrl}
      </EmailParagraph>
    </EmailLayout>,
  );

  const text = buildPlainTextEmail([
    messages.adminReviewSubmitted.title,
    messages.adminReviewSubmitted.introduction,
    buildPlainTextRows([
      { label: messages.common.accommodation, value: view.propertyName },
      {
        label: messages.adminReviewSubmitted.guestLabel,
        value: view.guestDisplayName,
      },
      {
        label: messages.adminReviewSubmitted.ratingLabel,
        value: view.rating,
      },
      {
        label: messages.adminReviewSubmitted.submittedAtLabel,
        value: view.submittedAt,
      },
    ]),
    messages.adminReviewSubmitted.commentTitle,
    view.comment,
    `${messages.adminReviewSubmitted.actionLabel}: ${view.adminReviewsUrl}`,
    messages.adminReviewSubmitted.footer,
  ]);

  return {
    subject,
    html,
    text,
  };
}
