# 169 — Final-B.3 Admin External-Calendar Read Model and Integration UI

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.3 — Admin external-calendar read model and integration UI
Status: Completed and accepted
Preparation date: 2026-08-25
Acceptance date: 2026-08-25
Accepted head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Owner evidence: package applied, committed, and npm run build passed without errors
Implementation base head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Previous subphase: Final-B.2 — Completed and accepted on 2026-08-25
Final-B.2 accepted head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Authoritative strategy: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
B.2 foundation: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Next planned subphase: Final-B.4 — Airbnb inbound configuration and operational actions
Phase 13: Not started
```

## Purpose

Final-B.3 adds the first protected admin surface for external-calendar integrations. It is deliberately
read-only: an administrator can inspect safe configuration and operational state for all three
supported accommodations, but this subphase cannot save an Airbnb URL, run a sync, enable/disable a
direction, expose/copy an outbound URL, generate a token, or rotate a token.

The core security rule is:

```text
The browser receives state, never external-calendar secret material.
```

## Implemented Scope

```text
types/admin-external-calendar-integration.ts
lib/admin/external-calendar-integrations.ts
app/admin/calendar/integrations/page.tsx
features/admin/components/admin-calendar-integrations-page.tsx
features/admin/components/admin-property-calendar.tsx
features/admin/index.ts
lib/admin/index.ts
messages/es.ts
messages/en.ts
```

The existing `/admin/calendar` header gains a localized link to:

```text
/admin/calendar/integrations
```

No additional main sidebar item is introduced. The existing Calendar item remains active on the
nested route because the admin shell already treats `/admin/calendar/*` as part of Calendar.

## Safe Read Model

The DTO exposes only the fields required by the frozen B.1 contract:

```text
calendarId | null
property id / nameEs / nameEn
provider
direction
importConfigured
importSecretSource
isImportEnabled
inboundStatus
lastSyncAt
lastSuccessfulSyncAt
latestSync safe counters/status/trigger/timestamps
safeFailure normalized code/message
exportConfigured
exportCopyAvailable
isExportEnabled
outboundStatus
exportTokenLastRotatedAt
lastExportGeneratedAt
updatedAt
```

It explicitly does not contain:

```text
importUrlEncrypted
Airbnb plaintext URL
Airbnb query/token
exportTokenHash
exportTokenEncrypted
raw outbound token
full private outbound URL
ExternalCalendarEvent.rawPayload
provider response body
encryption key
```

The read model mirrors the existing legacy `AIRBNB_ICAL_IMPORT_URLS_JSON` map semantics server-side
only to determine whether a non-empty string entry exists for the exact calendar id. It never returns
the candidate URL from that parser and reduces the legacy configuration to a boolean source
classification before constructing the DTO.

## Supported Accommodation Order

The page follows the existing authoritative admin order:

```text
black-white-apartment
perfect-retreat-bungalow
complete-retreat
```

Each supported property receives one integration card. The durable B.2 uniqueness rule means at most
one active Airbnb `ExternalCalendar` row can correspond to each property/provider pair.

## Direction-Specific State

### Airbnb -> TRP Booking

The read model derives:

```text
NOT_CONFIGURED
LEGACY_ENV_MIGRATION_REQUIRED
DISABLED
READY
HEALTHY
WARNING
ERROR
```

Rules preserve the B.1 contract:

```text
no encrypted DB URL and no legacy env entry -> NOT_CONFIGURED
configured but import disabled/inactive      -> DISABLED
legacy env is the effective source           -> LEGACY_ENV_MIGRATION_REQUIRED
encrypted DB source + latest FAILED          -> ERROR
encrypted DB source + latest PARTIAL_SUCCESS -> WARNING
encrypted DB source + latest SUCCESS         -> HEALTHY
configured/enabled without decisive evidence -> READY
```

B.3 does not change the runtime import resolver. Database-first decryption and transitional fallback
belong to Final-B.4.

### Last successful sync

`lastImportFinishedAt` is not treated as success evidence. The read model explicitly queries the
latest `ExternalCalendarSyncLog` whose status is `SUCCESS` and serializes that log's finished/start
time as `lastSuccessfulSyncAt`.

### Safe failure diagnostics

Only bounded normalized codes and the small allowlist of already accepted generic/HTTP-safe iCal
messages can enter the DTO. Arbitrary persisted provider text is discarded rather than rendered.
The UI prefers localized explanatory copy plus the normalized safe code.

### TRP Booking -> Airbnb

The outbound state is derived independently:

```text
NOT_CONFIGURED
DISABLED
ROTATION_REQUIRED
READY
```

Rules:

```text
no exportTokenHash                         -> NOT_CONFIGURED
configured but export disabled/inactive   -> DISABLED
hash exists but encrypted raw token absent -> ROTATION_REQUIRED
hash + encrypted token + enabled           -> READY
```

An inbound `ERROR` does not cause the outbound card to claim that the feed is broken. This preserves
the public export behavior accepted before Final-B.

## Existing Hash-Only Test Feeds

The three existing Test feeds are expected to appear as:

```text
exportConfigured = true
exportCopyAvailable = false
outboundStatus = ROTATION_REQUIRED
```

The UI explains that the existing URL continues to work and that an explicit future rotation is
required before protected Copy URL can be enabled. B.3 performs no rotation.

## Operational Evidence

The inbound card may display safe persisted evidence only:

```text
latest sync status
trigger source
started/finished timestamp
import/update/remove/skip counters
block create/update counters
last successful sync timestamp
normalized safe diagnostic code
```

The outbound card may display:

```text
configured/enabled state
Copy URL availability boolean
last rotation timestamp
last successful feed generation/request timestamp
```

`lastExportGeneratedAt` remains the accepted server-side timestamp written after a successful iCal
feed generation. No URL/token is required to display it.

## UI and Localization

All new visible copy is added symmetrically under:

```text
messages.admin.calendarIntegrations
```

in both `messages/es.ts` and `messages/en.ts`.

The page is responsive and uses the existing admin Card/Badge/Button/PageHeader primitives. Each
accommodation shows two clearly separate panels:

```text
Airbnb -> TRP Booking
TRP Booking -> Airbnb
```

No feature-local visible hardcoded string is introduced in TSX.

## Security Boundary

Final-B.3 introduces no mutation or secret endpoint. Authentication continues to be enforced by the
existing `/admin` layout. The stricter per-endpoint authentication and same-origin contract remains
reserved for B.4/B.5 where secret/mutation APIs actually appear.

The new page:

```text
- never decrypts exportTokenEncrypted
- never decrypts importUrlEncrypted
- never serializes either ciphertext
- never serializes exportTokenHash
- never returns the legacy Airbnb URL
- never renders a private URL/token into DOM
- never logs secret material
```

## Explicit Non-Goals

Final-B.3 does not implement:

```text
Airbnb URL password input
Save / Replace
Test connection
Sync now
enable / disable import
DB-first inbound runtime resolver
redirect/response-size provider hardening
Copy URL
Generate URL
Rotate URL
enable / disable export
rotation confirmation dialog
```

Those remain B.4/B.5 responsibilities exactly as frozen in B.1.

## Validation Gate

B.3 adds no per-subphase validator. Use the existing gates:

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
npm run lint
npm run build
git diff --check
```

There is no new Prisma migration in B.3 and therefore no B.3 `db:migrate:deploy` step. Final-B.6
remains the owner of the consolidated `tests/final-b/` regression gate.

## Acceptance State

Final acceptance state:

```text
Final-B.1 — Completed and accepted at 2627161d5b3960995be0f517682f84272431c291
Final-B.2 — Completed and accepted at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 — Completed and accepted at 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 — Implementation prepared; pending Local/Test validation and owner acceptance
Final-B.5 — Not started
Final-B.6 — Not started
Phase 13 — Not started
```
