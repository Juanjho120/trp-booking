# 74 — Brand Identity Refresh

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.1 — Brand Identity Refresh
9.11.1-A Production raster assets — Completed
9.11.1-B Reusable brand components — Completed
9.11.1-C Application and metadata integration — Next
9.11.1-D Responsive QA and documentation closure — Not started
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

## Usage examples

```tsx
import { BrandLogo, BrandMark } from "@/components/brand";

<BrandLogo priority width={220} />
<BrandMark alt="" width={48} />
```

## Scope boundary

9.11.1-B does not replace the existing temporary `TRP` presentation yet.

The following belongs to 9.11.1-C:

```text
Public header and footer
Admin sidebar and mobile navigation
Admin login
Next.js metadata and icons
Open Graph and social metadata
Transactional email brand header preparation
```
