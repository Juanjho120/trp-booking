-- Final-I.6.6 Human Reservation Codes.

ALTER TABLE "reservations"
ADD COLUMN "reservation_code" VARCHAR(12);

DO $$
DECLARE
    alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    candidate TEXT;
    suffix TEXT;
    current_reservation RECORD;
    attempts INTEGER;
    position INTEGER;
BEGIN
    FOR current_reservation IN
        SELECT "id"
        FROM "reservations"
        WHERE "reservation_code" IS NULL
        ORDER BY "created_at", "id"
    LOOP
        attempts := 0;

        LOOP
            attempts := attempts + 1;

            IF attempts > 100 THEN
                RAISE EXCEPTION 'Unable to generate unique reservation_code for reservation % after % attempts',
                    current_reservation."id",
                    attempts - 1;
            END IF;

            suffix := '';

            FOR position IN 1..10 LOOP
                suffix := suffix || substr(
                    alphabet,
                    1 + floor(random() * length(alphabet))::integer,
                    1
                );
            END LOOP;

            candidate := 'TR' || suffix;

            UPDATE "reservations"
            SET "reservation_code" = candidate
            WHERE "id" = current_reservation."id"
              AND NOT EXISTS (
                  SELECT 1
                  FROM "reservations" existing
                  WHERE existing."reservation_code" = candidate
              );

            IF FOUND THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_reservation_code_format_check"
CHECK ("reservation_code" ~ '^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$');

ALTER TABLE "reservations"
ALTER COLUMN "reservation_code" SET NOT NULL;

CREATE UNIQUE INDEX "reservations_reservation_code_key"
ON "reservations"("reservation_code");