# 90 — Transactional Email Brand Logo Hosting

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Context: Phase 10.4 validation follow-up
Status: Implementation prepared; pending local validation and commit
Base commit: d3803fb7744c5d9836db7a37001b2753c3f4c8f8
```

## Purpose

Ensure the branded transactional email logo renders in local and test email deliveries before the Vercel test deployment exists, without changing recipient routing, payment approval, reservation confirmation, or provider-failure behavior.

This document supersedes the earlier Phase 10 statements that derived the email logo from `EMAIL_PUBLIC_BASE_URL`. Only application links continue to use that base URL.

## Problem

The template previously converted `/brand/logo-primary.png` into an absolute URL using `EMAIL_PUBLIC_BASE_URL`. When that base URL pointed to localhost or to the not-yet-deployed `trp-booking.juantzun.dev`, Gmail could not fetch the image and displayed a broken logo.

## Accepted Design

Introduce one server-side variable:

```text
EMAIL_BRAND_LOGO_URL
```

It contains the permanent, publicly reachable HTTPS URL of the approved primary logo, preferably hosted in Cloudinary. Application links continue to use `EMAIL_PUBLIC_BASE_URL`.

Example:

```env
EMAIL_PUBLIC_BASE_URL="http://localhost:3000"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/ACCOUNT/image/upload/trp-booking/brand/logo-primary.png"
```

## Validation Contract

When `EMAIL_DELIVERY_MODE=test|production`:

```text
- EMAIL_BRAND_LOGO_URL is required.
- The URL must use HTTPS.
- The URL must be publicly reachable and must not use localhost or loopback hosts.
- Embedded URL credentials are rejected.
- EMAIL_DELIVERY_MODE=disabled does not require the logo URL.
```

Template input validates the same HTTPS/public-host contract before rendering.

## Delivery Boundary

This change does not alter:

```text
- EMAIL_TEST_RECIPIENT override behavior
- Intended recipient persistence
- Resend sender or reply-to selection
- Notification deduplication keys
- Reservation confirmation transactions
- Payment status
- FAILED email isolation
```

An invalid brand-logo configuration prevents the provider delivery attempt from being prepared, while the approved payment and confirmed reservation remain successful.

## Files

```text
.env.example
lib/env/server.ts
types/email-template.ts
emails/template-data.ts
lib/email/reservation-confirmation-notifications.ts
README.md
docs/89-test-and-production-environment-strategy.md
docs/90-transactional-email-brand-logo-hosting.md
```
