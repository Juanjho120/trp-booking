# Final-I.6.5 — Admin Contextual Help & Copy Density Polish

## Status

Status: Completed and accepted on 2026-10-09

Accepted Final-I.6.5 feature head: `61ba8ea88bc7b7073f4ef6e733422e7c34b29698`

Owner formal acceptance: PASS on 2026-10-09

Documentation closure commit: documentation-only; it does not replace the accepted feature head.

- Implementation base: `01c8b27d3e648b0653c27cd81a79c60ccbf7b7e0`
- Implementation date: 2026-10-08
- Acceptance date: 2026-10-09
- Scope: Admin contextual help and copy-density polish only.
- Final-I.6.4 remains completed and accepted; this work does not reopen its lazy-loading/tab-cache/financial-tab contract.
- Final-I.7 — Blocked pending official INFILE technical documentation and Test credentials.
- Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX.
- Final-I.9 — Not started / integrated Final-I closure.
- Phase 13 — Blocked / Not started until Final-I closes and is explicitly accepted.

## Scope Boundaries

Runtime changes are limited to Admin presentation/accessibility; no domain/API/schema/migration/provider/cron/dependency/configuration behavior changed.

This subphase reduces always-visible admin explanatory copy through reusable contextual help and a final Reservation-detail Card-header density polish. It preserves existing admin data, workflows, risk warnings, destructive-action guardrails, security notes, financial boundaries, provider behavior, API behavior, Reservation detail lazy loading, tab caching, and financial-tab separation.

The accepted implementation uses the existing `radix-ui` dependency and `lucide-react` icons. No new package was added.

The accepted feature head is `61ba8ea88bc7b7073f4ef6e733422e7c34b29698`. The documentation closure commit that records this acceptance is not the accepted feature head.

## Accepted Contextual-Help Architecture

The accepted shared component is `features/admin/components/admin-contextual-help.tsx`.

Accepted behavior:

```text
desktop hover -> opens contextual help
keyboard focus-visible -> opens contextual help
click/tap -> pins help open
second click/tap -> closes
Escape -> closes
outside click/tap -> closes
```

Frozen architecture:

- Controlled Radix Popover architecture.
- `Popover.Anchor`, not competing trigger state.
- Explicit pinning state.
- `:focus-visible` keyboard handling.
- No pointer/touch double-toggle.
- Radix auto-focus jumps prevented.
- Close timer cleanup.
- Viewport-safe help width.

## Accepted Mobile And PWA Support

Help must not require hover.

Accepted mobile/PWA contract:

- Android/mobile tap works.
- Standalone PWA tap works.
- Mobile interaction target is enlarged.
- Help content remains inside the viewport.
- No horizontal overflow.
- The icon remains visually compact even when the touch target is larger.

## Accepted Accessibility Contract

Accepted contextual-help trigger:

```text
native interactive button
localized aria-label
aria-controls
aria-expanded
aria-haspopup
decorative CircleHelp aria-hidden
```

Accepted localized accessible names:

```text
ES: Ayuda
EN: Help
```

Page/title semantics remain intact.

## Accepted AdminPageHeader Cleanup

`AdminPageHeader` still contains one proper `<h1>`.

Page descriptions are no longer persistent paragraphs. The accepted pattern is:

```text
Page title (?)
```

The previous localized description is available through contextual Help.

Frozen behavior:

- Badge unchanged.
- Actions unchanged.
- Title remains visible.
- Responsive title wrapping preserved.

## Copy Classification

### Category A — Contextual / Supplementary

Moved to contextual Help where appropriate.

Examples:

```text
page descriptions
section descriptions
metric explanations
format guidance
supplementary helper copy
general conceptual explanations
```

### Category B — Operational State / Data

Must remain visible.

Examples:

```text
IDs
statuses
amounts
dates
guest/property information
provider references
email metadata
loading states
empty states
pagination
timestamps
current values
```

### Category C — Risk / Consequence / Security

Must remain visible proactively.

Examples:

```text
financial boundaries
refund/payment consequences
cancellation consequences
availability release effects
date-change operational rules
secret/token security
rotation warnings
destructive-action consequences
FEL/provider limitations
stale-preview warnings
```

Do not require Help interaction to discover Category-C information.

## Component Audit Inventory

| Component | Existing admin copy reviewed | Classification | Action | Reason |
| --- | --- | --- | --- | --- |
| `use-admin-initial-focus-scroll.ts` | No visible copy. | None | No UI change. | Hook only; no density issue. |
| `admin-snackbar.tsx` | Dismissible feedback message shell. | Category B | No UI change. | Runtime feedback must stay visible. |
| `admin-shell.tsx` | Navigation labels, signed-in admin metadata, mobile sheet details. | Category B | No UI change. | Navigation and identity context must remain visible. |
| `admin-reviews-page.tsx` | Page description now flows through `AdminPageHeader`; review status/body/action metadata remains visible. | Category B/C | Header help via shared page header; no local refactor. | Moderation content and dialog consequences stay visible. |
| `admin-reservations-page.tsx` | Page description now flows through `AdminPageHeader`; filter/status/reservation metadata remains visible. | Category B | Header help via shared page header; no local refactor. | Reservation list state must stay visible. |
| `admin-reservation-refund-section.tsx` | Section overview, refund lifecycle/provider notes, authorization/execution/reconciliation dialog descriptions. | Category A/C | Moved only section overview to help. | Refund boundaries and provider/reconciliation consequences remain visible. |
| `admin-reservation-operational-history-section.tsx` | Section overview plus event-specific descriptions and allocation metadata. | Category A/B | Moved section overview to help. | Event descriptions and allocation evidence remain visible. |
| `admin-reservation-lifecycle-adjustment-refund-section.tsx` | Combined lifecycle-adjustment refund overview plus payment/refund entries. | Category A/B/C | Moved the generic date-adjustment overview to help. | Request/payment/refund facts and provider movement notes remain visible. |
| `admin-reservation-detail-page.tsx` | Payment, email-delivery, Zoho correspondence, and pricing-breakdown descriptions; guest/property/payment/email metadata. | Category A/B | Moved generic panel descriptions and Zoho helper to help. | Guest/property/payment IDs, provider references, amounts, timestamps, and email address stay visible. |
| `admin-reservation-date-mutation-section.tsx` | Section overview plus quote, availability, mutation and payment-link notes. | Category A/C | Moved only section overview to help. | Server quote, availability, no-mutation, and payment-link guardrails remain visible. |
| `admin-reservation-date-mutation-decision-controls.tsx` | Decision dialogs and payment email guidance. | Category C | No UI change. | Approval/rejection/payment-email consequences must stay visible. |
| `admin-reservation-cancellation-section.tsx` | Section overview plus policy/refund/availability notes and decision dialogs. | Category A/C | Moved only section overview to help. | Cancellation does not equal refund; policy/refund/availability notes remain visible. |
| `admin-refund-operational-controls.tsx` | Execution/reconciliation dialogs and provider diagnostics. | Category B/C | No UI change. | Provider movement diagnostics and action consequences must stay visible. |
| `admin-record-pagination.tsx` | Pagination counts and controls. | Category B | No UI change. | Current page/range metadata must remain visible. |
| `admin-public-location-page.tsx` | Public-location configuration note, preview note, security note, history description. | Category A/C | Moved preview/history explanatory copy to help. | Public-only/provider/security guidance remains visible. |
| `admin-property-photo-manager.tsx` | Upload format/alt guidance, current ordering note, soft-delete note. | Category A/C | Moved upload/order guidance to help. | Soft-delete warning remains visible. |
| `admin-property-calendar.tsx` | Calendar state, manual blocks, sheet descriptions. | Category B/C | No UI change. | Calendar operations and blocking consequences remain visible. |
| `admin-pricing-manager.tsx` | Base rate, summary, seasonal, length-of-stay, preview explanatory copy; active rules/ranges/rates. | Category A/B/C | Moved generic descriptions to help. | Rule names, ranges, rates, delete/restore notes and preview field guidance remain visible. |
| `admin-pricing-date-range-calendar.tsx` | Date picker controls. | Category B | No UI change. | Date selection is an active control, not explanatory density. |
| `admin-payments-page.tsx` | Page description now flows through `AdminPageHeader`; payment list metadata remains visible. | Category B | Header help via shared page header; no local refactor. | Payment reconciliation data must stay visible. |
| `admin-payment-submission-attempt-history.tsx` | Attempt-history overview plus attempts, statuses, provider references and diagnostics. | Category A/B | Moved generic overview to help. | Attempt counters, statuses, timestamps and diagnostics remain visible. |
| `admin-payment-detail-page.tsx` | Event-history description plus payment/reservation/provider diagnostics. | Category A/B | Moved event-history description to help. | Payment IDs, provider references, SDK messages and timestamps remain visible. |
| `admin-page-header.tsx` | Page title, badge, description and actions. | Category A/B | Replaced persistent description paragraph with contextual help beside the single `<h1>`. | Titles/actions remain visible while explanatory page copy is accessible on demand. |
| `admin-notifications-page.tsx` | History and device section descriptions, notification details and device/install state. | Category A/B | Moved history/device descriptions to help. | Notification content, Zoho email metadata, unread/read state and device actions remain visible. |
| `admin-fel-page.tsx` | FEL draft state, preview notes, certification/provider caveats. | Category B/C | No UI change. | FEL warnings and saved-snapshot/stale-preview notes must remain visible. |
| `admin-dashboard-page.tsx` | Stat descriptions and upcoming-arrivals description; stat counts and arrival rows. | Category A/B | Moved stat/upcoming explanations to help. | Counts, guest/property/date rows and CTAs remain visible. |
| `admin-cron-jobs-page.tsx` | Cron job descriptions, status history, manual execution dialogs. | Category B/C | No UI change. | Operational job descriptions and execution history are active state/context. |
| `admin-catalog-manager.tsx` | Catalog section descriptions plus item slugs/labels/delete dialogs. | Category A/B/C | Moved section descriptions to help. | Slugs, labels and delete dialog details remain visible. |
| `admin-calendar-integrations-page.tsx` | Property card description, inbound/outbound direction descriptions, secret/rotation/import notes. | Category A/C | Moved property/direction explanations to help. | Secret safety, rotation, legacy migration, import URL and safe-failure notes remain visible. |
| `admin-arrival-instructions-editor.tsx` | Content ownership, schedule explanation, security note. | Category A/C | Moved content/schedule explanations to help. | Security note remains visible. |
| `admin-amenities-house-rules-manager.tsx` | Assignment explanation, minimum-required and catalog-management notes. | Category A/C | Moved assignment explanation to help. | Minimum-required/catalog management notes remain visible. |
| `admin-additional-charges-section.tsx` | Section overview, financial-isolation/request/charge boundaries and refund dialogs. | Category A/C | Moved only section overview to help. | Financial isolation, charge/request boundaries and refund/payment consequences remain visible. |
| `admin-accommodation-settings.tsx` | Preparation-window card metadata and allowed-range note. | Category B/C | No UI change. | Last-updated and allowed-range constraints are operational. |
| `admin-accommodation-management.tsx` | Overview/preparation descriptions plus property slugs, capacity, pricing and immutable-boundary note. | Category A/B/C | Moved overview/preparation descriptions to help. | Property slugs, metrics, last-updated and readonly-boundary note remain visible. |
| `admin-accommodation-content-editor.tsx` | Identity/language, public-impact, capacity and time-format descriptions; immutable-fields note. | Category A/C | Moved explanatory section notes to help. | Immutable-field boundary remains visible. |

The complete current Admin component surface was reviewed and classified. Do not remove this audit inventory during future continuity updates.

## Representative Accepted Migrations

Category-A copy was successfully moved to contextual Help across representative Admin surfaces including:

```text
Dashboard
Accommodation content/management
Amenities / House Rules
Arrival Instructions
Calendar Integrations
Catalog
Pricing
Property Photos
Public Location
Notifications
Payment diagnostics/history
Reservation detail
Cancellation
Date changes
Refunds
Additional Charges
Operational History
```

FEL remained intentionally conservative.

## Critical Visible Boundaries

The following remain visible and are not contextual-help-only.

### Additional Charges

```text
financialIsolation
chargeBoundary
requestBoundary
```

### Cancellation

```text
policyCalculation
refundSeparate
availabilityRelease
```

### Date Changes

```text
serverQuote
availability
noMutation
```

### Refunds

```text
separateLifecycle
providerMovements
financial summary
authorization limits
execution/reconciliation consequences
```

### Calendar Integrations

```text
secret safety
legacy migration warning
generate-required state
rotation-required state
rotation warning
```

### Public Location

```text
security/privacy guidance
provider restrictions where operationally necessary
```

### FEL

```text
no provider certification
stale preview
saved snapshot evidence/state
fiscal/provider warnings
```

## Accepted Reservation-Detail Card-Header Polish

The final accepted polish at `61ba8ea88bc7b7073f4ef6e733422e7c34b29698` removed redundant pre-title icon/badge rows from:

```text
Lifecycle
Additional Charges
Refunds
Date changes
Operational history
```

These rows must not return merely as decorative duplication.

Accepted Reservation Card hierarchy, with actual localized Card titles remaining authoritative from existing messages:

```text
Cancelación administrativa (?)                  [+]
Cargos adicionales (?)                          [+]
Reembolsos (...)                         [shield] [$]
Cambios de fechas y extensiones (?)              [+]
Historial operativo de la reservación (?)
```

Top-level tab navigation labels remain separate.

## Accepted Compact Action Buttons

Accepted header actions are icon-only and remain in the same Card-header row as the title/help group.

Lifecycle:

```text
Plus
Tooltip / aria-label:
Registrar solicitud / Record request
```

Additional Charges:

```text
Plus
Crear cargo / Create charge
```

Date changes:

```text
Plus
Registrar cambio o extensión / Record change or extension
```

Refunds may display:

```text
ShieldCheck
Autorizar según política / Authorize by policy

CircleDollarSign
Autorizar extraordinario / Authorize extraordinary
```

Both Refund actions remain independently permission-controlled.

## Frozen Action Semantics

The visual compacting does not change:

```text
canCreateRequest
management.canCreateCharge
canAuthorizeStandard
canAuthorizeExtraordinary
openCreateRequest
openCreateCharge
openAuthorization("STANDARD_POLICY")
openAuthorization("EXTRAORDINARY")
```

Dialogs/sheets and business logic remain unchanged.

## Accepted Responsive Action Layout

Accepted Card-header layout:

```text
title/help group
+
shrink-0 action group
```

on both desktop and mobile.

Frozen behavior:

- Actions do not unnecessarily consume a separate vertical row.
- Mobile targets remain comfortable to tap.
- Title may wrap.
- No horizontal overflow.
- Action icon remains compact.

Accepted target sizing:

```text
mobile approximately 40px
desktop approximately 36px
```

## Accepted Tooltip Distinction

These Card action buttons use normal Tooltip behavior, not `AdminContextualHelp`.

Each icon-only action has:

```text
TooltipContent using existing localized action label
aria-label using the same localized label
```

This distinction remains:

```text
AdminContextualHelp -> explanatory information
Button + Tooltip -> action name
```

## Final-I.6.4 Compatibility

I.6.5 does not reopen or supersede I.6.4.

Preserved accepted I.6.4 behavior:

```text
lightweight Reservation initial shell
lazy top-level tabs
page-scoped cache
Financial Summary / Attempts
active-unit Reload
full loading presentation on Reload
Additional Charges locale stability
Zoho nested tab
Guest Correspondence relocation
contextual notification focus
focus cleanup
F5 -> Reservation
header status synchronization
canonical tab spacing
short top-level navigation labels
```

## Owner Hosted Acceptance Ledger

Contextual-help Hosted validation: PASS.

Accepted evidence covered:

```text
desktop hover
desktop click/pinning
keyboard focus
Escape
outside dismissal
Android/mobile tap
standalone PWA touch
responsive help width
ES/EN
Category B visibility
Category C visibility
reduced Admin copy density
```

Final Reservation-detail Card-header density validation: PASS on 2026-10-09.

Accepted evidence covered:

```text
Lifecycle redundant pre-title removed
Additional Charges redundant pre-title removed
Refunds redundant pre-title removed
Date changes redundant pre-title removed
Operational History redundant pre-title removed

Lifecycle compact icon action
Additional Charges compact icon action
Date changes compact icon action
Refund dual compact icon actions

desktop layout
mobile layout
tooltips
aria-labels
same dialogs/workflows
no overflow
```

Owner formal acceptance: PASS on 2026-10-09.

## Validation Ledger

Final-I.6.5 accepted validation:

```text
npm run final-i:validate
PASS — 118/118

npm run final-h:validate
PASS — 20/20

npm run lint
PASS

npm run build
PASS

git diff --check
PASS
```

Accepted feature-head Vercel deployment: SUCCESS.

`vercel.json` remains exactly:

```json
{
  "crons": []
}
```

## Current State

```text
Final-I.6.5 — Completed and accepted on 2026-10-09
Accepted Final-I.6.5 feature head: 61ba8ea88bc7b7073f4ef6e733422e7c34b29698

Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```

Final-I remains Active because I.7/I.8/I.9 are not complete.

## 2026-10-09 — Final-I.6.5 Completed And Accepted

The owner completed Hosted validation for both the Admin contextual-help/copy-density implementation and the Reservation-detail Card-header density polish, then formally accepted the complete Final-I.6.5 package on 2026-10-09.

Accepted Final-I.6.5 feature head: `61ba8ea88bc7b7073f4ef6e733422e7c34b29698`

Owner formal acceptance: PASS on 2026-10-09.

The documentation closure commit that records this acceptance must not replace the accepted feature head.
