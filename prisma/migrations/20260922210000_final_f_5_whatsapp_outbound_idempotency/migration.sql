ALTER TABLE "whatsapp_messages"
ADD COLUMN "client_request_id" VARCHAR(120);

ALTER TABLE "whatsapp_messages"
ADD CONSTRAINT "whatsapp_messages_client_request_id_check"
CHECK ("client_request_id" IS NULL OR length(btrim("client_request_id")) > 0);

CREATE UNIQUE INDEX "whatsapp_messages_client_request_id_key"
ON "whatsapp_messages"("client_request_id");
