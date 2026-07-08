# 48 — Reservation Form UX and Manual Locale Switcher

## Phase

```text
Phase 8.3.2 — Reservation form UX and manual locale switcher
```

## Purpose

This corrective subphase upgrades the public reservation request form before Phase 8.4 starts writing pending reservations.

The goal is to avoid persisting loosely-entered guest data from free text fields and to improve the public booking experience so it feels closer to a professional lodging website.

## Delivered Files

```text
package.json
features/i18n/use-locale.tsx
features/i18n/locale-switcher.tsx
features/i18n/index.ts
features/properties/components/accommodations-page.tsx
features/properties/components/property-detail-page.tsx
features/reservations/components/reservation-request-form.tsx
features/reservations/reservation-request-copy.ts
lib/geo/countries.ts
docs/48-reservation-form-ux-and-manual-locale-switcher.md
```

## UX Improvements

```text
- Replaced free text check-in/check-out fields with a styled date range picker.
- Replaced free text guest count with a controlled selector from 1 to the accommodation maxGuests value.
- Replaced free text country with a searchable country picker with flag, localized country name, and calling code.
- Added phone input with country calling code inferred from the selected country.
- Replaced free text estimated arrival time with a styled time selector.
- Added a manual ES/EN locale switcher to the public accommodation listing and detail pages.
```

## Dependency Decision

This subphase adds:

```text
react-day-picker
react-phone-number-input
```

Reason:

```text
- react-day-picker provides a mature accessible range picker foundation that fits the professional booking UX needed here.
- react-phone-number-input provides maintained country/calling-code metadata instead of manually maintaining an incomplete list of countries and dial codes.
```

The project still avoids unnecessary dependencies. These two are justified because this booking form must serve guests from many countries and should not feel like a basic developer form.

## Manual Locale Behavior

The new locale switcher is manual.

```text
- It does not infer the language from the browser.
- It persists the selection in localStorage.
- It updates client-rendered public accommodation listing/detail content and reservation request UI.
```

Future i18n work may move this to route-based `/es` and `/en` paths, but this subphase provides the requested manual switcher without disrupting the current route structure.

## Important Boundary

This subphase still does not create reservations.

It does not add:

```text
Reservation writes
Pending holds
Checkout sessions
Tilopay payment intents
Tilopay redirects
Tilopay webhooks
Resend emails
Admin reservation UI
External calendar admin configuration
PMS features
```

## Handoff to Phase 8.4

After this phase, Phase 8.4 can receive better structured client-side data:

```text
checkInDate
checkOutDate
guestCount
guestName
guestEmail
guestCountry
countryDialCode
guestPhoneLocal
arrivalTimeEstimate
```

Phase 8.4 must still validate everything server-side and must not trust the client as the source of truth.

## Validation Commands

```bash
npm install
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run build
npm run env:validate
npm run lint
```
