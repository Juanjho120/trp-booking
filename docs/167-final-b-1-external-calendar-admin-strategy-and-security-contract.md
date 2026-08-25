# 167 — Final-B.1 External-Calendar Admin Strategy and Security Contract

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.1 — External-calendar admin strategy and security contract
Status: Completed and accepted on 2026-08-14
Preparation date: 2026-08-14
Implementation base head: 0927feb18be35b8d96aca0205a75ee19445f15d4
Accepted head: 2627161d5b3960995be0f517682f84272431c291
Previous package: Final-A — Completed and accepted on 2026-08-12
Final-A accepted head: 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Latest pre-B implementation hardening: 0927feb18be35b8d96aca0205a75ee19445f15d4
Next planned subphase: Final-B.2 — Outbound-token encrypted persistence and rotation foundation
Phase 13: Not started
```

## Purpose

Final-B moves Airbnb iCal configuration and the private TRP Booking outbound feed from manual
provider/environment operations into a protected admin workflow without weakening the security,
loop-prevention, preparation-buffer, soft-delete, or audit behavior already accepted in Phase 12.

Final-B.1 performs no runtime feature implementation. It freezes the architecture, security
boundaries, compatibility plan, subphase split, and acceptance contract that Final-B.2 through
Final-B.6 must follow.

The feature remains deliberately Airbnb-specific. `AIRBNB` is the only `ExternalCalendarProvider`
supported by this track.

## Final-B Subphase Plan

Final-B is divided as follows:

```text
Final-B.1 External-calendar admin strategy and security contract
Final-B.2 Outbound-token encrypted persistence and rotation foundation
Final-B.3 Admin external-calendar read model and integration UI
Final-B.4 Airbnb inbound configuration and operational actions
Final-B.5 TRP outbound Copy URL / Rotate URL / export controls
Final-B.6 Integrated acceptance, regression and documentation closure
```

Rules for the subdivision:

```text
- Do not create one validation script per B.x subphase.
- Business/security behavior belongs in tests.
- Final-B.6 owns the consolidated Final-B regression gate.
- B.2 through B.5 use the normal technical gates: Prisma where applicable, lint, build,
  git diff --check, and controlled Local/Test functional verification.
- No Final-B subphase registers Vercel Test cron schedules.
- No Final-B subphase provisions Production resources.
```

---

# Current Repository Review at B.1 Base

## Reviewed Repository Boundary

The review is based on the current remote repository head:

```text
0927feb18be35b8d96aca0205a75ee19445f15d4
fix(lifecycle): avoid unnecessary hold-expiration transactions
```

The Final-A accepted historical boundary remains:

```text
66afbeacd6ee7d669cb4bc251c8416160fae3f49
```

Final-B starts from the latest working head rather than rewriting the accepted Final-A history.

## ExternalCalendar Persistence Already Present

The current Prisma model contains one durable calendar configuration entity with:

```text
propertyId
provider = AIRBNB
direction
name
importUrlEncrypted
exportTokenHash
exportTokenLastRotatedAt
isImportEnabled
isExportEnabled
lastImportStartedAt
lastImportFinishedAt
lastExportGeneratedAt
lastFailureCode
lastFailureMessage
status
createdAt / updatedAt
deletedAt / deletedById
```

Current related persistence also includes:

```text
ExternalCalendarEvent
ExternalCalendarSyncLog
CalendarBlock
AdminAuditLog
```

`ExternalCalendarEvent` preserves provider event identity and active/removed/cancelled state.
`ExternalCalendarSyncLog` preserves each import execution, trigger source, counts, safe failure data,
and timestamps. `CalendarBlock` retains the effective availability impact. `AdminAuditLog` is the
existing generic audit boundary for protected admin mutations.

## Current ExternalCalendar Cardinality Gap

The schema currently indexes:

```text
propertyId
provider + status
direction
deletedAt
```

but does not enforce one `AIRBNB` record per property.

Final-B freezes the durable cardinality as:

```text
one ExternalCalendar row per property + provider
```

For this track, that means one Airbnb integration row for each supported TRP Booking accommodation.
Soft deletion does not create permission to create a second competing row. If a durable row was
soft-deleted and later re-enabled, the service must restore/reuse it.

B.2 must fail closed if duplicate `(propertyId, provider)` rows exist before introducing the unique
constraint. No duplicate may be silently deleted or merged by migration code.

## Current Inbound Resolution Is Still Environment-Backed

The schema already contains:

```text
importUrlEncrypted
```

but current runtime synchronization does not decrypt or use that field as the default secret source.

`scheduled-sync.ts` currently:

```text
- selects importUrlEncrypted
- exposes it only to the resolver input type
- defaults to resolveAirbnbIcalImportUrlFromEnv()
- resolves AIRBNB_ICAL_IMPORT_URLS_JSON by ExternalCalendar.id
```

The current `.env.example` correctly labels that environment map as an early-development fallback
and already states that encrypted database-backed resolution is preferred once an admin settings
flow exists.

Therefore `importUrlEncrypted` is currently a persistence boundary without an implemented encryption
or decryption runtime.

Final-B must complete that boundary instead of creating another plaintext storage mechanism.

## Current Import Sync Foundation

`syncAirbnbIcalImport()` already provides the accepted reconciliation behavior:

```text
- server-side only execution
- 10-second default fetch timeout
- ExternalCalendar validation
- ExternalCalendarSyncLog STARTED -> SUCCESS/PARTIAL_SUCCESS/FAILED
- ExternalCalendar last-import timestamps
- safe failure-message persistence
- Airbnb event reconciliation
- effective AIRBNB CalendarBlocks
- preparation-buffer creation/reconciliation
- removed/cancelled event handling
- loop-prevention policy accepted in Phase 12
```

Final-B must reuse this sync engine. Admin configuration must not create a second calendar import
implementation.

## Current Inbound URL Validation Gap

The existing runtime URL guard currently accepts any syntactically valid:

```text
http://...
https://...
```

and the server then calls `fetch()` on that address.

That was acceptable only while the URL was controlled private environment configuration. It is not
an acceptable boundary once an administrator can submit the address through a browser because an
admin-controlled server-side fetch must not become a generic URL fetcher.

Final-B therefore adds an Airbnb-specific URL policy before any submitted or persisted provider URL
can be fetched.

## Current Outbound Foundation

The public TRP Booking iCal route is already protected by a high-entropy raw path token whose
SHA-256 digest is stored in:

```text
ExternalCalendar.exportTokenHash
```

The feed lookup hashes the presented token and compares the hash server-side. The public route:

```text
/api/ical/[token]
```

also:

```text
- runs on the Node runtime
- is force-dynamic
- sends text/calendar
- sends no-store cache headers
- accepts the Airbnb-compatible optional .ics path suffix
- catches all lookup/generation failures
- returns the same generic 404 response for invalid/disabled/missing feeds
```

This public lookup boundary is already correct and must remain unchanged in principle.

## Current Outbound Retrieval Gap

A hash cannot be reversed into the raw token. Therefore the existing rows cannot support a protected
admin `Copy URL` feature using only:

```text
exportTokenHash
```

Final-B must retain the hash for public deterministic lookup and add a separate encrypted raw token
copy for the explicit protected admin action.

Existing Test feeds must not be rotated automatically when the new field is introduced.

## Current Admin Calendar UI

The current protected calendar page:

```text
/admin/calendar
```

already provides:

```text
- property selection
- effective availability
- direct reservations
- Airbnb blocks
- manual blocks
- preparation buffers
- preparation-buffer override/unlock/restore behavior
- localized feedback
```

It does not currently expose external-calendar configuration.

The admin shell treats nested `/admin/calendar/...` paths as part of the existing Calendar navigation
item. Final-B therefore does not need another main navigation item.

Frozen destination:

```text
/admin/calendar/integrations
```

The main calendar page will link to this nested protected area in Final-B.3.

## Current Admin API Surface

The current `app/api/admin` tree has protected endpoints for calendar blocks, preparation buffers,
cron jobs, refunds, reservations, accommodation content, and other admin domains, but it has no
external-calendar integration configuration endpoint yet.

Final-B therefore adds a new protected API family rather than overloading manual-block or cron-job
routes.

## Current Copy State

Both `messages/es.ts` and `messages/en.ts` already contain the localized `admin.calendar` namespace
used by the operational calendar. Neither currently contains a `calendarIntegrations` namespace.

Final-B.3 through B.5 must add the new visible copy symmetrically to both language catalogs.

## Current Environment/URL Foundation

`lib/env/server.ts` currently has no external-calendar encryption key contract. B.2 must add it to
the validated server environment rather than reading an unvalidated secret directly from
`process.env`.

`config/site.ts` already provides canonical Test and Production application URLs:

```text
https://trp-booking.juantzun.dev
https://turefugioperfecto.com
```

Final-B.5 reuses that environment contract to build outbound URLs and must not trust an arbitrary
Host header outside Local development.

## Current Seed Boundary

`prisma/seed.ts` does not seed `ExternalCalendar` configuration. The current three real Test
integrations are operational database records created/configured during Phase 12.

Final-B must preserve them in place. B.2 migrations must not replace them with seeded records or
regenerate their outbound tokens.

## Current Admin Security Pattern

The admin layout already requires an authenticated Auth.js user with the admin role.

Current protected mutation endpoints also independently use:

```text
getAdminSessionActor()
Zod validation
adminApiSuccessResponse()
adminApiErrorResponse()
```

Final-B must preserve this defense-in-depth pattern. Page layout authorization is not a substitute
for API authorization.

## Current Audit Pattern

Admin calendar mutations already write `AdminAuditLog` transactionally with:

```text
userId
action
entityType
entityId
safe metadata
createdAt
```

Final-B uses this existing table. It does not add a provider-specific audit table.

## Current Manual Cron Foundation

The cron registry already has:

```text
SYNC_AIRBNB_CALENDARS
```

and the cron console can invoke that full job manually.

Final-B keeps that global operational control. A card-level `Sync now` action must use the existing
single-calendar manual synchronization path rather than invoking the global job for every listing.

## Current Test Scheduler Boundary

The current Test `vercel.json` remains:

```json
{
  "crons": []
}
```

Final-B must not change this. Phase 13 remains the scheduler-activation boundary.

## Current Encryption Utility Gap

No reusable external-calendar secret encryption utility exists in the current repository. The
`lib/airbnb-ical` module contains parser, import, export, scheduling, path, and policy code, but no
secret cryptography helper.

Final-B.2 therefore introduces one server-only encryption helper using the Node standard library.
No new third-party cryptography dependency is justified.

---

# Frozen Admin UX Contract

## Page Structure

Final-B uses:

```text
/admin/calendar
  -> operational availability calendar
  -> action/link: Calendar integrations

/admin/calendar/integrations
  -> protected external-calendar configuration and operations
```

The integration page displays one card per supported TRP Booking accommodation:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

Each card contains two clearly separated directions:

```text
Airbnb -> TRP Booking
TRP Booking -> Airbnb
```

The UI must not make a shared `ExternalCalendar.status` value look like proof that both directions
have the same health.

## Airbnb Inbound Card

The inbound section includes:

```text
Provider: Airbnb
Configuration state
Airbnb iCal URL password-style input
Show / hide while editing the new value only
Save / Replace
Test connection
Sync now
Enable / Disable import
Last sync
Last successful sync
Latest safe sync result
Safe failure diagnostic
```

After save:

```text
- The input is cleared.
- The stored URL is never re-populated into the DOM.
- Ordinary server-rendered data contains only configured/not-configured state.
- Show/hide applies only to the unsaved value typed by the current admin.
```

## TRP Outbound Card

The outbound section includes:

```text
TRP Booking iCal
Configuration state
Copy URL
Generate URL when no token exists
Rotate URL when a token already exists
Enable / Disable export
Last rotated timestamp
Last successful feed request timestamp
Safe status
```

For an existing hash-only calendar:

```text
exportTokenHash exists
exportTokenEncrypted does not exist

-> existing public feed continues to work
-> Copy URL is unavailable
-> UI shows Rotation required before Copy URL can be enabled
```

Rotation is deliberate and requires a styled project dialog that explains that the old URL will
stop working immediately. Native `confirm()` is prohibited.

---

# Frozen Secret-Persistence Contract

## Dedicated Encryption Key

Final-B.2 introduces the server-side environment variable:

```text
EXTERNAL_CALENDAR_ENCRYPTION_KEY
```

Contract:

```text
- exactly 32 random bytes represented in Base64
- server-side only
- never exposed through NEXT_PUBLIC variables
- never reuse AUTH_SECRET, CRON_SECRET, Tilopay credentials, or another provider secret
- Local/Test use a developer-owned Final-B key
- future Production uses a new company-owned Production key
```

Changing this key without re-encrypting stored values makes those ciphertexts intentionally
undecryptable. Key rotation itself is outside Final-B.

## Encryption Primitive

Final-B uses authenticated encryption from the Node standard library:

```text
AES-256-GCM
random 12-byte IV per encryption
16-byte authentication tag
versioned ciphertext envelope
```

The persisted envelope is equivalent to:

```text
v1:<iv-base64url>:<auth-tag-base64url>:<ciphertext-base64url>
```

The exact helper must:

```text
- reject malformed envelopes
- reject an invalid key length
- fail closed on authentication-tag mismatch
- fail closed when ciphertext is used for the wrong property or purpose
- never log plaintext, key material, IV/tag+ciphertext bundles, or decrypted provider URLs
```

## Additional Authenticated Data

Ciphertext is bound to its logical use with AAD equivalent to:

```text
trp-booking:external-calendar:airbnb-import:<propertyId>
trp-booking:external-calendar:trp-export-token:<propertyId>
```

This prevents an encrypted value from being silently copied to another property or from being used
as the opposite secret type.

## Inbound Persistence

The entire Airbnb import URL is secret because its path/query can contain provider access material.
It remains stored only as:

```text
ExternalCalendar.importUrlEncrypted
```

No plaintext companion column is allowed.

## Outbound Persistence

Final-B.2 adds:

```prisma
exportTokenEncrypted String? @map("export_token_encrypted") @db.Text
```

The model then intentionally stores two representations of the outbound token:

```text
exportTokenHash
  -> SHA-256 digest
  -> deterministic public feed lookup
  -> never returned to admin UI

exportTokenEncrypted
  -> authenticated encrypted raw high-entropy token
  -> decrypted only for explicit protected Copy URL
  -> never included in normal read models
```

The full TRP Booking URL is not stored. Only the raw token is encrypted.

## Durable Uniqueness

Final-B.2 also adds a durable uniqueness rule equivalent to:

```prisma
@@unique([propertyId, provider])
```

Before applying the constraint, migration/deployment must fail closed if duplicates already exist.
No migration may choose one duplicate arbitrarily or hard-delete history.

---

# Frozen Airbnb Inbound URL Security Policy

## Provider-Specific Validation

Once URLs can be submitted from admin UI, inbound validation must reject a URL unless all of the
following are true:

```text
- valid absolute URL
- HTTPS only
- no embedded username/password
- no fragment
- no IP-literal host
- no non-default port
- host is airbnb.com or a subdomain of airbnb.com
- calendar path is an Airbnb iCal export path
- path ends in .ics
```

Airbnb currently documents that URLs used for calendar synchronization must end in `.ics`.

Do not lowercase or otherwise rewrite the secret path/query values after validation.

## Redirect Defense

The provider fetcher must not rely on unrestricted automatic redirects.

Final-B.4 requires:

```text
fetch(..., { redirect: "manual" })
maximum redirect count: 3
validate every redirect target with the same Airbnb URL policy
reject redirects outside the allowed Airbnb boundary
```

No cookie, Authorization header, or provider credential may be forwarded manually.

## Fetch Bounds

Preserve the existing 10-second timeout and add a bounded response-body limit.

Final-B freezes the maximum accepted iCal body at:

```text
2 MiB
```

The import parser remains authoritative for calendar content. Content-Type alone is not considered
sufficient proof that a response is a valid Airbnb calendar.

## Secret-Safe Failures

Errors returned to UI, audit, cron history, or sync history may contain:

```text
safe error code
safe generic provider message
HTTP status category where already accepted
```

They must never contain:

```text
raw Airbnb URL
query string
provider access token
redirect URL
response body
ciphertext
key material
```

---

# Frozen Inbound Migration Contract

## Compatibility Sequence

Current Test synchronization uses the private environment map. Final-B migrates without interrupting
existing calendars:

```text
B.2
- add encryption foundation and outbound encrypted-token field
- keep current inbound resolver behavior
- no automatic secret migration

B.3
- expose safe read model only
- show effective inbound source as DATABASE_ENCRYPTED / LEGACY_ENV / NONE

B.4
- use encrypted database secret first
- use legacy environment map only as a temporary fallback
- saving/replacing the URL stores encrypted database value
- new database value becomes authoritative immediately

B.5
- complete outbound protected copy/rotation controls

B.6
- confirm all three Test inbound calendars use database encryption
- remove AIRBNB_ICAL_IMPORT_URLS_JSON from Vercel Test
- remove the normal runtime fallback and obsolete .env.example guidance
- rerun controlled hosted synchronization/round-trip regression
```

Production must never depend on the legacy environment URL map.

## No Automatic Import-Secret Migration

The application must not read the legacy environment URL and silently persist it to the database.
Migration requires an explicit admin/owner save/replace action so it has:

```text
authenticated actor
intentional timing
audit evidence
known property/provider mapping
```

---

# Frozen Admin Read-Model Contract

## Safe DTO

Final-B.3 introduces a server-side read model equivalent to:

```text
calendarId | null
property id / localized names
provider
direction
importConfigured
importSecretSource = DATABASE_ENCRYPTED | LEGACY_ENV | NONE
isImportEnabled
safe inbound status
last sync timestamp
last successful sync timestamp
latest sync status/counters
safe latest failure code/message
exportConfigured
exportCopyAvailable
isExportEnabled
safe outbound status
exportTokenLastRotatedAt
lastExportGeneratedAt
updatedAt
```

The read model must not contain:

```text
importUrlEncrypted
Airbnb plaintext URL
exportTokenHash
exportTokenEncrypted
raw outbound token
full private outbound URL
ExternalCalendarEvent.rawPayload
provider response bodies
```

## Direction-Specific Status

The UI derives inbound status independently from outbound status.

Inbound states:

```text
NOT_CONFIGURED
LEGACY_ENV_MIGRATION_REQUIRED
DISABLED
READY
HEALTHY
WARNING
ERROR
```

Suggested interpretation:

```text
NOT_CONFIGURED
  -> no database secret and no transitional legacy env secret

LEGACY_ENV_MIGRATION_REQUIRED
  -> legacy env secret exists but encrypted database secret does not

DISABLED
  -> import explicitly disabled

READY
  -> configured and enabled but no successful/failed sync evidence yet

HEALTHY
  -> latest relevant sync succeeded

WARNING
  -> latest relevant sync produced PARTIAL_SUCCESS

ERROR
  -> latest relevant sync failed
```

`lastImportFinishedAt` is not sufficient for `Last successful sync` because it is updated on failed
runs too. Final-B must derive the last successful sync from `ExternalCalendarSyncLog` with
`status=SUCCESS`.

Outbound states:

```text
NOT_CONFIGURED
DISABLED
ROTATION_REQUIRED
READY
```

Suggested interpretation:

```text
NOT_CONFIGURED
  -> no exportTokenHash

ROTATION_REQUIRED
  -> exportTokenHash exists but exportTokenEncrypted is null

DISABLED
  -> export configured but explicitly disabled

READY
  -> hash + encrypted raw token exist and export is enabled
```

An inbound `ExternalCalendar.status=ERROR` must not make the UI claim the public outbound feed is
broken. The current public feed intentionally rejects `INACTIVE`, while an inbound sync `ERROR`
continues to allow export.

---

# Frozen Admin API Security Contract

## Authentication and Validation

Every external-calendar admin endpoint must independently:

```text
- call getAdminSessionActor()
- reject unauthenticated/non-admin requests
- validate route/body data with Zod
- return centralized safe error codes
- run on Node when cryptography/provider fetch is required
```

Do not rely only on `/admin` layout protection.

## Same-Origin Defense

Secret-management and mutation endpoints must validate same-origin browser requests in addition to
the authenticated session.

For Test/Production, allowed application origins come from the validated TRP environment contract,
not from an arbitrary Host header.

For Local, the current local request origin may be accepted only when it is a valid localhost or
loopback development origin.

This check applies at minimum to:

```text
save/replace import URL
test connection using an unsaved URL
sync now
enable/disable import
copy outbound URL
generate/rotate outbound token
enable/disable export
```

## Endpoint Family

Final-B should use an Airbnb-specific protected family under the admin calendar domain, equivalent
to:

```text
/api/admin/calendar-integrations/[propertyId]/airbnb/import-url
/api/admin/calendar-integrations/[propertyId]/airbnb/import-test
/api/admin/calendar-integrations/[propertyId]/airbnb/import-sync
/api/admin/calendar-integrations/[propertyId]/airbnb/import-enabled
/api/admin/calendar-integrations/[propertyId]/airbnb/export-url/copy
/api/admin/calendar-integrations/[propertyId]/airbnb/export-url/rotate
/api/admin/calendar-integrations/[propertyId]/airbnb/export-enabled
```

Do not introduce a generic arbitrary-provider action endpoint in this track.

## Optimistic Concurrency

Secret replacement, enable/disable, and token rotation use an `expectedUpdatedAt` fence from the safe
read model.

A stale admin page must receive a typed conflict and refresh rather than overwriting a newer
configuration silently.

---

# Frozen Inbound Operations Contract

## Save / Replace

The admin input is a password-style field. Show/hide affects only the currently typed unsaved value.

Save/replace:

```text
- validates the Airbnb URL security policy
- encrypts the entire URL server-side
- creates/restores the durable property/provider calendar if necessary
- stores only ciphertext
- does not return the decrypted URL
- does not automatically perform a synchronization
- clears stale configuration failure state only where explicitly safe
- records audit evidence
```

Disabling import does not erase the encrypted URL.

## Test Connection

`Test connection` is intentionally different from `Sync now`.

It may test either:

```text
- the currently typed unsaved candidate URL, or
- the currently effective persisted/legacy secret when no candidate is supplied
```

It performs:

```text
URL policy validation
bounded provider fetch
Airbnb iCal parse
safe result calculation
```

It does not perform:

```text
ExternalCalendarEvent reconciliation
CalendarBlock mutation
preparation-buffer mutation
ExternalCalendarSyncLog creation
secret persistence
```

The action is audited with a safe result code only. The candidate URL is never written to audit
metadata.

## Sync Now

`Sync now` operates only on the persisted effective calendar secret and the selected
`ExternalCalendar` row.

It reuses:

```text
syncAirbnbIcalCalendarManually()
```

and therefore preserves:

```text
CalendarSyncTriggeredBy.ADMIN
ExternalCalendarSyncLog
existing event reconciliation
existing preparation-buffer rules
existing loop-prevention behavior
```

It must not invoke `SYNC_AIRBNB_CALENDARS` for every listing when an admin clicked one card.

Because `ExternalCalendarSyncLog` currently has no admin actor relation, Final-B also records a safe
`AdminAuditLog` entry for the per-card manual sync request.

## Import Enable / Disable

Enable/disable controls the direction independently:

```text
isImportEnabled
```

Rules:

```text
- disabling import does not erase the URL
- disabling import does not disable export
- enabling import requires an effective inbound configuration
- during B.4 compatibility, an effective legacy env secret satisfies that prerequisite
- after B.6, only an encrypted database secret satisfies it
```

---

# Frozen Outbound Operations Contract

## Token Generation

A new outbound token uses:

```text
32 cryptographically random bytes
encoded as 64 lowercase hexadecimal characters
256 bits of entropy
```

The service atomically computes/stores:

```text
SHA-256 token hash
AES-256-GCM encrypted raw token
exportTokenLastRotatedAt
```

The raw token is never persisted in plaintext.

## Rotation

Rotation atomically replaces:

```text
exportTokenHash
exportTokenEncrypted
exportTokenLastRotatedAt
```

with optimistic concurrency and audit evidence.

The old public URL becomes invalid immediately because its hash no longer matches the row.

The rotation response does not need to expose the raw token. The administrator explicitly uses
`Copy URL` after rotation.

## Existing Hash-Only Test Feeds

Final-B.2 must not backfill or auto-rotate the three existing Test feeds.

They remain valid because public lookup still uses the unchanged hash.

Until an administrator deliberately rotates one:

```text
existing feed -> works
Copy URL       -> unavailable
UI state       -> ROTATION_REQUIRED
```

## Controlled Rotation Rollout

Because each of the three existing Test feeds is already linked to a real Airbnb listing, B.5
rotates them one at a time:

```text
1. Rotate one property's TRP outbound token.
2. Copy the new protected .ics URL.
3. Replace that calendar URL in the matching Airbnb listing.
4. Verify new feed availability.
5. Verify old URL returns generic 404.
6. Run controlled round-trip/loop-prevention verification.
7. Repeat for the next property only after the previous one passes.
```

No bulk automatic rotation is allowed.

## Copy URL

`Copy URL` is an explicit protected POST action.

The server:

```text
- authenticates admin
- validates same-origin request
- loads exact property/provider row
- requires exportTokenEncrypted
- decrypts with purpose/property-bound AAD
- builds environment-safe TRP URL
- returns the URL only for this explicit request
- sends no-store/private response headers
- records secret-safe audit evidence
```

The client:

```text
- receives the value only inside the action handler
- immediately calls navigator.clipboard.writeText(url)
- does not persist it in React state
- does not render it into the page/DOM
- does not console.log it
- displays only safe success/failure feedback
```

If clipboard write fails, do not fall back to displaying the private token on screen.

## Environment-Aware Outbound URL

Only the raw token is encrypted. The full URL is built at request time.

Expected shape:

```text
Test:
https://trp-booking.juantzun.dev/api/ical/<token>.ics

Production after Phase 13:
https://turefugioperfecto.com/api/ical/<token>.ics
```

Local development may use a validated localhost/loopback origin.

Outside Local, do not construct the protected URL from an arbitrary request Host header. Use
`TRP_ENVIRONMENT` plus the approved environment configuration.

All admin-generated outbound URLs include the `.ics` suffix for Airbnb compatibility.

## Export Enable / Disable

Enable/disable controls:

```text
isExportEnabled
```

Rules:

```text
- disabling export does not erase hash/ciphertext
- disabling export does not disable import
- public route continues returning the same generic 404 while export is disabled
- enabling export requires a configured hash
```

---

# Frozen Audit Contract

Final-B reuses `AdminAuditLog` with:

```text
entityType = ExternalCalendar
entityId   = exact ExternalCalendar.id
userId     = authenticated admin actor id
```

Frozen action names:

```text
EXTERNAL_CALENDAR_IMPORT_URL_SAVED
EXTERNAL_CALENDAR_IMPORT_URL_REPLACED
EXTERNAL_CALENDAR_IMPORT_CONNECTION_TESTED
EXTERNAL_CALENDAR_IMPORT_SYNC_REQUESTED
EXTERNAL_CALENDAR_IMPORT_ENABLED
EXTERNAL_CALENDAR_IMPORT_DISABLED
EXTERNAL_CALENDAR_EXPORT_TOKEN_GENERATED
EXTERNAL_CALENDAR_EXPORT_TOKEN_ROTATED
EXTERNAL_CALENDAR_EXPORT_URL_COPIED
EXTERNAL_CALENDAR_EXPORT_ENABLED
EXTERNAL_CALENDAR_EXPORT_DISABLED
```

Allowed metadata examples:

```text
actorEmail
propertyId
provider
previousConfigured boolean
newConfigured boolean
previousEnabled boolean
newEnabled boolean
safe result code
syncLogId
rotation timestamp
```

Forbidden audit metadata:

```text
Airbnb URL
Airbnb query/token
export raw token
exportTokenHash
ciphertext
encryption key
full private TRP outbound URL
provider calendar body
```

---

# Copy and Localization Contract

All visible Final-B copy remains centralized in:

```text
messages/es.ts
messages/en.ts
```

Recommended namespace:

```text
messages.admin.calendarIntegrations
```

It will contain:

```text
page title/description
inbound/outbound labels
configuration states
safe health states
password-field labels/placeholders
save/replace/test/sync/enable/disable actions
copy/generate/rotate actions
rotation dialog
success feedback
safe error feedback
legacy migration warning
last sync / last success / last rotation labels
```

No visible feature-local strings are introduced in TSX.

---

# Data and Lifecycle Invariants

Final-B does not change accepted Airbnb availability semantics.

The following remain frozen:

```text
- Imported Airbnb events remain ExternalCalendarEvent records.
- Imported Airbnb availability remains CalendarBlockSource.AIRBNB.
- Airbnb preparation buffers remain PREPARATION_BUFFER children governed by accepted property rules.
- Refugio Completo composition/blocking behavior remains unchanged.
- TRP outbound export excludes Airbnb-imported events according to the accepted loop-prevention policy.
- Stable outbound event identity remains unchanged.
- Existing public export route behavior remains generic and secret-safe.
- No existing event/sync/audit history is hard-deleted by Final-B.
```

Final-B changes configuration ownership and protected operational controls, not the accepted calendar
business model.

---

# Final-B.2 Contract

Final-B.2 implements only the persistence/cryptography foundation required by later admin features.

Expected scope:

```text
Prisma:
- ExternalCalendar.exportTokenEncrypted nullable Text
- unique propertyId + provider constraint
- migration that fails closed on duplicates

Server environment:
- EXTERNAL_CALENDAR_ENCRYPTION_KEY
- .env.example contract
- lib/env/server.ts validation

Server crypto:
- lib/external-calendars/secret-crypto.ts
- AES-256-GCM authenticated encryption/decryption
- purpose/property-bound AAD

Outbound token service foundation:
- generate high-entropy token
- hash raw token
- encrypt raw token
- atomic generate/rotate primitives
- no UI yet
```

B.2 must not:

```text
- auto-rotate existing tokens
- move inbound env secrets automatically
- expose Copy URL yet
- enable Test cron schedules
```

---

# Final-B.3 Contract

Final-B.3 introduces the no-secret admin read model and integration page.

Expected scope:

```text
lib/admin/external-calendar-integrations.ts
types/admin-external-calendar-integration.ts
app/admin/calendar/integrations/page.tsx
features/admin/components/admin-calendar-integrations-page.tsx
messages/es.ts
messages/en.ts
current admin calendar link/action
```

It may show configuration state and historical safe operational evidence, but it must not expose any
provider/private token material.

---

# Final-B.4 Contract

Final-B.4 implements Airbnb inbound protected operations:

```text
save / replace URL
test connection
sync now
enable / disable import
DB-first secret resolution
transitional env fallback
Airbnb URL/redirect/size security policy
safe audit evidence
```

B.4 must preserve the existing import reconciliation service rather than duplicating it.

---

# Final-B.5 Contract

Final-B.5 implements outbound protected operations:

```text
Copy URL
Generate URL if no token exists
Rotate URL
Enable / disable export
rotation warning dialog
environment-safe URL construction
one-at-a-time Test migration of existing hash-only feeds
```

The public export route itself should require no behavioral redesign.

---

# Final-B.6 Acceptance and Closure Contract

## Permanent Test Gate

Final-B.6 may add one consolidated permanent command, equivalent to:

```text
npm run final-b:validate
```

with tests under:

```text
tests/final-b/
```

Do not introduce separate B.2/B.3/B.4/B.5 validator scripts.

## Automated Coverage

The consolidated gate must cover at minimum:

```text
- AES-GCM round trip
- tampered ciphertext fails closed
- wrong property/purpose AAD fails closed
- encryption key contract
- Airbnb URL allow/deny policy
- redirect target validation
- bounded provider response contract
- DB-first inbound secret resolution
- transitional legacy fallback contract
- safe admin DTO excludes secret/hash/ciphertext fields
- durable one property/provider calendar contract
- outbound token generation entropy/shape
- SHA-256 public lookup compatibility
- rotation invalidates old token and enables new token
- Copy URL requires encrypted token
- environment-safe .ics URL construction
- same-origin admin mutation/secret endpoint contract
- audit metadata contains no secret material
- per-card manual sync remains ADMIN-triggered
- accepted export loop prevention/stable UID regressions
- ES/EN Final-B message parity
```

## Hosted Test Acceptance

Before Final-B closes, controlled Test verification must include all three supported accommodations:

```text
[ ] admin integrations page loads without any secret value in page data/DOM
[ ] each Airbnb URL is explicitly migrated to encrypted database storage
[ ] each saved URL can pass Test connection
[ ] each saved URL can run Sync now successfully
[ ] expected Airbnb effective availability remains correct
[ ] safe last sync and last successful sync are correct
[ ] legacy AIRBNB_ICAL_IMPORT_URLS_JSON is removed from Test after migration
[ ] each existing hash-only outbound feed is rotated deliberately one at a time
[ ] Copy URL works only after encrypted token exists
[ ] copied URL ends in .ics
[ ] old rotated URL returns the existing generic 404
[ ] new URL returns the valid text/calendar feed
[ ] matching Airbnb listing is updated before moving to the next rotation
[ ] controlled TRP -> Airbnb -> TRP round-trip remains loop-free
[ ] no cross-property mapping appears
[ ] Vercel logs expose no Airbnb URL, provider token, export token, ciphertext, or key
[ ] Test vercel.json still contains zero cron registrations
[ ] lint/build/Prisma technical gates pass
```

## Closure State

Only after the automated and controlled Test gates pass may documentation move to:

```text
Final-B — Completed and accepted
Final-C — Next / Not started
Phase 13 — Not started
```

---

# Non-Goals

Final-B does not include:

```text
- a generic integration framework for providers other than AIRBNB
- Google Calendar, VRBO, Booking.com, or other calendar-provider support
- Production account provisioning
- Test Vercel scheduler activation
- generic secret-manager infrastructure for unrelated domains
- automatic provider token rotation without admin intent
- plaintext persistence of any private calendar URL/token
- exposing raw URLs in admin tables, logs, audit metadata, errors, or server-rendered data
- changing accepted Airbnb event reconciliation
- changing preparation-buffer policies
- changing composed-listing availability rules
- changing stable outbound event identity or loop-prevention rules
- Final-C pricing behavior
- Final-D additional-charge behavior
- Final-E reviews
- Final-F WhatsApp
- Final-G performance optimization
- Phase 13 work
```

---

# Status After Final-B.1 Strategy Package

```text
Final-A — Completed and accepted
Final-B — In progress
Final-B.1 — Strategy and security contract prepared; pending owner acceptance
Final-B.2 — Not started
Final-B.3 — Not started
Final-B.4 — Not started
Final-B.5 — Not started
Final-B.6 — Not started
Final-C — Not started
Final-D — Not started
Final-E — Not started
Final-F — Not started
Final-G — Not started
Final-H — Not started
Phase 13 — Not started
```

## B.1 Acceptance Gate

Before starting B.2:

```text
[ ] owner accepts the six-subphase Final-B split
[ ] owner accepts the one property/provider durable calendar model
[ ] owner accepts EXTERNAL_CALENDAR_ENCRYPTION_KEY as a dedicated secret
[ ] owner accepts AES-256-GCM + purpose/property-bound AAD
[ ] owner accepts no automatic rotation/backfill of existing outbound tokens
[ ] owner accepts explicit inbound migration rather than automatic env-to-DB migration
[ ] owner accepts Airbnb-only HTTPS/redirect SSRF controls
[ ] owner accepts /admin/calendar/integrations as the protected UI location
[ ] owner accepts DB-first + temporary env fallback until B.6
[ ] owner accepts one-at-a-time Test outbound rotation in B.5
[ ] owner accepts one consolidated Final-B test gate in B.6
[ ] Phase 13 remains Not started
```

## External References Reviewed for the Contract

The B.1 security decisions were also checked against current primary documentation on 2026-08-14:

```text
Airbnb Help — Sync your home host calendar to other websites
- Airbnb requires imported calendar URLs to end in .ics.

Node.js Crypto API
- createCipheriv/createDecipheriv support authenticated AES-GCM operation.
- GCM authentication tags are available through the standard crypto API.
```

These references inform protocol/cryptography compatibility only. The repository-specific behavior
and accepted TRP Booking Phase 12 contracts remain authoritative for implementation.

---

# Final-B.1 Acceptance and B.2 Handoff

Final-B.1 was accepted by the owner on 2026-08-14 at:

```text
2627161d5b3960995be0f517682f84272431c291
docs(final-b): define external-calendar security contract
```

The accepted contract is the implementation authority for Final-B.2 through Final-B.6. Final-B.2
implements the persistence/cryptography/token-mutation foundation only; it does not introduce the
admin UI, Copy URL endpoint, inbound DB-first resolver, or any automatic rotation/migration of the
three existing Test integrations. Its implementation record is:

```text
docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
```
