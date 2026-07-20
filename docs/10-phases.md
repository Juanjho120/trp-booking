# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started — Work has not begun.
In progress — Work has started but the phase is not complete.
Completed — Deliverables are implemented and committed.
Deferred — Intentionally postponed.
```

## Current Phase

```text
Current phase: Phase 9.11 — Admin MVP and Brand Identity Completion
Current subphase: 9.11.4 Amenities and house rules
Current focus: define bilingual amenity and house-rule administration after completing property photo management
Last completed subphase: 9.11.3 Property photo management
```

---

## Phase 8 — Reservation Flow

Status: **Completed**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Completed subphases:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

---

## Phase 9 — Tilopay Sandbox Integration

Status: **Completed**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation flow and close the operational payment, admin, availability, and preparation-buffer gaps required before Phase 10 email notifications.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
9.6 Confirm reservation only after validated payment — Completed
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX — Completed
9.7 Admin reservation and payment review — Completed
9.8 Automatic preparation buffers in availability — Completed
9.9 Admin preparation buffer settings and manual unlock behavior — Completed
9.9.1 Admin navigation and property calendar operations — Completed
9.10 Phase 9 documentation update and closure — Completed
```

Phase 9 rules preserved:

```text
- Do not store card data.
- Keep all Tilopay credentials server-side only.
- Do not expose raw provider payloads in public API responses.
- Do not set Reservation.status = CONFIRMED until payment validation succeeds.
- Keep failed/rejected payment states auditable.
- Do not send Resend emails in Phase 9.
- Do not add PMS features.
```

### Phase 9.4 result

```text
- Tilopay SDK V2 became the preferred checkout foundation.
- The backend obtains SDK access server-side and exposes only safe initialization data.
- Payment.providerReference stores the unique Tilopay order number.
- Card fields remain browser/SDK-managed and are never sent to the TRP Booking backend.
```

### Phase 9.5 result

```text
- Redirect handling resolves the payment by providerReference/orderNumber.
- Tilopay consult is executed server-side.
- OrderHash V2 is validated with HMAC-SHA256.
- Payment status can become APPROVED, REJECTED, or FAILED.
- Public result pages do not trust redirect parameters as final payment truth.
```

### Phase 9.6 result

```text
- Reservation confirmation is payment-driven and idempotent.
- Only an active PENDING_PAYMENT reservation with an APPROVED payment can become CONFIRMED.
- Reservation.confirmedAt is set and Reservation.expiresAt is cleared.
- Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 result

```text
- Tilopay preflight validation and sandbox hardening were added.
- Expired reservation confirmation is prevented.
- Retryable provider issues map to safe bilingual messages.
- Payment retry and result pages distinguish payment status from reservation status.
- SDK client failures are recorded using safe operational diagnostics.
- The public reservation flow guides the guest to the relevant quote, hold, payment, or error area.
```

### Phase 9.7 result

```text
- Protected admin visibility was added for reservations, payments, and safe SDK diagnostics.
- Visible statuses and copy are localized.
- Payment-driven confirmation remains the only confirmation path.
- No card number, CVV, expiration date, or tokenized card data is exposed.
```

### Phase 9.8 result

```text
- CONFIRMED reservations dynamically block stay dates and preparation-buffer ranges.
- Active PENDING_PAYMENT holds block stay dates and preparation buffers only while expiresAt > now.
- Expired holds, EXPIRED reservations, and PENDING_PAYMENT rows without expiresAt do not block availability.
- Property preparation settings and composed-listing dependency rules are used by availability.
- Confirmed buffers are represented consistently in future Airbnb iCal export calculations.
```

### Phase 9.9 result

```text
- Option B was selected: dynamic direct-reservation buffers plus auditable override records.
- Admin can configure preparation days before/after per accommodation from 0 through 30.
- A one-day PREPARATION_BUFFER CalendarBlock records each manual unlock.
- Availability and iCal export subtract only the matching override range.
- Reservation stay dates remain blocked.
- Property changes and unlock operations create AdminAuditLog records.
```

### Phase 9.9.1 result

```text
- A shared protected admin layout provides responsive sidebar navigation, optimistic active state, and route loading feedback.
- /admin remains a compact dashboard.
- Reservations and payments use dedicated searchable, filterable, paginated routes.
- Visible accommodation/status/payment-method selectors use the shared Radix design-system component.
- The Tilopay SDK-required tlpy_payment_method native field remains hidden and synchronized.
- The normal checkout and retry flow reuse the same stable Tilopay checkout component.
- Visa, Mastercard, and American Express acceptance indicators appear below the card-number field.
- Accommodation settings use a dedicated route.
- The property calendar shows direct reservations, active holds, Airbnb blocks, manual blocks, maintenance, preparation buffers, overrides, and composed-listing inheritance.
- New manual blocks are allowed only across fully available future dates and are revalidated server-side.
- Manual release, preparation unlock, and preparation restore preserve audit history.
- Successful and failed admin mutations use accessible auto-dismissing snackbars with distinct variants and manual dismissal.
```

### Phase 9.10 result

```text
- Phase 9 implementation and operational boundaries were consolidated in README and the official trackers.
- Phase 9.9.1 was marked completed after local implementation acceptance.
- The remaining operational Airbnb iCal setup and real E2E validation were explicitly deferred to production-readiness work.
- Phase 10 — Email Notifications became the next active phase.
```

Deferred Phase 9 operational item:

```text
Real Airbnb iCal import/export E2E validation requires secure operational external_calendars rows, real import URLs, and export tokens.
```

---

## Phase 9.11 — Admin MVP and Brand Identity Completion

Status: **In progress**

Goal: Close the documented MVP admin and brand-identity gaps before Phase 10 so public, admin, metadata, and future transactional email surfaces use the same approved brand system.

Subphase status:

```text
9.11.1-A Production raster assets — Completed
9.11.1-B Reusable brand components — Completed
9.11.1-C Application and metadata integration — Completed
9.11.1-D Responsive QA and documentation closure — Completed
9.11.2 Accommodation content management — Completed
9.11.3 Property photo management — Completed
9.11.4 Amenities and house rules — Not started
9.11.5 Reservation and payment detail views — Not started
9.11.6 Phase 9.11 validation and documentation closure — Not started
```

### Phase 9.11.1 result

```text
- Approved raster masters exist for the primary wordmark and icon-only mark.
- BrandLogo and BrandMark centralize runtime paths, intrinsic dimensions, aspect ratios, and accessibility defaults.
- The public header, public footer, admin navigation, and branded admin login use the reusable components.
- Next.js favicon, application icon, Apple touch icon, Open Graph, and Twitter metadata use the approved assets.
- Favicon-scale assets use only the mark without text.
- Long footer contact values wrap on narrow screens.
- The compact mobile admin header prioritizes menu, mark, and language controls without horizontal overflow.
- The branded admin sign-in page permits vertical scrolling on short displays.
- Auth.js authorization, Google OAuth verification, JWT roles, server-side admin allowlist, and safe callback behavior remain unchanged.
- Resend delivery and transactional email templates remain deferred to Phase 10.
```

### Phase 9.11.2 result

```text
- Authorized admins can edit bilingual property names, short descriptions, and long descriptions.
- Admins can edit maximum guests, bedroom count, bathroom count, check-in time, and optional check-out time.
- The existing /admin/accommodations page now separates public content management from preparation-buffer settings.
- Slug, price, currency, status, composition, photos, amenities, rules, and preparation settings are not editable through the content editor.
- Zod validates the PATCH request and the service repeats normalization and domain validation.
- expectedUpdatedAt prevents an older browser tab from silently overwriting newer property content.
- PROPERTY_CONTENT_UPDATED audit rows record the actor, changed fields, and before/after values.
- Public accommodation pages already read Property content from PostgreSQL and therefore reflect accepted updates without a separate synchronization step.
- Soft-deleted or unsupported property records cannot be edited.
- No Prisma schema migration, photo management, amenity/rule management, pricing workflow, email delivery, or PMS behavior was added.
```


### Phase 9.11.3 result

```text
- Each supported accommodation has a protected /admin/accommodations/[propertyId]/photos route.
- Authorized admins can upload JPG, PNG, and WEBP files up to 10 MB with required bilingual alternative text.
- Image bytes upload directly from the browser to Cloudinary through a short-lived signed request; the Cloudinary API secret remains server-side.
- Finalization verifies the exact owned public ID, provider resource type, upload type, actual format, byte size, delivery URLs, and recent creation time before persistence.
- Active galleries support up to 40 photos, sequential ordering, exactly one cover, bilingual alt-text editing, and soft deletion.
- Structural mutations use an optimistic gallery revision and serializable transactions so stale tabs do not silently overwrite order, cover, or deletion changes.
- Deleting the cover promotes the first remaining ordered image; the final active photo cannot be deleted.
- PROPERTY_IMAGE_UPLOADED, PROPERTY_IMAGE_ALT_TEXT_UPDATED, PROPERTY_IMAGES_REORDERED, PROPERTY_IMAGE_COVER_CHANGED, and PROPERTY_IMAGE_SOFT_DELETED preserve AdminAuditLog history.
- Soft deletion retains the PropertyImage row and Cloudinary asset until a restore/permanent-purge lifecycle is explicitly approved.
- Public listing and detail pages already read active PropertyImage rows, isCover, sortOrder, and bilingual alt text from PostgreSQL.
- No Prisma migration, amenity/rule management, pricing workflow, reservation/payment action, email delivery, or PMS behavior was added.
```

---

## Phase 10 — Email Notifications

Status: **Not started**

Goal: Add safe, bilingual, idempotent email notifications for the direct-booking lifecycle without changing payment-driven reservation confirmation.

Initial planning topics:

```text
- Resend server-side provider contract and environment validation
- Reservation confirmation email
- Admin notification for a new confirmed direct reservation
- Safe handling of rejected/failed payment communication where appropriate
- Bilingual ES/EN templates
- Idempotency and duplicate-send prevention
- Delivery attempt audit records and safe provider-error handling
- Arrival instructions and timing rules
```

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Not started**

---

## Phase 12 — Production Readiness

Status: **Not started**
