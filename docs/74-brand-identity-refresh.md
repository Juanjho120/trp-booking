# 74 — Brand Identity Refresh

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.1 — Brand Identity Refresh
9.11.1-A Production raster assets — Completed
9.11.1-B Reusable brand components — Completed
9.11.1-C Application and metadata integration — Completed
9.11.1-D Responsive QA and documentation closure — Completed
```

## Approved asset decision

The two approved raster masters remain authoritative:

- `public/brand/source/logo-approved-with-text.png`
- `public/brand/source/logo-approved-mark.png`

The primary logo with text is used for general brand placements. The mark without text is used for favicons, compact placements, and icon-only contexts.

No automatically recreated SVG is accepted because the previous recreation did not preserve the approved typography and proportions faithfully.

## Runtime assets

```text
Primary logo: /brand/logo-primary.png
Intrinsic size: 1233 × 1132
Reusable component: BrandLogo

Brand mark: /brand/logo-mark.png
Intrinsic size: 1121 × 1036
Reusable component: BrandMark
```

## Component contract

The reusable components live under:

```text
components/brand/brand-assets.ts
components/brand/brand-logo.tsx
components/brand/brand-mark.tsx
components/brand/index.ts
```

Both components:

- use `next/image`;
- preserve the approved intrinsic aspect ratio;
- use quality `100` by default for logo clarity;
- support standard safe `ImageProps` such as `priority`, `loading`, `sizes`, `style`, and `className`;
- prohibit callers from replacing `src`, `height`, or `fill`;
- derive the default accessible name from `siteConfig.brandName`;
- allow `alt=""` when the image is decorative or adjacent to equivalent visible text;
- expose `data-slot` for predictable styling and testing.

## Application integration

The approved assets are consumed through `BrandLogo` and `BrandMark` in:

```text
components/layout/site-header.tsx
components/layout/site-footer.tsx
features/admin/components/admin-shell.tsx
features/auth/components/admin-sign-in-page.tsx
```

Metadata integration uses:

```text
app/favicon.ico
app/icon.png
app/apple-icon.png
/brand/logo-open-graph.png
```

The custom Auth.js sign-in route is `/admin-login`. It preserves the existing Google OAuth provider and server-side admin allowlist; it changes presentation and routing only, not authorization policy.

## Responsive closure

```text
Public header: compact mark remains visible at mobile widths; adjacent text begins at sm.
Public footer: long email addresses wrap instead of forcing horizontal overflow.
Admin desktop: sidebar uses the compact mark with adjacent localized identity text.
Admin mobile: menu, mark, and locale selector remain visible; redundant adjacent identity text is hidden below sm.
Admin sign-in: the full logo remains centered and the page can scroll vertically on short displays.
Favicons and application icons: mark only, without unreadable wordmark text.
```

## Completion boundary

Phase 9.11.1 is closed. Transactional email rendering may reuse the approved brand system in Phase 10, but Resend integration and email templates were not added here.
