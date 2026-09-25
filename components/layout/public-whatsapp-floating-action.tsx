"use client";

import { MessageCircle } from "lucide-react";

import { getPublicWhatsAppContact } from "@/config/public-whatsapp";
import { useLocale } from "@/features/i18n";

export function PublicWhatsAppFloatingAction() {
  const { messages } = useLocale();
  const copy = messages.publicWhatsApp;
  const contact = getPublicWhatsAppContact(copy.initialMessage);

  if (!contact) {
    return null;
  }

  return (
    <a
      aria-label={copy.ariaLabel}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#128C7E] p-3 text-white shadow-lg shadow-black/20 transition hover:bg-[#075E54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      href={contact.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" className="size-6" />
    </a>
  );
}
