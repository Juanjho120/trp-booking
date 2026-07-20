# 75 — Reusable Brand Components

## Purpose

This document records the implementation contract for Phase 9.11.1-B.

Brand asset paths, intrinsic dimensions, and rendering defaults must be centralized so public, admin, metadata, and future email modules do not implement the logo independently.

## Exports

```text
@/components/brand
  BrandLogo
  BrandLogoProps
  BrandMark
  BrandMarkProps
  brandAssets
  BrandAssetName
  getBrandAssetHeight
```

## BrandLogo

`BrandLogo` renders the approved logo with the `Tu Refugio Perfecto` wordmark.

Default contract:

```text
Source: /brand/logo-primary.png
Default rendered width: 240px
Intrinsic aspect ratio: 1233 / 1132
Default alt: siteConfig.brandName
Default quality: 100
```

Recommended placements:

```text
Public footer
Wide public-header treatment where space permits
Admin login
Reservation confirmation screen
Transactional email header preparation
Brand-focused empty or confirmation states
```

## BrandMark

`BrandMark` renders the approved symbol without the wordmark.

Default contract:

```text
Source: /brand/logo-mark.png
Default rendered width: 64px
Intrinsic aspect ratio: 1121 / 1036
Default alt: siteConfig.brandName
Default quality: 100
```

Recommended placements:

```text
Compact public header
Admin sidebar
Admin mobile navigation
Small confirmation badges
Icon-only brand contexts
```

Favicons remain static metadata assets and do not render through the React component.

## Accessibility

- Use the default alt text when the logo is the only visible brand identification.
- Pass `alt=""` when equivalent visible text appears beside the image.
- Do not repeat the brand name in both the image alternative text and immediately adjacent text.
- Do not use CSS background images for meaningful brand identification.

## Rendering rules

- Prefer changing the `width` prop instead of supplying arbitrary width and height pairs.
- The component calculates height from the approved intrinsic ratio.
- Responsive callers may combine `width`, `sizes`, and Tailwind width classes.
- Do not stretch or crop the logo with fixed conflicting height classes.
- Do not replace `src` from feature modules.
- Do not use the wordmark at favicon-scale sizes.

## Phase 9.11.1-B validation gate

```text
TypeScript strict-compatible component signatures
No new dependency
No visible hardcoded copy
No integration changes outside components/brand
No replacement of public/admin placeholders until 9.11.1-C
Manifest paths are repository-relative
```


## Phase 9.11.1-C consumers

The first approved runtime consumers are:

```text
Public header: BrandMark
Public footer: BrandLogo
Admin desktop/mobile navigation: BrandMark
Admin sign-in: BrandLogo
```

Metadata icons do not render through React. They use the approved mark-only files directly because browser and device icon sizes are too small for the wordmark.
