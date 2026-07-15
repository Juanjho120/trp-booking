# 69 — Admin Reservation and Payment Review

## Phase

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Subphase: 9.7 Admin reservation and payment review
Status: Completed
```

## Goal

Add a protected, read-only admin review page that gives operational visibility into direct reservations, payment states, and safe Tilopay diagnostics before changing preparation-buffer behavior in Phase 9.8.

This subphase does not add PMS behavior and does not let admin users modify reservation or payment state.

## Context

Phase 9.6 confirmed reservations only after validated server-side payment approval.

Phase 9.6.1 then hardened the sandbox payment flow with:

```text
- strict OrderHash behavior
- Tilopay preflight validation
- retryable payment issue mapping
- payment result status localization
- safe SDK client failure tracking
- checkout UX improvements
```

After those changes, the admin area still only had the minimal protected shell. Phase 9.7 closes that operational visibility gap without adding actions.

## What was added or updated

```text
app/admin/page.tsx
features/admin/components/admin-reservation-payment-review-shell.tsx
features/admin/admin-review-copy.ts cleared of visible copy after i18n fix
lib/admin/reservation-payment-review.ts
lib/admin/index.ts
types/admin-reservation-payment-review.ts
messages/es.ts
messages/en.ts
```

The `/admin` route now loads a server-side review snapshot and renders it inside the protected admin page.

## Copy and i18n boundary

Admin-facing copy for this review must be centralized in:

```text
messages/es.ts
messages/en.ts
```

The admin review component must read copy from:

```text
messages.admin.review
```

Feature-local visible copy files are not allowed for public or admin UI. The previous `features/admin/admin-review-copy.ts` was cleared of visible copy and kept only as a non-user-facing placeholder for ZIP copy-paste cleanup. It should not be imported by new code.

## Visible information

### Reservations

The admin review shows recent direct reservations with localized labels:

```text
Reservation ID
Accommodation
Guest name
Guest email
Guest phone, when present
Guest country, when present
Check-in date
Check-out date
Guest count
Reservation.status as a localized label
Latest payment status as a localized label
Total and currency
expiresAt
confirmedAt
createdAt
```

### Payments

The admin review shows recent payments with localized labels:

```text
Payment ID
Reservation ID
Accommodation
Guest name
Provider
providerReference / orderNumber
providerTransactionId
Payment.status as a localized label
Amount and currency
paidAt
failedAt
createdAt
updatedAt
```

### Safe Tilopay diagnostics

The admin review summarizes safe operational fields extracted from `Payment.rawPayload` when present:

```text
providerCode
providerMessage
authorization
providerOrder
tilopayTransaction / TPT
orderHashStatus / phaseBoundary
```

This is intentionally a summary, not a raw JSON viewer.

### Tilopay SDK client events

The admin review shows recent `payment_client_events` rows with localized event labels when the event type is known:

```text
eventType
paymentId
reservationId
environment
locale
paymentMethodName / paymentMethodType
detectedCardBrand
sdkMessage
preflightStatus
preflightExpiresAt
createdAt
```

## Security and privacy rules

The admin review must never show:

```text
card number
CVV
expiration date
tokenized card data
raw cardholder form input values
```

This matches the Phase 9 payment boundary: TRP Booking does not read, store, log, or send card number, CVV, expiration, or tokenized card data to its backend.

## Read-only boundary

Phase 9.7 intentionally does not add:

```text
manual reservation confirmation
manual reservation cancellation
refund processing
date-change handling
stay-extension handling
calendar editing
preparation-buffer configuration
preparation-buffer unlock behavior
email sending
PMS behavior
```

Payment-driven reservation confirmation remains the only confirmation path:

```text
Payment.status = APPROVED after server-side validation
-> Reservation.status = CONFIRMED
```

Admin cannot bypass that flow in 9.7.

## Database and migration impact

```text
No Prisma schema change.
No migration.
```

Phase 9.7 only reads existing tables:

```text
reservations
payments
payment_client_events
properties
```

## Why this is before 9.8 buffers

Phase 9.8 will change availability behavior by making preparation buffers affect public availability for confirmed reservations and active pending holds.

Before changing availability rules, admin needed a safe way to inspect:

```text
which reservations exist
which reservation statuses are present
which payments exist
which payment statuses are present
whether Tilopay diagnostics exist for support/debugging
```

That visibility is now available through `/admin`.

## Validation

Run after applying the files:

```powershell
npm run db:validate
npm run lint
npm run build
```

Manual check:

```text
1. Sign in with an allowed admin email.
2. Open /admin.
3. Confirm the page loads without exposing public access.
4. Confirm recent reservations are visible when data exists.
5. Confirm recent payments are visible when data exists.
6. Confirm recent SDK client events are visible when data exists.
7. Confirm visible admin copy comes from messages/es.ts and messages/en.ts.
8. Confirm reservation and payment statuses are localized in the admin dashboard.
9. Confirm no card number, CVV, expiration, or tokenized card data is shown.
10. Confirm there are no admin buttons/actions to confirm, cancel, refund, or modify reservations.
```

## Next subphase

```text
9.8 — Automatic preparation buffers in availability
```
