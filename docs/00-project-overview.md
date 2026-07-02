# 00 — Project Overview

## Project Name

```text
Technical name: trp-booking
Internal name: TRP Booking
Commercial brand: Tu Refugio Perfecto
Public SEO name: Bungalows Tu Refugio Perfecto
Official domain target: turefugioperfecto.com.gt
```

## Objective

Build a professional direct booking website for the accommodations of Tu Refugio Perfecto in Panajachel, Guatemala.

The platform must allow guests to:

- Learn about the accommodations.
- View photos, amenities, rules, and policies.
- Check availability.
- Reserve available dates.
- Pay online.
- Receive reservation confirmation and arrival instructions.

The platform must allow the administrator to:

- Manage accommodations.
- Manage photos.
- Manage amenities and rules.
- Manage reservations.
- Manage payments and refunds.
- Manage manual calendar blocks.
- Sync Airbnb calendars.
- Force calendar synchronization manually.

## What This Project Is

TRP Booking is a:

```text
Direct Booking Website / Booking Engine
```

It combines public SEO pages with a transactional reservation flow.

## What This Project Is Not

TRP Booking is **not** a PMS.

TAMIAS is the internal PMS / property operations system. TRP Booking should not grow into a full internal operations platform.

## Confirmed Stack

```text
Next.js 15
TypeScript
Prisma
PostgreSQL / Supabase
Auth.js / NextAuth
Tilopay
Cloudinary
Resend
Vercel Pro
Vercel Cron every 30 minutes
```

## Initial Database Strategy

During development, use the existing Supabase Pro organization with a shared `portfolio-lab` project and a dedicated schema:

```text
Supabase Pro Organization
|
|--- tamias-production
|--- portfolio-lab
     |--- trp_booking
     |--- portfolio
     |--- tamias_demo
     |--- other demo projects
```

When the project moves to real production usage with real guests and payments, create a separate Supabase project for TRP Booking.

## Initial Accommodations

```text
Apartamento Blanco y Negro
Black & White Apartment
Base price: $65/night
Max guests: 2

Bungalow Refugio Perfecto
Perfect Retreat Bungalow
Base price: $95/night
Max guests: 4

Refugio Completo
Complete Private Retreat in Panajachel
Base price: $145/night
Max guests: 6
```

`Refugio Completo` is a composed listing that includes the other two accommodations.

## Public Languages

The public site must support:

```text
Spanish
English
```

The project should be structured for bilingual content from the beginning.

## Currency

The main booking currency is:

```text
USD
```

## Payment Flow

The booking flow charges:

```text
100% at reservation time
```

A reservation becomes confirmed only after payment confirmation through a trusted Tilopay flow, preferably webhook confirmation.

## Email Provider

Use Resend for transactional email.

Official sending identities:

```text
reservas@turefugioperfecto.com.gt
reservations@turefugioperfecto.com.gt
admin@turefugioperfecto.com.gt
```

## Deployment

Use Vercel Pro for production deployment and cron support.

Cron schedule:

```text
Every 30 minutes
```

Purpose:

```text
Synchronize Airbnb iCal availability with TRP Booking.
```
