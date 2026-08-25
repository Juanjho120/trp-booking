# 170 — Final-B.4 Airbnb Inbound Configuration and Operational Actions

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-B — Admin external-calendar integrations
Subphase: Final-B.4 — Airbnb inbound configuration and operational actions
Status: Implementation prepared; pending Local/Test validation and owner acceptance
Preparation date: 2026-08-25
Implementation base head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Previous subphase: Final-B.3 — Completed and accepted on 2026-08-25
Final-B.3 accepted head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Authoritative strategy: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Previous record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Next planned subphase: Final-B.5 — TRP outbound Copy URL / Rotate URL / export controls
Phase 13: Not started
```

## Purpose

Final-B.4 converts the read-only Airbnb inbound state introduced in B.3 into protected admin
operations without weakening the accepted secret boundary. The browser may submit a new private URL,
but persisted/read data still never contains plaintext provider URLs, ciphertext, hashes, or tokens.

## Implemented Scope

```text
Airbnb inbound URL allow/deny policy
manual redirect handling with maximum 3 redirects
2 MiB response-body bound
10-second provider timeout
DB-first encrypted inbound URL resolution
transitional AIRBNB_ICAL_IMPORT_URLS_JSON fallback
Save / Replace encrypted URL
Test connection without persistence or reconciliation
Sync now for one selected calendar only
Enable / Disable import independently from export
same-origin mutation defense
optimistic updatedAt concurrency fences
safe AdminAuditLog evidence
localized admin controls and feedback
```

## Security Contract

An accepted Airbnb import URL must be an absolute HTTPS URL, have no embedded credentials, fragment,
IP-literal host, or non-default port, use `airbnb.com` or one of its subdomains, use the Airbnb
`/calendar/ical/` export path, and end in `.ics`.

Provider requests use `redirect: "manual"`. Every redirect target is revalidated against the same
policy and no more than three redirects are accepted. The response is capped at 2 MiB. No cookie,
Authorization header, provider credential, redirect URL, response body, plaintext URL, ciphertext,
or encryption key is written to admin audit evidence.

## DB-First Migration Boundary

The effective resolver is now:

```text
ExternalCalendar.importUrlEncrypted
  -> decrypt with AIRBNB_IMPORT AAD bound to propertyId
  -> validate Airbnb URL policy
  -> use immediately

otherwise, temporarily:
AIRBNB_ICAL_IMPORT_URLS_JSON[externalCalendarId]
  -> validate Airbnb URL policy
  -> use as compatibility fallback
```

Saving/replacing a URL never copies the legacy env value automatically. It requires an authenticated
admin action, validates the candidate, encrypts it with the existing Final-B.2 AES-256-GCM helper,
and makes the database value authoritative immediately.

The legacy env fallback remains intentionally present until Final-B.6 verifies all three Test
calendars have been explicitly migrated and removes the Test environment map.

## Operation Semantics

### Save / Replace

```text
- validates the new candidate
- encrypts and persists only ciphertext
- clears the browser input after success
- never returns the stored URL
- does not start synchronization
- records only safe migration/configuration metadata
- uses expectedUpdatedAt to reject stale writes
```

### Test connection

```text
- candidate URL is used when currently typed; otherwise the effective persisted/legacy URL is used
- fetch + redirect + size policy is enforced
- iCal content is parsed
- no ExternalCalendarEvent mutation
- no CalendarBlock mutation
- no preparation-buffer mutation
- no ExternalCalendarSyncLog creation
- safe audit result only
```

### Sync now

```text
- uses only the effective persisted configuration
- targets one ExternalCalendar row
- reuses syncAirbnbIcalCalendarManually()
- preserves CalendarSyncTriggeredBy.ADMIN
- preserves existing event/block/buffer reconciliation
- adds safe AdminAuditLog actor evidence
```

### Enable / Disable

```text
- changes only isImportEnabled
- disabling does not erase the encrypted URL
- disabling does not disable export
- enabling requires an effective DB or transitional legacy configuration
- uses expectedUpdatedAt to reject stale writes
```

## Admin Endpoint Family

```text
PATCH /api/admin/calendar-integrations/[propertyId]/airbnb/import-url
POST /api/admin/calendar-integrations/[propertyId]/airbnb/import-test
POST /api/admin/calendar-integrations/[propertyId]/airbnb/import-sync
PATCH /api/admin/calendar-integrations/[propertyId]/airbnb/import-enabled
```

Every endpoint independently requires an admin session, validates route/body data, runs on Node,
and validates browser origin against the TRP environment contract.

## Explicit Non-Goals

Final-B.4 does not implement:

```text
Copy outbound URL
Generate outbound token
Rotate outbound URL/token
Enable / Disable export
rotation confirmation dialog
removal of the legacy env fallback
Test Vercel cron registrations
Production infrastructure/provider configuration
```

Those remain Final-B.5, Final-B.6, and Phase 13 responsibilities.

## Validation Gate

B.4 intentionally adds no standalone Final-B validator. Final-B.6 remains the owner of the
consolidated `tests/final-b/` gate. Apply the package and run:

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

No Prisma schema change or migration is introduced by Final-B.4.

## Local/Test Acceptance Matrix

```text
[ ] integrations page renders the new inbound controls for all three accommodations
[ ] DOM/page data contains no stored Airbnb URL, ciphertext, hash, or token
[ ] invalid HTTP/non-Airbnb/IP/credential/fragment/non-.ics candidate is rejected safely
[ ] valid Airbnb candidate passes Test connection without changing events/blocks/sync logs
[ ] Save stores importUrlEncrypted and clears the browser input
[ ] DB value becomes authoritative while legacy env value may still exist
[ ] Sync now affects only the selected accommodation and records ADMIN-triggered sync evidence
[ ] Disable import preserves encrypted URL and outbound state
[ ] Enable import requires effective inbound configuration
[ ] stale expectedUpdatedAt receives typed conflict instead of overwriting newer configuration
[ ] audit metadata contains no URL/query/token/ciphertext/redirect/body
[ ] existing outbound feed behavior is unchanged
[ ] zero Vercel Test cron registrations remain unchanged
[ ] technical gate passes
```

Do not mark Final-B.4 completed or begin Final-B.5 until this matrix is accepted by the owner.
