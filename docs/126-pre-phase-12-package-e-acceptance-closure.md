# 126 — Pre-Phase-12 Package E Acceptance Closure

## Closure record

```text
Track: Pre-Phase-12 Improvement Track
Package: E — Public location and map configuration
Status: Completed and accepted
Acceptance date: 2026-08-06
Implementation base: 5a039aa451628e8ac9712c166bdd0a4605c8813f
Implementation commit: 303a088b2de51f0819c92b982f09b0d44a4234f4
Accepted functional head: 113ed0198cee66650556409066e996693bf6db35
Implementation record: docs/125-pre-phase-12-package-e-public-location-map.md
Next package: F — Inbound/outbound email center and threaded replies
Package F implementation status: Not started
Phase 12: Not started and not activated
```

## Accepted capability

Package E closes the public-location placeholder without weakening the protected arrival-instruction boundary.

```text
- PublicLocationSettings owns site-wide public location state.
- ES and EN public-location text are persisted independently.
- The public map renders only from enabled, complete, server-validated settings.
- Google Maps embed URLs and OpenStreetMap export embed URLs are supported.
- Arbitrary iframe HTML, HTTP, credentials, non-default ports, fragments, arbitrary hosts, and token-like parameters remain rejected.
- /admin/location and PATCH /api/admin/location remain protected.
- Optimistic concurrency uses updatedAt.
- Effective changes create PUBLIC_LOCATION_SETTINGS_UPDATED audit history.
- No-op saves do not rewrite history.
- Public location never reads or publishes PropertyArrivalInstructions exact address, instructions, access data, or secrets.
- Existing reservation, payment, email, cron, availability, and lifecycle contracts remain unchanged.
```

## Functional acceptance evidence

The owner reported the public location working correctly with both Google Maps and OpenStreetMap and requested progression to the next package. Before closure, configuration and audit history were separated into dedicated tabs.

The final UX follow-up in this closure delivery increases the active-tab contrast on `/admin/location` only:

```text
data-[state=active]:border-primary
data-[state=active]:bg-primary
data-[state=active]:text-primary-foreground
data-[state=active]:shadow-md
```

The shared `components/ui/tabs.tsx` component is not modified, so cron-job tabs and unrelated tab surfaces preserve their accepted behavior. No new visible copy is introduced.

## Acceptance matrix

```text
1. Disabled initial configuration preserves localized placeholder — PASS
2. Incomplete disabled draft remains non-public — PASS
3. Enabled state requires complete bilingual text and accepted URL — PASS
4. Google Maps embed route — PASS
5. Google Maps output=embed route — ACCEPTED CONTRACT
6. OpenStreetMap export embed route — PASS
7. Unsafe URL shapes remain rejected — ACCEPTED CONTRACT
8. Arbitrary iframe HTML remains rejected — ACCEPTED CONTRACT
9. ES/EN public text follows selected locale — PASS
10. Public map responsive behavior — PASS
11. Protected admin responsive behavior — PASS
12. Optimistic-concurrency error boundary — ACCEPTED CONTRACT
13. Effective actor-linked audit history — ACCEPTED CONTRACT
14. No-op audit suppression — ACCEPTED CONTRACT
15. Private arrival data remains separated — PASS
16. Cross-domain regression boundaries remain unchanged — PASS
17. Prisma schema and migration are part of accepted implementation — PASS
18. ES/EN message parity is preserved — PASS
19. Configuration/history separation and active-tab contrast — PASS
```

## Final repository validation gate

After applying this closure delivery to `113ed0198cee66650556409066e996693bf6db35`, run:

```powershell
npm run env:validate
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run lint
npm run build
git diff --check
git status --short
```

`npm run db:migrate:dev` is required only when the Package E migration has not yet been applied to the local development database.

The execution environment used to prepare this closure could verify the repository files and exact GitHub blob lineage but could not clone the complete repository or execute dependency-based npm commands because outbound GitHub access is unavailable there. The local validation commands above remain the final commit gate and must not be represented as executed by this closure artifact.

## Package F handoff

Package F remains unstarted. The next activity is a strategy and decision review only. It must resolve, at minimum:

```text
- Inbound email provider and authenticated webhook boundary.
- Test and production receiving-domain ownership.
- DNS/MX coexistence with any existing mailbox provider.
- reservas@, reservations@, and admin@ sender selection.
- Thread, message, recipient, provider-ID, reply-header, and attachment persistence.
- Outbound reply idempotency and delivery-state handling.
- Reservation linking and /admin/emails?reservationId=<reservationId>.
- Search, filtering, pagination, responsive UI, and authorization.
- Scope that remains outside TRP Booking to avoid PMS expansion.
```

No Package F migration, provider activation, webhook, UI, or outbound reply implementation is authorized by this closure.
