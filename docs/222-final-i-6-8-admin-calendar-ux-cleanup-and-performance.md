# Final-I.6.8 - Admin Calendar UX Cleanup & Performance Optimization

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track addendum
Package: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.8 - Admin Calendar UX Cleanup & Performance Optimization
Status: Implementation completed; Hosted owner validation pending
Registration date: 2026-10-12
Implementation base: 39725387bd0cb8381108f1de36f17f0792060687
Implementation head: This implementation commit; Hosted acceptance pending
Final-I.6.7 status: Completed and accepted on 2026-10-12 at e5538e8e4528bc0c956bdc0ae07bcdbf2c52f283
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.8 is a bounded Admin calendar and adjacent Admin UX polish subphase. It does not reopen accepted Final-I.6.7 work, does not begin Final-I.7, and does not change Production readiness state.

## Implemented Scope

- Accommodations management removes the redundant `Contenido publico` / `Public content` readonly-boundary note while preserving the property cards, values, edit buttons, and operational restrictions.
- Accommodations management removes only the `Configuracion de preparacion` / `Preparation configuration` badge above `Buffers de preparacion` while preserving the title, contextual help, mounted tabs, forms, validation, and operational indicators.
- FEL keeps its `Nueva factura` / `Borradores e historial` tabs on natural width inside the existing grid container, while the form and history panels remain full-width.
- Calendar integrations removes the redundant page-header badge and the two informational presentation cards above the property navigation.
- Calendar integrations replaces the Button-based accommodation selector with controlled shared Tabs backed by `selectedPropertyId`; selection remains component state, not URL navigation, and the tabs keep keyboard-accessible Radix behavior plus horizontal overflow on narrow screens.
- Calendar integrations preserves secret-safe forms, operational badges, inbound/outbound status indicators, confirmation flows, and refresh behavior.
- Admin calendar performance was measured before deciding whether to alter server data flow. The accepted availability service and composed-listing blocking rules remain the source of truth.

## Preserved Boundaries

Final-I.6.8 does not modify Prisma schema, migrations, database data, API contracts, reservation/payment/FEL/Tilopay/email/notification business logic, cron jobs, `vercel.json`, dependencies, environment variables, Production resources, Final-I.7, Final-I.8, Final-I.9, or Phase 13.

The public availability tabs continue to use the accepted subtle visual variant. Final-I.6.8 does not alter public accommodation queries, availability selection, booking behavior, or guest-facing routes.

## Admin Calendar Performance Measurement

Measurement was read-only against the local/test database path through `getAdminPropertyCalendar()` with `now` fixed to `2026-10-12T12:00:00.000Z`. The run used three accommodations and the previous, current, and next calendar months, with five sequential samples per accommodation/month. The timing represents the server calendar data path used by initial load, property changes, and month changes because the Admin calendar page is dynamic and route-driven.

No private reservation values, guest data, external calendar secrets, tokens, or provider payloads were logged or persisted during measurement. Query timing was grouped only by safe table family: property read, reservations/holds, calendar blocks, lifecycle holds, preparation overrides, and total function time.

G.4 historical black-white September 2026 median was approximately `645.9 ms`; it remains historical context only and is not treated as a current baseline.

```text
black-white-apartment / 2026-09:
  first sample 3549.9 ms; median 741.2 ms; p80 1001.2 ms; min/max 619.8-3549.9 ms; query count 7; entries 8
black-white-apartment / 2026-10:
  first sample 866.3 ms; median 624.4 ms; p80 866.3 ms; min/max 621.7-992.5 ms; query count 8; entries 34
black-white-apartment / 2026-11:
  first sample 620.9 ms; median 515.1 ms; p80 620.7 ms; min/max 498.2-620.9 ms; query count 7; entries 20

perfect-retreat-bungalow / 2026-09:
  first sample 619.1 ms; median 498.4 ms; p80 619.1 ms; min/max 495.5-620.3 ms; query count 7; entries 4
perfect-retreat-bungalow / 2026-10:
  first sample 619.2 ms; median 619.2 ms; p80 681.6 ms; min/max 498.5-860.8 ms; query count 7-9; entries 19
perfect-retreat-bungalow / 2026-11:
  first sample 738.7 ms; median 497.0 ms; p80 505.1 ms; min/max 495.8-738.7 ms; query count 7; entries 13

complete-retreat / 2026-09:
  first sample 863.2 ms; median 619.9 ms; p80 622.0 ms; min/max 496.6-863.2 ms; query count 7; entries 8
complete-retreat / 2026-10:
  first sample 743.8 ms; median 626.3 ms; p80 743.0 ms; min/max 621.5-743.8 ms; query count 8; entries 34
complete-retreat / 2026-11:
  first sample 618.0 ms; median 504.5 ms; p80 618.0 ms; min/max 495.1-866.6 ms; query count 7; entries 20
```

Observed medians across the nine accommodation/month combinations were `497.0-741.2 ms`, with an overall median of `619.2 ms`. The first black-white September sample was the only multi-second outlier. Subsequent samples and the other accommodation/month combinations did not show a deterministic query-count or construction-stage regression.

The current implementation already delegates availability blocking to `getAvailabilityBlockingRecords()` and uses parallel reads for independent reservation, calendar-block, lifecycle-hold, blocking-block-detail, and preparation-override data. No duplicate replacement of availability logic was introduced.

No persistent cache, Redis, localStorage, CDN cache, or unstable_cache was added. The authenticated Admin calendar remains dynamic and operational. A future second-stage optimization may be evaluated only if Hosted owner validation shows the bottleneck is route navigation or visible-client transition time rather than server data construction.

## Server Revalidation And Safety

- `app/admin/calendar/page.tsx` remains `force-dynamic`.
- Calendar property and month changes remain route-driven Admin navigation.
- Manual block create/delete and preparation-buffer unlock/restore operations continue to execute server-side authorization and availability checks through their existing API routes.
- Successful Admin calendar mutations still call `router.refresh()` so the next visible calendar state is re-read from the server after persistence.
- Create/unlock/restore block behavior is unchanged; this subphase only verifies that the existing server-side refresh/re-read contract remains intact.

## Test Coverage

Final-I.6.8 adds `tests/final-i/i68-admin-calendar-ux-performance.test.ts`, registered through `tests/final-i/run.ts`.

The new coverage verifies:

- The Accommodations page removes only the redundant readonly-boundary note and preparation badge while preserving property status, edit actions, mounted tabs, and preparation settings.
- Calendar integrations uses controlled shared Tabs instead of Button-based property selection, keeps horizontal overflow, and removes only the redundant header/info-card presentation.
- FEL tabs use natural width inside the grid while the existing full-width panels remain unchanged.
- Admin calendar writes still rely on server-side routes and refresh the dynamic calendar view after successful mutations.
- The Admin calendar performance record preserves the accepted availability architecture and explicitly rejects persistent client/server cache shortcuts for this subphase.

## Validation Ledger

```text
npm run final-i:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 141/141
npm run final-h:validate — PASS, 20/20
npm run final-g:validate — PASS, 48/48
npm run admin:calendar-display:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS
npm run lint — PASS
npm run build — initial sandbox run failed fetching Google Fonts; outside-sandbox rerun PASS with Next slow-filesystem warning only
git diff --check — PASS; Windows CRLF normalization warnings only
```

## Current State After Implementation

```text
Final-I.6.7 — Completed and accepted on 2026-10-12 at e5538e8e4528bc0c956bdc0ae07bcdbf2c52f283
Final-I.6.8 — Implementation completed; Hosted owner validation pending
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```

Final-I.6.8 remains pending Hosted owner validation and formal acceptance. Final-I.7 remains blocked, Final-I.8 and Final-I.9 remain Not started, and Phase 13 remains Blocked / Not started until Final-I closes.
