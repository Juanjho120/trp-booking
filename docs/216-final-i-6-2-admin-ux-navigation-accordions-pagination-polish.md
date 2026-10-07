# 216 - Final-I.6.2: Admin UX Navigation, Accordions and Pagination Polish

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.2 - Admin UX Navigation, Accordions & Pagination Polish
Status: Completed and accepted on 2026-10-07
Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9
Registration date: 2026-10-06
Registration base: c4b44620b946ca4252c952073db51bbdd1a6c512
Registration base commit: docs(final-i): close Final-I.6.1
Final-I.6.1 status: Completed and accepted on 2026-10-06
Accepted Final-I.6.1 feature head: 4d8a1dd5eb2f2eaaadf43bd8b97d7dd1df6e500e
Final-I.6.1 implementation and acceptance record: docs/215-final-i-6-1-interim-operational-hardening.md
Final-I.6.2 implementation and acceptance record: docs/216-final-i-6-2-admin-ux-navigation-accordions-pagination-polish.md
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
G - Admin Notifications accordion controlled-state correction
H - Admin Notifications server-side pagination with 10 items per page
I - Financial notification contextual Reservation focus links and exact-item scroll
J - Notification Open action marks unread notifications read before navigation
K - Admin identity relocation to the desktop header beside the locale switcher
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

### G - Notifications Accordion Controlled State

The Admin Notification Center accordion now stays fully controlled with a stable empty-string closed value. It no longer transitions between a concrete notification id and `undefined`, so the accepted single/collapsible behavior remains predictable:

```text
- no item opens by default unless a valid notification deep link requests one
- one click closes the currently open notification
- opening B closes A
- closing B leaves all notifications closed instead of restoring A
```

Accordion expansion itself still does not mark a notification read.

### H - Notification Center Pagination

Notification Center retrieval now uses canonical server-side pagination with `ADMIN_NOTIFICATION_CENTER_PAGE_SIZE = 10`, Prisma `count`, `skip`, `take`, and stable ordering by `createdAt DESC, id DESC`. `unreadCount` remains global across all Admin notifications, not limited to the visible page.

The route supports `/admin/notifications?page=N`, normalizes unsafe page input to page 1, clamps overly large pages to the real final page, and renders localized Previous / Next controls below the accordion.

When a Push or deep link uses `/admin/notifications?notification=<id>`, the server resolves the requested notification's canonical page by counting rows before it under the same ordering. The returned page contains at most 10 rows and the target appears only once; the implementation no longer prepends the target to an unrelated page.

### I - Financial Notification Focus Links

Financial Admin notifications now derive contextual Reservation-detail targets from existing accepted `deduplicationKey` identities, without a schema migration:

```text
ADDITIONAL_CHARGE_PAID + admin-notification/additional-charge-paid/<guestPaymentRequestId>
-> /admin/reservations/<reservationId>?focus=additionalChargePaymentRequest&focusId=<guestPaymentRequestId>

LIFECYCLE_ADJUSTMENT_PAID + admin-notification/lifecycle-adjustment-paid/<lifecycleRequestId>
-> /admin/reservations/<reservationId>?focus=lifecycleAdjustment&focusId=<lifecycleRequestId>

REFUND_PROCESSED + admin-notification/refund-processed/<refundId>
-> /admin/reservations/<reservationId>?focus=refund&focusId=<refundId>
```

The focus contract is centralized in `lib/admin/reservation-detail-focus.ts`. It validates focus kinds, bounds focus ids, encodes target URLs, and falls back to the stored safe Admin target path if the notification type or deduplication key is malformed. This works for existing notification rows because it derives the focus at serialization time.

Reservation detail now parses bounded `focus` / `focusId` query params and initializes the correct top-level tab once:

```text
additionalChargePaymentRequest -> Additional Charges
lifecycleAdjustment -> Changes/Extensions
refund + ADDITIONAL_CHARGE -> Additional Charges
refund + other current authorization types -> Refunds
unknown or invalid focus -> Reservation
```

The Admin can still manually switch tabs after the initial landing.

Focused accordions now open and scroll to the exact operational item:

```text
- Additional Charge paid: Payment Requests tab, exact GuestPaymentRequest accordion
- Lifecycle Adjustment paid: containing Changes/Extensions page, exact lifecycle request accordion
- Refund processed: exact standard, grouped, lifecycle-adjustment, or Additional Charge refund item
```

Initial focus scrolling waits for the tab/accordion layout to commit, respects `prefers-reduced-motion`, uses `scrollIntoView({ block: "start" })`, and runs at most once per focus key.

### J - Open Marks Notification Read

The Notification Center `Open` action now uses the existing authenticated read endpoint before navigating. For unread notifications it marks the item read, updates local state, and decrements the global unread count once. If the read mutation unexpectedly fails, navigation to the safe Admin target still proceeds.

The manual `Mark as read` action remains available for unread notifications, and accordion expansion alone still does not mark anything read.

### K - Admin Identity Relocation

The desktop Admin shell now renders the logged-in Admin identity card in the sticky header immediately to the left of the ES/EN locale switcher. The desktop sidebar footer keeps only `View public site` and `Sign out`, preserving the fixed footer and nav-only scrolling structure.

On mobile, the full identity card remains inside the Admin Sheet footer above the same actions so the logged-in account remains visible without crowding the narrow header. Public site shell/header files are not changed.

Hosted validation confirmed Workstreams A-K. The final Workstream K visual finding was that the desktop Admin identity card beside ES/EN was taller than the LocaleSwitcher because the Admin email occupied a second visible line. The accepted correction keeps the desktop identity immediately left of ES/EN as a compact single-line name control with `h-10` height aligned to the locale switcher, moves the Admin email into a Radix tooltip on hover/focus, and preserves the mobile Sheet full identity card with visible Admin name and email.

## 2026-10-07 — Final-I.6.2 Completed And Accepted

```text
Owner Hosted validation: PASS
Owner formal acceptance: PASS on 2026-10-07
Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9
Documentation closure commit: this documentation-only closure commit; it records formal acceptance and does not replace the accepted feature head.
```

Final-I.6.2 is fully completed and accepted. The accepted feature head remains `d936983edd22607919148f871e3ba339ab4a4ed9`; the documentation closure commit generated by this task is only the formal acceptance record.

Final Workstream outcomes:

```text
A - Additional Charges compact tabs: Completed; Hosted owner validation PASS
B - Reviews single accordion: Completed; Hosted owner validation PASS
C - Dashboard Upcoming Arrivals action: Completed; Hosted owner validation PASS
D - Reservations pagination: Completed; Hosted owner validation PASS; PAGE_SIZE = 5
E - Accordion visual hierarchy: Completed; Hosted owner validation PASS
F - Admin sidebar scrolling: Completed; Hosted owner validation PASS
G - Notification accordion controlled state: Completed; Hosted owner validation PASS; closed controlled value = ""
H - Notification Center pagination: Completed; Hosted owner validation PASS; ADMIN_NOTIFICATION_CENTER_PAGE_SIZE = 10
I - Financial notification contextual navigation: Completed; Hosted owner validation PASS
J - Open automatically marks read: Completed; Hosted owner validation PASS
K - Admin identity relocation and compact tooltip refinement: Completed; Hosted owner validation PASS on 2026-10-07
```

Accepted Workstream A behavior: Charges / Payment Requests nested tabs use compact width, responsive horizontal behavior is preserved, and content/state behavior is preserved.

Accepted Workstream B behavior: Reviews use `Accordion type="single" collapsible`, are closed by default, opening another Review closes the previous one, the current Review can collapse, and moderation/Open Reservation actions are preserved outside the trigger.

Accepted Workstream C behavior: each Upcoming Arrival exposes the localized View Reservation action and opens the correct Reservation detail.

Accepted Workstream D behavior: Admin Reservations uses canonical server-side `PAGE_SIZE = 5` while preserving search/property/status filters and Prisma pagination.

Accepted Workstream E behavior: shared Admin accordion treatment remains `default: bg-muted/40`, `hover: bg-muted/50`, and `open: bg-muted/50`, preserving existing accordion behavior.

Accepted Workstream F behavior: desktop keeps a fixed Admin brand/header, scrollable navigation only, and fixed footer actions; mobile keeps a fixed Sheet header, scrollable navigation only, and fixed identity/actions footer.

Accepted Workstream G behavior: the notification accordion uses `""` as the closed controlled value; `A -> close A`, `A -> B -> close B -> all closed`, and previous items never reopen automatically.

Accepted Workstream H behavior: notification-center pagination preserves server-side count/skip/take, `createdAt DESC, id DESC`, global unread count, targeted notification canonical page resolution, and maximum 10 rendered items per page.

Accepted Workstream I behavior: financial notification focus uses `focus=refund`, `focus=additionalChargePaymentRequest`, and `focus=lifecycleAdjustment`; `REFUND_PROCESSED`, `ADDITIONAL_CHARGE_PAID`, and `LIFECYCLE_ADJUSTMENT_PAID` open the correct Reservation context, exact accordion item, necessary nested/grouped item, and perform one-time scroll. Existing notification compatibility remains based on canonical deduplication keys, with no schema change.

Accepted Workstream J behavior: Open uses the existing read endpoint, updates local read state, decrements unread count once, then navigates. If read persistence fails, navigation still proceeds. Manual Mark as read remains available, and accordion expansion alone does not mark notifications read.

Accepted Workstream K behavior: desktop renders `[ Admin Name ] [ ES / EN ]`; the name-only compact identity uses `h-10` visual height aligned with LocaleSwitcher; the email is available in an accessible Radix tooltip on hover and keyboard focus; no duplicate identity appears in the desktop sidebar; mobile keeps full name + email visible in the Admin Sheet; View public site and Sign out remain available; and public layout remains unaffected.

## Frozen Boundaries

```text
- No Final-I.7 implementation.
- No INFILE transport, authentication, certification, cancellation, credit-note, retry, contingency, PDF, XML, or provider lookup behavior.
- No FEL runtime, schema, migration, or provider behavior changes.
- No Final-I.8 or Final-I.9 work.
- No Phase 13 or Production activation.
- No dependency, environment, scheduler, cron, or vercel.json change.
- No email URL cleanup, FEL/INFILE behavior, Final-I.6.1 scope, Push service-worker behavior, or notification type/persistence contract reopened.
```

## Hosted Owner Validation Matrix

```text
PASS - desktop Admin sidebar with fixed header/footer and nav-only scrolling
PASS - mobile Admin menu Sheet with fixed header/footer and nav-only scrolling
PASS - Additional Charges nested tabs responsive behavior
PASS - Admin Reviews single/collapsible accordion behavior and action placement
PASS - Admin Dashboard upcoming-arrival reservation detail action
PASS - Admin Reservations pagination with 5 rows per page
PASS - Notifications accordion one-click collapse and A -> B -> close B leaves all closed
PASS - Notifications pagination with maximum 10 items per page, Previous / Next, global unread count, and targeted Push notification landing on its canonical page
PASS - Refund Processed Open marks read, opens the correct Reservation contextual tab, opens the exact Refund accordion item, and scrolls to it
PASS - Additional Charge Paid Open marks read, opens Additional Charges, selects Payment Requests, opens the exact request, and scrolls to it
PASS - Lifecycle Adjustment Paid Open marks read, opens Changes/Extensions, opens the exact lifecycle request, and scrolls to it
PASS - Manual Mark as read still works without opening the target
PASS - compact desktop Admin identity visually aligns with ES/EN
PASS - email tooltip works on hover
PASS - email tooltip works on keyboard focus
PASS - mobile full identity remains intact
PASS - public site layout remains unaffected
```

The entire Final-I.6.2 Hosted validation matrix is PASS. Final-I.6.2 owner acceptance is recorded above.

## Validation Ledger

```text
Final-I.6.2 documentation acceptance closure validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 96/96
- npm run final-h:validate - run outside the sandbox after the Final-I tsx sandbox ENOMEM blocker; PASS, 20/20
- npm run lint - PASS
- npm run build - initial sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Current Status

```text
Final-I.6.2 — Completed and accepted on 2026-10-07
Accepted Final-I.6.2 feature head — d936983edd22607919148f871e3ba339ab4a4ed9
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```
