# 06 — Security and Payments

## Payment Provider

Initial provider:

```text
Tilopay
```

Development starts with Tilopay sandbox. Production uses the official company affiliation when ready.

## Payment Architecture

Use a payment abstraction:

```text
ReservationService
    |
    v
PaymentService
    |
    v
TilopayPaymentProvider
```

Do not spread provider-specific code throughout the project.

## Payment Flow

```text
1. Guest selects property, dates, guest count, and estimated arrival time.
2. Server validates availability.
3. Server calculates price.
4. Server creates reservation as PENDING_PAYMENT.
5. Server creates Tilopay transaction.
6. Guest completes payment.
7. Tilopay sends webhook / trusted confirmation.
8. Server validates webhook.
9. Server re-checks reservation and payment amount.
10. Server confirms reservation.
11. Server blocks dates.
12. Server sends confirmation email.
```

## Critical Rule

```text
No trusted payment confirmation = no confirmed reservation.
```

The guest returning to the success page is not enough to confirm the reservation.

## Payment Data Safety

Never store:

```text
Card numbers
CVV
Raw card data
Sensitive cardholder authentication data
```

Store only:

```text
Provider transaction ID
Payment status
Amount
Currency
Timestamps
Non-sensitive provider reference
Webhook payload only if safe and necessary
```

If raw payloads are stored, sanitize or restrict access.

## Amount Validation

The server must calculate all totals.

Never trust:

```text
Frontend-submitted total
Frontend-submitted nightly price
Frontend-submitted discount
Frontend-submitted taxes
```

Before confirming a payment, verify:

```text
Payment amount matches reservation total
Payment currency matches reservation currency
Reservation is still valid
Reservation has not expired
Dates are still available or already held by the same pending reservation
```

## Reservation Expiration

Pending reservations should expire automatically.

Recommended initial value:

```text
15 minutes
```

Expired reservations should not block dates.

## Cancellation Policy

Recommended policy:

```text
Free cancellation during the first 24 hours after booking, as long as check-in is at least 7 days away.

Full refund if cancelled 7 or more days before check-in.

50% refund if cancelled between 3 and 6 days before check-in.

No refund if cancelled within the last 72 hours before check-in.

Payment processing fees may be non-refundable if Tilopay or the bank does not return them.
```

This must be confirmed before production.


## Reservation Date Changes and Stay Extensions

Confirmed reservation dates must not be modified directly by guests from the public website.

Default guest-facing rule:

```text
The guest must request assistance from the host/admin, or cancel and create a new reservation according to the cancellation policy.
```

Admin-approved date changes must:

```text
Re-check availability on the server
Validate composed listing conflicts
Validate preparation buffer conflicts
Recalculate totals on the server
Collect or record additional payment before confirming if the total increases
Apply the cancellation/refund policy if the total decreases
Create an audit log
Send updated confirmation email if applicable
```

If a guest wants to extend their stay while already on the property:

```text
Admin checks availability first
System calculates additional nights and total
Additional payment is collected or recorded
Reservation is updated or a linked extension reservation is created
Preparation buffers are recalculated
Airbnb iCal export is updated
```

No date change or extension should be treated as confirmed without availability validation and payment validation when additional payment is required.

## Preparation Buffer Blocks

When a reservation is confirmed or an Airbnb booking is imported, the system must automatically create preparation buffer blocks.

Initial rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

Preparation buffer blocks must:

```text
Block public availability
Be shown in the admin calendar
Be exported to Airbnb through TRP Booking iCal
Be manually unlockable by admin
Create audit logs when unlocked
```

## Refunds

Refund types:

```text
Full refund
Partial refund
No refund
Manual refund record
```

If Tilopay refund API is available:

```text
Admin action -> RefundService -> Tilopay refund API -> Refund record
```

If not available or if manual processing is needed:

```text
Admin action -> Manual refund record -> Audit log
```

## Webhook Security

Tilopay webhook route:

```text
/api/webhooks/tilopay
```

Requirements:

```text
Validate webhook secret/signature if available
Use idempotency checks
Ignore duplicate webhooks safely
Never expose webhook secrets
Log webhook event status
Return appropriate HTTP status
```

## Admin Security

Protect all admin routes:

```text
/admin/**
```

Protect all admin APIs and server actions.

Critical admin actions require audit logs:

```text
Cancel reservation
Change reservation dates
Approve stay extension
Issue refund
Change price
Change iCal URL
Force calendar sync
Create manual block
Unlock preparation buffer
Delete image
```

## Cron Security

Cron endpoint:

```text
/api/cron/sync-airbnb-calendars
```

Must validate:

```text
CRON_SECRET
```

Do not allow public unauthenticated execution.

## Secret Management

Secrets live only in environment variables or secure provider dashboards.

Examples:

```text
DATABASE_URL
AUTH_SECRET
TILOPAY_API_KEY
TILOPAY_SECRET
TILOPAY_WEBHOOK_SECRET
CLOUDINARY_API_SECRET
RESEND_API_KEY
CRON_SECRET
```

Never commit secrets to GitHub.

## Error Message Standards

All user-facing error messages must be centralized and reusable.

Do not hardcode random error messages inside components, services, route handlers, or server actions.

Errors must be grouped by domain:

```text
reservationErrors
paymentErrors
calendarErrors
authErrors
uploadErrors
formValidationErrors
```

Public payment and security errors must be safe, friendly, and localized.

Examples:

```text
The selected dates are no longer available.
The payment could not be completed.
Your reservation expired before payment was completed.
We could not synchronize the calendar. Please try again or contact support.
```

Do not show raw Tilopay, database, webhook, Cloudinary, Resend, or stack trace errors to public users.

Admin-facing errors may include more context, but must never expose secrets, tokens, card data, webhook secrets, or full Airbnb iCal URLs.
