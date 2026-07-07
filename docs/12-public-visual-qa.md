# 12 — Public Visual QA Checklist

This checklist belongs to Phase 2.7 — Public copy cleanup and visual QA.

## Scope

Pages to verify:

```text
/
/alojamientos
/alojamientos/apartamento-blanco-y-negro
/alojamientos/bungalow-refugio-perfecto
/alojamientos/refugio-completo
```

## Copy Rules

- Public labels, section titles, CTA copy, helper text, and page text must come from `messages/es.ts` and `messages/en.ts`.
- Accommodation-specific content may remain in `config/accommodations.ts` until the database phase.
- Amenity labels and icons must come from `config/amenities.ts`.
- Components should not contain random hardcoded public-facing text.

## Visual QA

Check the following breakpoints manually:

```text
Mobile: 375px
Large mobile: 430px
Tablet: 768px
Desktop: 1280px
Wide desktop: 1440px+
```

For each page, verify:

- Header remains readable and does not wrap awkwardly.
- Primary CTA is visible and styled.
- No native browser-looking UI appears.
- Cards have consistent spacing and rounded corners.
- Images do not stretch or distort.
- Detail pages remain readable on mobile.
- Footer contact emails are visible and readable.
- Sections have enough vertical breathing room.
- The page feels like a professional booking website, not a starter template.

## Deferred Items

Do not solve these in Phase 2.7:

```text
Prisma database schema
Cloudinary integration
Auth/admin
Availability calendar
Airbnb iCal sync
Tilopay payments
Resend email delivery
```

Those belong to later phases.
