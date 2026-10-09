-- Final-I.6.6 owner-approved 8-character Reservation code format.
-- This migration is intentionally fail-closed because reservation codes are immutable.

DO $$
DECLARE
    existing_reservations INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO existing_reservations
    FROM "reservations";

    IF existing_reservations <> 0 THEN
        RAISE EXCEPTION 'Cannot shrink reservations.reservation_code to VARCHAR(8) while % reservation rows exist; reservation codes are immutable',
            existing_reservations;
    END IF;
END $$;

ALTER TABLE "reservations"
DROP CONSTRAINT "reservations_reservation_code_format_check";

ALTER TABLE "reservations"
ALTER COLUMN "reservation_code" TYPE VARCHAR(8);

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_reservation_code_format_check"
CHECK ("reservation_code" ~ '^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');