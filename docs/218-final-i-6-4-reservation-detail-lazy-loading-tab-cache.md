# 218 - Final-I.6.4: Reservation Detail Lazy Loading, Tab Cache & Financial Tabs

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.4 - Reservation Detail Lazy Loading, Tab Cache & Financial Tabs
Status: Implementation completed; Hosted owner validation pending
Registration date: 2026-10-07
Implementation base: f934ae3ddae61dcdb3560fff771152c83e8768a7
Implementation base commit: docs(final-i): close Final-I.6.3
Final-I.6.3 status: Completed and accepted on 2026-10-07
Accepted Final-I.6.3 feature head: 235bd1f5a8a7d48161146c485c979d5f57a6530d
Final-I.6.3 implementation and acceptance record: docs/217-final-i-6-3-additional-charges-email-delivery-layout-polish.md
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.4 is a bounded Admin Reservation detail performance/UX correction on top of the accepted Final-I.6.3 closure. It does not reopen Final-I.6.3 and does not begin Final-I.7, Final-I.8, Final-I.9, Phase 13, schema, migrations, dependencies, environment variables, cron, scheduler, Vercel configuration, Production resources, INFILE transport, or FEL provider behavior.

## Scope

Final-I.6.4 changes the protected Admin Reservation detail surface from a monolithic eager loader to a lightweight shell plus lazy tab payloads:

```text
initial route:
- Reservation shell only: id + status
- initial focus parsing only
- no payment attempts
- no full Reservation detail graph

lazy tab API:
- reservation
- financial
- payment-attempts
- emails
- lifecycle
- refunds
- changes
- history
```

The Financial tab now has nested compact tabs:

```text
Summary / Resumen
Attempts / Intentos
```

Summary and Attempts are cached and reloaded independently.

## Implementation Summary

```text
- `app/admin/reservations/[reservationId]/page.tsx`
  - Loads only `getAdminReservationDetailShell`.
  - Keeps contextual notification focus parsing.
  - Uses a lightweight refund lookup to choose the initial tab for refund focus.

- `app/api/admin/reservations/[reservationId]/tabs/[tab]/route.ts`
  - Adds an ADMIN-authenticated lazy tab route with a closed tab enum.
  - Returns only the requested tab payload.

- `lib/admin/reservation-detail.ts`
  - Adds narrow tab loaders for overview, financial, emails, lifecycle, refunds, changes, and history.
  - Adds the lightweight refund focus resolver.
  - Keeps the historical monolithic loader available for existing callers.

- `features/admin/components/admin-reservation-detail-page.tsx`
  - Adds page-scoped tab cache entries with `idle`, `loading`, `ready`, `refreshing`, and `error` states.
  - Fetches each tab on first visit and keeps visited tabs mounted.
  - Keeps locale changes from triggering new data fetches.
  - Adds an icon-only localized reload action scoped to the active tab/data unit.
  - Splits Financial Summary and Payment Attempts into separately cached nested tabs.
  - Replaces full route refreshes for Reservation-detail mutations with scoped cache invalidation.
  - Cleans contextual `focus` / `focusId` query params through `history.replaceState` after the initial landing.

- `features/admin/components/admin-additional-charges-section.tsx`
  - Receives an explicit `reloadVersion` from the Reservation detail page.
  - Keeps `loadManagement` independent from localized copy so locale changes do not refetch Additional Charges.
  - Reports mutations back to the parent for dependent tab invalidation.

- Reservation lifecycle/refund/date-mutation sections
  - Accept scoped tab DTOs.
  - Notify the parent page after mutations when rendered inside the lazy Reservation detail surface.
  - Preserve `router.refresh()` fallback for any future standalone usage.

- `messages/es.ts` and `messages/en.ts`
  - Add localized reload/loading labels for Reservation detail lazy tabs and Financial nested tabs.

- `tests/final-i/i64-reservation-detail-lazy-loading.test.ts`
  - Adds deterministic source-level coverage for the I.6.4 lazy-loading, tab-cache, Financial split, Additional Charges locale-refetch, scoped invalidation, focus-cleanup, and reload contracts.
```

## Preserved Boundaries

Final-I.6.4 preserves:

```text
- No schema change.
- No migration.
- No dependency change.
- No environment variable change.
- No cron or scheduler change.
- No Vercel configuration change.
- No Production resource activation.
- No INFILE transport, credentials, certification, cancellation, Credit Note, PDF, or XML behavior.
- No Final-I.7, Final-I.8, Final-I.9, Phase 13, Final-G/H reopening, or public-site work.
```

## Validation Ledger

```text
Final-I.6.4 implementation validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; first outside-sandbox run reached 98/107 and exposed an obsolete I.6.2 focus expectation, which was reconciled with the new lightweight focus resolver; final outside-sandbox rerun PASS, 107/107
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - initial sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Current State

```text
Final-I.6.4 - Implementation completed; Hosted owner validation pending
Final-I.7 - Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 - Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 - Not started / integrated Final-I closure
Phase 13 - Blocked / Not started until Final-I closes
```
