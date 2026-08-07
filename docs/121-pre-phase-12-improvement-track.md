# 121 — Pre-Phase-12 Improvement Track

## Status

```text
Track: Pre-Phase-12 Improvement Track
Status: In progress — Packages A, B, C, and E accepted; Package F.1 through F.4 completed and accepted; F.5 is next
Registered on: 2026-08-05
Registration base: 992bf4ae465576a275a31e9ca3c5ca9ab3414500
Current phase: No active implementation phase
Phase 11: Completed and accepted
Phase 12: Not started and not activated
```

## Purpose

This track groups the bounded product, operational, and UI improvements that must be implemented and accepted before deciding whether to activate Phase 12 — Production Readiness.

The track is not a new product phase and does not reopen Phase 11. Each package must preserve the accepted reservation, payment, email, refund, lifecycle, availability, and audit contracts already implemented.

## Approved scope

The approved implementation scope contains Packages A, B, C, E, and F.

Package D is deliberately deferred until the owner confirms the future financial policies for cleaning fees, taxes, discounts, and non-refundable charges. Existing values remain zero and no speculative financial behavior may be introduced.

## Package overview

| Package | Scope | Status | Phase 12 gate |
| --- | --- | --- | --- |
| A | Immediate public-flow and UI corrections | Completed and accepted | Required |
| B | Durable payment-attempt history | Completed and accepted | Required |
| C | Admin cron console and generic execution history | Completed and accepted | Required |
| D | Future financial-policy and refundable-line contract | Deferred — awaiting financial policy decisions | Not part of the current implementation gate |
| E | Public location and map configuration | Completed and accepted | Required |
| F | Zoho guest correspondence and reservation navigation | In progress — F.1 through F.4 accepted; F.5 next | Required |

## Package A — Immediate public-flow and UI corrections

### Included improvements

1. Preserve an active pending-reservation hold after it is created instead of silently removing its card when form data changes.
2. Add a controlled **Modify information** flow that explicitly expires or replaces an eligible unpaid hold before allowing a new hold to be created.
3. Add check-out time to `RESERVATION_CONFIRMED` and `ARRIVAL_INSTRUCTIONS`; render a localized flexible/free value when no check-out time is configured.
4. Add the branded bilingual `app/not-found.tsx` experience.
5. Disable the floating Next.js development indicator without suppressing build or runtime errors.
6. Apply the existing Tilopay form-ready auto-scroll behavior to the lifecycle-adjustment payment link and keep the behavior consistent across initial checkout, retry, and lifecycle adjustment.

### Safety rules

- Never silently overwrite a persisted `PENDING_PAYMENT` reservation.
- A hold may be replaced only while it remains eligible, has no Payment attempt, and is version-current.
- Do not delete reservation, payment, or diagnostic history.
- Do not create a second active hold for the same blocked dates without safely releasing the first eligible hold.
- Do not alter payment confirmation, availability, preparation-buffer, or Tilopay validation rules.

### Acceptance boundary

Package A was accepted at `ec1e6ce7f43099864788f28ae30a87214afe554d` after the initial checkout, hold replacement, retry checkout, lifecycle-adjustment checkout, ES/EN templates, 404 page, responsive UI, and regression checks were reported working.

## Package B — Durable payment-attempt history

Implementation base: `ec1e6ce7f43099864788f28ae30a87214afe554d`.

Implementation record: `docs/123-pre-phase-12-package-b-durable-payment-attempt-history.md`.

Acceptance boundary: Package B was reported working and accepted at `795a95fec81bc7ff3f177304f2df3df35c4d59e6`, including the financial-tab placement correction for reservation-level attempt history.

### Goal

Persist every real payment submission attempt from the initial pending reservation, retry page, and lifecycle-adjustment payment page.

### Implemented contract

Introduce a durable payment-attempt entity related to `Payment` and `Reservation`, with an ordered attempt number, source, status, timestamps, safe provider result classification, environment, and locale.

Sources:

```text
INITIAL_CHECKOUT
RETRY_PAGE
LIFECYCLE_ADJUSTMENT
```

Statuses:

```text
STARTED
SUBMITTED
APPROVED
REJECTED
FAILED
UNKNOWN
```

### Counting rule

A payment attempt is counted only after server-side preflight succeeds and immediately before the client invokes the Tilopay payment submission. Local field corrections that never reach the provider are not payment attempts.

### Admin result

Admin payment and reservation views must expose total attempts, failed/rejected attempts, last-attempt time, source, and a paginated expandible history without exposing card data or unsafe raw provider details.

## Package C — Admin cron console and generic execution history

Implementation base: `795a95fec81bc7ff3f177304f2df3df35c4d59e6`.

Implementation record: `docs/124-pre-phase-12-package-c-admin-cron-console.md`.

### Covered jobs

```text
sync-airbnb-calendars
expire-pending-reservation-holds
process-email-notifications
schedule-arrival-instructions
```

### Goal

Add a protected `/admin/cron-jobs` route where an authorized administrator can execute each registered job manually, inspect its normalized JSON result, and review paginated execution history.

### Implemented execution record

The generic execution history must include at least:

```text
job key
trigger source
admin actor when manual
business environment
status
started time
finished time
duration in milliseconds
normalized result JSON
safe error code and message
creation time
```

### Safety rules

- Scheduled and manual executions must use the same instrumented runner.
- Do not call internal cron HTTP routes with `CRON_SECRET` from the admin browser.
- Prevent overlapping execution of the same job.
- Preserve the specialized Airbnb `CalendarSyncLog`; the generic record complements it and does not replace it.
- JSON shown in admin must be normalized and must not expose secrets, tokens, private iCal URLs, provider credentials, or unsafe errors.

Acceptance boundary: Package C was reported working and accepted at `5a039aa451628e8ac9712c166bdd0a4605c8813f`, including the responsive status-badge alignment correction.

## Package D — Future financial-policy contract

### Status

```text
Deferred — awaiting financial policy decisions
```

No implementation, migration, pricing activation, or refund calculation change is authorized in this track.

The package will be revisited after confirming policies for:

- Cleaning-fee refundability.
- Tax recalculation.
- Discount allocation.
- Non-refundable charges.
- Versioned pricing lines and refundability snapshots.

Until then, existing cleaning fee, tax, and discount values remain zero, and current accepted cancellation/refund behavior remains unchanged.

## Package E — Public location and map configuration

Implementation base: `5a039aa451628e8ac9712c166bdd0a4605c8813f`.

Implementation record: `docs/125-pre-phase-12-package-e-public-location-map.md`.

### Goal

Replace the public location placeholder with an explicitly configured map while keeping private arrival instructions separate.

### Accepted contract

Use public site-owned location configuration rather than automatically exposing `PropertyArrivalInstructions.exactAddress`.

The configuration must include an enabled flag, public address or location text, and a validated HTTPS map/embed URL with an allowlisted provider host.

### Safety rules

- Never accept arbitrary iframe HTML.
- Never publish private arrival instructions, access details, or secret operational content.
- Keep a localized placeholder when public mapping is disabled or incomplete.
- Provide protected admin management with optimistic concurrency and audit history.

### Acceptance boundary

Package E was accepted on 2026-08-06 after the owner reported the public Google Maps and OpenStreetMap flows working, the protected configuration and history surfaces were separated into explicit tabs, and the final scoped active-tab contrast correction was prepared. The accepted functional head is `113ed0198cee66650556409066e996693bf6db35`; the closure record is `docs/126-pre-phase-12-package-e-acceptance-closure.md`.

## Package F — Zoho guest correspondence and reservation navigation

Strategy base: `cab7d71e34d230cdf49e013921764f6386d3fa2f`.

Strategy record: `docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md`.

### Goal

Keep TRP Booking focused on automatic transactional notification history while Zoho
Mail Lite owns human guest correspondence.

### Accepted architecture

```text
- EmailNotification remains unchanged and continues to power automatic Resend
  delivery, retries, manual recovery, safe diagnostics, and reservation history.
- The protected reservation detail keeps its current transactional email section.
- Human messages are received, searched, threaded, and answered in Zoho Mail.
- Resend remains automatic-delivery-only and does not receive human inbound mail.
- TRP Booking may add a protected action that opens or searches the guest
  conversation in Zoho without ingesting mailbox contents.
```

### Zoho environment separation

```text
Local/test Zoho organization
- Domain: juantzun.dev
- Primary mailbox: admin@juantzun.dev
- Aliases: reservas@juantzun.dev, reservations@juantzun.dev
- Mobile client: Zoho Mail application

Production Zoho organization
- Domain: turefugioperfecto.com
- Primary mailbox: admin@turefugioperfecto.com
- Aliases: reservas@turefugioperfecto.com, reservations@turefugioperfecto.com
- Mobile client: Zoho Mail application
```

The organizations, domains, credentials, OAuth clients, and mailbox identifiers must
remain isolated.

### Sender and reply policy

```text
Received at reservas@...     -> reply from reservas@...
Received at reservations@... -> reply from reservations@...
Received at admin@...        -> reply from admin@...
```

Resend continues sending automatic messages from the isolated `mail.` sending
subdomains. Transactional Reply-To values route human responses to the corresponding
Zoho aliases.

### DNS boundary

Root-domain MX records point to Zoho for human mailbox delivery. Existing Resend
sending-domain records remain on `mail.trp-booking.juantzun.dev` in local/test and
`mail.turefugioperfecto.com` in production. Do not place competing mailbox-provider MX
records on the same root hostname.

### Integration boundary

```text
- The Zoho mobile application requires no IMAP setup.
- IMAP may be used by optional third-party email clients but not by TRP Booking.
- No generic API key is expected; any future server integration uses Zoho OAuth 2.0.
- Optional exact search uses read-only account/message scopes only.
- No passwords, refresh tokens, message bodies, attachment bytes, or raw mailbox data
  are stored in application tables.
- No undocumented Zoho URLs or mailbox HTML scraping is allowed.
```

### Persistence boundary

No `EmailThread`, `EmailMessage`, `EmailAttachment`, `InboundEmailEvent`, or
`ReservationEmailConversation` model is approved. A minimal provider-thread
identifier may be proposed later only after official Zoho capability validation and
separate owner approval.

### Revised subpackages

```text
F.1 Strategy, provider boundary, and environment contract — Completed and accepted
F.2 Test Zoho Mail setup and DNS validation — Completed and accepted on 2026-08-07
F.3 Transactional Reply-To alignment — Completed and accepted on 2026-08-07
F.4 Reservation-to-Zoho navigation — Completed and accepted on 2026-08-07
F.5 Integrated validation and documentation closure — Not started; next package
```

### Non-goals

```text
- No /admin/emails mailbox clone.
- No Resend inbound receiving or webhook.
- No stored human email bodies, headers, threads, or attachments.
- No application-owned reply composer.
- No Zoho API send/reply/delete operations.
- No removal of existing reservation transactional notification history.
- No shared-inbox workflow, CRM, marketing, AI, help-desk, or PMS behavior.
```

### F.1 acceptance boundary

Package F.1 was accepted on 2026-08-06 after the owner approved Zoho Mail Lite plus
the Zoho mobile application, separate test and production organizations, one mailbox
with Spanish/English aliases, Resend-only automation, preserved reservation-level
transactional history, no inbound synchronization, and future protected
reservation-to-Zoho navigation. No application code or provider credential was added.

### F.3 acceptance boundary

Package F.3 was accepted on 2026-08-07 at `c75a943a9f36c31e146594d7ad03eedb44635f89` after the original full ES/EN Reply-To round-trip matrix and the reduced environment-aware routing regression passed. The accepted boundary keeps Resend as the automatic transactional provider, routes human replies to the validated Zoho aliases, redirects only local guest-audience delivery to `EMAIL_TEST_RECIPIENT`, lets stable test deliver guest mail to intended reservation recipients, centralizes local/test admin delivery on `juantzun.dev`, uses the permanent Cloudinary brand asset, and preserves production isolation.

Implementation record: `docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md`.

Acceptance closure: `docs/131-pre-phase-12-package-f-3-acceptance-closure.md`.

### F.4 acceptance boundary

Package F.4 was accepted on 2026-08-07 at `7e0432f90836c5d4200ff528832eb48e69d1e642` after the full 20-check desktop/mobile ES/EN handoff and technical-validation matrix passed. The protected reservation detail keeps transactional `EmailNotification` history separate from human correspondence and adds only an HTTPS Zoho Mail handoff with best-effort guest-email copy. Native app opening remains operating-system dependent with a clean web fallback. No OAuth, mailbox ingestion, human message persistence, IMAP credential, undocumented provider URL, or production Zoho activation was introduced.

Implementation record: `docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md`.

Acceptance closure: `docs/133-pre-phase-12-package-f-4-acceptance-closure.md`.

## Implementation order

```text
1. Package A — Immediate public-flow and UI corrections
2. Package B — Durable payment-attempt history
3. Package C — Admin cron console and generic execution history
4. Package E — Public location and map configuration
5. Package F — Zoho guest correspondence and reservation navigation
6. Package D — Revisit only after financial policies are confirmed
```

Package F proceeds through the accepted F.1 through F.5 sequence. F.3 completed the transactional Reply-To and environment-aware recipient-routing boundary while preserving Resend automation, Zoho human correspondence, intended-recipient persistence, retry history, and production isolation. F.4 completed and accepted the protected reservation-to-Zoho HTTPS handoff without mailbox synchronization, message persistence, OAuth, or undocumented provider URLs. F.5 is the next and final Package F subpackage.

## Cross-package requirements

Every package must:

- Start from the latest accepted repository `HEAD`.
- Review `AGENTS.md`, `docs/10-phases.md`, and `docs/11-progress-log.md` before implementation.
- Centralize all visible ES/EN copy in `messages/es.ts` and `messages/en.ts`.
- Preserve strict TypeScript, Zod validation, server-side authorization, optimistic concurrency, idempotency, and auditability where applicable.
- Avoid native `alert()`, `confirm()`, and `prompt()`.
- Avoid hard deletes of operational records.
- Avoid storing card data, secrets, raw credentials, unsafe provider errors, or private iCal URLs.
- Include real repository-relative files in non-trivial ZIP deliveries.
- Include focused automated and manual acceptance matrices.
- Update this document and the official trackers after each accepted package.

## Phase 12 activation gate

Phase 12 remains `Not started` throughout this track.

A Phase 12 activation decision may be made only after Packages A, B, C, E, and F are implemented, validated, documented, and accepted, or after an explicit written decision changes that gate.

Package D is outside the current gate because its business policies are intentionally unresolved. It must be completed before any non-zero cleaning fee, tax, discount, or non-refundable-charge behavior is enabled.

## Current action

Prepare Package F.5 — Integrated validation and documentation closure. Validate Package F end to end across the accepted F.1 through F.4 boundaries using a reduced representative matrix: transactional Resend delivery, Reply-To handoff to Zoho aliases, human same-alias replies, reservation-level EmailNotification history, reservation-to-Zoho navigation, local/test environment isolation, ES/EN behavior, responsive/mobile handoff, secrets boundary, and production isolation. F.5 must not add feature scope, mailbox synchronization, OAuth, message persistence, or production Zoho activation.

Package A accepted head: `ec1e6ce7f43099864788f28ae30a87214afe554d`.

Package A implementation record: `docs/122-pre-phase-12-package-a-public-flow-and-ui-corrections.md`.

Package B implementation record: `docs/123-pre-phase-12-package-b-durable-payment-attempt-history.md`.

Package B accepted head: `795a95fec81bc7ff3f177304f2df3df35c4d59e6`.

Package C implementation record: `docs/124-pre-phase-12-package-c-admin-cron-console.md`.

Package C accepted head: `5a039aa451628e8ac9712c166bdd0a4605c8813f`.

Package E implementation record: `docs/125-pre-phase-12-package-e-public-location-map.md`.

Package E accepted functional head: `113ed0198cee66650556409066e996693bf6db35`.

Package E closure record: `docs/126-pre-phase-12-package-e-acceptance-closure.md`.


Package F strategy base head: `cab7d71e34d230cdf49e013921764f6386d3fa2f`.

Package F strategy record: `docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md`.

Package F.2 operational record: `docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md`.

Package F.2 closure record: `docs/129-pre-phase-12-package-f-2-acceptance-closure.md`.

Package F.3 implementation record: `docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md`.

Package F.3 accepted head: `c75a943a9f36c31e146594d7ad03eedb44635f89`.

Package F.3 closure record: `docs/131-pre-phase-12-package-f-3-acceptance-closure.md`.

Package F.4 implementation record: `docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md`.

Package F.4 accepted head: `7e0432f90836c5d4200ff528832eb48e69d1e642`.

Package F.4 closure record: `docs/133-pre-phase-12-package-f-4-acceptance-closure.md`.
