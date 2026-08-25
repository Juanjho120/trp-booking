# 171 — Final-B.5 TRP Outbound Copy URL, Rotation and Export Controls

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.5 — TRP outbound Copy URL / Rotate URL / export controls
Status: Completed and accepted for Final-B.6 integrated validation on 2026-08-25
Preparation date: 2026-08-25
Implementation base head: a3724f018449515363159ec9f23af892a21b24be
Accepted head: bc6b3db1bec219913164ef267fe5279b19f49a27
Previous subphase: Final-B.4 — Completed and accepted on 2026-08-25
Final-B.4 accepted head: a3724f018449515363159ec9f23af892a21b24be
Authoritative strategy: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Outbound foundation: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Previous record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Next planned subphase: Final-B.6 — Integrated acceptance, regression and documentation closure
Phase 13: Not started
```

## Purpose

Final-B.5 completes the protected outbound side of the calendar integrations page. An authorized
admin can generate or deliberately rotate the private TRP Booking feed token, copy the resulting
`.ics` URL without rendering it into the page, and enable or disable export independently from
Airbnb inbound synchronization.

The public feed lookup remains hash-based and unchanged. Existing hash-only Test feeds remain valid
until the owner deliberately rotates each one.

## Implemented Scope

```text
protected Copy URL POST action
private/no-store copy response
canonical environment-aware outbound URL construction
32-byte token generation through the accepted B.2 primitive
explicit token rotation through the accepted B.2 primitive
styled destructive rotation confirmation sheet
Generate URL when no token exists
Rotate URL when a token exists
Enable / Disable export independently from import
optimistic updatedAt concurrency fences for token mutation and export toggle
secret-safe AdminAuditLog evidence
localized ES/EN outbound controls and feedback
one-card-at-a-time operational rotation workflow
```

No Prisma schema or migration is introduced by B.5.

## Reused B.2 Token Foundation

B.5 does not create another token generator. It calls the already accepted services:

```text
generateExternalCalendarOutboundToken()
rotateExternalCalendarOutboundToken()
```

Those services retain:

```text
32 cryptographically random bytes
64 lowercase hexadecimal characters
SHA-256 public lookup hash
AES-256-GCM encrypted raw-token copy
TRP_EXPORT_TOKEN/property-bound AAD
Serializable transaction
expectedUpdatedAt optimistic fence
bounded P2034 retry
secret-safe token generation/rotation audit evidence
```

The raw token is never persisted in plaintext.

## Copy URL Contract

Endpoint:

```text
POST /api/admin/calendar-integrations/[propertyId]/airbnb/export-url/copy
```

The endpoint independently requires:

```text
authenticated admin session
same-origin browser request
supported property id
active AIRBNB ExternalCalendar row
exportTokenHash present
exportTokenEncrypted present
```

The server decrypts only the raw token for this explicit protected action, verifies that its
SHA-256 digest still matches the persisted lookup hash, builds the environment-safe `.ics` URL, and
returns only:

```json
{
  "url": "<private URL>"
}
```

The response uses:

```text
Cache-Control: private, no-store, max-age=0
```

The full URL is never persisted or written to audit metadata.

### Browser handling

The client keeps the returned URL only in the local action scope and immediately calls:

```text
navigator.clipboard.writeText(url)
```

It does not:

```text
store the URL in React state
render the URL into the DOM
log the URL
fall back to displaying the URL when clipboard access fails
```

A clipboard failure produces only localized safe feedback.

## Environment-Aware URL Construction

The full outbound URL is built at copy time and always includes the Airbnb-compatible `.ics`
suffix.

```text
Test
https://trp-booking.juantzun.dev/api/ical/<token>.ics

Production after Phase 13
https://turefugioperfecto.com/api/ical/<token>.ics
```

For Test and Production, B.5 uses `TRP_ENVIRONMENT` plus the approved `environmentConfig` values.
It does not trust an arbitrary request Host header.

For Local only, the already same-origin-validated request origin may be reused when it is a
localhost or loopback HTTP/HTTPS origin.

## Generate and Rotate Contract

Endpoint:

```text
POST /api/admin/calendar-integrations/[propertyId]/airbnb/export-url/rotate
```

The endpoint accepts an explicit operation:

```text
GENERATE
ROTATE
```

with:

```text
expectedUpdatedAt
```

The route name follows the frozen Final-B endpoint family while the operation field preserves the
separate B.2 generate and rotate invariants.

### Generate

Generate is available only when the durable calendar exists and has no outbound token state.
The B.2 primitive fails closed if either the hash or encrypted token is already configured.

Generate does not automatically enable export.

### Rotate

Rotate requires an existing `exportTokenHash`. This intentionally supports the real Test rows that
still have a working hash-only feed but no encrypted raw-token copy.

Rotation atomically replaces:

```text
exportTokenHash
exportTokenEncrypted
exportTokenLastRotatedAt
```

The previous public URL stops working immediately because its hash is no longer stored.

The rotation response never contains the raw token. The owner must use the separate protected
`Copy URL` action after rotation.

## Styled Rotation Confirmation

A configured feed cannot be rotated directly from the first button click. The admin UI opens the
existing project `Sheet` component and explains that:

```text
the old URL becomes invalid immediately
the new URL must be copied after rotation
the matching Airbnb listing must be updated
the three real Test integrations must be rotated one at a time
```

The final confirmation uses the destructive button variant. Native `confirm()` is not used.

## Existing Hash-Only Test Feeds

Before deliberate rotation:

```text
exportTokenHash        = existing value
exportTokenEncrypted   = null
existing public URL    = still valid
Copy URL               = unavailable
admin status           = ROTATION_REQUIRED when export remains enabled
```

B.5 does not backfill or infer the old raw token.

The controlled operational sequence remains:

```text
1. Rotate one property's feed.
2. Copy the new URL.
3. Replace the calendar URL in the matching Airbnb listing.
4. Verify the new feed returns a valid calendar.
5. Verify the previous URL returns the generic 404.
6. Verify the controlled round trip / loop-prevention boundary.
7. Move to the next property only after the current property passes.
```

There is no bulk rotation endpoint or UI action.

## Export Enable / Disable

Endpoint:

```text
PATCH /api/admin/calendar-integrations/[propertyId]/airbnb/export-enabled
```

Rules:

```text
enabling requires exportTokenHash
disabling preserves exportTokenHash
disabling preserves exportTokenEncrypted
disabling does not disable import
enabling converts IMPORT direction to BIDIRECTIONAL when necessary
enabling may restore an INACTIVE row to ACTIVE
disabling does not erase direction/history
expectedUpdatedAt rejects stale writes
```

While export is disabled, the existing public route continues to return the same generic 404 used
for invalid or unavailable feeds.

## Audit Contract

B.5 uses only the frozen Final-B actions:

```text
EXTERNAL_CALENDAR_EXPORT_TOKEN_GENERATED
EXTERNAL_CALENDAR_EXPORT_TOKEN_ROTATED
EXTERNAL_CALENDAR_EXPORT_URL_COPIED
EXTERNAL_CALENDAR_EXPORT_ENABLED
EXTERNAL_CALENDAR_EXPORT_DISABLED
```

Allowed evidence includes:

```text
actorEmail
propertyId
provider
previousConfigured/newConfigured
previousEnabled/newEnabled
rotationTimestamp
```

Forbidden audit/log data remains:

```text
raw token
exportTokenHash
exportTokenEncrypted
full private outbound URL
encryption key
Airbnb URL or query data
```

## Explicit Non-Goals

Final-B.5 does not:

```text
remove AIRBNB_ICAL_IMPORT_URLS_JSON
remove the B.4 runtime fallback
add Final-B consolidated tests
activate Vercel Test crons
change the public iCal route contract
change loop-prevention/export ownership policy
bulk-rotate the three Test feeds
provision Production resources
```

Legacy inbound fallback removal, consolidated Final-B tests, integrated hosted regression, and final
documentation reconciliation remain Final-B.6.

## Validation Gate

B.5 intentionally adds no per-subphase validator. Final-B.6 owns the consolidated Final-B suite.
After applying this package run:

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

No B.5 database migration or `db:migrate:deploy` step is required.

## Local/Test Acceptance Matrix

```text
[ ] all three integration cards render Copy URL, Generate/Rotate URL, and export enable/disable controls
[ ] normal page/DOM data still contains no raw token, hash, ciphertext, or full private outbound URL
[ ] a hash-only existing feed continues working before deliberate rotation
[ ] Copy URL is unavailable for a hash-only row and returns a safe typed conflict if called directly
[ ] Generate URL works only for an existing calendar with no token and does not auto-enable export
[ ] a stale token mutation receives ADMIN_EXTERNAL_CALENDAR_STALE
[ ] rotation requires the styled confirmation sheet; no native confirm() is used
[ ] rotation of one property invalidates that property's previous URL immediately
[ ] rotation does not return the raw token in its response
[ ] Copy URL returns an environment-canonical .ics URL with private/no-store response headers
[ ] the copied URL is written directly to navigator.clipboard and is never stored in React state or rendered
[ ] clipboard failure does not display the private URL
[ ] disabling export preserves token material and inbound state while the public feed returns generic 404
[ ] enabling export requires a configured hash and restores feed availability
[ ] token/copy/export audit evidence contains no token, hash, ciphertext, full URL, or provider secret
[ ] each real Test integration is rotated and reconnected one at a time before moving to the next
[ ] controlled round-trip and loop-prevention behavior remains correct after each real Test rotation
[ ] zero Vercel Test cron registrations remain unchanged
[ ] technical gate passes
```

The owner accepted the B.5 implementation for integration into Final-B.6 on 2026-08-25 after commit and a clean `npm run build` at:

```text
bc6b3db1bec219913164ef267fe5279b19f49a27
feat(final-b): add outbound calendar URL controls
```

The controlled Local/Test items above are intentionally not discarded. In accordance with the frozen B.1 contract that Final-B.6 owns the consolidated gate, the remaining manual/hosted items are carried forward verbatim into `docs/172-final-b-6-integrated-acceptance-regression-and-documentation-closure.md` and must pass before Final-B can close.
