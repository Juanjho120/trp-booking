# 62 — Public Calendar Confirmed Reservation Blocks

## Status

Prepared during Phase 9 sandbox testing, before starting 9.8.

## Context

After the Tilopay happy path confirmed a reservation, the public stay-date picker did not show the confirmed reservation dates as blocked.

This created a bad guest experience because guests had to guess which dates were available.

## Fix

`GET /api/availability/blocked-dates` now preserves the existing availability service output and explicitly adds blocked dates from direct reservations.

Reservation rows included as blockers:

```text
Reservation.status = CONFIRMED
Reservation.status = PENDING_PAYMENT and expiresAt > now
```

Reservation rows intentionally ignored:

```text
Reservation.status = EXPIRED
Reservation.status = PENDING_PAYMENT and expiresAt <= now
Rejected/failed payment attempts without confirmed reservation status
```

## Composed listing behavior

The endpoint applies the same dependency rule expected by the availability strategy:

```text
Viewing Apartamento Blanco y Negro:
- block dates from Apartamento Blanco y Negro
- block dates from Refugio Completo

Viewing Bungalow Refugio Perfecto:
- block dates from Bungalow Refugio Perfecto
- block dates from Refugio Completo

Viewing Refugio Completo:
- block dates from Apartamento Blanco y Negro
- block dates from Bungalow Refugio Perfecto
- block dates from Refugio Completo
```

## What this does not implement yet

This does not implement Phase 9.8 preparation buffers.

It only fixes the immediate public calendar problem for confirmed reservations and active pending holds.

Phase 9.8 should still be handled separately after payment and admin testing:

```text
9.8 — Automatic preparation buffers after confirmed reservations
```

Expected 9.8 scope:

```text
- Apply configured preparation buffers around CONFIRMED reservations.
- Apply temporary preparation buffers around active PENDING_PAYMENT holds.
- Ignore EXPIRED holds.
- Decide whether buffers stay dynamic or are materialized in calendar_blocks.
- Defer admin configuration/unlock UI until the admin pages are reviewed.
```

## Validation

```bash
npm run build
```

Manual checks:

```text
1. Create or use an existing CONFIRMED reservation.
2. Open the public booking date picker for that accommodation.
3. Confirm the occupied nights are disabled/tachadas.
4. Confirm the checkout date itself is not blocked unless another rule blocks it.
5. Confirm Refugio Completo blocks if either individual accommodation has a confirmed reservation.
6. Confirm each individual accommodation blocks if Refugio Completo has a confirmed reservation.
```
