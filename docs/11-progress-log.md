# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9.11 — Admin MVP and Brand Identity Completion
Current subphase: 9.11.4 Amenities and house rules
Current focus: define bilingual amenity and house-rule administration after completing property photo management
Last updated: 2026-07-20
Last completed subphase: 9.11.3 Property photo management
9.11.3 base commit: 9bc885750833c7e1bb964956fc4c86d70dfc4414
9.11.3 implementation commit: pending local validation and commit
```

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

Important decisions:

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The guest remains inside the TRP Booking experience for the main payment flow.
The backend calls the Tilopay SDK login endpoint server-side.
The frontend receives only a safe SDK access token and initialization configuration.
Payment.providerReference stores the unique orderNumber sent to Tilopay.
TRP Booking does not read, store, log, or send card number, CVV, expiration, or card tokens to its backend.
No regular-payment webhook is assumed for the current non-recurrent hosted payment flow.
```

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation Foundation

Status: **Completed**

Important decisions:

```text
The redirect route resolves Payment through providerReference/orderNumber.
Tilopay consult runs server-side.
OrderHash V2 is validated with HMAC-SHA256.
Payment.status can become APPROVED, REJECTED, or FAILED.
Redirect query parameters alone are not treated as final payment truth.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

Important decisions:

```text
Reservation confirmation is payment-driven.
Only APPROVED payments can confirm an active PENDING_PAYMENT reservation.
The confirmation service is idempotent.
Reservation.confirmedAt is set and Reservation.expiresAt is cleared.
Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 — Tilopay Sandbox Hardening, Retryable Payment Errors, Status Localization, and Checkout UX

Status: **Completed**

Completed behavior:

```text
Strict Tilopay OrderHash validation was hardened.
Tilopay preflight validation was added before starting payment.
Expired reservation confirmations were prevented.
Tilopay SDK client failures are tracked using safe operational diagnostics.
Retryable payment errors map to guest-friendly bilingual messages.
The retry page reuses the shared checkout.
Payment and reservation statuses are localized and shown separately.
The reservation flow guides the guest to the relevant quote, pending reservation, payment, or error area.
Raw provider descriptions and card data remain hidden.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

Completed behavior:

```text
Protected admin visibility exists for direct reservations, payments, and safe Tilopay SDK diagnostics.
Admin copy and visible statuses are centralized in messages/es.ts and messages/en.ts.
The admin never exposes card number, CVV, expiration date, or tokenized card data.
Payment-driven confirmation remains the only confirmation path.
No manual confirmation, cancellation, refund, date-change, email, or PMS action was introduced.
```

### Phase 9.8 — Automatic Preparation Buffers in Availability

Status: **Completed**

Completed behavior:

```text
CONFIRMED reservations dynamically block stay dates and preparation-buffer ranges.
Active PENDING_PAYMENT reservations block stay dates and buffers only while expiresAt > now.
PENDING_PAYMENT rows with expiresAt = null are not active holds.
EXPIRED reservations and expired pending holds do not block availability.
Buffer values come from Property.preparationDaysBefore and Property.preparationDaysAfter.
Composed-listing dependency rules apply to stay and buffer ranges.
Pending holds remain excluded from Airbnb iCal export.
Confirmed buffers remain part of future iCal export calculations.
```

### Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

Status: **Completed**

Completed behavior:

```text
Option B was selected: dynamic direct-reservation buffers plus auditable override records.
Preparation settings are editable from 0 through 30 days before/after.
A one-day PREPARATION_BUFFER CalendarBlock records each admin unlock.
Overrides are linked to their source relation and retain admin, timestamp, and optional note.
Availability and iCal export subtract only matching override ranges.
Reservation stay dates remain blocked.
Property changes, unlocks, and restores preserve AdminAuditLog history.
The real iCal operational E2E test remains deferred until secure external-calendar configuration exists.
```

### Phase 9.9.1 — Admin Navigation and Property Calendar Operations

Status: **Completed**

Completed behavior:

```text
app/admin/layout.tsx provides the shared protected shell.
The admin dashboard remains compact.
Reservations and payments use dedicated searchable, filterable, paginated routes.
Visible admin and Tilopay selectors use the shared Radix design-system component.
The hidden SDK-required tlpy_payment_method field remains synchronized with the visible selector.
The normal pending-reservation checkout and retry checkout share the same component.
The checkout displays Visa, Mastercard, and American Express acceptance indicators.
Accommodation preparation settings use a dedicated route.
The property calendar supports one selected accommodation, month navigation, search, effective blockers, composed-listing inheritance, manual block creation/release, and preparation-buffer unlock/restore.
Manual blocks are accepted only on fully available future dates and are revalidated server-side.
Manual blocks and preparation overrides preserve audit history through soft deletion and AdminAuditLog.
Successful and failed admin mutations use accessible auto-dismissing snackbars with distinct success and error variants and manual dismissal.
No Prisma migration, email delivery, guest date change, manual confirmation, refund action, or PMS behavior was added.
```

Validation acceptance recorded for closure:

```text
The implementation was reported working and committed after local build and manual verification.
Normal Tilopay checkout, retry checkout, Radix filters/selectors, calendar operations, snackbars, and accepted-card indicators were accepted before 9.10 closure.
```

### Phase 9.10 — Phase 9 Documentation Update and Closure

Status: **Completed**

Completed deliverables:

```text
README.md updated
docs/10-phases.md updated
docs/11-progress-log.md updated
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md updated
docs/72-admin-navigation-and-property-calendar-operations.md updated
docs/73-phase-9-documentation-closure.md added
```

Closure decisions:

```text
Phase 9 is completed.
Phase 10 — Email Notifications is the next phase.
No production credentials, real Airbnb URLs, export tokens, card data, or provider secrets were added to documentation.
Real Airbnb iCal operational configuration and E2E validation remain deferred to production-readiness work.
```

### Phase 9.11.1-C — Application and Metadata Integration

Status: **Completed**

Accepted implementation:

```text
Public header uses BrandMark instead of the temporary TRP block.
Public footer uses BrandLogo.
Desktop and mobile admin navigation use BrandMark.
Custom branded /admin-login page uses BrandLogo.
Auth.js uses /admin-login as its custom sign-in page.
Admin callback destinations are reduced to safe local /admin paths.
Root metadata uses approved favicon, Apple touch, Open Graph, and Twitter assets.
Next.js app/favicon.ico, app/icon.png, and app/apple-icon.png use the approved mark without text.
Bilingual admin sign-in copy remains centralized in messages/es.ts and messages/en.ts.
The public brand name replaces the internal technical name in visible brand surfaces.
```

Acceptance:

```text
The application and metadata integration was reported functioning and committed.
Integration commit: 8ac8291db2296f2c977f5e6667150a7ea0b8f9a8
Visible-name follow-up commit: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
```

### Phase 9.11.1-D — Responsive QA and Documentation Closure

Status: **Completed**

Responsive closure:

```text
Long reservation and admin email addresses can wrap inside the public footer on narrow screens.
The mobile admin top bar hides redundant adjacent brand text below the sm breakpoint while preserving the menu, mark, and locale selector.
The locale selector remains non-shrinking in the compact admin header.
The branded /admin-login page allows vertical scrolling and starts below the fixed locale selector on small screens.
BrandLogo and BrandMark continue to preserve their approved aspect ratios.
Favicon-scale contexts continue to use only the mark without text.
No visible copy, dependency, Auth.js policy, database schema, or provider integration changed.
```

Documentation closure:

```text
README.md updated.
docs/10-phases.md updated.
docs/11-progress-log.md updated.
docs/74-brand-identity-refresh.md updated.
docs/75-reusable-brand-components.md updated.
docs/76-brand-application-and-metadata-integration.md updated.
docs/77-responsive-brand-qa-and-closure.md added.
public/brand/brand-manifest.json updated to Phase 9.11.1-D.
```

## Current Work

### Phase 9.11.2 — Accommodation Content Management

Status: **Completed**

Implemented behavior:

```text
/admin/accommodations shows the three supported properties and keeps preparation settings in a separate section.
Each property has a dedicated /admin/accommodations/[propertyId] content editor.
Editable fields are bilingual names, short descriptions, long descriptions, max guests, bedrooms, bathrooms, check-in time, and optional check-out time.
Slug, price, currency, status, composed-listing structure, photos, amenities, rules, and preparation settings remain read-only or deferred.
Public pages already read active Property rows from PostgreSQL, so successful edits are visible without copying values back into typed configuration.
PATCH /api/admin/accommodation-content requires an authorized admin session and a strict Zod payload.
The service normalizes text and validates lengths and capacity values independently of the client.
expectedUpdatedAt provides optimistic concurrency and returns ACCOMMODATION_CONTENT_STALE for an outdated form.
PROPERTY_CONTENT_UPDATED audit records contain the actor email, changed fields, and before/after values.
Unsupported or soft-deleted properties return not found and cannot be restored from this UI.
The public ES/EN selector is available from the shared site header.
Public header and footer copy respond to the locale selected by the visitor.
Accommodation-content, preparation-buffer, and calendar mutation errors use the shared destructive admin snackbar instead of persistent inline alerts.
No Prisma migration, photo management, amenity/rule management, price editing, status publishing, deletion UI, email delivery, refund action, or PMS behavior was added.
```

Important seed boundary:

```text
The Property upsert in prisma/seed.ts must use update: {} so re-running the development seed does not overwrite admin-managed runtime content or restore a soft-deleted property.
The create branch of the upsert remains the clean-database baseline.
```

Accepted follow-up:

```text
The accommodation content workflow was reported functioning and committed.
The public ES/EN selector and shared admin error snackbars were then validated and committed.
Implementation commit: bc19e7327cd96647fd760b1a551fc4ae9ffacde2
UI follow-up commit: 3dc5797aef1efc2942d68358bdc5d3b5b44cca4d
```

### Phase 9.11.3 — Property Photo Management

Status: **Completed pending local validation and commit**

Implemented behavior:

```text
/admin/accommodations/[propertyId]/photos provides the protected photo manager for each supported property.
The admin accepts JPG, PNG, and WEBP images up to 10 MB and enforces a maximum of 20 active photos per property.
Spanish and English alternative text are required and normalized server-side.
The browser uploads bytes directly to Cloudinary with a short-lived signed owned public ID; CLOUDINARY_API_SECRET remains server-side.
Finalization re-reads the provider asset and verifies ownership, resource type, upload type, actual format, size, URLs, and upload age before creating PropertyImage.
The gallery supports ordered move controls, one cover photo, bilingual alt-text editing, and soft deletion.
A SHA-256 gallery revision plus serializable transactions rejects stale structural changes from older tabs.
The first upload becomes cover; deleting the cover promotes the first remaining ordered photo; the final active photo cannot be deleted.
Soft deletion preserves deletedAt, deletedById, the database record, audit history, and the Cloudinary asset.
All success and failure feedback uses the shared accessible AdminSnackbar.
The public listing and detail gallery already consume active PostgreSQL PropertyImage rows, cover selection, order, and bilingual alt text.
No Prisma migration, amenity/rule management, price/status/composition editing, reservation/payment action, email delivery, or PMS behavior was added.
```

Audit actions:

```text
PROPERTY_IMAGE_UPLOADED
PROPERTY_IMAGE_ALT_TEXT_UPDATED
PROPERTY_IMAGES_REORDERED
PROPERTY_IMAGE_COVER_CHANGED
PROPERTY_IMAGE_SOFT_DELETED
```

Important seed boundary:

```text
The PropertyImage upsert in prisma/seed.ts must use update: {} so rerunning the development seed does not overwrite admin-managed alt text, order, cover selection, or restore soft-deleted photo records.
The create branch remains the clean-database baseline.
```

### Phase 9.11.4 — Amenities and House Rules

Status: **Not started**

Planning scope:

```text
Define bilingual amenity assignment and house-rule administration for the three supported accommodations.
Reuse the existing Amenity, HouseRule, PropertyAmenity, and PropertyRule models and the typed icon catalog.
Preserve public localization, soft-deletion rules, auditability, and the shared admin snackbar behavior.
Do not mix pricing, property publishing, reservation/payment actions, email delivery, or PMS behavior into 9.11.4.
```

## Next Recommended Work

```text
1. Apply and validate Phase 9.11.3 against real development Cloudinary credentials.
2. Upload each accepted image format and verify public listing/detail rendering.
3. Validate order, cover, alt-text, stale-tab, soft-delete, final-photo guard, seed-safety, and audit behavior.
4. Run npm run env:validate, npm run db:validate, npm run lint, and npm run build.
5. Commit Phase 9.11.3.
6. Continue with 9.11.4 amenities and house rules.
```

## Continuity Notes for New Conversations

Minimum context files to review before continuing:

```text
README.md
AGENTS.md
.env.example
docs/10-phases.md
docs/11-progress-log.md
docs/32-availability-strategy-and-calendar-rules.md
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/58-confirm-reservation-after-validated-payment.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/69-admin-reservation-payment-review.md
docs/70-automatic-preparation-buffers-in-availability.md
docs/71-admin-preparation-buffer-settings-and-overrides.md
docs/72-admin-navigation-and-property-calendar-operations.md
docs/73-phase-9-documentation-closure.md
docs/74-brand-identity-refresh.md
docs/75-reusable-brand-components.md
docs/76-brand-application-and-metadata-integration.md
docs/77-responsive-brand-qa-and-closure.md
docs/78-accommodation-content-management.md
docs/79-property-photo-management.md
components/brand/
components/layout/site-header.tsx
components/layout/site-footer.tsx
features/admin/components/admin-shell.tsx
features/auth/components/admin-sign-in-page.tsx
features/admin/components/admin-accommodation-management.tsx
features/admin/components/admin-accommodation-content-editor.tsx
features/admin/components/admin-property-photo-manager.tsx
app/api/admin/accommodation-content/route.ts
app/api/admin/property-photos/route.ts
app/admin/accommodations/[propertyId]/photos/page.tsx
lib/admin/accommodation-content.ts
lib/admin/property-photos.ts
types/admin-accommodation-content.ts
types/admin-property-photos.ts
app/admin-login/page.tsx
app/layout.tsx
lib/reservations/confirmation.ts
lib/payments/tilopay-payment-result.ts
lib/availability/rules.ts
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
lib/airbnb-ical/sync-service.ts
prisma/schema.prisma
```
