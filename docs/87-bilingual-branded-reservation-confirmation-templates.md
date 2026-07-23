# 87 — Bilingual Branded Reservation-Confirmation Templates

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.3 Bilingual branded reservation-confirmation templates
Status: Completed
Base commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72
Accepted commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e
Strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Provider foundation: docs/86-email-persistence-and-resend-provider-foundation.md
Next accepted subphase: 10.4 Guest and admin confirmation notification orchestration
```

## Purpose

Add the bilingual, branded, typed content layer required by the initial Phase 10 confirmation notifications without creating notification intents, changing reservation confirmation, calling Resend, processing retries, or exposing delivery history.

Phase 10.3 prepares two logical messages:

```text
RESERVATION_CONFIRMED
- Guest-facing reservation confirmation
- Locale: reservation preferred locale
- Output: subject, HTML, and plain text

ADMIN_NEW_RESERVATION
- Administrative notification for a newly confirmed direct reservation
- Locale: configured administrative locale when orchestration is added
- Output: subject, HTML, and plain text
```

The builders are pure formatting operations. They do not read or write the database and they do not contact an external provider.

## Delivered Files

```text
emails/components/email-layout.tsx
emails/admin-new-reservation-email.tsx
emails/email-text.ts
emails/index.ts
emails/messages.ts
emails/reservation-confirmed-email.tsx
emails/template-data.ts
types/email-template.ts
lib/email/index.ts
messages/es.ts
messages/en.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/86-email-persistence-and-resend-provider-foundation.md
docs/87-bilingual-branded-reservation-confirmation-templates.md
```

The ZIP includes a surgical Git patch for `messages/es.ts` and `messages/en.ts` because those catalogs are large shared files. The patch adds only the new top-level `emails` namespace and avoids replacing unrelated current copy.

## Copy Ownership

All transactional visible copy remains centralized in the two approved message catalogs:

```text
messages/es.ts
messages/en.ts
```

The new matching structure is:

```text
emails.common
emails.reservationConfirmed
emails.adminNewReservation
```

It contains:

```text
- Subjects
- Preview text
- Headings and paragraphs
- Reservation and guest labels
- Date-change guidance
- Arrival-instruction boundary copy
- Support and footer copy
- Admin action and fallback copy
```

Template components do not introduce feature-local visible copy. Dynamic values such as names, dates, totals, counts, URLs, and reservation IDs come from validated template data.

## Shared Brand Layout

The shared layout lives in:

```text
emails/components/email-layout.tsx
```

It uses:

```text
- React server rendering through react-dom/server
- Email-safe table structure
- Inline styles
- A hidden preview-text block
- A constrained white content card on a neutral background
- Shared headings, sections, detail rows, success notes, and CTA primitives
- A plain HTML doctype
```

The layout uses the approved primary logo configured by:

```text
components/brand/brand-assets.ts
brandAssets.primary.src = /brand/logo-primary.png
```

The relative runtime asset is converted to an absolute URL from the validated `publicBaseUrl` input. Email HTML never relies on a relative image URL.

The template implementation does not import `next/image`, because email clients require a normal absolute `<img>` URL rather than Next.js runtime image optimization.

No new email-component dependency is added. The implementation reuses the project's existing React and React DOM dependencies.

## Typed Template Contract

The shared contract lives in:

```text
types/email-template.ts
```

Required reservation values:

```text
id
guestName
guestEmail
guestPhone
guestCountry
preferredLocale
propertyNameEs
propertyNameEn
checkInDate
checkOutDate
guestCount
arrivalTimeEstimate
total
currency
confirmedAt
```

Request-level values:

```text
locale
publicBaseUrl
reservation
```

The `locale` selects the template output language. `reservation.preferredLocale` is retained separately because the administrative template may be rendered in the configured admin language while still displaying the guest's preferred language.

The caller must provide data already selected from the reservation domain. The template does not accept raw Prisma entities, Tilopay payloads, payment SDK events, provider errors, or unrestricted JSON.

## Validation and Normalization

`emails/template-data.ts` validates and normalizes the input before rendering.

Validation includes:

```text
- locale is es or en
- publicBaseUrl is an absolute HTTP/HTTPS URL without embedded credentials
- reservation ID and visible strings are bounded
- guest email is valid and normalized to lowercase
- date values use YYYY-MM-DD
- check-out is after check-in
- guest count is a positive bounded integer
- arrival time is HH:mm when present
- total is a non-negative decimal string with at most two decimals
- currency is a three-letter uppercase code
- confirmedAt is an ISO timestamp with offset
```

Invalid data throws the safe internal error:

```text
EMAIL_TEMPLATE_INVALID_DATA
```

Zod issue details and input values are not exposed through that error.

## Locale-Aware Formatting

Spanish output uses:

```text
es-GT
```

English output uses:

```text
en-US
```

Formatting rules:

```text
- Check-in/check-out are date-only values formatted in UTC so the calendar date cannot shift.
- confirmedAt is formatted in America/Guatemala because it is a business event timestamp.
- Currency uses Intl.NumberFormat with the requested currency.
- Stay length is calculated from the date-only range.
- Guest and night labels use singular/plural copy from the message catalog.
- Arrival time uses locale-aware 12/24-hour presentation.
- ISO-2 guest country codes use Intl.DisplayNames when supported.
- Missing optional phone, country, or arrival values use localized fallback copy.
```

## Guest Confirmation Template

Builder:

```text
buildReservationConfirmedEmail(input)
```

Output:

```text
subject
html
text
```

The guest builder rejects a render request when the requested output locale differs from `Reservation.preferredLocale`. This prevents orchestration from accidentally sending the guest template in the administrative locale.

The guest email includes:

```text
- Approved brand logo
- Confirmation heading and greeting
- Reservation reference
- Localized accommodation name
- Check-in and check-out
- Number of nights and guests
- Estimated arrival time when available
- Confirmed total
- Payment-confirmed note
- Date-change policy guidance
- Statement that arrival details will be sent separately
- Reservation support email for the selected locale
```

The date-change copy preserves the approved rule: guests cannot freely modify confirmed dates from the public site. They must request authorization or cancel and create a new reservation according to the applicable policy.

The guest email intentionally excludes:

```text
- Protected admin URLs
- Card number, CVV, expiration, or token data
- Raw Tilopay references or payloads
- Payment SDK diagnostics
- Internal notes
- Door, lockbox, or access codes
- Private Wi-Fi credentials
- PMS-only operational information
```

## Administrative Notification Template

Builder:

```text
buildAdminNewReservationEmail(input)
```

Output:

```text
subject
html
text
```

The admin email includes minimum operational information:

```text
- Reservation reference
- Localized accommodation name
- Stay dates, duration, guest count, arrival estimate, total, and confirmation timestamp
- Guest name, email, optional phone, optional country, and preferred language
- A clear note that validated payment already confirmed the reservation
- An absolute protected /admin/reservations/[reservationId] link
- A visible URL fallback for clients that do not render the CTA button
```

The administrative message does not contain raw provider payloads, card data, credentials, authorization headers, complete email HTML from another message, or PMS-only information.

The protected admin URL is not added to the guest template.

## Plain-Text Alternatives

Both builders create a complete plain-text representation through:

```text
emails/email-text.ts
```

The text output:

```text
- Uses the same localized copy and formatted view model as the HTML output
- Includes all essential reservation details
- Ends with a newline
- Does not rely on visual layout or hidden content
- Includes the admin detail URL only in the administrative message
```

The provider adapter from 10.2 already accepts `subject`, `html`, and `text`, so 10.4 can pass builder output without changing the provider contract.

## Security and Scope Boundaries

Phase 10.3 does not:

```text
- Create or update EmailNotification rows
- Generate deduplication keys
- Hook into confirmReservationAfterApprovedPayment
- Call createResendEmailProvider or EmailProvider.send
- Contact Resend
- Change payment or reservation status
- Add retry processing
- Add admin notification-history UI
- Add arrival-instruction scheduling
- Add Prisma schema changes or migrations
- Add environment variables
- Add package dependencies
- Introduce PMS behavior
```

A rendering error in a future orchestration flow must be handled as an email failure and must never downgrade a valid confirmed reservation or approved payment.

## Validation Gate

Run:

```text
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Template checks with representative ES and EN data:

```text
1. Render guest and admin templates in both locales.
2. Confirm every subject is non-empty.
3. Confirm every HTML document begins with a doctype.
4. Confirm the logo URL is absolute and points to /brand/logo-primary.png.
5. Confirm every message has a non-empty plain-text alternative.
6. Confirm date, time, amount, country, guest count, and stay duration formatting is localized.
7. Confirm the guest email has no /admin URL.
8. Confirm the admin email links to the expected protected reservation detail.
9. Confirm no undefined/null placeholder text appears.
10. Confirm no card data, provider payload, access code, or PMS-only data appears.
11. Confirm invalid dates, URLs, email addresses, amounts, currencies, and timestamps produce EMAIL_TEMPLATE_INVALID_DATA.
12. Confirm the guest builder rejects a locale that differs from the stored preferred locale.
13. Exercise the existing payment flow and confirm no EmailNotification row or Resend request is created in 10.3.
```

## Phase 10.6 Follow-up — House Rules in Guest Templates

The guest-facing `RESERVATION_CONFIRMED` template and the later `ARRIVAL_INSTRUCTIONS` template now include the accommodation's active assigned house rules.

```text
- Read current PropertyRule assignments during notification delivery.
- Exclude soft-deleted HouseRule records.
- Validate bilingual titles and descriptions through the shared template-data contract.
- Localize each rule using the reservation's stored preferred locale.
- Render matching HTML and plain-text sections.
- Omit the section safely when no active assigned rule is available.
- Do not add a Prisma migration, rule snapshot, provider payload, or PMS behavior.
```

Rule content is resolved at delivery time. Pending notifications therefore use the latest active bilingual house-rule content without changing reservation, payment, notification deduplication, or retry behavior.

## Handoff to 10.4

Phase 10.4 was completed and accepted after this template foundation:

```text
10.4 — Guest and admin confirmation notification orchestration
```

10.4 may create permanent guest/admin notification intents during a newly confirmed reservation and attempt best-effort delivery only after the confirmation transaction commits. It must reuse these template builders and keep successful payment/reservation behavior independent from rendering or provider delivery results.
