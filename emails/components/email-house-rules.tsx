import type { ReservationEmailTemplateHouseRuleViewModel } from "@/types/email-template";

type EmailHouseRulesProps = Readonly<{
  rules: readonly ReservationEmailTemplateHouseRuleViewModel[];
}>;

export function EmailHouseRules({ rules }: EmailHouseRulesProps) {
  return (
    <div>
      {rules.map((rule, index) => (
        <div
          key={`${rule.title}-${index}`}
          style={{
            padding: index === 0 ? "0 0 16px" : "16px 0",
            borderTop: index === 0 ? "none" : "1px solid #e4e4e7",
          }}
        >
          <div
            style={{
              marginBottom: 6,
              color: "#171717",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: "21px",
            }}
          >
            {index + 1}. {rule.title}
          </div>
          <div
            style={{
              color: "#666666",
              fontSize: 14,
              lineHeight: "22px",
              whiteSpace: "pre-line",
            }}
          >
            {rule.description}
          </div>
        </div>
      ))}
    </div>
  );
}

export function buildPlainTextHouseRules(
  title: string,
  rules: readonly ReservationEmailTemplateHouseRuleViewModel[],
): string | null {
  if (rules.length === 0) {
    return null;
  }

  return [
    title,
    ...rules.map(
      (rule, index) => `${index + 1}. ${rule.title}\n${rule.description}`,
    ),
  ].join("\n\n");
}
