# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 10 — Email Notifications
Current subphase: 10.2 Persistence and Resend provider foundation — Not started
Current focus: add conditional email environment validation, the server-side Resend adapter, stored reservation locale, and permanent notification deduplication without sending emails yet
Last updated: 2026-07-21
Last completed subphase: 10.1 Email notification strategy and environment contract
10.1 base commit: 0c9df37380588ca9573a74faf3ce52a1b25a0654
10.1 strategy document: docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The backend calls Tilopay server-side and exposes only safe initialization data.
Payment.providerReference stores the unique provider order number.
Card number, CVV, expiration, and card tokens never reach the backend.
```

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation

Status: **Completed**

```text
Redirect handling resolves Payment by providerReference/orderNumber.
Tilopay consult runs server-side.
OrderHash V2 uses HMAC-SHA256 validation.
Redirect query parameters are not final payment truth.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

```text
Reservation confirmation is payment-driven and idempotent.
Only APPROVED payment for an active PENDING_PAYMENT reservation can confirm it.
Reservation.confirmedAt is set and expiresAt is cleared.
Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 — Sandbox Hardening and Checkout UX

Status: **Completed**

```text
Tilopay preflight and OrderHash validation were hardened.
Expired reservation confirmation is prevented.
Retryable provider issues map to safe bilingual messages.
SDK client failures use safe operational diagnostics.
Payment and reservation statuses remain distinct and localized.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

```text
Protected admin visibility exists for reservations, payments, and safe SDK diagnostics.
Visible copy and statuses are bilingual.
Payment-driven confirmation remains the only confirmation path.
No card data, manual confirmation, cancellation, refund, date change, email, or PMS action was added.
```

### Phase 9.8 — Automatic Preparation Buffers

Status: **Completed**

```text
CONFIRMED reservations block stay dates and preparation buffers.
Active PENDING_PAYMENT holds block only while expiresAt is in the future.
Expired or invalid holds do not block availability.
Property buffer settings and composed-listing dependencies are respected.
```

### Phase 9.9 — Preparation Buffer Settings and Unlocks

Status: **Completed**

```text
Dynamic direct-reservation buffers use auditable override records.
Preparation days are editable from 0 through 30.
One-day PREPARATION_BUFFER CalendarBlock rows record admin unlocks.
Availability and iCal subtract only matching overrides.
Reservation stay dates remain blocked.
```

### Phase 9.9.1 — Admin Navigation and Property Calendar

Status: **Completed**

```text
The protected admin layout provides responsive sidebar navigation and route feedback.
Reservations and payments use dedicated searchable, filterable, paginated routes.
Visible selectors use the shared Radix design-system component.
The property calendar supports effective blockers, composed inheritance, manual blocks, and preparation overrides.
Successful and failed admin mutations use accessible snackbars.
```

### Phase 9.10 — Phase 9 Documentation Closure

Status: **Completed**

```text
Phase 9 behavior and boundaries were consolidated in README and official trackers.
Real Airbnb iCal operational configuration remains deferred to production readiness.
No credentials, card data, private iCal URLs, or provider secrets were documented.
```

### Phase 9.11.1 — Brand Identity

Status: **Completed**

```text
Approved BrandLogo and BrandMark components are used across public, admin, sign-in, favicon, application icon, and social metadata surfaces.
Responsive closure protects narrow footer, mobile admin header, and short admin-login viewports.
Auth.js policy and provider configuration remain unchanged.
```

Accepted commits:

```text
Application integration: 8ac8291db2296f2c977f5e6667150a7ea0b8f9a8
Visible-name follow-up: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
```

### Phase 9.11.2 — Accommodation Content Management

Status: **Completed**

```text
/admin/accommodations lists the supported properties and separates content from preparation settings.
Each property has a bilingual content editor.
Editable fields include names, descriptions, capacity, bedroom/bathroom counts, check-in, and optional check-out.
Slug, price, currency, status, composition, photos, amenities, rules, and preparation policy remain outside that editor.
Strict Zod validation, service normalization, expectedUpdatedAt, and PROPERTY_CONTENT_UPDATED auditing are preserved.
The public locale selector and shared admin error snackbars were accepted.
```

Accepted commits:

```text
Implementation: bc19e7327cd96647fd760b1a551fc4ae9ffacde2
Locale/snackbar follow-up: 3dc5797aef1efc2942d68358bdc5d3b5b44cca4d
```

### Phase 9.11.3 — Property Photo Management

Status: **Completed**

```text
/admin/accommodations/[propertyId]/photos manages up to 40 active JPG, PNG, or WEBP photos of at most 10 MB.
Cloudinary uploads use short-lived server signatures and provider verification.
Bilingual alt text, ordering, cover selection, soft deletion, optimistic gallery revisions, and audit history are supported.
The final active photo cannot be deleted.
The local upload preview uses a temporary object URL.
```

Audit actions:

```text
PROPERTY_IMAGE_UPLOADED
PROPERTY_IMAGE_ALT_TEXT_UPDATED
PROPERTY_IMAGES_REORDERED
PROPERTY_IMAGE_COVER_CHANGED
PROPERTY_IMAGE_SOFT_DELETED
```

Accepted commits:

```text
Implementation: c76451b4f1f8b1af97783f3c2571b4fbb7c5daa0
Sheet accessibility fix: 39a90fd8f5314189265b8cbf445a3e873c873c80
Photo-limit/card alignment: 9f5c10a6ca5812e0c6ea48852e1f673fb65df138
```

### Phase 9.11.4 — Amenities and House Rules

Status: **Completed**

Base implementation:

```text
/admin/accommodations/[propertyId]/amenities-rules manages assignments.
Each property must retain at least one active amenity and one active rule.
Assignment changes use a SHA-256 revision and serializable transaction.
PROPERTY_AMENITIES_RULES_UPDATED preserves before/after membership history.
Public pages read active bilingual catalog content and assignments from PostgreSQL.
```

Accepted UI follow-up:

```text
The sidebar includes a dedicated Catalogs entry.
/admin/catalogs separates Amenities and House Rules with tab-style buttons.
Shared catalog editing is separate from property assignments.
Property photo upload shows a local preview.
Accommodation check-in and check-out use controlled 30-minute selectors.
Accepted follow-up commit: ac4c8d96dbe1a80e481ebbc9046a3bf887a22a6e
```

Accepted catalog lifecycle follow-up:

```text
POST /api/admin/catalogs creates amenities and house rules.
New catalog items are unassigned initially.
The server generates an immutable runtime key from the English label and resolves collisions with a suffix.
DELETE /api/admin/catalogs soft-deletes amenities and house rules.
Deletion removes replaceable assignment rows in the same serializable transaction.
Deletion is rejected when an affected property would lose its final active item in that domain.
deletedAt, deletedById, expectedUpdatedAt, and AdminAuditLog preserve history and concurrency.
The property-photo upload form can explicitly clear its local selection without contacting Cloudinary.
Static amenity ordering accepts runtime-created catalog keys.
No Prisma migration, hard deletion, restore/purge UI, reservation/payment action, email delivery, or PMS behavior was added.
```

Catalog audit actions:

```text
AMENITY_CREATED
AMENITY_CONTENT_UPDATED
AMENITY_SOFT_DELETED
HOUSE_RULE_CREATED
HOUSE_RULE_CONTENT_UPDATED
HOUSE_RULE_SOFT_DELETED
PROPERTY_AMENITIES_RULES_UPDATED
```

Important seed boundary:

```text
Amenity and HouseRule upserts use update: {}.
Default assignments are inserted only when a property currently has zero assignments.
Seed reruns do not overwrite runtime content or restore soft-deleted catalog records.
```

Accepted commits:

```text
Catalog lifecycle implementation: 96e6d3938be82dd500b03aeead18c95b962a20fe
Static amenity-key hardening: 88b2320994d0dd91b80e2359bb28932751de8a37
Static amenity-key hardening follow-up: d6ae907b6c3bc91b45147d05aa83878c0b38d3c2
Final static/dynamic ordering fix: c5b15197bba6d2fce84a15649944ebd013a0fdfc
```

### Phase 9.11.5 — Reservation and Payment Detail Views

Status: **Completed**

```text
/admin/reservations/[reservationId] provides a protected read-only reservation detail.
/admin/payments/[paymentId] provides a protected read-only payment detail.
Reservation and payment list cards link to the corresponding detail routes.
Reservation detail shows guest, stay, pricing, active hold, and ordered payment-attempt information.
Payment detail shows safe allowlisted diagnostics, parent reservation context, and ordered SDK client events.
Reservation and payment detail pages provide cross-navigation.
Payment.rawPayload is processed only in the server loader and never returned as raw JSON.
PaymentClientEvent.sdkPayload is not selected.
Visible copy and statuses reuse the centralized bilingual message catalog.
No mutation action, Prisma migration, seed change, email delivery, calendar mutation, refund flow, date-change flow, or PMS behavior was added.
```

Accepted commits:

```text
Implementation: f3d14a26f314967c7d1ff536477e9541dd17a7ed
Detail-route registration fix: 1ae765fe1bb3b2504f2c458632fd5b9acef43ade
List-route restoration: b9fa0d7e397959a385685b7c8298c2b93cd974b0
```

Implementation document:

```text
docs/83-reservation-and-payment-detail-views.md
```

### Phase 9.11.6 — Validation and Documentation Closure

Status: **Completed**

```text
Phase 9.11 implementation and scope boundaries are consolidated in README and the official trackers.
The final reservation/payment list and detail route arrangement was reported working and committed.
The closure records the accepted Phase 9.11.5 commits and the next Phase 10 handoff.
No application code, Prisma migration, seed change, dependency, provider credential, visible UI copy, email delivery, or PMS behavior was added.
```

Closure document:

```text
docs/84-phase-9.11-validation-and-documentation-closure.md
```

### Phase 10.1 — Email Notification Strategy and Environment Contract

Status: **Completed**

Repository findings:

```text
EmailNotification and the email type/status enums already exist in prisma/schema.prisma.
EmailNotification does not yet have a permanent deduplication key or safe retry-claim fields.
The public pending-hold request carries locale = es|en, but Reservation does not persist that preference.
The reservation-confirmation service is already payment-driven and transactionally changes the reservation to CONFIRMED.
The repository has no Resend dependency, API-key validation, sender validation, template layer, dispatcher, or retry worker yet.
siteConfig already centralizes the public Spanish, English, and admin email addresses.
```

Accepted strategy:

```text
The database owns permanent email deduplication and Resend receives the same stable key as its provider idempotency key.
Provider network calls run only after the reservation-confirmation transaction commits.
Guest RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION are the initial automatic messages.
PAYMENT_APPROVED is not sent separately.
Automatic rejected/failed-payment emails are deferred from the initial MVP to avoid duplicate or noisy messages across retries.
Arrival instructions remain a later Phase 10 subphase pending explicit timing and content approval.
Transactional email copy stays centralized in messages/es.ts and messages/en.ts.
The server-side environment contract will support disabled, test-recipient-override, and production delivery modes.
No email is sent and no schema, migration, dependency, or environment file is changed by 10.1.
```

Strategy document:

```text
docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

## Active Work

### Phase 10.2 — Persistence and Resend Provider Foundation

Status: **Not started**

Planned scope:

```text
Add the resend package as the only new provider dependency.
Add conditional server-side email environment validation and document safe example values.
Persist Reservation.preferredLocale from the existing pending-hold locale input.
Add permanent EmailNotification.deduplicationKey uniqueness.
Add bounded retry/claim metadata and safe error-code storage to EmailNotification.
Add a server-only Resend adapter and normalized provider result/error types.
Do not create templates, enqueue confirmation notifications, call Resend, or expose new UI yet.
```

## Next Recommended Work

```text
1. Apply and commit the Phase 10.1 strategy documentation.
2. Implement the Phase 10.2 Prisma migration and regenerate Prisma Client.
3. Update .env.example and lib/env/server.ts with conditional email-delivery validation.
4. Add the server-only Resend adapter and safe provider error mapping.
5. Confirm no email is sent during Phase 10.2.
6. Run npm run env:validate, npm run db:validate, npm run lint, and npm run build.
7. Continue with 10.3 bilingual branded reservation-confirmation templates after local acceptance.
```

## Continuity Notes for New Conversations

Minimum context files:

```text
README.md
AGENTS.md
.env.example
package.json
prisma/schema.prisma
docs/10-phases.md
docs/11-progress-log.md
docs/84-phase-9.11-validation-and-documentation-closure.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
config/site.ts
lib/env/server.ts
lib/reservations/pending-holds.ts
lib/reservations/confirmation.ts
types/reservation-pending-hold.ts
messages/es.ts
messages/en.ts
```
