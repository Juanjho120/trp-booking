# 05 — Development Standards

## Principles

TRP Booking must be built with clarity, safety, and maintainability.

Priorities:

```text
Reservation correctness
Payment safety
Calendar accuracy
Public performance
SEO
Clean architecture
Minimal PMS creep
```

## TypeScript

Use TypeScript strict mode.

```text
strict: true
```

Avoid `any` unless there is a documented reason.

## Validation

Use Zod or an equivalent validation library for:

```text
Form inputs
Server actions
API route payloads
Webhook payloads
Environment variables
Admin forms
Reservation requests
Payment requests
```

All critical validation must happen server-side.

## Business Logic Placement

Do not put business logic inside UI components.

Use service modules for:

```text
Availability calculation
Reservation creation
Payment creation
Refund calculation
Cancellation policy
Calendar synchronization
Email sending
```

## Server-Side Rules

The server must always validate:

```text
Property exists
Property is active
Dates are valid
Check-out is after check-in
Guest count does not exceed max guests
Dates are available
Price was calculated server-side
Reservation has not expired
Payment amount matches reservation total
Webhook is trusted
```

## Frontend Rules

Frontend may improve UX but must not be trusted for final decisions.

Frontend can:

```text
Show calendars
Suggest available dates
Show estimated totals
Display validation messages
Guide the user through checkout
```

Frontend cannot be the source of truth for:

```text
Availability
Pricing
Payment confirmation
Refund eligibility
Reservation status
```

## Prisma

Use Prisma migrations for schema changes.

Do not manually alter production database structure outside migrations unless it is an emergency and documented afterward.

## Environment Variables

Centralize environment validation.

Suggested file:

```text
lib/env.ts
```

Never read `process.env` throughout the app without validation and typing.

## Error Handling

Use clear error boundaries and structured server errors.

Do not expose sensitive provider errors to public users.

Public errors should be user-friendly:

```text
The selected dates are no longer available.
The payment could not be completed.
Please try again or contact us.
```

Admin errors can be more detailed but must not expose secrets.


## Centralized Error Messages

All user-facing error messages must be centralized, typed, reusable, and ready for Spanish/English localization.

Do not hardcode arbitrary user-facing messages inside:

```text
Components
Server actions
API routes
Services
Payment providers
Calendar sync modules
Upload handlers
Database/repository modules
```

Errors must be grouped by domain, for example:

```text
reservation
payment
calendar
auth
upload
validation
admin
system
```

Suggested structure:

```text
lib/errors/error-codes.ts
lib/errors/public-messages.ts
lib/errors/server-errors.ts
messages/es/errors.json
messages/en/errors.json
```

Public UI should render localized messages by key, not raw provider/database errors.

Example keys:

```text
errors.reservation.unavailableDates
errors.reservation.expiredPendingReservation
errors.payment.failed
errors.calendar.syncFailed
errors.upload.invalidFileType
errors.validation.requiredField
```

Raw errors from Tilopay, Prisma, Cloudinary, Resend, Airbnb iCal parsing, or server internals must be logged safely and mapped to friendly public messages.

## Logging

Log critical operations:

```text
Reservation created
Payment initiated
Webhook received
Payment approved
Payment failed
Reservation confirmed
Reservation expired
Reservation cancelled
Reservation dates changed
Stay extension approved
Preparation buffer unlocked
Refund requested
Refund completed
Airbnb sync started
Airbnb sync completed
Airbnb sync failed
Manual calendar block created
```

Avoid logging:

```text
Full secrets
Card details
Full iCal URLs with tokens
Raw sensitive guest data beyond what is necessary
```

## Testing Priorities

Tests should cover:

```text
Overlapping reservation prevention
Composed listing availability
Preparation buffer block generation and admin unlock
Reservation date change and extension validation
Pending reservation expiration
Payment amount validation
Webhook confirmation flow
Cancellation policy calculation
Refund eligibility calculation
iCal import parsing
iCal export generation
Admin route protection
```


## Reservation Change and Extension Standards

Guests must not be able to directly edit confirmed reservation dates from the public website.

Any reservation date change must be handled by admin authorization or cancellation plus a new reservation.

Server-side requirements for admin-approved changes or extensions:

```text
Check current reservation status
Check availability for the requested new dates
Apply composed listing availability rules
Apply preparation buffer rules
Recalculate price server-side
Collect or record additional payment if total increases
Apply cancellation/refund policy if total decreases
Create admin audit log
Send appropriate email notification if needed
```

Stay extensions while a guest is already on the property must follow the same availability and payment rules before the extended dates are considered confirmed.

## Preparation Buffer Standards

The availability engine must automatically generate preparation buffer blocks around confirmed reservations and imported Airbnb bookings.

Initial buffer rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

Preparation buffers must:

```text
Block public availability
Appear in the admin calendar
Be included in iCal exports to Airbnb
Be unlockable by admin
Create audit logs when manually unlocked
```

## UI Standards

The public site must be:

```text
Responsive
Mobile-first
Fast
Accessible
SEO-friendly
Photo-focused
Trustworthy
Bilingual
```

Avoid native `confirm()` for destructive admin actions. Use proper modal components.

## Dependency Rules

Before adding a dependency:

```text
Check if it is necessary
Check maintenance status
Check bundle impact
Check security reputation
Document why it is used if it affects architecture
```

## Commit / Phase Discipline

Work by phases.

Each phase should have:

```text
Clear scope
Small commits
Documented changes
No unrelated refactors
No hidden scope expansion
```

## No PMS Creep

If a feature starts looking like internal operations, maintenance, inventory, purchases, full accounting, or staff management, it likely belongs in TAMIAS and not in TRP Booking.

## User Interface Standards

The project must not use unstyled native browser UI for user-facing booking, payment, calendar, modal, select, alert, confirmation, or form interactions.

All interactive UI must be implemented using the approved design system.

Approved UI approach:

- shadcn/ui
- Radix UI primitives
- Tailwind CSS
- React DayPicker for booking date range selection
- React Hook Form + Zod for forms and validation

Disallowed user-facing patterns:

- Native `alert()`
- Native `confirm()`
- Native `prompt()`
- Unstyled `<select>` controls
- Browser-default `input type="date"` as the main booking calendar
- Browser-default modal/dialog behavior
- Unstyled payment or reservation forms

## Deletion Rules

Do not hard-delete business-critical data.

Reservations, payments, refunds, guests, calendar blocks, and synchronization records must be preserved for auditability and troubleshooting.

When the UI exposes a delete action for business data, it must perform a soft delete unless the documentation explicitly allows hard delete for that table.
