# 76 — Brand Application and Metadata Integration

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.1 — Brand Identity Refresh
Delivery: 9.11.1-C Application and metadata integration
Status: Completed and accepted
Base commit: ff61f42304780f1f1e049e6350de1d85be799a1e
Integration commit: 8ac8291db2296f2c977f5e6667150a7ea0b8f9a8
Visible-name follow-up commit: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
Closure delivery: 9.11.1-D Responsive QA and documentation closure
```

## Purpose

This delivery moved the approved Tu Refugio Perfecto assets from passive files into the real application surfaces before Phase 10 email templates are designed.

## Public application integration

```text
Public header uses BrandMark in the compact home link.
Visible adjacent brand text remains available on sm+ screens.
The link keeps its localized accessible home label on every breakpoint.
Public footer uses BrandLogo with the full wordmark.
Existing public content and navigation remain unchanged.
```

## Admin integration

```text
Desktop sidebar uses BrandMark.
Mobile admin top bar uses BrandMark.
Admin navigation sheet uses BrandMark.
The obsolete TRP text placeholder is removed from visible application surfaces.
The public brand name is used instead of the internal technical name in visible identity text.
```

## Branded Auth.js sign-in

Auth.js declares:

```text
pages.signIn = /admin-login
```

The route:

```text
app/admin-login/page.tsx
```

Behavior:

```text
- Shows the approved BrandLogo.
- Uses centralized ES/EN copy through the existing locale system.
- Starts the existing Google OAuth provider through a server action.
- Redirects an already authorized admin to the requested safe admin path.
- Accepts only local /admin callback destinations; arbitrary external redirects are not returned.
- Keeps robots index/follow disabled.
```

This does not change the server-side allowlist, verified Google email requirement, JWT strategy, role assignment, or protected `/admin` namespace.

## Metadata integration

Root metadata defines:

```text
Public application name and existing SEO values
Favicons 16/32/48 and ICO
Apple touch icon 180x180
Open Graph website metadata
1200x630 approved Open Graph image
Twitter summary_large_image metadata
```

File-based application icons:

```text
app/favicon.ico
app/icon.png
app/apple-icon.png
```

All favicon-scale files use the mark without text.

## Accepted validation

The application and metadata integration was reported functioning and committed before Phase 9.11.1-D began.

The responsive closure then hardened narrow and short viewport behavior without changing the approved visual identity or authorization model.

## Scope boundary

This delivery did not add:

```text
Resend integration
Transactional email templates
Email header rendering
Accommodation admin editing
Photo management
Amenity/rule management
Cancellation/refund behavior
PMS features
```

The approved logo is ready to be reused by Phase 10 templates after Phase 9.11 is complete.
