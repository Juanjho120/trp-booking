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

## What was added

```text
app/admin/page.tsx
features/admin/components/admin-reservation-payment-review-shell.tsx
lib/admin/reservation-payment-review.ts
lib/admin/index.ts
types/admin-reservation-payment-review.ts
messages/es.ts
messages/en.ts
```

The `/admin` route now loads a server-side review snapshot and renders it inside the protected admin page.

The admin dashboard consumes `messages.admin.review` through the shared client `useLocale()` hook. The header includes the shared `LocaleSwitcher`, so the admin page can change between Spanish and English without adding feature-local copy.

## Visible information

### Reservations

The admin review shows recent direct reservations with:

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
Reservation.status, localized for admin display
Latest payment status, localized for admin display
Total and currency
expiresAt
confirmedAt
createdAt
```

### Payments

The admin review shows recent payments with:

```text
Payment ID
Reservation ID
Accommodation
Guest name
Provider
providerReference / orderNumber
providerTransactionId
Payment.status, localized for admin display
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

The admin review shows recent `payment_client_events` rows with:

```text
eventType, localized for known SDK event types
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

## Copy and i18n boundary

Admin-facing copy must stay centralized in:

```text
messages/es.ts
messages/en.ts
```

The admin review dashboard must not introduce feature-local visible copy files. It uses:

```text
messages.admin.review
messages.admin.shell
features/i18n/LocaleSwitcher
features/i18n/use-locale.tsx
```

The dashboard may show operational data values from the database or Tilopay diagnostics, but labels, titles, notes, guardrails, empty states, and known status/event display text must remain localized.

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
4. Confirm the ES/EN locale switcher is visible in the admin header.
5. Switch to EN and confirm section titles, labels, notes, guardrails, statuses, and known SDK event names change to English.
6. Switch back to ES and confirm the same UI text returns to Spanish.
7. Confirm recent reservations are visible when data exists.
8. Confirm recent payments are visible when data exists.
9. Confirm recent SDK client events are visible when data exists.
10. Confirm no card number, CVV, expiration, or tokenized card data is shown.
11. Confirm there are no admin buttons/actions to confirm, cancel, refund, or modify reservations.
```

## Next subphase

```text
9.8 — Automatic preparation buffers in availability
```
