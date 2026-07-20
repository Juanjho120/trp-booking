# 76 — Brand Application and Metadata Integration

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.1 — Brand Identity Refresh
Delivery: 9.11.1-C Application and metadata integration
Status: In progress pending local build and visual acceptance
Base commit: ff61f42304780f1f1e049e6350de1d85be799a1e
Next delivery: 9.11.1-D Responsive QA and documentation closure
```

## Purpose

This delivery moves the approved Tu Refugio Perfecto assets from passive files into the real application surfaces before Phase 10 email templates are designed.

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
The obsolete TRP text placeholder is removed from centralized messages.
```

## Branded Auth.js sign-in

Auth.js now declares:

```text
pages.signIn = /admin-login
```

The new route:

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

Root metadata now defines:

```text
Application name and existing SEO values
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

## Scope boundary

This delivery does not add:

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

The approved logo is now ready to be reused by Phase 10 templates after Phase 9.11 is complete.

## Validation

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
```

Manual acceptance:

```text
1. Open the public site on mobile and desktop.
2. Verify the header mark is sharp, contained, and not stretched.
3. Verify the full footer logo is readable and does not dominate the footer.
4. Open /admin while signed out and confirm the branded sign-in page appears.
5. Complete Google login with the allowlisted admin account.
6. Verify desktop sidebar, mobile top bar, and mobile sheet branding.
7. Confirm the favicon uses the symbol without text.
8. Inspect Open Graph and Twitter metadata in the built HTML.
```
