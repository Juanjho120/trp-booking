# 13 — Static SEO Foundation

This document belongs to Phase 2.8 — Static SEO metadata and sitemap foundation.

## Scope

Phase 2.8 adds static SEO support for the current public pages:

```text
/
/alojamientos
/alojamientos/apartamento-blanco-y-negro
/alojamientos/bungalow-refugio-perfecto
/alojamientos/refugio-completo
```

## Rules

- Public SEO copy should be centralized in `messages/es.ts` and `messages/en.ts`.
- Page metadata should use typed helpers from `config/seo.ts`.
- Canonical URLs must use the official domain target: `https://turefugioperfecto.com.gt`.
- Do not hardcode real Airbnb iCal URLs or tokens in SEO metadata.
- Do not add booking, payment, calendar, database, or admin logic in this phase.

## Implemented Routes

```text
app/robots.ts
app/sitemap.ts
```

## Implemented Metadata

```text
Root metadataBase and site defaults
Home metadata
Accommodation listing metadata
Accommodation detail metadata
Open Graph metadata
Twitter summary_large_image metadata
Canonical URLs
```

## Local QA

After running the application locally, verify:

```text
/sitemap.xml renders successfully.
/robots.txt renders successfully.
The home page has the correct title and description.
/alojamientos has the correct title and description.
Each accommodation detail page has a unique title, description, and canonical URL.
Open Graph image URLs are absolute.
```

## Deferred Items

Do not solve these in Phase 2.8:

```text
Custom generated OG images
Structured data / JSON-LD
Cloudinary image URLs
Multilingual route metadata
Prisma-driven metadata
Production search console setup
```

Those belong to later phases after the public static foundation and production deployment are more stable.
