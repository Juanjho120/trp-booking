# 218 - Final-I.6.4: Reservation Detail Lazy Loading, Tab Cache & Financial Tabs

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.4 - Reservation Detail Lazy Loading, Tab Cache & Financial Tabs
Status: Completed and accepted on 2026-10-08
Accepted Final-I.6.4 feature head: c80f172ac9e1e366e54517020dd5b1a1e1c30a76
Owner formal acceptance: PASS on 2026-10-08
Documentation closure commit: documentation-only closure; it does not replace the accepted feature head
Registration date: 2026-10-07
Implementation base: f934ae3ddae61dcdb3560fff771152c83e8768a7
Implementation base commit: docs(final-i): close Final-I.6.3
Final-I.6.3 status: Completed and accepted on 2026-10-07
Accepted Final-I.6.3 feature head: 235bd1f5a8a7d48161146c485c979d5f57a6530d
Final-I.6.3 implementation and acceptance record: docs/217-final-i-6-3-additional-charges-email-delivery-layout-polish.md
Final-I.6.5 status: Not started / next bounded Admin UX polish: Admin Contextual Help & Copy Density Polish
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.4 is a completed and accepted bounded Admin Reservation detail performance/UX correction on top of the accepted Final-I.6.3 closure. It does not reopen Final-I.6.3 and does not begin Final-I.7, Final-I.8, Final-I.9, Phase 13, schema, migrations, dependencies, environment variables, cron, scheduler, Vercel configuration, Production resources, INFILE transport, or FEL provider behavior.

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
This checkpoint kept Final-I.6.4 within its bounded implementation/validation track before final owner acceptance.
```

This checkpoint corrected the remaining cache/UX regressions before formal owner acceptance:

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

Status after owner acceptance:

```text
Final-I.6.4 - Completed and accepted on 2026-10-08
```

## Final Owner Polish Checkpoint - 2026-10-08

After the full-loading-on-Reload Hosted pass, the owner requested a final bounded Reservation-detail UI polish checkpoint before formal acceptance:

```text
- Additional Charges explicit reload loading now uses the shared compact loading card with only the spinner and localized `copy.loading`; it does not repeat the Additional Charges section title.
- Lifecycle, Refunds, Date Changes, and Operational History now align to the canonical top-level tab spacing by removing the parent `-mt-6` wrappers and using embedded section rendering for the first cards.
- Guest Correspondence moved out of the Reservation overview tab and into Email Delivery as a third nested `Zoho` tab to the right of Administration.
- Email Delivery nested tabs now remain available even when the reservation has zero email notifications, so the Zoho handoff remains discoverable from the Email Delivery surface.
- The Zoho handoff preserves the existing explicit user gesture, `_blank`, `noopener,noreferrer`, stable `https://mail.zoho.com/` target, best-effort guest-email clipboard copy, snackbar success/error feedback, and no subject/body/recipient/secrets in the URL.
- Top-level Reservation-detail labels now use dedicated shorter navigation copy: Lifecycle / Ciclo de vida, Date changes / Cambios de fechas, and Operational history / Historial operativo, without renaming the shared section titles used inside panels.
```

This checkpoint does not change the lazy tab API, cache invalidation contract, domain logic, schema, migrations, configuration, scheduler, or Production boundaries.

Status after owner acceptance:

```text
Final-I.6.4 - Completed and accepted on 2026-10-08
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
Final-I.6.4 accepted validation:
- npm run final-i:validate - PASS, 111/111
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
- Vercel Hosted deployment at accepted feature head c80f172ac9e1e366e54517020dd5b1a1e1c30a76 - SUCCESS
```

## Current State

```text
Final-I.6.4 - Completed and accepted on 2026-10-08
Final-I.6.5 - Not started / next bounded Admin UX polish: Admin Contextual Help & Copy Density Polish
Final-I.7 - Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 - Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 - Not started / integrated Final-I closure
Phase 13 - Blocked / Not started until Final-I closes
```
## 2026-10-08 - Final-I.6.4 Completed And Accepted

Owner Hosted validation passed for the complete accepted Final-I.6.4 behavior. Owner formal acceptance is recorded as PASS on 2026-10-08.

```text
Accepted Final-I.6.4 feature head: c80f172ac9e1e366e54517020dd5b1a1e1c30a76
Documentation closure commit: documentation-only closure; it does not replace the accepted feature head
Owner formal acceptance: PASS on 2026-10-08
Vercel Hosted deployment at accepted feature head: SUCCESS
Final-I.6.5: Not started / next bounded Admin UX polish: Admin Contextual Help & Copy Density Polish
Final-I.7: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9: Not started / integrated Final-I closure
Phase 13: Blocked / Not started until Final-I closes
```

Accepted contracts frozen by this closure:

```text
Lightweight initial Reservation-detail route:
- /admin/reservations/<reservationId> normal navigation and F5 select Reservation.
- The initial server route loads only the lightweight shell and the initial Reservation payload.
- It does not eagerly load payments, payment attempts, emails, cancellation requests, date mutations, refunds, financial summary, operational history, or Additional Charges.

Lazy top-level tab loading:
- Accepted top-level tabs: Reservation, Payments and diagnostics, Email delivery, Lifecycle, Additional Charges, Refunds, Date changes, and Operational history.
- First visit fetches only the relevant tab data.
- Leaving a tab retains page-scoped state.
- Returning to a visited valid tab does not fetch.
- Explicit Reload fetches only the active data unit.

Financial nested tabs:
- Summary / Resumen is the default.
- Attempts / Intentos is separate.
- Summary loads/reloads only the financial payload.
- Attempts loads/reloads only the payment-attempts payload.
- Both remain independently cached and reloadable.
- The compact nested tab list does not consume unnecessary desktop width.

Page-scoped cache:
- Accepted states: idle, loading, ready, refreshing, error.
- Per-tab in-flight request deduplication is preserved.
- Failed lazy loads do not create automatic retry loops.
- Locale changes do not invalidate data.
- Inactive valid caches are preserved.
- Mutation-dependent inactive caches become stale rather than fetching eagerly.

Mutation invalidation:
- Successful mutations refresh the owning active unit immediately.
- Dependent inactive units are marked stale only.
- Next visit to a stale unit fetches once.
- No full Reservation-detail route refresh is required for the accepted lazy architecture.

Header Reload:
- Placement is [Back to Reservations] [Reload] in the Reservation detail header.
- Reload is immediately to the right of Back to Reservations.
- Reload is icon-only, localized, tooltip-backed, keyboard accessible, and aria-label backed.
- Tooltip/aria label copy is ES Recargar and EN Reload.
- Reload is disabled/spinning while the active unit is loading or refreshing.
- Normal per-tab Reload toolbars do not appear in tab bodies.

Reload target semantics:
- Reservation -> reservation.
- Payments and diagnostics / Summary -> financial.
- Payments and diagnostics / Attempts -> payment-attempts.
- Email delivery -> emails.
- Lifecycle -> lifecycle.
- Additional Charges -> Additional Charges management only.
- Refunds -> refunds.
- Date changes -> changes.
- Operational history -> history.
- Reload never intentionally reloads unrelated cached tabs.

Full-loading-on-Reload UX:
- Explicit header Reload hides the active tab's previous content.
- It shows the same loading presentation as first load.
- Fresh content renders only after the request succeeds.
- The previous successful cache may remain internally preserved for failure recovery.
- If explicit refresh fails after prior valid data existed, loading ends, prior valid data returns, a safe error Snackbar appears, and no automatic retry starts.

Additional Charges loading:
- Loading shows only spinner plus localized loading message.
- It does not repeat Additional Charges / Cargos adicionales as a CardTitle.
- Explicit header Reload uses the full loading presentation.
- Mutation-triggered internal management refreshes preserve their existing accepted behavior.
- loadManagement remains independent from locale, messages, copy, and resolveError.
- ES/EN copy changes do not reload Additional Charges.

Header status synchronization:
- The Reservation status badge follows the latest successful lazy payload status.
- Example accepted behavior: Confirmed -> cancellation approved -> lifecycle refresh -> header status becomes Cancelled without F5/full route refresh.

Contextual notification focus:
- Supported focus includes refund, additionalChargePaymentRequest, and lifecycleAdjustment.
- Deep links use lightweight target-tab resolution and load only target data.
- The exact nested item/accordion opens and scrolls once.
- focus and focusId are removed through history.replaceState only after the exact focus is applied.
- Subsequent F5 returns to Reservation and loads only the Reservation payload.

Reservation-detail top-level navigation copy:
- ES: Ciclo de vida, Cambios de fechas, Historial operativo.
- EN: Lifecycle, Date changes, Operational history.
- These are dedicated navigation labels and do not redefine broader internal section titles/badges.

Canonical top-level spacing:
- Top-level tab content uses TabsContent mt-4 sm:mt-6 spacing.
- Lifecycle, Refunds, Date changes, and Operational history no longer cancel it through parent -mt-6 wrappers.
- Embedded section first cards use the accepted no-extra-top-margin contract.
- The Reservation detail page must not reintroduce -mt-6 workarounds for these tabs.

Email Delivery nested tabs:
- Accepted nested tabs: Guests / Huespedes, Administration / Administracion, Zoho.
- Zoho appears to the right of Administration.
- Zoho uses an Inbox icon immediately to the left of the name.
- These nested tabs remain available even when emailNotifications.length === 0.
- Default nested tab: Guests when guest notifications exist; else Administration when admin notifications exist; else Zoho.

Guest correspondence relocation:
- Guest correspondence / Correspondencia del huesped no longer belongs to the Reservation overview tab.
- It belongs to Email delivery -> Zoho.
- Existing behavior is preserved: guest email display, description/helper copy, open Zoho Mail, best-effort guest-email clipboard copy, desktop/mobile action labels, success/error Snackbar, explicit user gesture, _blank, noopener noreferrer, and siteConfig.correspondence.zohoMailWebUrl.
- No extra server request is required for Zoho; it reuses emailData.guestEmail.
```

Accepted owner validation ledger:

```text
- lightweight initial Reservation load - PASS
- first-visit tab lazy loading - PASS
- visited-tab cache reuse - PASS
- Financial Summary/Attempts independent loading - PASS
- Additional Charges ES/EN no-refetch - PASS
- active-unit Reload behavior - PASS
- F5 -> Reservation behavior - PASS
- contextual financial notification deep-links - PASS
- header Reservation-status synchronization - PASS
- Reload header placement desktop/mobile - PASS
- full-loading-on-Reload behavior - PASS
- Additional Charges loading presentation - PASS
- canonical spacing of Lifecycle / Refunds / Date changes / Operational history - PASS
- Zoho nested tab and Guest Correspondence relocation - PASS
- zero-email Zoho accessibility - PASS
- shortened ES/EN navigation labels - PASS
```

Accepted automated validation ledger:

```text
- npm run final-i:validate - PASS, 111/111
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - PASS
- git diff --check - PASS
- vercel.json remains { "crons": [] }
```

This acceptance closure is documentation-only and does not modify runtime behavior, APIs, tab loaders, cache code, messages/runtime copy, Prisma schema, migrations, dependencies, environment variables, cron, scheduler, `vercel.json`, INFILE, FEL behavior, Production resources, Final-I.6.5 implementation, Final-I.7, Final-I.8, Final-I.9, or Phase 13.
