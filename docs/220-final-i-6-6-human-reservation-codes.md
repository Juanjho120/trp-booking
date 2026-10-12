# Final-I.6.6 — Human Reservation Codes

## Status

Status: Completed and accepted on 2026-10-12

- Implementation base: `0e28002e7a6317986745b6d6406b260a85f3fa44`
- Implementation date: 2026-10-09
- Owner-approved format refinement date: 2026-10-09
- Owner-approved eight-character refinement accepted feature HEAD: `7c1441ac62c06d723f9e1fbe07d61b5a4de0a8dd`
- Scope: Human-readable Reservation reference codes for guest/admin presentation only.
- Final-I.6.5 remains completed and accepted; this work does not reopen Admin contextual-help/copy-density polish.
- Final-I.7 — Blocked pending official INFILE technical documentation and Test credentials.
- Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX.
- Final-I.9 — Not started / integrated Final-I closure.
- Phase 13 — Blocked / Not started until Final-I closes and is explicitly accepted.

Final-I.6.6 is completed and accepted after Hosted owner validation PASS and explicit owner acceptance on 2026-10-12.

## Scope Boundary

Final-I.6.6 introduces an immutable human Reservation code so guests and admins can reference Reservations without relying on the technical database ID in visible UI and selected emails.

The code is not an authentication factor, secret, token, lookup credential, or public route key. The technical `Reservation.id` remains authoritative for database relations, admin routes, API parameters, payment provider handoff, idempotency, audit history, and internal joins.

No Production resources, provider credentials, cron changes, dependency changes, FEL provider integration, or Phase 13 work are introduced.

## Code Format

Accepted runtime format after owner refinement on 2026-10-09:

```text
TRXXXXXX
```

Rules:

```text
length: 8 characters
prefix: TR
random suffix length: 6
alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
excluded ambiguous characters: I, O, 0, 1
valid example: TR8K3Q7Z
```

The implementation lives in `lib/reservations/reservation-code.ts` and uses Node `crypto.randomInt`. The helper validates the full code with `^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`.

## Persistence And Backfill

Original applied migration:

```text
20261009130000_final_i_6_6_human_reservation_codes
```

Incremental owner-format refinement migration:

```text
20261009143000_final_i_6_6_reservation_code_8_chars
```

Schema field:

```prisma
reservationCode String @unique @map("reservation_code") @db.VarChar(8)
```

Original migration behavior:

```text
- add nullable reservations.reservation_code as VARCHAR(12)
- backfill existing rows with random TR codes from the approved alphabet
- retry backfill candidates on collision
- add CHECK format constraint for the historical 12-character format
- set NOT NULL
- add unique index reservations_reservation_code_key
```

The original migration remains immutable because it was already applied.

Incremental migration behavior:

```text
- fail closed before changing the column if any reservations exist
- preserve immutable existing Reservation codes by refusing automatic shrink/regeneration
- drop and replace reservations_reservation_code_format_check with the final 8-character validation
- alter reservations.reservation_code to VARCHAR(8)
- preserve NOT NULL and the existing unique index reservations_reservation_code_key
- do not update, regenerate, or derive reservation codes from existing rows
```

Pre-application Local/Test precondition checked on 2026-10-09:

```sql
SELECT COUNT(*) FROM trp_booking.reservations;
```

Result: `0`, so the forward-only refinement could be applied to the shared Local/Test database without rewriting Reservation codes.

The backfill does not derive the human code from `Reservation.id` or any provider/payment identifier.

## Runtime Creation Contract

Pending-hold creation generates `reservationCode` when creating the `Reservation` row.

Unique-code collision handling is intentionally narrow and transaction-safe:

```text
- retry only Prisma P2002 collisions targeting reservationCode / reservation_code
- each candidate reservationCode is attempted inside exactly one PostgreSQL/Prisma transaction attempt
- a reservation-code P2002 escapes the failed transaction so PostgreSQL can roll it back
- the next reservation-code retry starts with a fresh generated code and a fresh transaction
- Serializable P2034 retry remains separate and reuses the same reservationCode inside the transaction-retry layer
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

## Pre-Hosted Hardening Checkpoint

Initial implementation head:

```text
eccf2ff76b4aad1f09e357c07d8a7f8525b4cc2b
```

Finding:

```text
The initial runtime collision retry caught a Prisma P2002 reservationCode / reservation_code collision inside the same interactive transaction and then attempted another tx.reservation.create within that transaction callback.
```

Correction:

```text
Reservation-code collision now escapes the failed transaction, allowing PostgreSQL/Prisma to roll it back completely. The outer reservation-code retry loop generates a fresh code and starts a fresh transaction. Serializable P2034 transaction retry remains a separate layer and retries once with the same candidate reservationCode.
```

Preserved behavior:

```text
- reusable active pending holds return the existing Reservation and existing reservationCode
- technical Reservation.id remains authoritative for routes, payment handoff, Admin actions, FEL source allocations, notification targets, and relations
- non-code P2002, business validation failures, pricing failures, unavailable dates, and connectivity errors do not trigger reservation-code retry
```

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
- pending-hold persistence/return contract and fresh-transaction reservation-code collision retry
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
```

Pre-Hosted hardening validation executed after the transaction-safety correction:

```text
npm run final-i:validate
PASS — 127/127 after correcting the new test marker; an earlier run failed on the intentionally updated regression-test assertion before the final pass

$env:TRP_ENVIRONMENT='test'; npm run final-i:db:validate
PASS — 14/14

npm run final-h:validate
PASS — 20/20

npm run db:validate
PASS — Prisma package.json#prisma deprecation warning only

npm run db:generate
PASS — Prisma package.json#prisma deprecation warning only

npm run db:migrate:status
PASS — 32 migrations; database schema is up to date

npm run lint
PASS

npm run build
PASS — Next slow-filesystem warning only

git diff --check
PASS — Windows CRLF normalization warnings only

vercel.json exact crons confirmation
PASS — remains exactly { "crons": [] }
```

Owner-approved 8-character format refinement validation executed on 2026-10-09:

```text
Pre-application Local/Test data guard
PASS — SELECT COUNT(*) FROM trp_booking.reservations returned 0 before migration deployment

npm run final-i:validate
PASS — 127/127

npm run db:validate
PASS — Prisma package.json#prisma deprecation warning only

npm run db:migrate:deploy
PASS — applied 20261009143000_final_i_6_6_reservation_code_8_chars to the Local/Test database

npm run db:generate
PASS — Prisma package.json#prisma deprecation warning only; generated Prisma Client v6.19.3

npm run db:migrate:status
PASS — 33 migrations; database schema is up to date

$env:TRP_ENVIRONMENT='test'; npm run final-i:db:validate
PASS — 14/14

npm run final-h:validate
PASS — 20/20

npm run lint
PASS

npm run build
PASS — Next slow-filesystem warning only

vercel.json exact crons confirmation
PASS — remains exactly { "crons": [] }

git diff --check
PASS — Windows CRLF normalization warnings only
```

Notes:

```text
- The original 12-character migration remains immutable and is still tested as historical applied migration evidence.
- The incremental 8-character migration is fail-closed and refuses to alter existing immutable Reservation codes if any Reservation rows exist.
- No existing Reservation code was rewritten or regenerated because the pre-application Local/Test reservation count was 0.
```

## Formal Acceptance

Final-I.6.6 — Human Reservation Codes is completed and accepted on 2026-10-12.

```text
Accepted feature HEAD: 7c1441ac62c06d723f9e1fbe07d61b5a4de0a8dd
Hosted owner validation: PASS
Owner formal acceptance: PASS
Vercel deployment for accepted feature HEAD: SUCCESS
Final code format: TRXXXXXX
Prefix: TR
Random suffix length: 6
Alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

The owner confirmed that all Final-I.6.6 Hosted functional tests passed satisfactorily and formally approved the subphase on 2026-10-12. No additional Hosted metrics, logs, or per-step observations are invented by this acceptance entry.

The accepted implementation keeps `Reservation.id` as the authoritative technical identifier for database relations, routes, payments, provider handoff, idempotency, audit history, FEL source ownership, and internal joins. The human `reservationCode` remains public-reference-safe only and is not a credential, lookup token, provider idempotency key, payment confirmation key, or relational replacement.

Preserved implementation evidence:

```text
- Final format: TRXXXXXX, eight characters total.
- Generation: fixed TR prefix plus six crypto.randomInt characters.
- Alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789, excluding I, O, 0, and 1.
- Collision handling: bounded transactional retries remain preserved.
- Database protection: PostgreSQL uniqueness and CHECK constraints remain preserved.
- Original migration retained: 20261009130000_final_i_6_6_human_reservation_codes.
- Incremental refinement migration retained: 20261009143000_final_i_6_6_reservation_code_8_chars.
```

Previously recorded automated evidence remains authoritative:

```text
npm run final-i:validate — PASS, 127/127
TRP_ENVIRONMENT=test npm run final-i:db:validate — PASS, 14/14
npm run final-h:validate — PASS, 20/20
npm run db:migrate:status — PASS, 33 migrations; database schema is up to date
```

This acceptance closure is documentation-only. It does not modify runtime behavior, Prisma schema, migrations, Local/Test data, reservation-code generation, Tilopay, FEL, email, notification, cron, dependency, environment, Vercel, Production, Final-I.7, Final-I.8, Final-I.9, or Phase 13 scope.

## Current State

```text
Final-I.6.6 — Completed and accepted on 2026-10-12 at 7c1441ac62c06d723f9e1fbe07d61b5a4de0a8dd
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```