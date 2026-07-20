# 77 — Responsive Brand QA and Closure

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.1 — Brand Identity Refresh
Delivery: 9.11.1-D Responsive QA and documentation closure
Status: Completed when this package passes local validation and is committed
Base commit: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
Next subphase: 9.11.2 Accommodation content management
```

## Purpose

This delivery closes the brand refresh after the approved assets, reusable components, application integration, authentication surface, and metadata were implemented and accepted.

The closure is limited to responsive hardening, accessibility preservation, and official documentation updates.

## Responsive issues addressed

### Public footer contact values

Reservation and admin email addresses are long enough to exceed the available width on narrow screens.

The contact container now uses:

```text
overflow-wrap: anywhere
```

This preserves the existing copy and links while preventing horizontal page overflow.

### Mobile admin top bar

The compact admin header must show three operational controls:

```text
Menu trigger
Brand mark
ES/EN locale selector
```

Adjacent brand text is useful but redundant at the smallest widths. It is now hidden below the `sm` breakpoint while the mark remains visible.

The locale selector is also protected from flex shrinking.

### Branded admin sign-in

The sign-in card can be taller than short mobile viewports.

The page now:

```text
allows vertical scrolling
prevents only horizontal overflow
starts below the fixed locale selector on small screens
returns to vertically centered presentation from sm upward
```

This prevents the logo, badge, authentication button, access note, or public-site link from being clipped.

## Preserved behavior

```text
BrandLogo and BrandMark keep their approved intrinsic aspect ratios.
The public header still uses BrandMark.
The public footer still uses BrandLogo.
Desktop and mobile admin navigation still use BrandMark.
/admin-login still uses BrandLogo.
Favicons and application icons still use the mark without text.
Open Graph and Twitter metadata still use the approved 1200x630 image.
Auth.js Google OAuth, verified-email requirement, JWT role, allowlist, and callback safety remain unchanged.
No visible copy was added or moved out of messages/es.ts and messages/en.ts.
No dependency or database migration was added.
```

## Local validation

Run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
```

Responsive manual matrix:

```text
320px wide — public header, footer emails, admin top bar, admin login
375px wide — public header, footer emails, admin top bar, admin login
768px wide — public header/footer and tablet admin header
1024px wide — desktop admin sidebar transition
1440px wide — full public and admin composition
Short mobile viewport — /admin-login vertical scrolling
```

Acceptance checklist:

```text
No horizontal scrollbar caused by brand or contact content.
Public header mark remains sharp and contained.
Footer wordmark remains readable and proportionate.
Footer email links wrap without leaving the viewport.
Mobile admin menu trigger and locale selector remain visible.
Mobile admin mark remains visible when adjacent text is hidden.
Admin navigation sheet retains the full localized identity.
/admin-login can scroll to every control on a short viewport.
Favicon uses the mark without text.
Open Graph and Twitter metadata remain present in the built HTML.
```

## Documentation closure

This delivery updates:

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/74-brand-identity-refresh.md
docs/75-reusable-brand-components.md
docs/76-brand-application-and-metadata-integration.md
public/brand/brand-manifest.json
```

Phase 9.11.1 is complete after local validation and commit. Phase 9.11 remains in progress and continues with accommodation content management.
