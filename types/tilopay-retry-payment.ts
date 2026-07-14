export type TilopayRetryPaymentIssue =
  | "invalid_card_number"
  | "invalid_cvv"
  | "insufficient_funds"
  | "card_not_allowed";

export type TilopayRetryPaymentFieldIssue = "card_details" | "cvv" | null;

export function isTilopayRetryPaymentIssue(value: string | null | undefined): value is TilopayRetryPaymentIssue {
  return (
    value === "invalid_card_number" ||
    value === "invalid_cvv" ||
    value === "insufficient_funds" ||
    value === "card_not_allowed"
  );
}
