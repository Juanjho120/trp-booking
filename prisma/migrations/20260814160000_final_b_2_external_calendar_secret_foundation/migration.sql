BEGIN;

LOCK TABLE "external_calendars" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "external_calendars"
    GROUP BY "property_id", "provider"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'FINAL_B_2_DUPLICATE_EXTERNAL_CALENDAR_PROPERTY_PROVIDER',
      DETAIL = 'Resolve duplicate external_calendars rows for the same property_id/provider before applying Final-B.2. No row is selected, merged, or deleted automatically.';
  END IF;
END
$$;

ALTER TABLE "external_calendars"
ADD COLUMN "export_token_encrypted" TEXT;

CREATE UNIQUE INDEX "external_calendars_property_id_provider_key"
ON "external_calendars"("property_id", "provider");

COMMIT;
