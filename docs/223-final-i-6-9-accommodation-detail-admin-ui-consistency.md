# Final-I.6.9 - Accommodation Detail Admin UI Consistency

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track addendum
Package: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.9 - Accommodation Detail Admin UI Consistency
Status: Implementation completed; Hosted owner validation pending
Registration date: 2026-10-13
Implementation base: fd85bfa17473c93271cf70cef36c69189074651d
Implementation head: 32d9af56bffa33085554fd73378bbf859663cb2d
Pre-Hosted responsive header hardening: recorded by the follow-up hardening commit
Pre-Hosted header help icon position fix: recorded by this follow-up correction
Final-I.6.8 status: Completed and accepted on 2026-10-12 at f0c38cf18d8c470f0ba184010be2e6aeeecf6980
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.9 is a bounded Admin UI consistency pass for the accommodation detail management pages. It does not reopen the accepted Final-I.6.8 calendar package, does not start Final-I.7, and does not change Phase 13 state.

## Implemented Scope

- `AdminPageHeader` now exposes a reusable `inlineActions` variant. The default header layout remains unchanged for existing Admin pages; the new variant keeps the title, contextual `?` help affordance, and action buttons in one responsive row when space allows.
- The inline header variant wraps actions below the title/help group on narrow or constrained widths without truncating long accommodation names.
- The pre-Hosted responsive hardening splits the inline title/help class from the default title/help class. The follow-up Hosted issue fix removes the former expansive `flex-1` title/help layout and renders the inline title plus contextual `?` help control in the same inline flow with a fixed small gap, so the icon stays immediately after the visible title text instead of drifting toward the action buttons.
- Inline actions are an independent responsive group: they align to the right when space allows, move below the title/help group when constrained, and do not insert expandable spacing between the title and its help affordance.
- The inline action group remains a wrapping flex row so two-button headers such as Photos and Amenities/Rules can wrap between buttons without causing horizontal overflow on narrow screens.
- The variant was applied only to:
  - `features/admin/components/admin-accommodation-content-editor.tsx`
  - `features/admin/components/admin-pricing-manager.tsx`
  - `features/admin/components/admin-property-photo-manager.tsx`
  - `features/admin/components/admin-amenities-house-rules-manager.tsx`
  - `features/admin/components/admin-arrival-instructions-editor.tsx`
- The five redundant header badges were removed from those accommodation detail pages only:
  - `Contenido publico bilingue` / `Bilingual public content`
  - `Precios por alojamiento` / `Per-accommodation pricing`
  - `Galeria publica` / `Public gallery`
  - `Contenido publico estructurado` / `Structured public content`
  - `Correo previo al check-in` / `Pre-check-in email`
- The content-editor immutable-fields info block and photo-manager soft-delete info block were removed as requested.
- Operational badges and warnings remain visible, including property status, photo counts, cover/order labels, delete confirmation text, arrival-instruction enabled/disabled state, and assignment requirements.
- Pricing now has a fourth `Vista previa` / `Preview` tab. The existing `PricingPreviewCard` moved out of Overview into that dedicated tab without duplicating pricing logic.
- Pricing preview dates and calculated results remain parent component state, so preview state survives tab changes. Pricing mutation behavior still invalidates preview state through the existing `setPreview(null)` paths.
- Pricing tab navigation now uses the same responsive Admin horizontal overflow pattern as the accepted tab work, and the public availability page keeps its accepted subtle visual tab variant.

## Preserved Boundaries

Final-I.6.9 does not modify Prisma schema, migrations, database data, API contracts, server actions, reservation availability, Airbnb import/export behavior, pricing arithmetic, payment/refund/FEL/Tilopay/email/notification business logic, cron jobs, `vercel.json`, dependencies, environment variables, Production resources, Final-I.7, Final-I.8, Final-I.9, or Phase 13.

The accommodation detail changes are presentation-only. They do not alter accommodation content validation, pricing preview calculation, pricing rule persistence, photo upload/delete semantics, amenity/rule assignment persistence, arrival-instruction scheduling, authentication, authorization, or audit behavior.

## Test Coverage

Final-I.6.9 adds `tests/final-i/i69-accommodation-detail-admin-ui-consistency.test.ts`, registered through `tests/final-i/run.ts`.

The new coverage verifies:

- `AdminPageHeader` has a reusable inline-action variant while preserving the default layout for other Admin pages.
- Inline title/help behavior is covered for short and long ES/EN titles at representative 320, 375, 768, and 1280 pixel widths through deterministic responsive class assertions. The regression now rejects `flex-1`, `justify-between`, `ml-auto`, and full-width expansion in the title/help contract, verifies the inline `h1` plus fixed-gap `inline-flex` help wrapper, and keeps the actions as a separate wrapping group. The repository does not include a browser layout test harness or Playwright dependency for this suite; real geometric spacing remains a Hosted owner-validation item.
- The five target accommodation detail editors use the inline variant and no longer pass `badge={copy.badge}`.
- Title/help grouping and wrapped header actions remain centralized in `AdminPageHeader`.
- Back actions and destination links are preserved, including the Pricing `ArrowLeft`, the Photos content-link action, and the Amenities catalog action.
- The content immutable-fields block and photo soft-delete block are removed, while operational controls, badges, delete warnings, and save controls remain.
- Pricing exposes four localized tabs, including `Vista previa` / `Preview`.
- `PricingPreviewCard` appears only inside `TabsContent value="preview"` and is no longer rendered in Overview.
- Pricing preview state and existing pricing endpoints/actions remain unchanged.
- Public availability tabs keep the accepted subtle visual variant.

Historical Final-I.6.5 and Final-I.6.7 tests were updated narrowly so they continue to protect shared contextual help and operational badge behavior while allowing the five I.6.9 accommodation detail badges to be removed.

## Validation Ledger

After the help-icon position fix, the required validation was rerun with the following results:

```text
npm run final-i:validate — PASS, 156/156 with a temporary Node preload workaround for the local Windows uv_os_get_passwd/userInfo failure
npm run final-h:validate — PASS, 20/20 with the same temporary Node preload workaround
npm run final-g:validate — PASS, 48/48 with the same temporary Node preload workaround
npm run lint — PASS
npm run build — initial sandbox run failed fetching Google Fonts; approved network rerun PASS with Next slow-filesystem warning only
git diff --check — PASS
```

No dedicated pricing/accommodations npm validation script exists in `package.json`; the applicable coverage is included in `npm run final-i:validate` plus lint/build.

## Current State After Implementation

```text
Final-I.6.8 — Completed and accepted on 2026-10-12 at f0c38cf18d8c470f0ba184010be2e6aeeecf6980
Final-I.6.9 — Implementation completed; Hosted owner validation pending
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 — Not started / integrated Final-I closure
Phase 13 — Blocked / Not started until Final-I closes
```

Final-I.6.9 is not accepted yet. Hosted owner validation and explicit owner acceptance remain pending.
