# 122 — Pre-Phase-12 Package A Public-Flow and UI Corrections

## Implementation status

```text
Track: Pre-Phase-12 Improvement Track
Package: A — Immediate public-flow and UI corrections
Status: Completed and accepted
Implementation base: 5e2902df9a74057133bfa2f7f151c4ba3492c9f2
Initial implementation commit: 2d98a51afae4a1c3cfbc6a7cbafe600303a2c0ec
Accepted head: ec1e6ce7f43099864788f28ae30a87214afe554d
Accepted on: 2026-08-05
Prepared on: 2026-08-05
Current phase: No active implementation phase
Phase 11: Completed and accepted
Phase 12: Not started and not activated
```

## Purpose

Package A removes the public pending-hold dead end and completes the bounded UI corrections approved before Phase 12. It does not activate production-readiness behavior, change pricing policy, add a migration, or reopen Phase 11.

## 1. Controlled pending-hold replacement

The public reservation form now treats a created `PENDING_PAYMENT` reservation as persisted state rather than disposable UI state.

```text
- The pending-reservation card remains visible after creation.
- Form fields and quote recalculation are locked while the active hold is retained.
- The Tilopay checkout remains mounted and available.
- A styled Sheet provides the explicit edit/release action.
- Releasing the hold changes the same Reservation to EXPIRED.
- The Reservation row, Payment rows, and diagnostics are retained.
- The current Reservation.updatedAt value acts as the optimistic-concurrency fence.
- Any existing Payment attempt, a non-pending Reservation, stale state, or a missing Reservation rejects the release.
- A serializable conflict is retried once and then fails safely.
- After a successful release, blocked dates are reloaded and the existing form values remain available for correction.
```

The public route remains `app/api/reservations/pending-hold/route.ts`; `POST` preserves existing creation behavior and `DELETE` performs the bounded release transition.

No hard delete, second active hold, manual payment state change, or payment-confirmation shortcut is introduced.

## 2. Check-out time in guest templates

`RESERVATION_CONFIRMED` and `ARRIVAL_INSTRUCTIONS` now render the accommodation check-out time.

```text
Configured check-out time:
- normalized and formatted for the guest locale

Missing check-out time:
- renders the centralized localized email value `Libre` / `Flexible`
```

The implementation reads `checkOutTime` and `flexibleCheckOut` directly from the centralized email catalog in `messages/es.ts` and `messages/en.ts`; no visible email copy is hardcoded in the templates.

## 3. Branded 404 page

`app/not-found.tsx` replaces the native Next.js not-found surface with the existing public brand shell:

```text
- SiteHeader
- responsive branded card
- localized existing not-found metadata copy
- home action
- accommodations action
- SiteFooter
```

The technical `404` status code is displayed as a status identifier. No framework diagnostic content is exposed to the visitor.

## 4. Development indicator

`next.config.ts` sets:

```ts
devIndicators: false
```

This removes the floating Next.js development indicator. It does not suppress compiler errors, runtime errors, logs, or production diagnostics.

## 5. Uniform Tilopay auto-scroll

The form-ready scroll behavior is centralized in:

```text
features/payments/components/payment-form-auto-scroll.ts
```

The same helper is used by:

```text
- initial public reservation checkout
- retry payment page
- lifecycle-adjustment payment-link page
```

The helper centers the ready checkout in the viewport and respects `prefers-reduced-motion`.

## Persistence and migration impact

```text
Prisma schema change: No
Migration: No
Seed change: No
New dependency: No
Environment-variable change: No
```

`Reservation.updatedAt` and the existing statuses provide the required concurrency and lifecycle boundary.

## Preserved contracts

```text
- Payment approval remains server-validated and payment-driven.
- An EXPIRED Reservation cannot be confirmed by a later rejected or stale flow.
- Availability and preparation buffers remain status- and expiration-driven.
- No Reservation, Payment, Refund, notification, or diagnostic record is deleted.
- No card data reaches the TRP Booking backend.
- No raw Prisma or Tilopay error is exposed.
- No native alert(), confirm(), or prompt() is added.
- Phase 12 remains Not started.
- Package D remains deferred.
```

## Required acceptance matrix

### Pending hold

1. Create a pending reservation and confirm the card and Tilopay checkout remain visible.
2. Confirm every form control and quote action is locked while the hold is active.
3. Close the edit Sheet and confirm no database or UI state changes.
4. Confirm release and verify the original Reservation becomes `EXPIRED`.
5. Verify the same Reservation and its Payment history remain in admin.
6. Verify the released dates become available after blocked-date refresh.
7. Modify guest data or dates and create a new pending reservation successfully.
8. Verify no second active hold exists for the original dates.
9. Attempt release with stale `updatedAt` and verify safe rejection.
10. Prepare or attempt payment, then verify hold release is rejected even while the Payment is still pending, rejected, or failed.
11. Attempt release for a non-pending Reservation and verify safe rejection.
12. Repeat an already completed release and verify idempotent `EXPIRED` behavior.

### Emails

13. Render `RESERVATION_CONFIRMED` in ES with configured check-out time.
14. Render `RESERVATION_CONFIRMED` in EN without configured check-out time.
15. Render `ARRIVAL_INSTRUCTIONS` in ES with configured check-out time.
16. Render `ARRIVAL_INSTRUCTIONS` in EN without configured check-out time.
17. Verify HTML and plain-text output contain the same check-out value.

### UI and checkout

18. Open a missing public route in ES and EN and verify the branded 404 page.
19. Verify home and accommodation actions work on desktop and mobile.
20. Verify the floating Next.js `N` indicator is absent in local development.
21. Verify compiler and runtime errors are still observable.
22. Verify initial checkout scrolls when Tilopay becomes ready.
23. Verify retry checkout scrolls when Tilopay becomes ready.
24. Verify lifecycle-adjustment checkout scrolls when Tilopay becomes ready.
25. Verify reduced-motion preference avoids smooth animation.
26. Verify keyboard navigation, focus behavior, responsive layout, and console output.

## Completion gate

Package A was accepted after the user completed the functional checks and confirmed the final corrected implementation was working at `ec1e6ce7f43099864788f28ae30a87214afe554d`. The accepted path includes the initial implementation plus the type-guard, centralized email-copy, accessible Sheet label, edit-specific error, countdown hydration, and development-indicator corrections.
