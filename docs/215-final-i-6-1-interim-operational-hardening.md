# 215 - Final-I.6.1: Interim Operational Hardening

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.1 - Interim Operational Hardening
Status: Registered / implementation not started
Final-I.6.1 status: Registered / implementation not started
Registration record: docs/215-final-i-6-1-interim-operational-hardening.md
Registration base: 1fd728567b739100e51dea41aeb6da3f23cc6c19
Final-I.6 status: Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.1 is an owner-requested, provider-independent interim hardening package registered while Final-I.7 remains blocked by missing official INFILE technical documentation and Test credentials. This registration does not reopen Final-I.6, does not replace the accepted Final-I.6 feature head, does not supersede Final-I.7, and does not implement runtime changes.

## Purpose

Register five bounded workstreams that improve operational correctness and Admin UX before INFILE provider integration can begin:

```text
A - Guest phone-country inference
B - GuestPaymentRequest expiration cron
C - Financial Admin Web Push notifications
D - Reservation Additional Charges nested tabs + single accordions
E - Zoho exact-recipient suppression / DMARC false-positive fix
```

Implementation must proceed in this order:

```text
1. E - Zoho exact-recipient suppression
2. A - Guest phone-country inference
3. B+C - GuestPaymentRequest expiration cron + financial Admin Push foundation
4. D - Additional Charges tabs + accordions
5. Integrated regression + Hosted owner acceptance
```

This ordering fixes the active false-notification defect first, keeps the phone-country inference self-contained, allows B and C to share one deliberate enum/schema migration if needed, leaves the UI-heavy Additional Charges work after domain/runtime changes, and reserves integrated validation for the end.

## Workstream A - Guest Phone-Country Inference

Owner requirement: when a guest opens the Reservation request form, TRP should attempt to infer the guest's current country and preselect the corresponding phone country/dial code instead of immediately defaulting to Guatemala.

Frozen architecture:

```text
Target signal: x-vercel-ip-country
Expected value: ISO-3166-1 alpha-2 country code, for example GT, US, MX
Existing country catalog: lib/geo/countries.ts
Existing Reservation form: features/reservations/components/reservation-request-form.tsx
Fallback: GT
```

The future implementation must:

```text
- use coarse Vercel request-IP country metadata only;
- validate the ISO2 value against the supported phone-country catalog;
- preselect the inferred country only when valid and when the guest has not manually chosen a country;
- keep GT fallback for local development, missing headers, invalid headers, and unsupported countries;
- allow the guest to override the inferred/default country;
- never overwrite a manual guest selection with a later asynchronous inference result;
- avoid browser GPS/geolocation permission prompts;
- avoid external geolocation providers or paid services;
- avoid adding @vercel/functions solely for this if the existing request header is enough;
- avoid persisting raw IP, city, latitude, longitude, postal code, or other geolocation metadata.
```

The inferred country is only a convenience default and must never be treated as authoritative identity, residency, or location evidence. Reservation persistence continues to store only the country/phone fields already intended by the booking contract.

## Workstream B - GuestPaymentRequest Expiration Cron

Current behavior: GuestPaymentRequest expiration exists lazily in multiple flows, including `expirePendingRequestByHash(...)` in `lib/payments/guest-payment-request-payment.ts` and reservation-scoped `expirePendingRequests(...)` in `lib/admin/additional-charges.ts`.

Target future domain:

```text
expirePendingGuestPaymentRequests(...)
```

The canonical expiration service must globally transition only:

```text
GuestPaymentRequest.status == PENDING
AND expiresAt <= now
-> EXPIRED
```

It must not cancel charges, mark charges paid, alter Reservation totals, alter payment evidence, or mutate already `PAID`, `CANCELLED`, or `EXPIRED` requests. Existing lazy expiration paths should reuse the canonical domain where practical instead of maintaining divergent rules.

Future cron registration concept:

```text
key: EXPIRE_GUEST_PAYMENT_REQUESTS
slug: expire-guest-payment-requests
recommended schedule metadata: */5 * * * *
```

The cron must appear in Admin `Tareas programadas / Scheduled tasks`, support the existing protected manual-run workflow, and expose bounded safe result evidence such as `expiredCount` and `expiredAt`.

Final-I.6.1 must not activate Production scheduling. `vercel.json` remains empty/no scheduled registrations during the pre-Production track. A protected `/api/cron/expire-guest-payment-requests` route may be added consistently with the existing cron architecture when implementation begins, while actual Production scheduler registration remains Phase 13 work.

This workstream is expected to extend the existing `CronJobKey` contract and may require a migration.

## Workstream C - Financial Admin Web Push Notifications

Add three new ADMIN operational notification classes in the existing AdminNotification/AdminPushDelivery architecture:

```text
ADDITIONAL_CHARGE_PAID
LIFECYCLE_ADJUSTMENT_PAID
REFUND_PROCESSED
```

Exact enum naming may be refined during implementation only if existing conventions justify it, but the semantics must remain unambiguous. All three notifications target `/admin/reservations/{reservationId}` and must reuse the existing notification center, Android PWA/Web Push, shared target resolver, deduplication/idempotency architecture, and best-effort post-commit delivery behavior. Do not create a second notification system.

### C1 - Additional-Charge Payment Received

Trigger only after the additional-charge payment is authoritatively committed as approved and:

```text
GuestPaymentRequest -> PAID
AdditionalCharge(s) -> PAID
Payment -> APPROVED
```

Current transaction point: `lib/payments/guest-payment-request-payment.ts`.

Do not notify from an unvalidated client callback. Use an idempotent deduplication key tied to the canonical payment/request identity. Lock-screen Push content remains bounded and must not include financial amounts or sensitive payment data.

Conceptual titles:

```text
ES: Pago de cargo adicional recibido · <huesped> · <alojamiento>
EN: Additional charge payment received · <guest> · <property>
```

### C2 - Stay-Adjustment Payment Received

Trigger when an approved `PaymentPurpose.LIFECYCLE_ADJUSTMENT` successfully completes the paid date mutation.

Current canonical completion path: `completePaidDateMutation(...)`.

Do not notify for zero-difference mutations and do not notify merely because a payment row exists. The notification is tied to successful completion of the paid lifecycle adjustment.

Conceptual titles:

```text
ES: Pago de ajuste de estadia recibido · <huesped> · <alojamiento>
EN: Stay adjustment payment received · <guest> · <property>
```

### C3 - Refund Processed

Notify when a Refund actually reaches a completed successful state. Current successful state: `RefundStatus.APPROVED`.

Do not notify for `PENDING`, `PROCESSING`, or `FAILED`. Cover all current refund families that produce a successful Refund: Reservation/cancellation refunds, lifecycle/date-change refunds, additional-charge refunds, and compensating refunds once actually processed. Use `refundId` as the canonical deduplication identity. Lock-screen Push content must not expose refund amount.

Conceptual titles:

```text
ES: Reembolso procesado · <huesped> · <alojamiento>
EN: Refund processed · <guest> · <property>
```

The AdminNotification enum extension may share the same Final-I.6.1 migration as the new CronJobKey extension. Do not create unnecessary migrations.

## Workstream D - Additional Charges Tabs + Accordions

Current component:

```text
features/admin/components/admin-additional-charges-section.tsx
```

Inside the existing outer Reservation tab `Cargos adicionales / Additional charges`, add two design-system tabs:

```text
Cargos / Charges
Solicitudes de pago / Payment requests
```

Default tab: `Cargos / Charges`.

The Charges tab contains all existing Additional Charges functionality except the current Guest payment requests section. Charge creation, selection, payment-request creation action, charge records, refund actions/history, and related charge functionality remain under Charges.

The Payment requests tab contains only the current Guest payment requests section and its existing functionality:

```text
- request status
- expiry
- request items
- total
- copy payment link
- cancel request
- email-delivery history
- resend controls
- existing request-specific actions
```

Do not duplicate data between tabs.

Both lists become single-item collapsible accordions using the existing project Accordion component:

```text
Accordion type="single" collapsible
```

Requirements:

```text
- only one Charge detail may be expanded at a time;
- opening another Charge closes the previous one;
- the currently open Charge can be collapsed;
- only one Payment Request detail may be expanded at a time;
- opening another Request closes the previous one;
- the currently open Request can be collapsed;
- existing actions and information remain available;
- mobile responsiveness and accessibility are preserved;
- no native browser UI is introduced;
- visible copy stays centralized in messages/es.ts and messages/en.ts.
```

Do not place interactive Buttons inside an AccordionTrigger if that would create nested buttons or invalid interactive markup. Charge selection must remain accessible through a non-nested design, such as a sibling/action area or another appropriate design-system control. Existing nested refund-history Accordion inside an expanded Charge must remain functional.

## Workstream E - Zoho Exact-Recipient Suppression

Current root cause: `getAcceptedZohoMailRecipientAddresses(...)` already returns the exact accepted correspondence addresses:

```text
admin@<correspondence-domain>
reservas@<correspondence-domain>
reservations@<correspondence-domain>
```

However, `isAcceptedZohoMailRecipient(...)` currently accepts an inbound event when any recipient merely belongs to the correspondence domain. That lets unrelated same-domain aliases enter the guest-email notification pipeline and explains the owner-observed false mobile Push for DMARC Reports. The same architecture can affect DMARC Forensic.

Target future behavior:

```text
same correspondence domain -> not enough
exact normalized accepted recipient address -> required
```

An inbound Zoho event proceeds toward guest correspondence only if at least one normalized `toAddress` exactly matches the accepted allowlist. Any other same-domain mailbox or alias must be ignored before Reservation matching, `ZohoInboundEmailEvent` persistence, `AdminNotification`, `AdminPushDelivery`, and Web Push.

Do not hardcode a broad DMARC subject/sender filter. The fix must be recipient-based because exact recipient acceptance is the trust boundary. Preserve webhook signature verification, bootstrap behavior, Limited Data parsing, internal-sender suppression, deduplication, and genuine guest-email behavior for the three accepted correspondence addresses.

Regression coverage must prove that arbitrary same-domain but non-accepted recipients are ignored. If stable DMARC Reports/Forensic aliases are already documented in the repository, add explicit regression cases for them; do not invent undocumented addresses.

## Strict Boundaries

This registration does not implement:

```text
- runtime TS/TSX behavior
- Prisma schema changes
- migrations
- cron registry changes
- notification enum changes
- Reservation form changes
- Additional Charges UI changes
- Zoho webhook/runtime changes
- payment/refund behavior changes
- environment variables
- dependencies
- vercel.json changes
- INFILE work
- Production resources
- Phase 13 activation
```

`vercel.json` remains `{ "crons": [] }` until a later explicitly requested implementation still preserving the pre-Production scheduler boundary.

## Validation Ledger

```text
Final-I.6.1 registration validation:
- npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only
```
