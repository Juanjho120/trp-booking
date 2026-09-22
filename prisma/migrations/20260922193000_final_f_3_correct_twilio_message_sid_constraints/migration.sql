ALTER TABLE "whatsapp_messages"
DROP CONSTRAINT "whatsapp_messages_provider_message_sid_check";

ALTER TABLE "whatsapp_messages"
ADD CONSTRAINT "whatsapp_messages_provider_message_sid_check"
CHECK (
    "provider_message_sid" IS NULL
    OR "provider_message_sid" ~ '^(SM|MM)[0-9a-fA-F]{32}$'
);

ALTER TABLE "staff_whatsapp_alerts"
DROP CONSTRAINT "staff_whatsapp_alerts_provider_message_sid_check";

ALTER TABLE "staff_whatsapp_alerts"
ADD CONSTRAINT "staff_whatsapp_alerts_provider_message_sid_check"
CHECK (
    "provider_message_sid" IS NULL
    OR "provider_message_sid" ~ '^(SM|MM)[0-9a-fA-F]{32}$'
);
