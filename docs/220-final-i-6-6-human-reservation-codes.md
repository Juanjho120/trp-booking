# Final-I.6.6 — Human Reservation Codes

## Status

Status: Implementation completed; Hosted owner validation pending

- Implementation base: `0e28002e7a6317986745b6d6406b260a85f3fa44`
- Implementation date: 2026-10-09
- Scope: Human-readable Reservation reference codes for guest/admin presentation only.
- Final-I.6.5 remains completed and accepted; this work does not reopen Admin contextual-help/copy-density polish.
- Final-I.7 — Blocked pending official INFILE technical documentation and Test credentials.
- Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX.
- Final-I.9 — Not started / integrated Final-I closure.
- Phase 13 — Blocked / Not started until Final-I closes and is explicitly accepted.

Do not mark Final-I.6.6 accepted until Hosted owner validation and explicit owner acceptance are complete.

## Scope Boundary

Final-I.6.6 introduces an immutable human Reservation code so guests and admins can reference Reservations without relying on the technical database ID in visible UI and selected emails.

The code is not an authentication factor, secret, token, lookup credential, or public route key. The technical `Reservation.id` remains authoritative for database relations, admin routes, API parameters, payment provider handoff, idempotency, audit history, and internal joins.

No Production resources, provider credentials, cron changes, dependency changes, FEL provider integration, or Phase 13 work are introduced.

## Code Format

Accepted runtime format:

```text
TRXXXXXXXXXX
```

Rules:

```text
length: 12 characters
prefix: TR
random suffix length: 10
alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
excluded ambiguous characters: I, O, 0, 1
```

The implementation lives in `lib/reservations/reservation-code.ts` and uses Node `crypto.randomInt`. The helper validates the full code with `^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$`.

## Persistence And Backfill

Migration:

```text
20261009130000_final_i_6_6_human_reservation_codes
```

Schema field:

```prisma
reservationCode String @unique @map("reservation_code") @db.VarChar(12)
```

Migration behavior:

```text
- add nullable reservations.reservation_code
- backfill existing rows with random TR codes from the approved alphabet
- retry backfill candidates on collision
- add CHECK format constraint
- set NOT NULL
- add unique index reservations_reservation_code_key
```

The backfill does not derive the human code from `Reservation.id` or any provider/payment identifier.

## Runtime Creation Contract

Pending-hold creation generates `reservationCode` when creating the `Reservation` row.

Unique-code collision handling is intentionally narrow:

```text
- retry only Prisma P2002 collisions targeting reservationCode / reservation_code
- retry is bounded by RESERVATION_CODE_MAX_GENERATION_ATTEMPTS
- unrelated uniqueness or persistence errors are rethrown
- repeated code collision exhausts to the existing pending-hold conflict path
```

`PendingReservationHold` now returns both:

```text
reservationId   -> technical internal/payment reference
reservationCode -> visible guest/admin reference
```

The public reservation form displays `reservationCode`; the Tilopay checkout still receives `reservationId`.

## Visible Surfaces Updated

Admin Reservation list:

```text
- displays Código de reservación / Reservation code
- search includes reservationCode
- accordion keys, values, and detail links keep reservation.id
```

Admin Reservation detail:

```text
- shell includes id, reservationCode, status
- header/title displays reservationCode
- overview displays reservationCode
- tab/API fetches and mutation targets keep reservationShell.id
```

Public payment result and retry pages:

```text
- server pages resolve reservationCode from reservationId
- visible reference uses reservationCode
- callback query and Tilopay retry checkout keep the technical reservationId
- no public lookup route by reservationCode was introduced
```

Reservation confirmation emails:

```text
- guest confirmation email displays reservationCode
- admin new-reservation email displays reservationCode
- admin action URL still targets /admin/reservations/{Reservation.id}
```

FEL Admin draft UX:

```text
- visible Reservation references use reservationCode
- selected reservationIds, FEL source allocations, document relations, and persisted commercial-source ownership keep technical Reservation IDs
```

## Security And Routing Boundary

`reservationCode` is public-reference-safe but not security-sensitive. It must not be used as a bearer credential.

Frozen boundaries:

```text
- no `/reservations/[reservationCode]` route
- no public API lookup by code
- no payment confirmation by code
- no admin auth bypass by code
- no provider idempotency or webhook logic based on code
- no replacement of existing technical IDs in database relations
```

## Test Coverage

Final-I.6.6 adds `tests/final-i/i66-human-reservation-codes.test.ts`, covering:

```text
- generator format and validator rejection of ambiguous/invalid codes
- Prisma schema and migration constraints
- pending-hold persistence/return contract and bounded collision retry
- admin list display/search plus ID-preserving routing
- admin detail shell/overview code display plus ID-preserving fetches
- confirmation/admin-new-reservation email visible code contract
- public payment result/retry visible code plus provider-flow ID preservation
- FEL visible code references plus technical source IDs
- absence of public reservation-code routes
```

Existing Final-I tests were updated only where the new schema field or stable Prettier formatting required it.

## Validation Ledger

Implementation validation executed for this turn:

```text
npm run final-i:validate
PASS — 127/127

$env:TRP_ENVIRONMENT='test'; npm run final-i:db:validate
PASS — 14/14

npm run final-h:validate
PASS — 20/20

npm run db:validate
PASS — Prisma package.json#prisma deprecation warning only

npm run db:generate
PASS — Prisma package.json#prisma deprecation warning and Prisma major-version notice only

npm run db:migrate:deploy
PASS — applied 20261009130000_final_i_6_6_human_reservation_codes to the Local/Test database

npm run db:migrate:status
PASS — 32 migrations; database schema is up to date

npm run lint
PASS

npm run build
PASS — Next slow-filesystem warning only

vercel.json exact crons confirmation
PASS — remains exactly { "crons": [] }
```

Notes:

```text
- final-i:db:validate without TRP_ENVIRONMENT=test failed closed as expected and was rerun with the required Test environment.
- Two intermediate DB-backed reruns hit transient Local/Test database connectivity/transaction-timeout failures before the final 14/14 pass.
- git diff --check is executed after final documentation reconciliation and recorded in docs/212 plus the completion report.
```

## Current State

```text
Final-I.6.6 — Implementation completed; Hosted owner validation pending
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```