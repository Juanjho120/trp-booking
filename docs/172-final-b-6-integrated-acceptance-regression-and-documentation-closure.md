# 172 — Final-B.6 Integrated Acceptance, Regression and Documentation Closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.6 — Integrated acceptance, regression and documentation closure
Status: In progress — automated gate prepared; Hosted Test acceptance pending
Preparation date: 2026-08-25
Implementation base head: bc6b3db1bec219913164ef267fe5279b19f49a27
Previous subphase: Final-B.5 — Completed and accepted for integrated Final-B.6 validation on 2026-08-25
Final-B.5 accepted head: bc6b3db1bec219913164ef267fe5279b19f49a27
Authoritative strategy: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Inbound implementation record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Outbound implementation record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Next package after Final-B closure: Final-C — Pricing rules: seasonal and length-of-stay — Not started
Phase 13: Not started
```

## Purpose

Final-B.6 is the mandatory integrated gate for Final-B. It does not treat a clean build as proof that
calendar integration operations are accepted. It combines a permanent automated regression suite
with controlled Local/Test UI and real Airbnb validation for all three supported accommodations.

Final-B must remain `In progress` until both parts pass.

The owner explicitly confirmed on 2026-08-25 that the B.4/B.5 UI and real-integration checks belong
inside B.6 rather than becoming a separate subphase. This is consistent with the frozen B.1 contract
that B.6 owns the consolidated Final-B gate.

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

The prepared suite contains 37 regression checks covering the frozen B.1 minimums and adjacent
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

Inbound migration/read model
- database configuration source wins over legacy state
- Local/Test transitional fallback remains explicit during B.6 migration
- Production cannot consume the legacy environment map
- malformed legacy map fails closed
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

## Transitional Production Hardening

While B.6 is performing the controlled Test migration, Local/Test may still use
`AIRBNB_ICAL_IMPORT_URLS_JSON` as the accepted temporary compatibility source.

B.6 adds one defensive rule immediately:

```text
TRP_ENVIRONMENT=production -> legacy Airbnb import URL map is ignored
```

This keeps the transitional fallback from ever becoming a Production dependency even before the
final B.6 cleanup removes it from normal runtime altogether.

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
[ ] integrations page exposes selector buttons for all three supported accommodations
[ ] exactly one selected-property integration card is rendered at a time
[ ] switching accommodation updates the visible integration card without exposing secret material
[ ] inbound and outbound sections are independently visible
[ ] browser DOM/page data does not contain a stored Airbnb URL
[ ] browser DOM/page data does not contain exportTokenHash
[ ] browser DOM/page data does not contain exportTokenEncrypted
[ ] browser DOM/page data does not contain a raw outbound token/private outbound URL
[ ] existing hash-only feed shows ROTATION_REQUIRED and Copy URL is unavailable
```

## B. Explicit Inbound Migration — All Three Properties

For each property, obtain the matching private Airbnb export `.ics` URL directly from Airbnb and use
an explicit admin action. Never paste the URL into logs, docs, tickets, screenshots intended for
sharing, or source control.

For each card:

```text
[ ] enter the matching Airbnb .ics URL in the password-style field
[ ] Show/Hide affects only the unsaved typed value
[ ] Test connection succeeds without changing calendar blocks/sync history
[ ] Save/Replace succeeds
[ ] input clears immediately after save
[ ] page refresh never repopulates plaintext URL
[ ] configuration source becomes DATABASE_ENCRYPTED
[ ] Enable import succeeds when required
[ ] Sync now succeeds for this card only
[ ] latest sync evidence is ADMIN-triggered
[ ] expected Airbnb effective availability remains correct
[ ] last sync and last successful sync timestamps are coherent
[ ] inbound action does not disable/change outbound state
```

Do not remove the Test legacy environment map until all three cards show database-backed
configuration and have passed Test connection + Sync now.

## C. Controlled Outbound Rotation — One Property at a Time

Because the existing Test feeds are linked to real Airbnb listings, capture the currently configured
old TRP feed URL from the matching Airbnb listing **before** rotating that property. Keep it only for
the immediate old-URL 404 verification; do not commit or document it.

For one property at a time:

```text
[ ] confirm old hash-only feed currently works
[ ] Copy URL remains unavailable before rotation
[ ] click Rotate URL
[ ] styled project confirmation sheet appears
[ ] cancel once and verify no state changed
[ ] reopen and confirm rotation
[ ] old feed URL now returns the existing generic 404
[ ] Copy URL becomes available
[ ] Copy URL writes directly to clipboard without rendering the URL
[ ] copied URL ends in .ics
[ ] copied URL uses https://trp-booking.juantzun.dev/api/ical/<token>.ics
[ ] new URL returns HTTP 200 text/calendar
[ ] replace the old calendar URL in the matching Airbnb listing
[ ] Airbnb accepts/refreshes the new feed
[ ] controlled TRP -> Airbnb -> TRP round trip remains loop-free
[ ] no cross-property availability mapping appears
[ ] only after this property passes, continue to the next property
```

Repeat until all three existing Test feeds have been deliberately rotated and reconnected.

## D. Export Enable / Disable

Use at least one already-rotated property:

```text
[ ] Disable export preserves inbound state
[ ] disabled feed returns the same generic 404
[ ] Copy/rotation token material is not erased
[ ] Enable export succeeds with the configured hash
[ ] the exact same new URL works again after re-enable
[ ] import remains enabled/unchanged throughout
```

## E. Failure and Concurrency Safety

Without exposing secrets:

```text
[ ] invalid inbound HTTP/non-Airbnb/IP/credential/fragment/non-.ics candidates fail safely
[ ] stale expectedUpdatedAt write returns the typed stale conflict
[ ] Copy URL called for hash-only state fails safely
[ ] clipboard-denied/failure path does not display the private URL
[ ] provider error feedback contains no raw provider URL/query/body
```

## F. Audit and Hosted Logs

Review safe operational evidence after the controlled actions:

```text
[ ] AdminAuditLog uses entityType=ExternalCalendar and exact calendar id
[ ] expected Final-B action names are present
[ ] audit metadata contains no Airbnb URL/query/token
[ ] audit metadata contains no outbound raw token/hash/ciphertext/full URL
[ ] Vercel logs expose no Airbnb URL/provider token/export token/ciphertext/encryption key
[ ] sync logs contain only accepted safe error/result evidence
```

---

# Stage 4 — Legacy Fallback Removal and Final Closure

This stage is deliberately **not** performed by the initial B.6 preparation ZIP because the three
real Test inbound URLs must first be explicitly migrated and proven database-backed.

Only after Stage 3 passes for all three properties:

```text
1. Remove AIRBNB_ICAL_IMPORT_URLS_JSON from the Vercel Test environment.
2. Confirm all three integrations still Test connection and Sync now from encrypted DB values.
3. Remove normal runtime fallback code from airbnb-import-secret.ts / scheduled compatibility export.
4. Remove obsolete .env.example legacy-fallback guidance.
5. Update the permanent final-b:validate assertions to require DB-only normal runtime behavior.
6. Redeploy Test.
7. Re-run final-b:validate, lint, build, Prisma/env gates and git diff --check.
8. Re-run one final controlled sync/feed smoke test for all three properties.
9. Reconfirm vercel.json remains { "crons": [] }.
10. Reconcile README, docs/10, docs/11, docs/160, docs/170, docs/171 and this record.
```

Only then may the project status move to:

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
[ ] npm run final-b:validate passes every registered test
[ ] existing Final-A gate still passes
[ ] existing Airbnb import/export/path validators pass
[ ] Prisma generate/validate/migrate status pass
[ ] env validation passes
[ ] lint passes
[ ] build passes
[ ] git diff --check passes
```

## Hosted Test gate

```text
[ ] all three cards render without exposing secrets
[ ] all three Airbnb inbound URLs explicitly migrated to encrypted DB storage
[ ] all three Test connection operations pass
[ ] all three per-card Sync now operations pass
[ ] expected effective availability remains correct
[ ] all three existing outbound feeds deliberately rotated one at a time
[ ] all three new .ics URLs copied securely and installed in matching Airbnb listings
[ ] each old rotated URL returns generic 404
[ ] each new URL returns valid text/calendar
[ ] controlled round-trip remains loop-free for all three listings
[ ] no cross-property mapping appears
[ ] export disable/enable preserves inbound state and token material
[ ] audit/log review exposes no secret material
[ ] AIRBNB_ICAL_IMPORT_URLS_JSON removed from Test after migration
[ ] normal runtime legacy fallback removed after migration
[ ] zero Vercel Test cron registrations remain unchanged
```

## Closure rule

Any unchecked item keeps Final-B.6 and Final-B `In progress`. A partial pass is useful diagnostic
evidence but is not acceptance.
