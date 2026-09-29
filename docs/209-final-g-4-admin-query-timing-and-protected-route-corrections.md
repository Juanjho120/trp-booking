# 209 — Final-G.4: Admin/query timing and protected-route corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.4 — Admin/query timing and targeted protected-route corrections
Status: Implementation completed; Hosted owner validation + acceptance pending
Document date: 2026-09-28
Implementation base head: 3b65f145c17fc3fb2789c43eb3144214d1c01ec8
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Accepted G.2 feature head: ecafa2f95314fe485b1e1cc2d6372c40f076964a
G.2 Hosted evidence head: c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Accepted G.3 head: e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28
Final-G.3: Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4: Implementation completed; Hosted owner validation + acceptance pending
Final-G.5: Not started
Final-H: Not started
Phase 13: Not started
Schema changes: none
Migration changes: none
Dependency changes: none
Environment variable changes: none
Production resources: none
vercel.json remains {"crons":[]}
```

G.4 implements the protected Admin route bundle correction and records the query-timing audit requested
after the accepted G.3 client/hydration work. It does not mark G.4 accepted, does not start G.5, and
does not start Final-H or Phase 13.

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
its own catalog management component graph is legitimately larger, but it no longer inherits the full
552 kB broad-barrel graph and remains route-specific rather than globally shared across all Admin pages.

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

G.4 remains pending Hosted owner validation and explicit acceptance.

## Boundary Confirmation

G.4 preserves:

```text
- ADMIN_ROLE protected Admin layout boundary.
- OAuth/session Admin access path.
- middleware /admin/:path* protection.
- Admin API authorization and same-origin mutation protection.
- Admin reservations, payments, reviews, notifications, calendar, accommodations, location, catalogs and cron behavior.
- accepted Final-A through Final-F behavior.
- accepted Final-G.2 public cache architecture.
- accepted Final-G.3 public client/hydration architecture.
- vercel.json {"crons":[]}.
```

G.4 does not implement Final-G.5, Final-H, or Phase 13.
