# 01 — Product Scope

## Product Definition

TRP Booking is a public direct booking website for Tu Refugio Perfecto.

The product must help potential guests:

- Discover the accommodations.
- Trust the brand.
- Understand rules, amenities, and policies.
- Check available dates.
- Book directly.
- Pay online.
- Receive clear confirmation and arrival instructions.

## Core Public Features

```text
Home page
Accommodation listing page
Accommodation detail pages
Photo galleries
Amenities
Rules
Availability calendar
Reservation flow
Payment flow
Policies page
Contact page
FAQ section
Spanish / English public content
```

## Core Admin Features

```text
Admin login
Dashboard
Accommodation management
Photo management
Amenity management
Rule management
Reservation management
Manual calendar blocks
Preparation buffer blocks and manual unlocks
Reservation date change / extension review
Payment status review
Refund tracking
Airbnb iCal configuration
Force Airbnb calendar sync
```


## Reservation Changes and Extensions

Guests must not be able to freely change confirmed reservation dates from the public website.

For the MVP, date changes are handled as an admin-approved operational process:

```text
Guest requests change by contact channel
Admin reviews availability
Admin approves or rejects
If needed, guest cancels and creates a new reservation
If additional payment is required, it must be collected before confirming the change
```

Preferred guest-facing rule:

```text
If the guest booked incorrect dates, the guest should request assistance or cancel and create a new reservation according to the cancellation policy.
```

Stay extensions while the guest is already on the property must:

```text
Check availability first
Respect preparation buffer rules
Calculate any additional cost server-side
Collect or record additional payment before confirming
Create an admin audit log
```

Self-service date modification is out of scope for the MVP.

## Preparation Buffer Scope

The system must automatically block preparation days around confirmed reservations and imported Airbnb bookings.

Initial rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

These preparation blocks must be visible in the admin calendar, must block public availability, and must be exported to Airbnb through TRP Booking iCal.

The admin can manually unlock preparation buffer days when operationally convenient.

## Out of Scope

The following features belong to TAMIAS or future separate systems, not TRP Booking:

```text
Full PMS functionality
Maintenance operations
Inventory management
Purchasing workflows
Internal document management
Full accounting
Staff task management
AI assistant for internal operations
Complex multi-organization management
Channel manager integrations beyond iCal
Native mobile app
```

## MVP Scope

The MVP should include:

```text
Public bilingual site
Three reservable listings
Cloudinary galleries
Admin authentication
Admin accommodation management
Availability logic
Preparation buffer block generation
Airbnb iCal import/export
Direct reservations
Tilopay sandbox integration
Webhook-based payment confirmation
Resend email notifications
Manual sync button
Basic cancellation/refund tracking
```

## Production Scope

The first production-ready version should add:

```text
Tilopay production credentials
Verified Resend domain
Production Cloudinary account
Production Supabase project
Vercel Pro deployment
Domain configuration
End-to-end payment tests
Webhook verification tests
iCal sync validation
SEO metadata
Sitemap
Robots.txt
```

## Strategic Scope Boundary

If a requirement starts to resemble an internal property operations module, it should be evaluated for TAMIAS instead of TRP Booking.

TRP Booking should remain lean, public-facing, and reservation-focused.
