# Final-I.6.5 — Admin Contextual Help & Copy Density Polish

## Status

Final-I.6.5 — Implementation completed; Hosted owner validation pending.

- Implementation base: `01c8b27d3e648b0653c27cd81a79c60ccbf7b7e0`
- Implementation date: 2026-10-08
- Scope: Admin contextual help and copy-density polish only.
- Final-I.6.4 remains completed and accepted; this work does not reopen its lazy-loading/tab-cache/financial-tab contract.
- Final-I.7 — Blocked pending official INFILE technical documentation and Test credentials.
- Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX.
- Final-I.9 — Not started / integrated Final-I closure.
- Phase 13 — Blocked / Not started until Final-I closes and is explicitly accepted.

## Scope Boundaries

Runtime changes are limited to Admin presentation/accessibility; no domain/API/schema/migration/provider/cron/dependency/configuration behavior changed.

This subphase only reduces always-visible admin explanatory copy by adding reusable contextual help. It preserves existing admin data, workflows, risk warnings, destructive-action guardrails, security notes, financial boundaries, provider behavior, API behavior, reservation detail lazy loading, tab caching, and financial-tab separation.

The implementation uses the existing `radix-ui` dependency and `lucide-react` icons. No new package was added.

## Implementation Summary

- Added `features/admin/components/admin-contextual-help.tsx` as a reusable localized admin help trigger.
- The trigger is icon-only (`CircleHelp`), uses localized accessible labels (`Ayuda` / `Help`), and is available through pointer hover, keyboard focus, click, and tap via Radix Popover.
- The shared help primitive was hardened to use a controlled Radix Popover Anchor, explicit click/tap pinning, focus-visible keyboard opening, Escape/outside dismissal through `onOpenChange`, prevented Radix auto-focus jumps, timer cleanup on unmount, a larger mobile touch target, and viewport-safe popover width.
- Refactored `features/admin/components/admin-page-header.tsx` so page-level descriptions are no longer persistent paragraphs; they are available through contextual help beside the single `<h1>`.
- Moved only Category A explanatory copy behind contextual help in high-density admin surfaces.
- Kept Category B operational metadata visible, including ids, timestamps, statuses, provider references, guests/properties, counts, amounts, and email metadata that admins need for work.
- Kept Category C warnings, consequences, security/privacy notes, financial boundaries, refund/payment caveats, destructive-action descriptions, and provider/secret notes visible.

## Copy Classification

- Category A: explanatory/orienting copy that can safely move behind contextual help without hiding the current state or consequences.
- Category B: operational metadata that must remain visible for repeated admin work and reconciliation.
- Category C: warnings, risk/consequence copy, security boundaries, privacy notes, destructive-action guidance, and financial/provider safeguards that must remain visible.

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

## Expected Hosted Owner Validation

Hosted owner validation remains pending and should verify:

- Desktop: help triggers appear beside admin headings and open through hover/focus/click.
- Intermediate/tablet widths: help triggers remain reachable without wrapping over controls.
- Android PWA/touch: help opens on tap and does not require hover.
- Keyboard: help triggers are tabbable, labelled, and expose help text through focus/click.
- Spanish and English: accessible labels are localized as `Ayuda` / `Help`.
- Additional Charges, Cancellation, Date Changes, Refunds, FEL, Calendar secrets/rotation and other risk-boundary text still appears visibly where admins make decisions.

## Validation Ledger

Final-I.6.5 implementation validation:
- npm run final-i:validate - PASS, 117/117
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
- vercel.json confirmation - PASS; remains exactly `{ "crons": [] }`

## Current State

- Final-I.6.5 — Implementation completed; Hosted owner validation pending.
- Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials.
- Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX.
- Final-I.9 — Not started / integrated Final-I closure.
- Phase 13 — Blocked / Not started.
