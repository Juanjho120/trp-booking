# 09 — Deployment

## Deployment Platform

Use:

```text
Vercel Pro
```

Reasons:

```text
Next.js support
Production hosting
Preview deployments
Custom domain
Cron Jobs for 30-minute Airbnb sync
Environment variable management
```

## Domain

Official domain:

```text
turefugioperfecto.com.gt
```

## Environments

### Development

```text
Local Next.js app
Supabase portfolio-lab schema trp_booking
Tilopay sandbox
Cloudinary dev/personal account
Resend test or verified dev setup
Vercel preview deployments
```

### Production

```text
Vercel Pro production deployment
Dedicated Supabase project for TRP Booking
Tilopay production affiliation
Company Cloudinary account
Verified Resend domain
Official .com.gt domain
```

## Environment Variables

Suggested variables:

```text
# App
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_NAME

# Database
DATABASE_URL
DIRECT_URL

# Auth
AUTH_SECRET
AUTH_URL

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

# Tilopay
TILOPAY_ENV
TILOPAY_API_URL
TILOPAY_API_KEY
TILOPAY_SECRET
TILOPAY_WEBHOOK_SECRET

# Resend
RESEND_API_KEY
RESEND_FROM_ES
RESEND_FROM_EN
RESEND_FROM_ADMIN

# Cron
CRON_SECRET

# iCal
ICAL_EXPORT_BASE_URL
```

Do not commit `.env` files with real values.

## Supabase Strategy

Initial development:

```text
portfolio-lab schema: trp_booking
```

Production later:

```text
Dedicated Supabase project: trp-booking-production or similar
```

Migration to production should happen before accepting real reservations and payments.

## Cloudinary Strategy

Development:

```text
Use current personal/dev account
```

Production:

```text
Use company-owned Cloudinary account
```

Images should be uploaded through authenticated admin flows.

## Resend Strategy

Verify the domain:

```text
turefugioperfecto.com.gt
```

Configure senders:

```text
reservas@turefugioperfecto.com.gt
reservations@turefugioperfecto.com.gt
admin@turefugioperfecto.com.gt
```

Configure DNS records according to Resend requirements.

## Tilopay Strategy

Development:

```text
Use Tilopay sandbox credentials
```

Production:

```text
Use official company affiliation
Use BI as the intended bank relationship
Configure production webhook URL
Validate refund API behavior
```

## Vercel Cron

Cron endpoint:

```text
/api/cron/sync-airbnb-calendars
```

Schedule:

```text
*/30 * * * *
```

Security:

```text
CRON_SECRET
```

## Production Launch Checklist

```text
Domain configured
HTTPS active
Supabase production ready
Prisma migrations applied
Cloudinary production configured
Resend domain verified
Tilopay production configured
Webhook endpoint verified
Cron configured
Airbnb iCal import configured privately
TRP Booking iCal export URLs imported into Airbnb
Admin user created
Policies reviewed
Cancellation policy reviewed
Test reservation completed
Test payment completed
Test cancellation completed
Test refund completed, if supported
Email templates tested
Mobile responsive review completed
SEO metadata configured
Sitemap generated
Robots.txt configured
```
