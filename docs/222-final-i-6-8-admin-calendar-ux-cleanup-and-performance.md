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
Initial implementation head: 8d7be6c3168f8cf3f4e8c66301fdfc096f8f18fe
Pre-Hosted route-timing security hardening base: ab60b6953c6b03000d4d3b85706f04530713fbaa
Pre-Hosted calendar navigation UX hardening head: This hardening commit; Hosted acceptance pending
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
- Pre-Hosted hardening wraps each calendar-integration property card in a matching Radix `TabsContent` so every property tab owns a tabpanel while still mounting only the selected `IntegrationCard`.
- Admin calendar performance was measured before and after changing the server data flow. The accepted availability service and composed-listing blocking rules remain the source of truth.
- `getAdminPropertyCalendar()` now starts the independent property-list, availability-record, and preparation-override reads before awaiting the property list, then fetches blocking-block details and reservation details only after their IDs are known. This preserves the existing meaning while overlapping independent database latency.
- Pre-Hosted calendar navigation UX hardening adds a typed `{ propertyId, month }` route coordinator for `/admin/calendar` so accommodation and month selections update visually immediately while preserving URL-driven navigation, browser history, and server-owned calendar data.
- Pending calendar navigation now replaces the old calendar grid with a same-geometry skeleton for the target month/accommodation. The skeleton keeps seven weekday headers and 42 placeholder day cells, uses localized accessible loading copy, and avoids showing stale blocking entries under an optimistic tab or month.
- Calendar accommodation tabs and previous/today/next controls are guarded by one pending state plus a synchronous duplicate guard. While navigation or a calendar mutation is in progress, tabs/month controls expose `aria-disabled`, keyboard prevention, and disabled affordance; manual block/date actions are also disabled against stale data. Calendar-specific `Link` prefetch is disabled only for these controls, and route pushes preserve scroll position.

## Preserved Boundaries

Final-I.6.8 does not modify Prisma schema, migrations, database data, API contracts, reservation/payment/FEL/Tilopay/email/notification business logic, cron jobs, `vercel.json`, dependencies, environment variables, Production resources, Final-I.7, Final-I.8, Final-I.9, or Phase 13.

The public availability tabs continue to use the accepted subtle visual variant. Final-I.6.8 does not alter public accommodation queries, availability selection, booking behavior, or guest-facing routes.

## Admin Calendar Performance Measurement

Measurement was read-only against the local/test database path through `getAdminPropertyCalendar()` with `now` fixed to `2026-10-12T12:00:00.000Z`. The original implementation run used three accommodations and the previous, current, and next calendar months, with five sequential samples per accommodation/month. The Pre-Hosted hardening run used the same accommodation/month matrix with seven sequential samples per combination through the reproducible command below:

```text
TRP_ENVIRONMENT=test npm run admin:calendar-performance:measure -- --samples=7 --month=2026-10 --summary-only --skip-route
```

The measurement script is `scripts/measure-admin-property-calendar.ts`. It fails closed unless `TRP_ENVIRONMENT=test`, refuses production-looking database URLs, logs only property ids, months, durations, counts, safe stage names, and safe query-family timings, and never logs guest data, reservation values, provider URLs, tokens, cookies, secrets, or raw SQL parameters.

The script also supports authenticated route-response timing through `--route-base-url=...` plus `TRP_ADMIN_SESSION_COOKIE`, but only for the explicit HTTPS Test origin `https://trp-booking.juantzun.dev`. Route timing rejects non-HTTPS schemes, embedded URL credentials, Production origins, external domains, and lookalike domains before any fetch can send the ADMIN cookie. The cookie value is intentionally read only from environment and is not printed. Redirect responses and authentication failures are invalid route samples. No browser-visible "time until calendar displayed" metric is claimed in this record because no real ADMIN session cookie or authenticated browser session was available to automation.

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

### Pre-Hosted Hardening Measurement

After the bounded server optimization, the same read-only Test matrix produced these seven-sample medians:

```text
black-white-apartment / 2026-09:
  first sample 2693.4 ms; median 641.2 ms; p80 763.9 ms; min/max 388.1-2693.4 ms; query count 7; entries 8
black-white-apartment / 2026-10:
  first sample 909.0 ms; median 651.2 ms; p80 904.0 ms; min/max 514.6-909.0 ms; query count 8; entries 34
black-white-apartment / 2026-11:
  first sample 513.8 ms; median 387.5 ms; p80 513.8 ms; min/max 385.9-522.7 ms; query count 7; entries 20

perfect-retreat-bungalow / 2026-09:
  first sample 516.7 ms; median 513.6 ms; p80 516.7 ms; min/max 386.6-647.5 ms; query count 7; entries 4
perfect-retreat-bungalow / 2026-10:
  first sample 641.4 ms; median 387.7 ms; p80 514.7 ms; min/max 386.8-641.4 ms; query count 7; entries 19
perfect-retreat-bungalow / 2026-11:
  first sample 397.6 ms; median 397.6 ms; p80 515.8 ms; min/max 387.5-648.3 ms; query count 7; entries 13

complete-retreat / 2026-09:
  first sample 661.3 ms; median 641.7 ms; p80 654.0 ms; min/max 385.5-661.3 ms; query count 7; entries 8
complete-retreat / 2026-10:
  first sample 522.0 ms; median 553.5 ms; p80 565.6 ms; min/max 522.0-683.5 ms; query count 8; entries 34
complete-retreat / 2026-11:
  first sample 406.7 ms; median 391.1 ms; p80 513.8 ms; min/max 386.8-650.0 ms; query count 7; entries 20
```

Before/after median comparison against the original Final-I.6.8 measurement:

```text
black-white-apartment / 2026-09: 741.2 -> 641.2 ms, 13.5% faster
black-white-apartment / 2026-10: 624.4 -> 651.2 ms, 4.3% slower
black-white-apartment / 2026-11: 515.1 -> 387.5 ms, 24.8% faster
perfect-retreat-bungalow / 2026-09: 498.4 -> 513.6 ms, 3.0% slower
perfect-retreat-bungalow / 2026-10: 619.2 -> 387.7 ms, 37.4% faster
perfect-retreat-bungalow / 2026-11: 497.0 -> 397.6 ms, 20.0% faster
complete-retreat / 2026-09: 619.9 -> 641.7 ms, 3.5% slower
complete-retreat / 2026-10: 626.3 -> 553.5 ms, 11.6% faster
complete-retreat / 2026-11: 504.5 -> 391.1 ms, 22.5% faster
overall median across the nine combinations: 619.2 -> 513.6 ms, 17.1% faster
```

The safe stage timings confirmed that `properties`, `availability_records`, and `preparation_overrides` now overlap. Median totals remain driven primarily by availability and blocking-detail reads, not by presentation work. The bounded change is retained because it improved the overall median without changing query meaning, source precedence, availability records, preparation overrides, or mutation revalidation. Small per-combination regressions remain within the observed Test database/network variability and do not justify broader architecture work in this subphase.

No persistent cache, Redis, localStorage, CDN cache, or unstable_cache was added. The authenticated Admin calendar remains dynamic and operational. A future second-stage optimization may be evaluated only if Hosted owner validation shows the bottleneck is route navigation or visible-client transition time rather than server data construction.

## Server Revalidation And Safety

- `app/admin/calendar/page.tsx` remains `force-dynamic`.
- Calendar property and month changes remain route-driven Admin navigation.
- Manual block create/delete and preparation-buffer unlock/restore operations continue to execute server-side authorization and availability checks through their existing API routes.
- Successful Admin calendar mutations still call `router.refresh()` so the next visible calendar state is re-read from the server after persistence.
- Create/unlock/restore block behavior is unchanged; this subphase only verifies that the existing server-side refresh/re-read contract remains intact.
- The navigation UX hardening does not change `getAdminPropertyCalendar()`, availability semantics, Airbnb imports/exports, composed-listing inheritance, preparation buffers, mutations, Prisma schema, or migrations. It improves perceived responsiveness and duplicate-request prevention around the existing dynamic route rather than claiming a new backend speedup.

## Test Coverage

Final-I.6.8 adds `tests/final-i/i68-admin-calendar-ux-performance.test.ts`, registered through `tests/final-i/run.ts`.

The new coverage verifies:

- The Accommodations page removes only the redundant readonly-boundary note and preparation badge while preserving property status, edit actions, mounted tabs, and preparation settings.
- Calendar integrations uses controlled shared Tabs instead of Button-based property selection, keeps horizontal overflow, and removes only the redundant header/info-card presentation.
- Calendar integrations now renders `TabsContent` panels associated with the property triggers, preserving Radix tab/tabpanel semantics without mounting every `IntegrationCard`.
- FEL tabs use natural width inside the grid while the existing full-width panels remain unchanged.
- Admin calendar writes still rely on server-side routes and refresh the dynamic calendar view after successful mutations.
- The Admin calendar performance record preserves the accepted availability architecture, verifies the Test-only measurement script, verifies independent server reads are started before awaiting the property list, and explicitly rejects persistent client/server cache shortcuts for this subphase.
- The measurement tool route-timing guard accepts only the authorized HTTPS Test origin, rejects HTTP/FTP, embedded credentials, Production/external/lookalike domains, and treats redirects plus authentication failures as invalid samples without logging cookies or sensitive headers.
- The Admin calendar navigation coordinator collapses rapid duplicate accommodation/month requests, clears correctly after confirmed, cancelled, or external navigation, and preserves URL-based route construction.
- The Admin calendar pending UX renders an accessible 42-cell skeleton instead of stale entries, updates the active accommodation/month immediately, disables tabs/month controls/manual block actions while pending, and uses the same coordinator for previous, today, and next month controls.

## Validation Ledger

```text
npm run admin:calendar-performance:measure -- --samples=7 --month=2026-10 --summary-only --skip-route — initial sandbox run failed before measurement with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS with Test-only guard and safe summarized output
npm run final-i:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 142/142
npm run final-h:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 20/20
npm run final-g:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 48/48
npm run admin:calendar-display:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS
npm run airbnb:import-policy:validate — initial sandbox run failed before validation with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS
npm run airbnb:export-policy:validate — initial sandbox run failed before validation with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS
npm run airbnb:export-path:validate — initial sandbox run failed before validation with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS
npm run lint — PASS
npm run build — initial sandbox run failed fetching Google Fonts; outside-sandbox rerun PASS with Next slow-filesystem warning only
git diff --check — PASS; Windows CRLF normalization warnings only
```

Measurement-tool security hardening validation:

```text
npm run final-i:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 144/144
npm run final-h:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 20/20
TRP_ENVIRONMENT=test npm run admin:calendar-performance:measure -- --samples=1 --month=2026-10 --summary-only --skip-route — PASS outside the sandbox; direct getAdminPropertyCalendar() measurement remains intact
TRP_ENVIRONMENT=test TRP_ADMIN_SESSION_COOKIE=<fake> npm run admin:calendar-performance:measure -- --samples=1 --month=2026-10 --summary-only --route-base-url=https://evil.example --route-samples=1 — PASS as a negative security check; command exits non-zero before any route fetch with the safe diagnostic "--route-base-url is restricted to the authorized Test origin."
npm run lint — PASS
npm run build — initial sandbox run failed fetching Google Fonts; outside-sandbox rerun PASS with Next slow-filesystem warning only
git diff --check — PASS; Windows CRLF normalization warnings only
```

Calendar navigation UX hardening validation:

```text
npm run final-i:validate — initial sandbox run failed before tests with uv_os_get_passwd ENOMEM; outside-sandbox rerun PASS, 149/149
npm run final-h:validate — PASS, 20/20
npm run final-g:validate — PASS, 48/48
npm run admin:calendar-display:validate — PASS
npm run lint — PASS
npm run build — initial sandbox run failed fetching Google Fonts; first outside-sandbox rerun exposed a type-narrowing issue that was corrected; final outside-sandbox rerun PASS with Next slow-filesystem warning only
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
