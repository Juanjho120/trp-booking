const PUBLIC_WHATSAPP_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export type PublicWhatsAppContact = Readonly<{
  phoneE164: string;
  digits: string;
  href: string;
}>;

export function normalizePublicWhatsAppPhone(
  value: string | null | undefined,
): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue || !PUBLIC_WHATSAPP_PHONE_PATTERN.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

export function buildPublicWhatsAppUrl(
  phoneE164: string,
  initialMessage: string,
): string | null {
  const normalizedPhone = normalizePublicWhatsAppPhone(phoneE164);
  const trimmedMessage = initialMessage.trim();

  if (!normalizedPhone || trimmedMessage.length === 0) {
    return null;
  }

  const digits = normalizedPhone.slice(1);

  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedMessage)}`;
}

export function getPublicWhatsAppContact(
  initialMessage: string,
  source: string | null | undefined = process.env
    .NEXT_PUBLIC_WHATSAPP_PHONE_E164,
): PublicWhatsAppContact | null {
  const phoneE164 = normalizePublicWhatsAppPhone(source);

  if (!phoneE164) {
    return null;
  }

  const href = buildPublicWhatsAppUrl(phoneE164, initialMessage);

  if (!href) {
    return null;
  }

  return {
    phoneE164,
    digits: phoneE164.slice(1),
    href,
  };
}
