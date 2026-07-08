# 43 — Reservation Flow Strategy and Pending Hold Contract

## Phase

```text
Phase 8.1 — Reservation flow strategy and pending hold contract
```

## Purpose

This document defines the direct reservation flow contract before adding reservation creation code.

The goal is to make the next reservation flow subphases safe and predictable by documenting:

```text
- Guest-facing reservation lifecycle
- Server-side validation boundaries
- Pending hold behavior
- Pending hold expiration rules
- Availability revalidation points
- Payment handoff boundaries
- Explicit Phase 8 non-goals
```

## Current Scope

Phase 8.1 is documentation and contract only.

It does not add:

```text
Reservation creation route handlers
Guest details form UI
Pricing service code
Checkout UI
Tilopay integration
Tilopay payment intents or redirects
Tilopay webhook handling
Resend emails
Database migrations
Seed data
Admin reservation UI
Deployment changes
PMS features
```

## Existing Foundation Reused by Phase 8

Phase 8 must build on the existing project foundation:

```text
- Prisma Reservation model
- ReservationStatus enum
- Availability domain service from Phase 6
- Airbnb iCal imported blocks from Phase 7
- Cloudinary-backed public accommodation pages
- Admin authentication foundation
```

Important existing reservation fields:

```text
propertyId
guestName
guestEmail
guestPhone
guestCountry
checkInDate
checkOutDate
arrivalTimeEstimate
guestCount
status
subtotal
cleaningFee
taxes
discounts
total
currency
expiresAt
confirmedAt
cancelledAt
createdAt
updatedAt
```

Important existing statuses:

```text
PENDING_PAYMENT
CONFIRMED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
EXPIRED
BLOCKED
```

## Reservation Lifecycle

The public direct reservation flow must follow this lifecycle:

```text
1. Guest selects accommodation and date range.
2. Server validates the date range and accommodation.
3. Server calculates a quote.
4. Guest enters contact and stay details.
5. Server rechecks availability before creating a pending hold.
6. Server creates a PENDING_PAYMENT reservation with expiresAt.
7. Server prepares payment handoff data only after revalidating the hold.
8. Tilopay payment is handled in Phase 9.
9. Payment webhook validates the payment in Phase 9.
10. Reservation becomes CONFIRMED only after validated payment.
11. Resend confirmation emails are sent later in Phase 10.
```

## Pending Hold Contract

A pending hold is represented by a `Reservation` record with:

```text
status = PENDING_PAYMENT
expiresAt = required non-null timestamp
confirmedAt = null
cancelledAt = null
```

Pending holds must block availability only while they are active.

A pending hold is active when:

```text
status = PENDING_PAYMENT
expiresAt > now
```

A pending hold is expired when:

```text
status = PENDING_PAYMENT
expiresAt <= now
```

Expired pending holds must not block public availability, reservation creation, or payment handoff.

The Phase 6 availability service already treats expired pending reservations as non-blocking. Future reservation creation code must preserve that behavior and must create new pending holds with a non-null `expiresAt`.

## Hold Duration

Initial MVP hold duration:

```text
15 minutes
```

This value should be centralized when reservation code is introduced. It must not be duplicated across route handlers or UI components.

The hold duration may be adjusted later after real payment testing, but the behavior must remain:

```text
No completed payment before expiration = no confirmed reservation.
```

## Availability Revalidation Points

Availability must be rechecked on the server at least twice:

```text
1. Before creating a PENDING_PAYMENT reservation.
2. Before preparing or returning payment handoff data.
```

When Tilopay webhook handling is introduced in Phase 9, the webhook path must also verify that the reservation is still eligible to be confirmed before setting `status = CONFIRMED`.

## Server-side Validation Requirements

The server must validate:

```text
Accommodation exists and is reservable.
Date range uses date-only YYYY-MM-DD boundaries.
checkInDate is inclusive.
checkOutDate is exclusive.
checkOutDate is after checkInDate.
Guest count is at least 1.
Guest count does not exceed accommodation capacity.
Availability is open for the requested range.
Composed listing dependencies are respected.
Preparation buffers are respected.
Expired pending holds are ignored.
Soft-deleted calendar blocks are ignored.
Admin-unlocked preparation buffers are ignored.
Subtotal, taxes, discounts, cleaning fee, total, and currency are calculated on the server.
Guest email is valid before a pending reservation is created.
```

Client-side validation may improve UX, but it is never the source of truth.

## Pricing Boundary

Phase 8.1 does not implement pricing code.

Phase 8.2 must define the server-side quote foundation.

The quote service must use server-controlled data only:

```text
base nightly price
number of nights
cleaning fee, if enabled later
taxes, if enabled later
discounts, if enabled later
currency = USD
```

The client must never send trusted totals to the server. Any client-provided amount is display-only and must be recalculated server-side.

## Payment Boundary

Phase 8 must not process payments.

Phase 8 may prepare the reservation state required for future payment handoff, but actual Tilopay behavior belongs to Phase 9.

The system must not set:

```text
status = CONFIRMED
confirmedAt = now
```

until payment validation exists and succeeds.

## Email Boundary

Phase 8 must not send Resend emails.

Reservation confirmation, payment failure, cancellation, and arrival instruction emails belong to Phase 10.

Phase 8 may collect the data needed for future email notifications, such as:

```text
guestName
guestEmail
arrivalTimeEstimate
reservation dates
accommodation name
```

## Calendar and Buffer Boundary

Pending holds block availability through the Reservation record while active.

Phase 8 must not create confirmed reservation preparation buffer blocks until payment confirmation exists.

Confirmed reservation buffer handling remains tied to later confirmation behavior. Availability can continue using derived preparation buffers for confirmed reservations until a later write flow persists them.

## Cancellation and Date Change Boundary

Guests must not modify confirmed reservation dates directly from the public website.

Date change and extension handling remain under the documented operational rule:

```text
Guest requests assistance.
Admin reviews availability.
Admin approves or rejects.
Additional payment is collected or recorded when needed.
```

Self-service confirmed reservation date modification is not part of Phase 8.

## Error Message Boundary

Future reservation route handlers and form UI must not expose raw Prisma, availability, Tilopay, Resend, Airbnb iCal, or provider errors.

User-facing errors must be centralized, reusable, and bilingual before they are displayed publicly.

## Concurrency Requirements

Future pending reservation creation must avoid double-booking by performing server-side availability revalidation immediately before creating the hold.

The intended sequence is:

```text
Validate input.
Calculate quote server-side.
Recheck availability server-side.
Create PENDING_PAYMENT reservation with expiresAt.
Return only safe reservation handoff data.
```

If two guests attempt to reserve overlapping dates, only the first active hold should succeed once it is written. The second request must fail after the availability recheck sees the first active hold.

## Safe Public Response Contract

Future public reservation responses may return safe fields such as:

```text
reservationId
status
expiresAt
property slug or accommodation id
checkInDate
checkOutDate
guestCount
total
currency
```

They must not return:

```text
provider secrets
payment provider raw payloads
admin notes
internal audit metadata
raw database errors
Airbnb iCal URLs or tokens
exportTokenHash
```

## Phase 8.2 Handoff

The next subphase is:

```text
8.2 Reservation quote and server-side pricing foundation
```

Phase 8.2 should add the quote foundation only.

It should not create reservations, start checkout, call Tilopay, send Resend emails, add migration files, seed data, admin reservation UI, deployment configuration, or PMS features.
