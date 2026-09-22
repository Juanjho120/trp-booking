import type { AdminWhatsAppConversationSummary } from "@/types/admin-whatsapp";

export function getDisplayedWhatsAppReservationIds(
  conversation: Pick<
    AdminWhatsAppConversationSummary,
    "candidateReservations" | "reservation"
  >,
): readonly string[] {
  const ids = new Set<string>();

  if (conversation.reservation) {
    ids.add(conversation.reservation.id);
  }

  for (const candidate of conversation.candidateReservations) {
    ids.add(candidate.id);
  }

  return Array.from(ids);
}

export function getDisplayedWhatsAppReservationCount(
  conversation: Pick<
    AdminWhatsAppConversationSummary,
    "candidateReservations" | "reservation"
  >,
): number {
  return getDisplayedWhatsAppReservationIds(conversation).length;
}

export function formatWhatsAppReservationsTabLabel(
  template: string,
  count: number,
): string {
  return template.replace("{count}", String(count));
}
