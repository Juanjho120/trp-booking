# 209 — Final-G.4: Admin/query timing and protected-route corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.4 — Admin/query timing and targeted protected-route corrections
Status: Completed and accepted
Document date: 2026-09-28
Implementation base head: 3b65f145c17fc3fb2789c43eb3144214d1c01ec8
Accepted G.4 feature head: 7090701b2dc37f4cbd6490f250984b6db9d53a58
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Accepted G.2 feature head: ecafa2f95314fe485b1e1cc2d6372c40f076964a
G.2 Hosted evidence head: c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Accepted G.3 head: e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G package: Completed and accepted on 2026-09-28
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28
Final-G.3: Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4: Completed and accepted on 2026-09-28 at 7090701b2dc37f4cbd6490f250984b6db9d53a58
Final-G.5: Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3
Final-H: Next / Not started
Phase 13: Not started
Schema changes: none
Migration changes: none
Dependency changes: none
Environment variable changes: none
Production resources: none
vercel.json remains {"crons":[]}
```

G.4 implements the protected Admin route bundle correction and records the query-timing audit requested
after the accepted G.3 client/hydration work. The owner explicitly accepted Final-G.4 on 2026-09-28
after the Vercel deployment for `7090701b2dc37f4cbd6490f250984b6db9d53a58` succeeded.
This closure does not start G.5, Final-H or Phase 13.

## Accepted Closure Summary

Final-G.4 is completed and accepted with the following outcome:

```text
Final-G.4 — Completed and accepted on 2026-09-28
Accepted feature head: 7090701b2dc37f4cbd6490f250984b6db9d53a58
Implementation base: 3b65f145c17fc3fb2789c43eb3144214d1c01ec8
Implementation record: docs/209-final-g-4-admin-query-timing-and-protected-route-corrections.md
Vercel status for accepted head: SUCCESS
Owner acceptance: Final-G.4 is approved.
```

The broad route-entry barrels were confirmed as the major avoidable Admin client-bundle coupling.
The accepted correction keeps Admin information architecture and behavior unchanged while moving
Admin route entrypoints to direct `features/admin/components/...` imports and direct `lib/admin/...`
imports where appropriate. `AdminShell` remains client-side and unchanged in behavior, and the barrels
themselves remain available to non-route consumers.

## Scope Implemented

The runtime change is intentionally narrow:

```text
- Admin route entry points no longer import the broad @/features/admin barrel.
- Admin route entry points no longer import the broad @/lib/admin server barrel.
- The existing feature/admin and lib/admin barrels remain available for non-route code.
- AdminShell remains the same client component and was not aggressively split.
- Protected Admin auth remains in app/admin/layout.tsx through auth(), ADMIN_ROLE, and redirect("/") for non-admin users.
- Admin API same-origin mutation protections and ADMIN-only session actor checks are preserved.
- No protected Admin data was moved to public endpoints.
- No schema, migration, env, dependency, cron, or Production resource change was introduced.
```

The change was made only after the production build baseline showed every Admin route sharing the same
large first-load graph. The root cause was route-level coupling through broad barrels, especially the
layout import of `AdminShell` from `@/features/admin`, which made simple protected routes inherit a large
set of unrelated Admin client components.

## Build Baseline Before Runtime Edits

Baseline command:

```text
npm run build
```

The sandboxed build could not fetch Google Fonts because network access is restricted; the same command
was rerun with network permission and completed successfully.

Baseline first-load evidence:

| Route | First Load JS |
| --- | ---: |
| /admin | 552 kB |
| /admin/reservations | 552 kB |
| /admin/calendar | 552 kB |
| /admin/payments | 552 kB |
| /admin/reviews | 552 kB |
| /admin/notifications | 552 kB |
| /admin/accommodations | 552 kB |
| /admin/location | 552 kB |
| /admin/catalogs | 552 kB |
| /admin/cron-jobs | 552 kB |

Baseline shared-by-all output was about 230 kB. The route manifest showed the same 19 chunks for every
targeted Admin route, with a raw listed total around 2,252,881 bytes per route. The largest shared chunks
in that coupled graph included route-independent Admin code such as `52340270597a707c.js` at 572,654
bytes and `d8dc21d3e6ec6db0.js` at 385,343 bytes.

## Build Evidence After Runtime Edits

Post-change command:

```text
npm run build
```

The sandboxed build again hit only the Google Fonts network restriction; the network-enabled rerun
completed successfully.

| Route | Baseline | After G.4 | Change |
| --- | ---: | ---: | ---: |
| /admin | 552 kB | 320 kB | -42.0% |
| /admin/reservations | 552 kB | 343 kB | -37.9% |
| /admin/calendar | 552 kB | 324 kB | -41.3% |
| /admin/payments | 552 kB | 343 kB | -37.9% |
| /admin/reviews | 552 kB | 342 kB | -38.0% |
| /admin/notifications | 552 kB | 329 kB | -40.4% |
| /admin/accommodations | 552 kB | 322 kB | -41.7% |
| /admin/location | 552 kB | 329 kB | -40.4% |
| /admin/catalogs | 552 kB | 478 kB | -13.4% |
| /admin/cron-jobs | 552 kB | 329 kB | -40.4% |

The simple protected routes exceed the primary client target. `/admin/catalogs` remains heavier because
its own catalog-management client graph is legitimately larger, but it no longer inherits the full
552 kB broad-barrel graph and remains route-specific rather than globally shared across all Admin pages.
No artificial lazy-loading was introduced solely to force the 20% target.

Post-change shared-by-all output was about 221 kB. Representative route-manifest evidence:

```text
/admin: 17 chunks, raw listed total about 1,267,298 bytes.
/admin/reservations: 18 chunks, raw listed total about 1,337,001 bytes.
/admin/calendar: 17 chunks, raw listed total about 1,281,564 bytes.
/admin/payments: 18 chunks, raw listed total about 1,339,894 bytes.
/admin/reviews: 18 chunks, raw listed total about 1,331,496 bytes.
/admin/notifications: 17 chunks, raw listed total about 1,293,936 bytes.
/admin/accommodations: 17 chunks, raw listed total about 1,275,723 bytes.
/admin/location: 17 chunks, raw listed total about 1,295,636 bytes.
/admin/catalogs: 20 chunks, raw listed total about 1,910,869 bytes.
/admin/cron-jobs: 17 chunks, raw listed total about 1,298,080 bytes.
```

The remaining shared cost is the accepted protected Admin shell/platform floor plus Next/Turbopack shared
runtime. G.4 does not split `AdminShell` further because the route-entry barrel split already removed the
large avoidable coupling without altering Admin navigation, auth, localization, or operational behavior.

## Query Timing Audit

G.4 audited the dashboard, reservations and property-calendar Admin readers. No Admin operational data
was cached or made stale.

Source-level findings:

```text
lib/admin/dashboard.ts
- already uses Promise.all for the summary count/read group.
- keeps the bounded latest-reservations read at take: 5.
- does not use unstable_cache, revalidateTag, or public cache helpers.

lib/admin/reservations.ts
- keeps PAGE_SIZE pagination.
- clamps safePage to totalPages before the page read.
- preserves status/search/property filters and ordering semantics.
- does not use unstable_cache, revalidateTag, or public cache helpers.

lib/admin/property-calendar.ts
- preserves the 42-day admin calendar grid.
- preserves preparation-buffer override semantics and source priority.
- parallelizes blocking records and preparation overrides safely.
- does not use unstable_cache, revalidateTag, or public cache helpers.
```

Local/Test timing samples were captured against the shared Local/Test database. The first sample includes
connection/provider warm-up and is not labeled as a serverless cold start.

| Reader | Median | Min | Max | Samples |
| --- | ---: | ---: | ---: | --- |
| Dashboard summary | 498.6 ms | 257.0 ms | 2355.2 ms | 2355.2, 520.5, 481.6, 498.6, 257.0 |
| Reservations default page | 511.4 ms | 509.0 ms | 896.4 ms | 896.4, 510.7, 509.0, 511.4, 630.7 |
| Calendar black-white 2026-09 | 645.9 ms | 635.4 ms | 1266.2 ms | 1266.2, 764.0, 635.4, 637.4, 645.9 |

No query runtime change was made from this audit because the relevant readers already used the safe
parallelization/clamping structure available without weakening protected-data freshness or correctness.
This no-change query result is part of the accepted evidence-driven G.4 outcome:

```text
Dashboard summary median: about 498.6 ms.
Reservations default page median: about 511.4 ms.
Calendar black-white September 2026 median: about 645.9 ms.
```

Dashboard summary reads were already parallelized with `Promise.all`, the bounded arrivals query already
uses `take: 5`, and stale caching is not appropriate for protected Admin operational data. Reservations
must count before safe page clamping, and the list query legitimately depends on the resolved safe page
while preserving pagination and filter semantics. Calendar reads remain correctness-dependent across
multiple phases, availability internals already parallelize safe reads, and no evidence justified
duplicating availability logic, adding speculative indexes, or adding stale cache.

## Validation Ledger

Executed during G.4 implementation:

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 48/48.
npm run final-a:validate — PASS, 44/44.
npm run final-b:validate — PASS, 38/38.
npm run final-c:validate — PASS, 41/41.
npm run final-d:validate — PASS, 66/66.
npm run final-e:validate — PASS, 88/88.
npm run final-f:validate — PASS, 125/125.
npm run env:validate — PASS.
npm run db:validate — PASS.
npm run db:generate — PASS.
npm run db:migrate:status — PASS after network-enabled rerun; database schema is up to date.
npm run lint — PASS.
npm run build — PASS after network-enabled rerun for Google Fonts fetch.
git diff --check — PASS.
```

The first sandboxed `db:migrate:status` attempt loaded Prisma configuration but failed in the schema
engine while reaching the Supabase pooler from the restricted sandbox. The same command passed with
network permission. The sandboxed build attempts were blocked only by Google Fonts network access; the
network-enabled build completed successfully.

This validation state is accepted for Final-G.4 closure. No schema, migration, dependency,
environment-variable, Production resource, or scheduler change was introduced.

## Boundary Confirmation

G.4 preserves:

```text
- ADMIN_ROLE protected Admin layout boundary.
- auth().
- OAuth/session Admin access path.
- middleware /admin/:path* protection.
- ADMIN-only server session actor.
- Admin API authorization and same-origin mutation protection.
- protected Admin APIs and private Admin data boundaries.
- Admin reservations, payments, reviews, notifications, calendar, accommodations, location, catalogs and cron behavior.
- accepted Final-A through Final-F behavior.
- Final-F Admin Web Push, service worker, notification subscriptions, notification center, device registration, PWA installation, notification configuration, and operational notification classes.
- accepted Final-G.2 public cache architecture.
- accepted Final-G.3 public client/hydration architecture.
- public i18n architecture, /disponibilidad behavior, public bundle splitting, booking form, DayPicker, Tilopay hardening, and image delivery architecture.
- vercel.json {"crons":[]}.
```

G.4 did not implement Final-G.5, Final-H, or Phase 13. Final-G.5 was later explicitly requested as evidence/documentation closure in docs/210.

## Final-G.5 Prepared Scope

Final-G.5 was explicitly requested as the Final-G package evidence/documentation closure phase and is completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3. Its scope is
evidence and closure, not broad new optimization:

```text
- Hosted final comparison.
- Permanent performance evidence.
- Cross-check accepted G.1 baseline vs final G.2/G.3/G.4 state.
- Final-G integrated regression.
- Final-G documentation closure.
```

Expected comparison areas:

```text
Public: /, /alojamientos, representative /alojamientos/[slug], /disponibilidad, /resenas.
Admin: final build First Load JS for representative Admin routes, authenticated owner UX evidence from accepted G.4, and no auth bypass.
```

G.5 should preserve G.2 server/cache improvements, G.3 public bundle improvements, `/disponibilidad`
CLS correction, blocked-dates hardening, Tilopay hardening, and G.4 Admin bundle reductions. Final-H
and Phase 13 remain Not started until G.5 is completed and explicitly accepted.
