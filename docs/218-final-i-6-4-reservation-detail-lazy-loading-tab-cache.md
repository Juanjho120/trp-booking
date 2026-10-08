# 218 - Final-I.6.4: Reservation Detail Lazy Loading, Tab Cache & Financial Tabs

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.4 - Reservation Detail Lazy Loading, Tab Cache & Financial Tabs
Status: Implementation completed; Hosted functional validation PASS; Reload placement visual validation PASS; final full-loading-on-Reload revalidation pending
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
  - Fetches each tab on first visit and keeps visited tabs mounted, with per-tab in-flight deduplication for fast clicks, reloads, and callback/effect churn.
  - Keeps locale changes from triggering new data fetches.
  - Adds an icon-only localized reload action scoped to the active tab/data unit in the Reservation detail page-header action area, immediately after the Back to Reservations action.
  - Removes the normal per-tab reload toolbar instances from Reservation, Financial, Emails, Lifecycle, Additional Charges, Refunds, Changes, and History bodies.
  - Splits Financial Summary and Payment Attempts into separately cached nested tabs; the Financial tab is loaded only by its Financial-specific effect, not by the generic top-level tab effect.
  - Replaces full route refreshes for Reservation-detail mutations with scoped cache invalidation.
  - Cleans contextual `focus` / `focusId` query params through `history.replaceState` only after the exact target component applies focus and performs the initial scroll.

- `features/admin/components/admin-additional-charges-section.tsx`
  - Receives an explicit `reloadVersion` from the Reservation detail page.
  - Keeps `loadManagement` independent from localized copy so locale changes do not refetch Additional Charges.
  - Reports initial-load and manual-refresh busy state to the parent header reload control without making localized copy a fetch dependency.
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

## Correction Checkpoint - 2026-10-08

```text
Pre-Hosted hardening checkpoint on top of 239d2473ec6c87a9541bde69f2013ae4d953c770.
Final-I.6.4 remains Implementation completed; Hosted functional validation PASS; final Reload placement visual revalidation pending.
```

This checkpoint corrected the remaining cache/UX regressions before Hosted owner validation:

```text
- The generic top-level lazy-load effect now skips both Additional Charges and Financial, so the Financial tab no longer emits a duplicate first-visit request.
- Financial Summary and Payment Attempts remain owned by the Financial-specific effect.
- Lazy server-tab requests now use a per-tab in-flight Set and a pure `shouldLoadAdminReservationTab` helper.
- Automatic effect-driven retries stop after `error`; explicit reload/force actions remain available.
- Manual refresh failures preserve existing tab data and surface localized snackbar feedback instead of blanking the panel.
- The Reservation header badge now follows the latest successful lazy payload status instead of the immutable shell status.
- Additional Charges reports real refresh state to the parent reload control while preserving first-mount loading and locale-stable `loadManagement` dependencies.
- Contextual focus query cleanup is now driven by successful exact-target focus/scroll application, not by an unconditional mount effect.
```

## Hosted Functional Validation, Reload Placement and Full-Loading Reload UX - 2026-10-08

Hosted functional validation passed for the Final-I.6.4 lazy Reservation detail behavior before formal acceptance. The owner then identified one visual finding: the normal active-tab Reload icon was functionally correct, but its per-tab toolbar placement added unnecessary vertical UI noise.

Owner requested relocation to the Reservation detail page-header action area, immediately to the right of the Back to Reservations action. That header Reload placement has now passed visual validation.

This visual refinement keeps the same `reloadActiveUnit()` domain semantics and moves only the normal reload placement:

```text
- Reservation reloads only the reservation tab payload.
- Financial / Summary reloads only the financial summary payload.
- Financial / Attempts reloads only payment-attempts.
- Emails reloads only emails.
- Lifecycle reloads only lifecycle.
- Additional Charges reloads only Additional Charges management.
- Refunds reloads only refunds.
- Changes reloads only changes.
- History reloads only history.
```

The header Reload remains icon-only, localized through existing ES/EN `detailCopy.reload`, keyboard accessible, tooltip-backed, and compact beside the Back action for desktop and mobile header layouts. Its busy state now derives from the active top-level or nested Financial data unit and treats `loading` and `refreshing` as busy. Additional Charges now reports both initial management loading and manual refreshing through `onLoadBusyChange`, while `loadManagement` remains independent from localized copy so locale changes still do not refetch.

A final owner UX requirement was identified after the header placement approval: during an explicit header Reload, stale cached content must not remain visible while fresh data is being requested. The accepted target behavior is that the active tab temporarily returns to the exact same full loading presentation used on first load, and fresh content appears only when the request succeeds.

This correction keeps previous successful data in the internal tab cache while `status = refreshing`, but rendering ignores that data until the request resolves. If the refresh fails after previously valid data existed, the page restores that cached content and shows the existing localized error snackbar. First-load failures with no usable data continue to show the inline error/retry panel. Financial keeps the compact Summary / Attempts nested navigation visible during nested reloads while the nested body shows only the appropriate loading panel. Additional Charges now uses its existing first-load management loading card for explicit page-header Reloads, while mutation-triggered internal refreshes continue to use their existing non-blanking `loadManagement()` path.

Status remains:

```text
Final-I.6.4 - Implementation completed; Hosted functional validation PASS; Reload placement visual validation PASS; final full-loading-on-Reload revalidation pending
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
- npm run final-i:validate - initial implementation run PASS, 107/107; 2026-10-08 cache/UX correction rerun PASS, 111/111; 2026-10-08 header Reload placement rerun PASS, 111/111; 2026-10-08 full-loading-on-Reload correction rerun PASS, 111/111
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- Local authenticated browser/network inspection - not executed in this code-only correction pass because no local authenticated Admin browser fixture was available; Hosted owner validation remains pending
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Current State

```text
Final-I.6.4 - Implementation completed; Hosted functional validation PASS; Reload placement visual validation PASS; final full-loading-on-Reload revalidation pending
Final-I.7 - Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 - Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 - Not started / integrated Final-I closure
Phase 13 - Blocked / Not started until Final-I closes
```
