# 90 — Transactional Email Brand Logo Hosting

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Context: Phase 10.4 validation follow-up
Status: Completed; local-link behavior clarified during Pre-Phase-12 Package F.3
Base commit: d3803fb7744c5d9836db7a37001b2753c3f4c8f8
Current refinement base: 4b4f1cfa93b1cdb483f098ffffb981236b4f90a5
```

## Purpose

Keep transactional email branding independent from the application deployment URL. The logo image must always be loaded from a permanent public HTTPS asset, while application links continue to use `EMAIL_PUBLIC_BASE_URL`.

## Canonical Asset

```text
EMAIL_BRAND_LOGO_URL=https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png
```

This Cloudinary URL is public configuration, not a secret.

## Rendering Contract

`EMAIL_BRAND_LOGO_URL` is the `<img src>` used by all reservation, arrival, lifecycle, refund, and lifecycle-adjustment transactional templates through the shared email layout.

`EMAIL_PUBLIC_BASE_URL` remains responsible for application URLs such as public-home links, protected admin reservation links, and lifecycle payment handoff links.

The brand image itself follows this environment behavior:

```text
local
  image src: Cloudinary HTTPS asset
  clickable brand href: omitted when EMAIL_PUBLIC_BASE_URL is localhost/loopback

test
  image src: Cloudinary HTTPS asset
  clickable brand href: https://trp-booking.juantzun.dev

production
  image src: Cloudinary HTTPS asset
  clickable brand href: https://turefugioperfecto.com
```

This prevents a delivered local test email from exposing a useless `http://localhost:3000/` logo link while preserving normal navigation for deployed test and production messages.

## Validation Contract

When email delivery is enabled:

```text
- EMAIL_BRAND_LOGO_URL is required.
- The URL must use HTTPS.
- The URL must be publicly reachable and must not use localhost or loopback hosts.
- Embedded URL credentials are rejected.
- EMAIL_DELIVERY_MODE=disabled does not require the logo URL.
```

Template input validates the same HTTPS/public-host contract before rendering.

## Delivery Boundary

This change does not alter payment approval, reservation confirmation, `EmailNotification` persistence, deduplication, retry scheduling, Resend authentication, Reply-To routing, or provider idempotency.

An invalid brand-logo configuration can fail an email delivery attempt, but it must never roll back an approved payment or confirmed reservation.
