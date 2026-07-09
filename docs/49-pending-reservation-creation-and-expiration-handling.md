# 49 — Pending reservation creation and expiration handling

## Status

Completed as part of Phase 8.4.

## Purpose

This subphase enables the public reservation request form to create a real server-side pending reservation hold without introducing payment, email delivery, admin UI, or PMS behavior.

The hold is intentionally temporary and uses the existing `Reservation` / `ReservationGuest` schema foundation. No Prisma schema change and no migration are required for this subphase.

## Public endpoint

```txt
POST /api/reservations/pending-hold
```

### Request body

```ts
{
  accommodationId: "black-white-apartment" | "perfect-retreat-bungalow" | "complete-retreat";
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestCountry: string; // ISO-2, e.g. GT
  countryDialCode: string; // e.g. +502
  guestPhoneLocal: string;
  arrivalTimeEstimate: string; // HH:mm, 08:00 through 22:00
  locale: "es" | "en";
}
```

## Server-side rules

The server does not trust frontend quote values.

When the pending hold request is received, the server:

1. Validates the request body with Zod.
2. Normalizes guest name, email, country code, dial code, and local phone.
3. Recalculates the quote using the DB-backed reservation pricing service.
4. Revalidates availability using the DB-backed availability service.
5. Creates a `Reservation` with `status = PENDING_PAYMENT`.
6. Sets `expiresAt = now + 15 minutes`.
7. Creates the related `ReservationGuest` record.
8. Returns only safe public reservation data.

## Hold expiration

Pending reservation holds expire after 15 minutes.

The duration is centralized in:

```ts
PENDING_RESERVATION_HOLD_DURATION_MINUTES = 15
```

Expired holds are expected to stop blocking availability through the existing availability rule that ignores `PENDING_PAYMENT` reservations whose `expiresAt <= now`.

## Availability and dependencies

The hold uses the existing availability service, so it keeps the same blocking behavior already defined for composed accommodations:

- Booking `Apartamento Blanco y Negro` blocks itself and `Refugio Completo`.
- Booking `Bungalow Refugio Perfecto` blocks itself and `Refugio Completo`.
- Booking `Refugio Completo` blocks both individual accommodations and itself.

No manual `CalendarBlock` is created for pending holds. Pending reservations block through the `Reservation` record while active.

## Out of scope

This subphase intentionally does not add:

- Tilopay checkout.
- Payment records.
- Payment confirmation.
- Resend emails.
- Admin reservation UI.
- Guest self-service date changes.
- PMS behavior.
- New Prisma schema fields.
- New migrations.

## Files added or updated

```txt
app/api/reservations/pending-hold/route.ts
features/reservations/components/reservation-request-form.tsx
features/reservations/reservation-pending-hold-copy.ts
lib/reservations/pending-holds.ts
types/reservation-pending-hold.ts
docs/49-pending-reservation-creation-and-expiration-handling.md
```

## Validation checklist

Run:

```bash
npm run lint
npm run build
```

Manual checks:

1. Open an accommodation detail page.
2. Fill dates, guest count, guest details, country, phone, and arrival time.
3. Calculate quote.
4. Create pending reservation.
5. Confirm the response shows a pending reservation id, expiration time, status, and total.
6. Confirm the reservation exists in the database with `PENDING_PAYMENT` and non-null `expiresAt`.
7. Confirm a related `ReservationGuest` row was created.
8. Confirm payment, email, and calendar block records are not created.
