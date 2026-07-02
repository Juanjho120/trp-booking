# 03 — Architecture

## High-Level Architecture

```text
Guest / Admin Browser
        |
        v
Next.js 15 on Vercel Pro
        |
        |--- Public pages
        |--- Admin pages
        |--- Server Actions
        |--- Route Handlers
        |--- API endpoints
        |
        v
Prisma
        |
        v
PostgreSQL / Supabase
```

External services:

```text
Cloudinary   -> image storage, delivery, optimization
Tilopay      -> online payments and refunds
Resend       -> transactional email
Airbnb iCal  -> external availability synchronization
Vercel Cron  -> scheduled synchronization every 30 minutes
```

## Next.js Application Structure

Recommended structure:

```text
app/
  [locale]/
    page.tsx
    alojamientos/
      page.tsx
      [slug]/
        page.tsx
    politicas/
      page.tsx
    contacto/
      page.tsx
    faq/
      page.tsx
    admin/
      layout.tsx
      page.tsx
      properties/
      reservations/
      calendar/
      payments/
      settings/
  api/
    cron/
      sync-airbnb-calendars/
        route.ts
    webhooks/
      tilopay/
        route.ts
    ical/
      [token]/
        route.ts
components/
features/
lib/
prisma/
docs/
public/
```

The exact folder structure can be refined during implementation, but business logic should be separated from UI components.

## Main Application Layers

```text
UI components
Feature components
Server actions / route handlers
Services
Providers
Prisma repositories / queries
Database
```

## Core Services

Suggested services:

```text
AccommodationService
AvailabilityService
ReservationService
PaymentService
TilopayPaymentProvider
RefundService
CalendarSyncService
AirbnbIcalProvider
IcalExportService
EmailService
CloudinaryImageService
AdminAuditService
```

## Payment Abstraction

Do not spread Tilopay-specific logic across the application.

Use:

```text
PaymentService
    |
    |--- TilopayPaymentProvider
```

This allows replacing or adding another provider later without rewriting reservation logic.

## Image Handling

Use Cloudinary for:

```text
Image upload
Image storage
Image transformation
Responsive delivery
Gallery rendering
SEO-friendly alt text
```

Store only Cloudinary identifiers and URLs in the database.

## Authentication

Use Auth.js / NextAuth for admin authentication.

Initial roles:

```text
ADMIN
```

Optional future role:

```text
OWNER
```

Keep authorization simple for MVP.

## i18n

Public site must support Spanish and English from the beginning.

Possible route structure:

```text
/es
/en
```

Default language decision can be finalized during setup. Since foreign guests are important, English must not be treated as an afterthought.

## Environment Configuration

Environment variables must be validated centrally.

Example groups:

```text
App
Database
Auth
Cloudinary
Tilopay
Resend
Cron
```

Never read raw environment variables scattered across the codebase without validation.

## Cron Architecture

Vercel Cron calls:

```text
/api/cron/sync-airbnb-calendars
```

Frequency:

```text
Every 30 minutes
```

The endpoint must be protected with a secret.

## Deployment Environments

```text
Development:
- Local Next.js
- Supabase portfolio-lab schema trp_booking
- Tilopay sandbox
- Personal/dev Cloudinary account
- Resend test/verified domain when available

Production:
- Vercel Pro
- Dedicated Supabase project
- Tilopay production affiliation
- Company Cloudinary account
- Verified Resend domain
- turefugioperfecto.com.gt
```
