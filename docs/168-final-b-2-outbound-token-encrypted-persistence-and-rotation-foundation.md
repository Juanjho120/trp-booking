# 168 — Final-B.2 Outbound-Token Encrypted Persistence and Rotation Foundation

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.2 — Outbound-token encrypted persistence and rotation foundation
Status: Completed and accepted on 2026-08-25
Preparation date: 2026-08-14
Implementation base head: 2627161d5b3960995be0f517682f84272431c291
Previous subphase: Final-B.1 — Completed and accepted on 2026-08-14
Final-B.1 accepted head: 2627161d5b3960995be0f517682f84272431c291
Final-B.1 authoritative contract: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Accepted head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Next planned subphase: Final-B.3 — Admin external-calendar read model and integration UI
Phase 13: Not started
```

## Purpose

Final-B.2 implements the persistence, environment, authenticated-encryption, and outbound-token
mutation foundation frozen in Final-B.1. It deliberately does not expose any new admin UI or API
endpoint and does not change the current inbound resolver or Test scheduler configuration.

The primary compatibility requirement is:

```text
Existing Test outbound URLs must continue working after the B.2 migration.
```

B.2 therefore adds a nullable encrypted token copy without changing any existing hash and without
rotating any calendar automatically.

## Implemented Scope

```text
Prisma
- ExternalCalendar.exportTokenEncrypted nullable Text
- durable @@unique([propertyId, provider])
- fail-closed duplicate preflight inside migration

Server environment
- required EXTERNAL_CALENDAR_ENCRYPTION_KEY
- exactly 32 random bytes encoded as canonical Base64
- Local/Test shared-database key requirement documented

Server cryptography
- AES-256-GCM
- 12-byte random IV
- 16-byte authentication tag
- versioned v1 envelope
- property/purpose-bound AAD

Outbound token foundation
- 32 random bytes -> 64 lowercase hexadecimal characters
- SHA-256 public lookup hash
- encrypted raw-token copy
- atomic generate primitive
- atomic rotate primitive
- optimistic updatedAt fence
- Serializable transaction
- bounded P2034 retry
- secret-safe AdminAuditLog evidence

Compatibility
- public hash lookup preserved
- existing hash-only feeds remain valid
- current inbound env-backed resolver unchanged
- Test vercel.json remains crons: []
```

---

# Prisma Persistence Changes

## New Encrypted Outbound Token Column

`ExternalCalendar` now adds:

```prisma
exportTokenEncrypted String? @map("export_token_encrypted") @db.Text
```

The two outbound representations have intentionally different jobs:

```text
exportTokenHash
  -> SHA-256
  -> deterministic public feed lookup
  -> retained unchanged for existing feeds

exportTokenEncrypted
  -> AES-256-GCM encrypted raw token
  -> future protected Copy URL action only
  -> null for existing hash-only rows until deliberate rotation
```

The migration does not reconstruct, infer, replace, or rotate an existing raw token. A SHA-256 hash
is intentionally non-reversible.

## Durable Property/Provider Cardinality

The model now enforces:

```prisma
@@unique([propertyId, provider], map: "external_calendars_property_id_provider_key")
```

This includes soft-deleted rows. Final-B.1 explicitly froze the rule that soft deletion does not
permit a competing second provider row; future reactivation must reuse/restore the durable row.

## Fail-Closed Migration

Migration:

```text
prisma/migrations/20260814160000_final_b_2_external_calendar_secret_foundation/migration.sql
```

Before adding the unique index it:

```text
1. opens a transaction
2. locks external_calendars against competing writes
3. groups rows by property_id/provider
4. aborts explicitly if any count > 1
5. adds export_token_encrypted
6. creates the unique property/provider index
7. commits
```

If duplicates exist, the migration raises:

```text
FINAL_B_2_DUPLICATE_EXTERNAL_CALENDAR_PROPERTY_PROVIDER
```

It does not:

```text
- select a winner
- merge rows
- hard-delete history
- soft-delete a duplicate automatically
- change importUrlEncrypted
- change exportTokenHash
- populate exportTokenEncrypted
- change enable/disable flags
```

## Expected Existing Test State After Migration

For an existing configured hash-only feed:

```text
exportTokenHash       = existing unchanged hash
exportTokenEncrypted  = null
public feed            = continues working
future Copy URL state  = ROTATION_REQUIRED
```

This is intentional and is resolved only by a deliberate one-at-a-time B.5 rotation.

---

# Encryption-Key Environment Contract

## Required Variable

Final-B.2 adds:

```text
EXTERNAL_CALENDAR_ENCRYPTION_KEY
```

Validation requires exactly:

```text
32 random bytes
canonical Base64 encoding
server-side only
```

Recommended generation command:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The generated value must never be committed or pasted into documentation/logs.

## Shared Local/Test Database Consequence

TRP Booking Local and stable Test intentionally use the same developer-owned Supabase database.
Therefore they must use the same Final-B encryption key while that shared database contract remains
active:

```text
Local .env                       same key
Vercel Test environment          same key
Future Production environment    different company-owned key
```

If Local encrypts a value with key A and Test uses key B, Test must fail closed when attempting to
decrypt it. That is authentication working as intended, not a recoverable fallback condition.

Future Production does not reuse the developer-owned Local/Test key.

## Validation Boundary

`lib/env/server.ts` validates the key as part of the existing central server environment contract.
The cryptography helper retrieves the key through that validated boundary rather than reading an
unvalidated `process.env` value directly.

No new `NEXT_PUBLIC_*` variable is introduced.

---

# Authenticated Encryption Foundation

## Module

```text
lib/external-calendars/secret-crypto.ts
```

The implementation uses only the Node standard library:

```text
node:crypto
node:buffer
```

No third-party cryptography dependency is added.

## Primitive

Frozen B.1 parameters are implemented exactly:

```text
algorithm: AES-256-GCM
key:       32 bytes
IV:        random 12 bytes per encryption
Auth tag:  16 bytes
```

Persisted envelope:

```text
v1:<iv-base64url>:<auth-tag-base64url>:<ciphertext-base64url>
```

The parser rejects malformed/non-canonical envelope segments and unexpected lengths.

## Additional Authenticated Data

The ciphertext is bound to its property and purpose.

Implemented purposes:

```text
AIRBNB_IMPORT
TRP_EXPORT_TOKEN
```

AAD:

```text
trp-booking:external-calendar:airbnb-import:<propertyId>
trp-booking:external-calendar:trp-export-token:<propertyId>
```

Therefore the same encrypted bytes cannot be silently copied to:

```text
- another property
- the opposite secret purpose
```

Authentication failure is returned as a typed safe crypto error. Plaintext, key material,
ciphertext, IV/auth tag, and private provider URLs are never written to logs by the helper.

---

# Outbound Token Material Foundation

## Modules

```text
lib/external-calendars/token-hash.ts
lib/external-calendars/export-token.ts
```

`token-hash.ts` intentionally contains only the SHA-256 lookup helper so the existing public iCal
route does not acquire a dependency on the authenticated-encryption/environment modules.

New outbound tokens are generated as:

```text
randomBytes(32).toString("hex")
```

which produces:

```text
64 lowercase hexadecimal characters
256 bits of entropy
```

The material-creation helper rejects caller-supplied candidate tokens that do not match that exact
new-token contract.

The public hash helper intentionally remains more permissive than the new-material helper so that
historical token lookup does not become dependent on a newly introduced format assertion. It is
kept in the lightweight `token-hash.ts` module rather than importing the protected encryption stack
into the public feed path.

## Material Produced In Memory

For a new token the service creates:

```text
rawToken
SHA-256(rawToken)
AES-256-GCM(rawToken, TRP_EXPORT_TOKEN/property AAD)
```

Only the hash and encrypted copy are persisted.

The raw token exists only transiently in server memory and is not returned by the B.2 database
mutation service.

## Public Feed Lookup Compatibility

`lib/airbnb-ical/export-feed.ts` now delegates hashing to the centralized external-calendar token
helper while retaining the existing exported compatibility function:

```text
hashAirbnbIcalExportToken()
```

Therefore existing imports and public feed behavior remain unchanged in B.2.

The public route still resolves a presented raw token by SHA-256 hash and continues using its
existing generic 404/no-store behavior.

---

# Atomic Generate/Rotate Foundation

## Module

```text
lib/external-calendars/outbound-token-service.ts
```

B.2 introduces server-only primitives for later B.5 endpoints:

```text
generateExternalCalendarOutboundToken()
rotateExternalCalendarOutboundToken()
```

No route or UI calls them yet.

## Shared Safety Checks

Both operations require:

```text
- existing ExternalCalendar id
- provider = AIRBNB
- deletedAt = null
- valid expectedUpdatedAt optimistic fence
- authenticated AdminActor supplied by the future protected caller
```

The service resolves the durable admin user inside the transaction and records `AdminAuditLog` in
the same transaction.

## Generate

Generate requires both:

```text
exportTokenHash       = null
exportTokenEncrypted  = null
```

It fails closed rather than overwriting any partially/previously configured state.

## Rotate

Rotate requires:

```text
exportTokenHash != null
```

This intentionally supports the existing hash-only Test rows. When a B.5 admin deliberately rotates
one, the transaction replaces the old hash and creates the first encrypted raw-token copy.

## Transaction Contract

Each mutation runs with:

```text
Prisma Serializable isolation
maxWait = 10 seconds
timeout = 20 seconds
bounded P2034 retry = 3 attempts
```

Within the transaction it:

```text
1. resolves admin actor
2. reads exact AIRBNB ExternalCalendar
3. validates optimistic updatedAt fence
4. validates generate/rotate state
5. generates new 256-bit token material
6. updates hash + encrypted copy + last-rotated timestamp atomically
7. writes secret-safe AdminAuditLog evidence
8. returns only safe ids/timestamps
```

A stale update returns a typed conflict condition to the future API layer instead of overwriting a
newer configuration.

## Audit Evidence

The B.1 action names are used:

```text
EXTERNAL_CALENDAR_EXPORT_TOKEN_GENERATED
EXTERNAL_CALENDAR_EXPORT_TOKEN_ROTATED
```

Metadata includes only safe evidence such as:

```text
actorEmail
propertyId
provider
previousConfigured
newConfigured
rotationTimestamp
```

It never includes:

```text
raw token
exportTokenHash
exportTokenEncrypted
full private outbound URL
encryption key
```

---

# Explicit B.2 Non-Goals

Final-B.2 does not implement:

```text
- /admin/calendar/integrations UI
- Copy URL API/action
- Rotate confirmation dialog
- Generate/Rotate API routes
- inbound URL save/replace
- Airbnb URL SSRF policy/fetch hardening
- DB-first inbound resolver
- Test Connection
- per-card Sync now
- import/export enable/disable endpoints
- automatic migration of AIRBNB_ICAL_IMPORT_URLS_JSON
- automatic backfill of exportTokenEncrypted
- automatic outbound token rotation
- removal of legacy env fallback
- Vercel Test cron registration
```

Those remain assigned to B.3 through B.6 according to `docs/167`.

---

# Deployment and Validation Order

Because `EXTERNAL_CALENDAR_ENCRYPTION_KEY` is now part of validated server configuration, the safe
B.2 rollout order is:

```text
1. Generate one Local/Test 32-byte Base64 key outside the repository.
2. Add it to local .env.
3. Add the same exact value to the stable Vercel Test project's environment variables.
4. Verify no duplicate property/provider ExternalCalendar rows exist.
5. Apply the B.2 repository files.
6. Generate/validate Prisma Client/schema.
7. Deploy the migration to the shared Local/Test database.
8. Validate environment, existing Airbnb policy gates, lint, and build.
9. Confirm existing public outbound feeds still work before any B.5 rotation.
10. Commit/push B.2 only after the technical gates pass.
```

Do not commit `.env`.

## Duplicate Preflight Query

A safe read-only preflight is:

```sql
SELECT property_id, provider, COUNT(*) AS row_count
FROM trp_booking.external_calendars
GROUP BY property_id, provider
HAVING COUNT(*) > 1;
```

Expected result before migration:

```text
0 rows
```

The migration repeats this protection under a table lock, so the manual query is evidence rather
than the only safeguard.

## Post-Migration Shape Check

A safe query that does not expose token values is:

```sql
SELECT
  property_id,
  provider,
  export_token_hash IS NOT NULL AS hash_configured,
  export_token_encrypted IS NOT NULL AS encrypted_copy_configured
FROM trp_booking.external_calendars
ORDER BY property_id;
```

For existing hash-only Test feeds, the expected B.2 state is:

```text
hash_configured = true
encrypted_copy_configured = false
```

That is the correct `ROTATION_REQUIRED` precursor for B.3/B.5.

---

# Validation Gates

B.2 deliberately introduces no `validate-final-b-2` script.

Use the existing technical/cross-cutting gates:

```text
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:migrate:status
npm run env:validate
npm run airbnb:import-policy:validate
npm run airbnb:export-policy:validate
npm run airbnb:export-path:validate
npm run final-a:validate
npm run lint
npm run build
git diff --check
```

The existing Airbnb validators remain accepted cross-cutting architectural gates; B.2 does not
replace them.

Before packaging, isolated deterministic checks were performed against the new pure cryptography and
token-material helpers for:

```text
- AES-256-GCM round trip
- wrong-purpose authentication failure
- wrong-property authentication failure
- malformed-envelope rejection
- 64-character lowercase-hex generation
- SHA-256 compatibility
- token encryption/decryption round trip
```

Full Prisma/type/build validation remains authoritative in the complete project checkout.

---

# Acceptance State

At preparation time:

```text
Final-B.1 — Completed and accepted at 2627161d5b3960995be0f517682f84272431c291
Final-B.2 — Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 — Implementation prepared; pending Local/Test validation and owner acceptance
Final-B.3 record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Final-B.4 — Not started
Final-B.5 — Not started
Final-B.6 — Not started
Phase 13 — Not started
```

Final-B.2 is accepted only after the Local/Test environment setup, Prisma migration, existing-feed
compatibility, lint/build, warning-free Turbopack build, and owner confirmation completed at the
accepted head recorded above.


---

# Acceptance Addendum — 2026-08-25

Final-B.2 was accepted after the Local/Test Prisma, environment, compatibility, lint, and build gates
were completed. The implementation commit was followed by a narrow Turbopack hardening correction
that moved `Buffer` conversion out of the transversal environment module and into the Node-only
cryptography boundary. The final accepted B.2 head is:

```text
530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
fix(final-b): isolate external-calendar Buffer usage
```

The warning-free build preserves the frozen B.2 encryption/key contract and does not rotate or
rewrite any existing external-calendar feed.
