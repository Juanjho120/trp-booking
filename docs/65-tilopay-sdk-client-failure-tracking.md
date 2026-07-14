# 65 — Tilopay SDK Client Failure Tracking

## Status

Prepared during Phase 9 sandbox testing.

## Context

Manual testing showed that `/api/payments/tilopay/preflight` can correctly return `READY_FOR_PAYMENT`, but `Tilopay.startPayment()` may still fail or return a non-success result before the redirect/consult flow starts.

That case is different from a rejected payment result:

```text
Preflight OK -> Tilopay.startPayment() failed before redirect.
```

Because there is no redirect and no `/consult` result yet, the failure must not be stored as the final `Payment.rawPayload`, and it must not change `Payment.status`.

## Fix

A new append-only table stores only safe operational telemetry:

```text
payment_client_events
```

Tracked cases:

```text
TILOPAY_SDK_START_PAYMENT_FAILED
TILOPAY_SDK_START_PAYMENT_NON_SUCCESS
```

The frontend records the event only after:

```text
1. Server-side preflight succeeded.
2. `Tilopay.startPayment()` failed or returned a non-success message.
```

## Stored metadata

Allowed:

```text
paymentId
reservationId
provider
eventType
environment
locale
paymentMethodId
paymentMethodName
paymentMethodType
detectedCardBrand
sdkMessage
sanitized sdkPayload
preflightStatus
preflightExpiresAt
createdAt
```

Forbidden:

```text
card number
CVV
expiration date
cardholder-sensitive input values
raw DOM input values
```

## Behavior

```text
- Payment.status is not changed.
- Reservation.status is not changed.
- The guest still sees the existing localized generic payment message.
- Telemetry failure never blocks the guest flow.
```

## OrderHash note

This change does not change OrderHash behavior.

Sandbox can continue allowing `sandbox_mismatch_allowed` while `/consult` validates amount, currency, order, and approval.

Production must remain strict until Tilopay confirms the exact V2 HMAC signing formula and the implementation produces `orderHash = valid`.

## Validation

Run after applying the ZIP:

```bash
npm run db:migrate:dev
npm run build
```

Manual test:

```text
1. Create a pending reservation.
2. Prepare secure payment.
3. Use a card that causes Tilopay.startPayment() to fail before redirect.
4. Confirm Payment.status remains PENDING.
5. Confirm Reservation.status remains PENDING_PAYMENT.
6. Confirm a row exists in payment_client_events.
```

Example query:

```sql
select
  id,
  payment_id,
  reservation_id,
  event_type,
  environment,
  locale,
  payment_method_name,
  payment_method_type,
  detected_card_brand,
  sdk_message,
  preflight_status,
  preflight_expires_at,
  created_at
from payment_client_events
order by created_at desc
limit 20;
```
