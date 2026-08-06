# 121 — Pre-Phase-12 Improvement Track

## Status

```text
Track: Pre-Phase-12 Improvement Track
Status: In progress — Packages A and B accepted; Package C implementation prepared
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
| C | Admin cron console and generic execution history | Implementation prepared — validation pending | Required |
| D | Future financial-policy and refundable-line contract | Deferred — awaiting financial policy decisions | Not part of the current implementation gate |
| E | Public location and map configuration | Not started | Required |
| F | Inbound/outbound email center and threaded replies | Not started | Required |

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

### Goal

Replace the public location placeholder with an explicitly configured map while keeping private arrival instructions separate.

### Planned contract

Use public site-owned location configuration rather than automatically exposing `PropertyArrivalInstructions.exactAddress`.

The configuration must include an enabled flag, public address or location text, and a validated HTTPS map/embed URL with an allowlisted provider host.

### Safety rules

- Never accept arbitrary iframe HTML.
- Never publish private arrival instructions, access details, or secret operational content.
- Keep a localized placeholder when public mapping is disabled or incomplete.
- Provide protected admin management with optimistic concurrency and audit history.

## Package F — Inbound/outbound email center and threaded replies

### Goal

Add a protected `/admin/emails` route with separate **Received** and **Sent** tabs, server-side filtering and pagination, expansion panels, reservation linking, and threaded replies.

### Sender policy

- Messages received at `reservas@...` are answered from `reservas@...`.
- Messages received at `reservations@...` are answered from `reservations@...`.
- Messages received at `admin@...` are answered from `admin@...`.
- New Spanish guest conversations use `reservas@...`.
- New English guest conversations use `reservations@...`.
- `admin@...` remains for administrative communication and conversations originally addressed there.

### Threading and persistence

The implementation must preserve provider message identifiers and standard `Message-ID`, `In-Reply-To`, and `References` relationships. It must persist email threads, inbound/outbound messages, normalized bodies, delivery direction/status, optional reservation relation, dates, and safe attachment metadata.

### Operational prerequisite

Inbound delivery must not be activated until the production/test receiving-domain and MX strategy is confirmed. The implementation must not assume that Resend can take control of a domain already used by another mailbox provider without an explicit DNS decision.

### Reservation-detail transition

The existing reservation-detail email section remains available until the new email center is accepted. After acceptance, replace the embedded list with a link to:

```text
/admin/emails?reservationId=<reservationId>
```

The redirect must apply the reservation filter automatically.

## Implementation order

```text
1. Package A — Immediate public-flow and UI corrections
2. Package B — Durable payment-attempt history
3. Package C — Admin cron console and generic execution history
4. Package E — Public location and map configuration
5. Package F — Inbound/outbound email center and threaded replies
6. Package D — Revisit only after financial policies are confirmed
```

Package F may begin with persistence and UI architecture before inbound DNS activation, but inbound production delivery cannot be accepted without the operational prerequisite.

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

Validate Package C against scheduled and manual execution, same-job overlap prevention, stale-run recovery, environment and actor persistence, normalized safe JSON, bilingual admin UI, pagination, and regression checks. Do not start Package E until Package C is reported working and the required technical checks pass.

Package A accepted head: `ec1e6ce7f43099864788f28ae30a87214afe554d`.

Package A implementation record: `docs/122-pre-phase-12-package-a-public-flow-and-ui-corrections.md`.

Package B implementation record: `docs/123-pre-phase-12-package-b-durable-payment-attempt-history.md`.

Package B accepted head: `795a95fec81bc7ff3f177304f2df3df35c4d59e6`.

Package C implementation record: `docs/124-pre-phase-12-package-c-admin-cron-console.md`.
