# 216 - Final-I.6.2: Admin UX Navigation, Accordions and Pagination Polish

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.2 - Admin UX Navigation, Accordions & Pagination Polish
Status: Implementation completed; Hosted owner validation pending
Registration date: 2026-10-06
Registration base: c4b44620b946ca4252c952073db51bbdd1a6c512
Registration base commit: docs(final-i): close Final-I.6.1
Final-I.6.1 status: Completed and accepted on 2026-10-06
Accepted Final-I.6.1 feature head: 4d8a1dd5eb2f2eaaadf43bd8b97d7dd1df6e500e
Final-I.6.1 implementation and acceptance record: docs/215-final-i-6-1-interim-operational-hardening.md
Final-I.6.2 implementation record: docs/216-final-i-6-2-admin-ux-navigation-accordions-pagination-polish.md
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.2 is a bounded Admin UX polish package registered after the accepted Final-I.6.1 closure. It does not reopen Final-I.6.1, does not change FEL fiscal/domain behavior, does not start Final-I.7, and does not introduce Production or Phase 13 work.

## Scope Implemented

```text
A - Additional Charges nested tabs compact responsive polish
B - Admin Reviews list single/collapsible accordion conversion
C - Admin Dashboard upcoming-arrival reservation detail action
D - Admin Reservations pagination size reduction to 5
E - Shared Admin accordion trigger visual hierarchy polish
F - Admin shell desktop/mobile navigation-only scrolling
```

### A - Additional Charges Tabs

The internal Additional Charges nested tabs now reuse the compact responsive tab pattern already accepted for Email Delivery inside the Admin reservation detail page:

```text
- wrapper: -mx-1 overflow-x-auto px-1 pb-2
- TabsList: inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0
- triggers: min-h-10 shrink-0
```

The default tab remains `charges`. The Charges and Payment Requests tab values, localized labels, content boundaries, selection behavior, payment-request actions, and nested refund-history behavior remain unchanged.

### B - Admin Reviews Accordion

`/admin/reviews` now presents review rows in a single, collapsible, closed-by-default accordion. Each item is keyed by `review.id`. The header summary includes moderation status, star rating, guest display name, property name, and submitted timestamp.

Moderation actions and reservation links remain outside the accordion trigger, inside the expanded content. Existing filters, pagination, moderation Sheet, optimistic busy state, concurrency fence, localized copy, and server behavior are preserved.

### C - Dashboard Reservation Action

Each Admin Dashboard upcoming-arrival row now includes a localized action:

```text
ES: Ver reservación
EN: View reservation
```

The action links directly to `/admin/reservations/{reservationId}` using the existing reservation id. No dashboard query, aggregation, or data-loading behavior changed.

### D - Reservations Pagination

The Admin Reservations server-side page size is reduced from 20 to 5. Existing filtering, search, count, safe page, skip/take, and total page calculation remain server-side and unchanged except for the smaller `PAGE_SIZE` constant.

### E - Accordion Header Hierarchy

The shared design-system Accordion trigger now provides a subtle default hierarchy for Admin accordion rows:

```text
- default: bg-muted/40
- hover: hover:bg-muted/50
- open: data-[state=open]:bg-muted/50
```

Per-use Admin accordion hover overrides from the old `hover:bg-muted/30` / `hover:bg-muted/40` pattern were removed where they would conflict with the shared visual hierarchy. This keeps the accordion treatment consistent without adding strong fills.

### F - Admin Shell Navigation Scroll

The desktop Admin shell sidebar now keeps the brand/header and account/footer fixed while only the navigation list scrolls. The mobile Sheet mirrors that structure: header fixed, navigation scrollable, account actions fixed. Overflow is not placed on the whole sidebar/sheet body.

## Frozen Boundaries

```text
- No Final-I.7 implementation.
- No INFILE transport, authentication, certification, cancellation, credit-note, retry, contingency, PDF, XML, or provider lookup behavior.
- No FEL runtime, schema, migration, or provider behavior changes.
- No Final-I.8 or Final-I.9 work.
- No Phase 13 or Production activation.
- No dependency, environment, scheduler, cron, or vercel.json change.
- No notification UX, email URL cleanup, or Final-I.6.1 scope reopened.
```

## Hosted Owner Validation Matrix

```text
Pending - desktop Admin sidebar with fixed header/footer and nav-only scrolling
Pending - mobile Admin menu Sheet with fixed header/footer and nav-only scrolling
Pending - Additional Charges nested tabs responsive behavior
Pending - Admin Reviews single/collapsible accordion behavior and action placement
Pending - Admin Dashboard upcoming-arrival reservation detail action
Pending - Admin Reservations pagination with 5 rows per page
```

Final-I.6.2 must not be marked accepted until Hosted owner validation and explicit owner acceptance are recorded.

## Validation Ledger

```text
Final-I.6.2 implementation validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 85/85
- npm run final-h:validate - PASS, 20/20; executed outside the sandbox because the tsx gates have the known sandbox-only uv_os_get_passwd ENOMEM failure mode
- npm run lint - PASS
- npm run build - initial sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Current Status

```text
Final-I.6.2 — Implementation completed; Hosted owner validation pending
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```
