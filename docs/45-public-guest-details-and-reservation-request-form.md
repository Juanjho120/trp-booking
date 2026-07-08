# 45 — Public Guest Details and Reservation Request Form

## Phase

```text
Phase 8.3 — Public guest details and reservation request form
```

## Purpose

This document records the public reservation request form foundation added in Phase 8.3.

The goal is to let a guest enter reservation request details and calculate a server-side quote before the project introduces server-side pending reservation creation.

## Delivered Files

```text
features/reservations/components/reservation-request-form.tsx
features/reservations/index.ts
features/properties/components/property-detail-page.tsx
messages/es.ts
messages/en.ts
docs/45-public-guest-details-and-reservation-request-form.md
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## What the Form Does

The public accommodation detail page now renders a reservation request form inside the existing reservation summary card.

The form collects:

```text
checkInDate
checkOutDate
guestCount
guestName
guestEmail
guestPhone
guestCountry
arrivalTimeEstimate
```

The form can request a server-side quote from:

```text
GET /api/reservations/quote
```

The quote response displays:

```text
nights
nightlyRate
subtotal
cleaningFee
taxes
discounts
total
currency
```

## Important UI Decision

The date fields are text-based fields with a `YYYY-MM-DD` placeholder.

This intentionally avoids native browser date pickers because the project rules require the booking calendar/date experience to remain styled and controlled by the project UI instead of relying on native browser date picker behavior.

## Server-side Source of Truth

The form does not calculate trusted totals in the browser.

The form calls the Phase 8.2 quote endpoint, and the quote endpoint recalculates totals using server-controlled accommodation pricing.

The client must still treat the quote as non-binding because:

```text
- Availability is not guaranteed by the quote alone.
- Availability must be rechecked before creating a pending hold.
- Availability must be rechecked again before payment handoff.
```

## Guest Details Boundary

In Phase 8.3, guest details are held only in client-side UI state.

They are not persisted to Prisma yet.

They are not sent to Resend.

They are not sent to Tilopay.

They are not exposed to admin UI.

## Hold Creation Boundary

The final hold creation button remains disabled in Phase 8.3.

This is intentional.

Pending reservation creation belongs to:

```text
8.4 Pending reservation creation and expiration handling
```

Phase 8.4 must create server-side pending reservations only after:

```text
1. Validating request input.
2. Recalculating the quote server-side.
3. Rechecking availability server-side.
4. Setting status = PENDING_PAYMENT.
5. Setting a non-null expiresAt value.
```

## Payment Boundary

Phase 8.3 does not process payments.

It does not create:

```text
Tilopay payment intents
Tilopay redirects
Tilopay webhook handling
Payment records
Checkout sessions
```

Payment behavior remains in Phase 9.

The reservation must not become:

```text
status = CONFIRMED
confirmedAt = now
```

until the later Tilopay webhook validation phase succeeds.

## Email Boundary

Phase 8.3 does not send emails.

It only collects the information that future email phases may need:

```text
guestName
guestEmail
arrivalTimeEstimate
reservation dates
accommodation identity
```

Resend behavior remains in Phase 10.

## Availability Boundary

Phase 8.3 does not block dates.

It does not create `Reservation` records.

It does not create `CalendarBlock` records.

It does not create preparation buffer blocks.

Availability must still be enforced later by the server-side reservation creation flow.

## Centralized Copy

User-facing copy added in this phase lives in:

```text
messages/es.ts
messages/en.ts
```

The reservation request copy is grouped under:

```text
reservations.request
```

The form should continue using centralized copy instead of hardcoding user-facing text inside TSX components.

## Security Notes

The form must not expose:

```text
provider secrets
raw database errors
Airbnb iCal URLs
iCal export tokens
exportTokenHash
payment payloads
admin notes
```

The quote endpoint already returns safe reservation quote data only.

## Out of Scope

Phase 8.3 does not add:

```text
reservation writes
pending holds
checkout sessions
Tilopay payment intents
Tilopay redirects
Tilopay webhooks
Resend emails
migration files
seed data
admin reservation UI
deployment configuration
PMS features
```

## Validation Commands

Recommended validation after applying this phase:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run env:validate
npm run lint
```

## Handoff to Phase 8.4

The next subphase is:

```text
8.4 Pending reservation creation and expiration handling
```

Phase 8.4 should add the server-side write flow that creates active pending holds safely.

It must not confirm reservations, start real checkout, call Tilopay, send Resend emails, add admin reservation UI, or add PMS features.
