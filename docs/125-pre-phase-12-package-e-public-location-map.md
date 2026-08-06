# 125 — Pre-Phase-12 Package E: Public Location and Map Configuration

## Status

```text
Package: E — Public location and map configuration
Status: Implementation prepared — validation pending
Implementation base: 5a039aa451628e8ac9712c166bdd0a4605c8813f
Phase 12: Not started and not activated
```

## Goal

Replace the homepage location placeholder with an explicitly configured, bilingual public location and an allowlisted map embed while preserving private arrival instructions as a separate protected domain.

## Persistence contract

`PublicLocationSettings` is a site-wide singleton identified by `site` and stores:

```text
enabled
publicLocationEs
publicLocationEn
mapEmbedUrl
createdAt
updatedAt
```

The migration creates a disabled initial row. No public value is copied from `PropertyArrivalInstructions`.

## Public behavior

- `/` loads accommodations and public-location settings in parallel.
- A map is rendered only when the setting is enabled and both localized texts and the embed URL are complete.
- Disabled, missing, or incomplete settings retain the existing localized placeholder.
- The displayed text follows the selected ES/EN locale.
- The exact guest address and detailed arrival instructions remain unavailable on the public page.

## Map URL allowlist

Only HTTPS embed URLs with no credentials, non-default ports, fragments, API-key/token query parameters, or arbitrary hosts are accepted.

Allowed shapes:

```text
https://www.google.com/maps/embed?...
https://maps.google.com/maps?...&output=embed
https://www.openstreetmap.org/export/embed.html?...
https://openstreetmap.org/export/embed.html?...
```

The administrator submits a URL only. Arbitrary iframe HTML is never accepted or stored.

## Admin behavior

Protected route:

```text
/admin/location
```

Protected API:

```text
PATCH /api/admin/location
```

The editor provides:

- ES/EN public-location text.
- HTTPS map embed URL.
- Enable/disable control.
- Saved, server-validated preview.
- Optimistic concurrency using `updatedAt`.
- Latest 20 audit entries.

## Audit contract

Every effective change creates `AdminAuditLog` action:

```text
PUBLIC_LOCATION_SETTINGS_UPDATED
```

The record contains actor, changed fields, and safe before/after snapshots. The snapshots contain only public location configuration, never private arrival instructions, codes, credentials, or operational secrets.

## Security boundaries

- `PropertyArrivalInstructions.exactAddress`, `mapUrl`, and bilingual instructions are not read by this feature.
- No access codes, Wi-Fi passwords, lockbox details, or rotating credentials are accepted.
- No API keys or token-like query parameters are accepted in the map URL.
- The public iframe source comes only from server-validated persisted data.
- The admin preview uses saved data, not unsaved browser input.
- No hard deletion or history rewrite is introduced.

## Acceptance matrix

1. Disabled initial configuration preserves the localized placeholder.
2. Incomplete disabled drafts can be saved without rendering a public map.
3. Enabling requires both localized texts and an accepted embed URL.
4. Google Maps share embed is accepted.
5. Google Maps `output=embed` URL is accepted.
6. OpenStreetMap export embed is accepted.
7. HTTP, arbitrary hosts, credentials, ports, fragments, API keys, and token parameters are rejected.
8. Arbitrary iframe HTML is rejected.
9. ES and EN public text switch with the site locale.
10. Public map remains responsive on mobile and desktop.
11. Admin page remains responsive and uses project UI components.
12. Stale `updatedAt` returns the localized optimistic-concurrency error.
13. Effective changes create actor-linked audit history.
14. No-op saves do not create duplicate history.
15. Private arrival instructions remain unchanged and absent from public queries.
16. Existing reservation, payment, email, cron, availability, and lifecycle behavior remains unchanged.
17. Prisma schema and migration validate.
18. ES/EN message structure remains equivalent, including restored lifecycle-admin notification labels.
19. Lint, build, diff, and repository checks pass.

## Validation commands

```powershell
npm run env:validate
npm run db:generate
npm run db:validate
npm run db:migrate:dev
npm run db:migrate:status
npm run lint
npm run build
git diff --check
git status --short
```

Package E remains pending until the owner reports the functional and technical matrix passing in local/test.
