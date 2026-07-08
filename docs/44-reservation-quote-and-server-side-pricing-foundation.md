# 44 — Reservation Quote and Server-side Pricing Foundation

## Phase

```text
Phase 8.2 — Reservation quote and server-side pricing foundation
```

## Purpose

This document closes the pricing foundation required before public guest details and pending reservation creation are introduced.

The goal is to add a server-controlled quote foundation that can be reused by the public reservation flow without trusting client-provided totals.

## Current Scope

Phase 8.2 adds:

```text
- A typed reservation quote domain contract.
- A pure server-side pricing service.
- A public-safe quote endpoint.
- Centralized reservation quote error messages.
- Documentation for pricing assumptions and future handoff.
```

Phase 8.2 does not add:

```text
Reservation creation
Pending hold writes
Checkout UI
Tilopay payment intents
Tilopay redirects
Tilopay webhooks
Resend emails
Admin reservation UI
Migration files
Seed data
Deployment changes
PMS features
```

## Quote Endpoint

The quote endpoint is:

```text
GET /api/reservations/quote
```

Expected query parameters:

```text
accommodationId
checkInDate
checkOutDate
guestCount
locale optional, es or en
```

Example:

```text
/api/reservations/quote?accommodationId=black-white-apartment&checkInDate=2026-08-10&checkOutDate=2026-08-12&guestCount=2&locale=es
```

The endpoint returns a quote only. It does not create a reservation, hold dates, start checkout, or call Tilopay.

## Pricing Source of Truth

The pricing service uses server-controlled data only:

```text
config/accommodations.ts
baseNightlyPriceUsd
maxGuests
```

The client must not send trusted pricing values.

Any future UI-provided amount is display-only. The server must recalculate every subtotal, tax, discount, fee, and total before creating a pending reservation or preparing payment handoff.

## Current MVP Pricing Rules

Current Phase 8.2 pricing rules:

```text
currency = USD
nightlyRate = accommodation.baseNightlyPriceUsd
nights = checkOutDate - checkInDate using date-only boundaries
subtotal = nightlyRate * nights
cleaningFee = 0
taxes = 0
discounts = 0
total = subtotal + cleaningFee + taxes - discounts
```

Cleaning fees, taxes, seasonal pricing, promotions, coupons, and discounts are intentionally not implemented yet.

The quote response exposes monetary values in cents and fixed decimal strings so later reservation writes can store exact server-calculated totals.

## Date Boundary

Quote date ranges follow the same lodging convention used by availability:

```text
checkInDate inclusive
checkOutDate exclusive
```

A valid quote must have at least one night.

## Guest Count Validation

The quote service validates:

```text
guestCount >= 1
guestCount <= accommodation.maxGuests
```

This is not only a UI rule. It must remain enforced server-side in later reservation creation flows.

## Availability Boundary

The quote endpoint does not write holds and does not guarantee final availability.

Availability must still be rechecked server-side later:

```text
1. Before creating a PENDING_PAYMENT reservation.
2. Before preparing or returning payment handoff data.
3. Before confirming a reservation from a future Tilopay webhook.
```

The quote is non-binding and is only valid for the request payload and current server-side pricing rules.

## Error Handling

The quote endpoint must not expose raw internal errors.

It returns safe reservation error codes such as:

```text
INVALID_QUOTE_REQUEST
INVALID_ACCOMMODATION
INVALID_DATE_RANGE
INVALID_GUEST_COUNT
```

User-facing copy is centralized in:

```text
messages/es.ts
messages/en.ts
```

## Files Added

```text
types/reservation-quote.ts
lib/reservations/pricing.ts
lib/reservations/index.ts
app/api/reservations/quote/route.ts
docs/44-reservation-quote-and-server-side-pricing-foundation.md
```

## Files Updated

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
messages/es.ts
messages/en.ts
```

## Phase 8.3 Handoff

The next subphase is:

```text
8.3 Public guest details and reservation request form
```

Phase 8.3 should use the quote endpoint and service as read-only pricing foundation for the public form.

It should not create reservations unless the tracker explicitly moves into Phase 8.4 pending reservation creation.
