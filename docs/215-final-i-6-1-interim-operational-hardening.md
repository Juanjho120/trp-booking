# 215 - Final-I.6.1: Interim Operational Hardening

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.1 - Interim Operational Hardening
Status: Implementation in progress
Final-I.6.1 status: Implementation in progress
Registration record: docs/215-final-i-6-1-interim-operational-hardening.md
Registration base: 1fd728567b739100e51dea41aeb6da3f23cc6c19
Workstream E status: Completed; provider trigger configuration + Hosted validation PASS on 2026-10-02
Workstream A status: Confidence hardening implemented; Hosted owner revalidation pending
Workstream B+C status: Not started
Workstream D status: Not started
Final-I.6 status: Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.1 is an owner-requested, provider-independent interim hardening package registered while Final-I.7 remains blocked by missing official INFILE technical documentation and Test credentials. Workstream E is completed through provider-side Zoho trigger configuration plus Hosted validation PASS on 2026-10-02. Workstream A confidence hardening is implemented as a bounded guest phone-country convenience default and remains pending Hosted owner revalidation. This does not reopen Final-I.6, does not replace the accepted Final-I.6 feature head, and does not supersede Final-I.7.

## Purpose

Register five bounded workstreams that improve operational correctness and Admin UX before INFILE provider integration can begin:

```text
A - Guest phone-country inference
B - GuestPaymentRequest expiration cron
C - Financial Admin Web Push notifications
D - Reservation Additional Charges nested tabs + single accordions
E - Zoho guest-correspondence trigger hardening / DMARC false-positive fix
```

Implementation must proceed in this order:

```text
1. E - Zoho guest-correspondence trigger hardening
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
Signals: browser IANA timezone + x-vercel-ip-country
Priority: MANUAL > uniquely attributable browser timezone country > Vercel IP country > GT fallback
Expected IP-country value: ISO-3166-1 alpha-2 country code, for example GT, US, MX
Expected timezone value: IANA timezone name, for example America/Guatemala
Timezone data source: countries-and-timezones ^3.10.0 static local data
Existing country catalog: lib/geo/countries.ts
Existing Reservation form: features/reservations/components/reservation-request-form.tsx
Fallback: GT
```

The implementation:

```text
- uses browser IANA timezone as the stronger non-authoritative convenience signal only when it maps to exactly one supported phone country;
- treats multi-country timezone mappings as ambiguous and falls through to the Vercel IP-country signal;
- uses coarse Vercel request-IP country metadata only through the `x-vercel-ip-country` header;
- exposes a public read-only `GET /api/geo/phone-country` endpoint returning only `{ country }`;
- validates the ISO2 value with `normalizeSupportedCountryCode(...)` from the supported phone-country catalog;
- keeps the public property page cacheable with `export const revalidate = 300` and no `headers()` call;
- preselects the inferred country only after mount, only when valid, and only when the guest has not manually chosen a country;
- keeps GT/+502 as the visible fallback for local development, missing headers, invalid headers, and unsupported countries;
- allows the guest to override the inferred/default country;
- never overwrites a manual guest selection with a later asynchronous inference result;
- avoids browser GPS/geolocation permission prompts;
- avoids external geolocation providers or paid services;
- avoids adding @vercel/functions;
- avoids sending browser timezone to the server, endpoint, headers, request body, database, Reservation records, audit records, or analytics;
- avoids persisting raw IP, city, latitude, longitude, postal code, provider geo metadata, browser timezone, inferred metadata, or any inferred-country field.
```

Initial Workstream A Hosted validation discovered a real IP-country false positive: physical Guatemala / VPN OFF / Vercel country US. The confidence hardening keeps the original bounded endpoint but resolves the client-side convenience default through `resolvePhoneCountryInference(...)`, where `America/Guatemala` wins over `US`, ambiguous timezones return null, invalid or missing timezones fall back to the validated IP country, and manual guest selection remains authoritative.

The inferred country is only a convenience default and must never be treated as authoritative identity, residency, or location evidence. Reservation persistence continues to store only the existing booking contract fields: `guestCountry`, `countryDialCode`, and `guestPhoneLocal`.

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

## Workstream E - Zoho Guest-Correspondence Trigger Hardening

Status:

```text
Workstream E status: Completed; provider trigger configuration + Hosted validation PASS on 2026-10-02
```

The initial I.6.1 registration described Workstream E as a runtime change from correspondence-domain matching to exact accepted-alias matching. That is not the accepted architecture and must not be implemented.

Final-F.7 Hosted Test established that Zoho Mail Limited Data may expose the active mailbox-normalized recipient address even when the original email was sent to an intended public alias such as `reservas@juantzun.dev`. Because of that provider behavior, TRP runtime acceptance intentionally remains domain-based after exact email parsing:

```text
Local/Test accepted domain: juantzun.dev
Production accepted domain: turefugioperfecto.com
```

`getAcceptedZohoMailRecipientAddresses(...)` remains the documented intended correspondence-address contract:

```text
Local/Test:
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev

Production:
admin@turefugioperfecto.com
reservas@turefugioperfecto.com
reservations@turefugioperfecto.com
```

Do not replace `isAcceptedZohoMailRecipient(...)` with exact-alias runtime matching unless new provider evidence proves Zoho Limited Data always exposes the original alias without mailbox normalization. The current runtime guard still rejects outside-domain recipients and domain lookalikes such as `eviljuantzun.dev` and `juantzun.dev.attacker.example`.

### Corrected Root Cause

The accepted Zoho outgoing webhook configuration is currently:

```text
Entity: Mail
Condition Type: No conditions. All incoming emails
Limited Data List: ON
Status: Enabled
```

With `No conditions. All incoming emails`, Zoho can trigger TRP for unrelated same-mailbox traffic such as DMARC Reports and potentially DMARC Forensic. If Zoho's Limited Data representation exposes a recipient at the active correspondence domain, TRP can correctly pass the domain guard even though the original incoming email was not intended guest/admin correspondence.

The trust boundary therefore belongs at provider trigger scope:

```text
Original incoming email in Zoho
-> Zoho Outgoing Webhook mail conditions
-> only intended guest/admin correspondence recipients trigger webhook
-> TRP signature verification
-> Limited Data parsing
-> existing correspondence-domain runtime compatibility guard
-> existing internal-sender suppression
-> Reservation matching
-> persistence
-> Admin notification / Web Push
```

### Provider-Side Positive Trigger Allowlist

The owner must edit the existing Zoho outgoing webhook so it triggers only when the original incoming email is addressed to one of the intended correspondence aliases for the environment.

Use Any / OR semantics:

```text
To matches admin@<correspondence-domain>
OR To matches reservas@<correspondence-domain>
OR To matches reservations@<correspondence-domain>
```

Local/Test intended aliases:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Production intended aliases:

```text
admin@turefugioperfecto.com
reservas@turefugioperfecto.com
reservations@turefugioperfecto.com
```

Do not invent DMARC alias addresses. Do not add DMARC subject, sender or keyword suppression. The intended-recipient allowlist is the positive provider boundary.

### TRP Runtime Defense In Depth

Runtime acceptance remains intentionally domain-based, not exact-alias-based, to preserve the Final-F.7 mailbox-normalization compatibility. The provider-side Zoho condition and TRP runtime guard have different responsibilities:

```text
Zoho condition:
authoritative trigger scope using original incoming recipient

TRP runtime guard:
defense in depth over the Limited Data representation that may be mailbox-normalized
```

Preserve:

```text
- webhook signature verification
- bootstrap and persisted x-hook-secret behavior
- Limited Data parsing
- `messageId` accept-but-ignore behavior
- exact correspondence-domain runtime comparison
- outside-domain and domain-lookalike rejection
- internal-sender suppression
- SHA-256 raw-body idempotency
- bounded `ZohoInboundEmailEvent` persistence
- `GUEST_EMAIL_RECEIVED` notification and immediate Web Push behavior for genuine guest correspondence
```

Do not fake a runtime test claiming TRP can identify the original alias when Zoho Limited Data does not provide it.

### Owner Hosted Configuration Validation

The owner configured the existing Zoho outgoing webhook from:

```text
No conditions. All incoming emails
```

to an Any / OR condition set scoped to the three intended Test correspondence aliases:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

The existing Zoho outgoing webhook is named `TRP Booking Test`. This is a provider trigger configuration change, not a TRP runtime code change.

Negative Hosted cases:

```text
DMARC Reports email:
- PASS; no ZohoInboundEmailEvent
- PASS; no GUEST_EMAIL_RECEIVED
- PASS; no Admin Push

DMARC Forensic email:
- PASS; no ZohoInboundEmailEvent
- PASS; no GUEST_EMAIL_RECEIVED
- PASS; no Admin Push
```

Positive Hosted cases:

```text
External email to reservas@juantzun.dev:
- PASS; intended guest/admin correspondence path remains operational

External email to reservations@juantzun.dev:
- PASS; intended guest/admin correspondence path remains operational

External email to admin@juantzun.dev:
- PASS; intended guest/admin correspondence path remains operational
```

Workstream E Hosted validation passed on 2026-10-02. The accepted architecture remains Zoho positive original-recipient trigger allowlist plus TRP domain-based Limited Data compatibility guard, signature validation, internal-sender suppression, reservation matching, bounded persistence, and Admin Web Push. No exact-alias runtime filtering, DMARC heuristic, or runtime email subject/sender suppression was introduced.

## Strict Boundaries

This I.6.1 checkpoint does not implement:

```text
- Prisma schema changes
- migrations
- cron registry changes
- notification enum changes
- Additional Charges UI changes
- TRP Zoho webhook/runtime code changes
- payment/refund behavior changes
- environment variables
- dependencies beyond `countries-and-timezones` static timezone metadata for Workstream A
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

Workstream E architecture correction validation:
- npm run final-i:validate - PASS, 61/61 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only

Workstream E Hosted validation + Workstream A implementation validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 65/65
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- git diff --check - PASS; Windows CRLF normalization warnings only

Workstream A confidence hardening validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; after stale tracker assertions were updated to the new Workstream A status, rerun outside the sandbox PASS, 67/67
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
```
