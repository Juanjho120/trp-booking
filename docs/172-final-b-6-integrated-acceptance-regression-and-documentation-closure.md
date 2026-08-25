# 172 — Final-B.6 Integrated Acceptance, Regression and Documentation Closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.6 — Integrated acceptance, regression and documentation closure
Status: Completed and accepted on 2026-08-25
Preparation date: 2026-08-25
Acceptance date: 2026-08-25
Implementation base head: bc6b3db1bec219913164ef267fe5279b19f49a27
Accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Previous subphase: Final-B.5 — Completed and accepted on 2026-08-25
Final-B.5 accepted head: bc6b3db1bec219913164ef267fe5279b19f49a27
Authoritative strategy: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Inbound implementation record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Outbound implementation record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Final-B status: Completed and accepted on 2026-08-25
Next package: Final-C — Pricing rules: seasonal and length-of-stay — Not started
Phase 13: Not started
```

## Purpose

Final-B.6 is the mandatory integrated gate for Final-B. It does not treat a clean build as proof that
calendar integration operations are accepted. It combines a permanent automated regression suite
with controlled Hosted Test UI and real Airbnb validation for all three supported accommodations.

Final-B.6 is now completed and accepted. Every mandatory automated, technical, migration, Hosted Test,
security/logging, DB-only runtime, and final smoke-test gate passed on 2026-08-25.

The owner explicitly confirmed that the B.4/B.5 UI and real-integration checks belong inside B.6
rather than becoming a separate subphase. The final accepted feature head is:

```text
1fe06de8c55ab1563999b2db1d210bfc9a82c613
feat(final-b): add accommodation selector to integrations
```

## B.5 Handoff Into B.6

B.5 was committed and `npm run build` passed at:

```text
bc6b3db1bec219913164ef267fe5279b19f49a27
feat(final-b): add outbound calendar URL controls
```

That accepts the B.5 implementation for integrated validation. It does **not** waive the controlled
Hosted Test items from docs/171. Those checks are carried into this document and remain mandatory
before Final-B can close.

---

# Stage 1 — Permanent Automated Final-B Gate

## Command

Final-B.6 introduces one consolidated command only:

```text
npm run final-b:validate
```

Implementation:

```text
tests/final-b/
```

No B.2/B.3/B.4/B.5-specific validator scripts are added.

## Initial Automated Matrix

The accepted permanent suite contains 38 regression checks covering the frozen B.1 minimums and adjacent
security invariants:

```text
Cryptography and token contract
- AES-256-GCM round trip
- versioned authenticated envelope
- tampered ciphertext fails closed
- wrong property AAD fails closed
- wrong purpose AAD fails closed
- invalid encryption-key length fails closed
- outbound token is 256-bit lowercase hexadecimal
- SHA-256 public lookup compatibility
- .ics path compatibility

Provider fetch security
- accepted Airbnb HTTPS iCal URL shape
- HTTP / wrong host / host-confusion / IP / credentials / port / fragment / wrong path denied
- redirect: manual contract
- allowed Airbnb redirect accepted
- cross-provider redirect rejected
- maximum three redirects
- 2 MiB response cap
- invalid non-calendar response rejected

Inbound/read-model/runtime
- database encrypted configuration is the only supported runtime secret source
- retired environment-backed fallback cannot configure Local, Test or Production
- legacy runtime compatibility exports are absent
- safe admin DTO excludes plaintext/ciphertext/hash/token material
- direction-specific safe status derivation remains available

Persistence/API/audit/source contracts
- durable property/provider uniqueness
- 32-byte canonical Base64 environment-key contract
- all seven admin integration endpoints require session + Zod + same-origin
- per-card Sync now stays scoped to one calendar and ADMIN-triggered
- Copy URL requires encrypted raw-token persistence
- canonical Test/Production outbound URL construction and .ics suffix
- token rotation replaces hash + encrypted raw token + timestamp under concurrency fence
- public feed preserves generic 404/no-store behavior
- normal DTO type excludes secret-bearing fields
- all frozen audit actions remain present without forbidden secret metadata fields
- no native confirm() in integration UI
- clipboard handling does not store/render the copied private URL
- Test vercel.json remains crons: []

Calendar regression
- provider-origin Airbnb rows remain excluded from outbound feed ownership
- preparation artifacts tied to provider events remain excluded
- TRP-owned manual blocks remain exportable
- stable deterministic VEVENT UID namespace remains turefugioperfecto.com

Localization
- exact ES/EN key parity for admin.calendarIntegrations
```

## Accepted DB-Only Runtime Hardening

The transitional environment-backed Airbnb import fallback was removed only after all three Hosted
Test integrations were explicitly migrated and proven database-backed.

Accepted final state:

```text
Local/Test/Production normal runtime -> encrypted ExternalCalendar.importUrlEncrypted only
legacy environment map -> unsupported and absent from normal runtime
.env.example legacy guidance -> removed
permanent Final-B regression -> fails if legacy runtime compatibility returns
```

Production remains unprovisioned and Not started; this hardening changes the application contract,
not the Phase 13 infrastructure boundary.

---

# Stage 2 — Technical Gate

After applying the B.6 preparation package, run from the repository root:

```text
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run env:validate
npm run airbnb:import-policy:validate
npm run airbnb:export-policy:validate
npm run airbnb:export-path:validate
npm run admin:calendar-display:validate
npm run final-a:validate
npm run final-b:validate
npm run lint
npm run build
git diff --check
```

No Prisma schema change or migration is introduced by this B.6 preparation package.

Do not proceed to real token rotation if this technical gate fails.

---

# Stage 3 — Controlled Hosted Test Acceptance

## Supported accommodations

All checks apply to:

```text
black-white-apartment
perfect-retreat-bungalow
complete-retreat
```

Use the stable Test application:

```text
https://trp-booking.juantzun.dev/admin/calendar/integrations
TRP_ENVIRONMENT=test
```

Do not activate Vercel cron registrations.

## A. Secret-Safe UI Baseline

Before changing any provider configuration:

```text
[x] integrations page exposes selector buttons for all three supported accommodations
[x] exactly one selected-property integration card is rendered at a time
[x] switching accommodation updates the visible integration card without exposing secret material
[x] inbound and outbound sections are independently visible
[x] browser DOM/page data does not contain a stored Airbnb URL
[x] browser DOM/page data does not contain exportTokenHash
[x] browser DOM/page data does not contain exportTokenEncrypted
[x] browser DOM/page data does not contain a raw outbound token/private outbound URL
[x] existing hash-only feed shows ROTATION_REQUIRED and Copy URL is unavailable
```

## B. Explicit Inbound Migration — All Three Properties

For each property, obtain the matching private Airbnb export `.ics` URL directly from Airbnb and use
an explicit admin action. Never paste the URL into logs, docs, tickets, screenshots intended for
sharing, or source control.

For each card:

```text
[x] enter the matching Airbnb .ics URL in the password-style field
[x] Show/Hide affects only the unsaved typed value
[x] Test connection succeeds without changing calendar blocks/sync history
[x] Save/Replace succeeds
[x] input clears immediately after save
[x] page refresh never repopulates plaintext URL
[x] configuration source becomes DATABASE_ENCRYPTED
[x] Enable import succeeds when required
[x] Sync now succeeds for this card only
[x] latest sync evidence is ADMIN-triggered
[x] expected Airbnb effective availability remains correct
[x] last sync and last successful sync timestamps are coherent
[x] inbound action does not disable/change outbound state
```

Do not remove the Test legacy environment map until all three cards show database-backed
configuration and have passed Test connection + Sync now.

## C. Controlled Outbound Rotation — One Property at a Time

Because the existing Test feeds are linked to real Airbnb listings, capture the currently configured
old TRP feed URL from the matching Airbnb listing **before** rotating that property. Keep it only for
the immediate old-URL 404 verification; do not commit or document it.

For one property at a time:

```text
[x] confirm old hash-only feed currently works
[x] Copy URL remains unavailable before rotation
[x] click Rotate URL
[x] styled project confirmation sheet appears
[x] cancel once and verify no state changed
[x] reopen and confirm rotation
[x] old feed URL now returns the existing generic 404
[x] Copy URL becomes available
[x] Copy URL writes directly to clipboard without rendering the URL
[x] copied URL ends in .ics
[x] copied URL uses https://trp-booking.juantzun.dev/api/ical/<token>.ics
[x] new URL returns HTTP 200 text/calendar
[x] replace the old calendar URL in the matching Airbnb listing
[x] Airbnb accepts/refreshes the new feed
[x] controlled TRP -> Airbnb -> TRP round trip remains loop-free
[x] no cross-property availability mapping appears
[x] only after this property passes, continue to the next property
```

Repeat until all three existing Test feeds have been deliberately rotated and reconnected.

## D. Export Enable / Disable

Use at least one already-rotated property:

```text
[x] Disable export preserves inbound state
[x] disabled feed returns the same generic 404
[x] Copy/rotation token material is not erased
[x] Enable export succeeds with the configured hash
[x] the exact same new URL works again after re-enable
[x] import remains enabled/unchanged throughout
```

## E. Failure and Concurrency Safety

Without exposing secrets:

```text
[x] invalid inbound HTTP/non-Airbnb/IP/credential/fragment/non-.ics candidates fail safely
[x] stale expectedUpdatedAt write returns the typed stale conflict
[x] Copy URL called for hash-only state fails safely
[x] clipboard-denied/failure path does not display the private URL
[x] provider error feedback contains no raw provider URL/query/body
```

## F. Audit and Hosted Logs

Review safe operational evidence after the controlled actions:

```text
[x] AdminAuditLog uses entityType=ExternalCalendar and exact calendar id
[x] expected Final-B action names are present
[x] audit metadata contains no Airbnb URL/query/token
[x] audit metadata contains no outbound raw token/hash/ciphertext/full URL
[x] Vercel logs expose no Airbnb URL/provider token/export token/ciphertext/encryption key
[x] sync logs contain only accepted safe error/result evidence
```

---

# Stage 4 — Legacy Fallback Removal and Final Closure — Completed

The initial B.6 preparation ZIP deliberately deferred this stage until the three real Test inbound
URLs were explicitly migrated and proven database-backed. Stage 3 passed for all three properties,
and the following closure sequence was completed:

```text
[x] AIRBNB_ICAL_IMPORT_URLS_JSON removed from the Vercel Test environment.
[x] All three integrations continued Test connection / Sync now from encrypted DB values.
[x] Normal runtime fallback code and scheduled compatibility exports removed.
[x] Obsolete .env.example legacy-fallback guidance removed.
[x] Permanent final-b:validate assertions updated to require DB-only normal runtime behavior.
[x] Test redeployed without the legacy environment value.
[x] final-b:validate, lint, build, Prisma/env gates and git diff --check passed.
[x] Final controlled sync/feed smoke test passed for all three properties.
[x] vercel.json remained { "crons": [] }.
[x] Final-B documentation reconciled for closure.
```

Accepted project status after this gate:

```text
Final-B — Completed and accepted
Final-B.6 — Completed and accepted
Final-C — Next / Not started
Phase 13 — Not started
```

---

# Final-B.6 Acceptance Matrix

## Automated / repository gate

```text
[x] npm run final-b:validate passes every registered test
[x] existing Final-A gate still passes
[x] existing Airbnb import/export/path validators pass
[x] Prisma generate/validate/migrate status pass
[x] env validation passes
[x] lint passes
[x] build passes
[x] git diff --check passes
```

## Hosted Test gate

```text
[x] accommodation selector exposes all three supported properties and renders one card at a time without exposing secrets
[x] all three Airbnb inbound URLs explicitly migrated to encrypted DB storage
[x] all three Test connection operations pass
[x] all three per-card Sync now operations pass
[x] expected effective availability remains correct
[x] all three existing outbound feeds deliberately rotated one at a time
[x] all three new .ics URLs copied securely and installed in matching Airbnb listings
[x] each old rotated URL returns generic 404
[x] each new URL returns valid text/calendar
[x] controlled round-trip remains loop-free for all three listings
[x] no cross-property mapping appears
[x] export disable/enable preserves inbound state and token material
[x] audit/log review exposes no secret material
[x] AIRBNB_ICAL_IMPORT_URLS_JSON removed from Test after migration
[x] normal runtime legacy fallback removed after migration
[x] zero Vercel Test cron registrations remain unchanged
```

## Accepted Final-B.6 Evidence

```text
Automated / technical
- npm run final-b:validate: 38/38 PASS
- npm run final-a:validate: PASS
- Prisma generate / validate / migration status: PASS
- environment validation: PASS
- Airbnb import/export/path policy validators: PASS
- admin calendar display validator: PASS
- lint: PASS with no Final-B cleanup warnings
- build: PASS
- git diff --check: PASS

Hosted Test — all three accommodations
- Airbnb inbound URLs explicitly migrated into encrypted database storage
- Test connection and per-card ADMIN-triggered Sync now passed
- expected availability and preparation buffers remained coherent
- each old hash-only outbound feed was deliberately rotated one property at a time
- each old rotated URL returned the generic 404
- each new copied .ics URL returned HTTP 200 text/calendar and was installed in the matching Airbnb listing
- export disable/enable preserved inbound state and token material
- controlled TRP -> Airbnb -> TRP round trips remained loop-free
- no cross-property mapping appeared

DB-only / security closure
- AIRBNB_ICAL_IMPORT_URLS_JSON removed from Hosted Test
- all three integrations continued operating from encrypted DB values
- normal runtime legacy fallback and compatibility exports removed
- AdminAuditLog, sync evidence, and Vercel Runtime Logs remained free of secret material
- Test Vercel scheduler registrations remained zero

Final UI refinement
- selector buttons expose all three accommodations
- exactly one selected-property integration card is mounted at a time
- selector styling follows the existing /admin/calendar default/outline pattern
- changing selection discards unsaved client-only secret input from the prior card
- selector behavior is protected by the permanent Final-B source-contract regression
```

## Closure decision

Final-B.6 is **Completed and accepted**.

Final-B — Admin external-calendar integrations — is **Completed and accepted** on 2026-08-25 at accepted
feature head:

```text
1fe06de8c55ab1563999b2db1d210bfc9a82c613
```

The next package is:

```text
Final-C — Pricing rules: seasonal and length-of-stay — Next / Not started
```

No Final-C implementation is started by this closure. Phase 13 remains **Not started** and remains
blocked until Final-H is completed and the owner explicitly accepts the complete Final Improvement
Track.
