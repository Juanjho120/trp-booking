# 11 — Progress Log

This document tracks completed implementation work so the project can be resumed from another conversation without losing context.

## Current Status

```text
Current phase: Phase 2 — Public Website Foundation
Current subphase: 2.7 Public copy cleanup and visual QA
```

## Completed Work

| Phase | Subphase | Status | Notes |
|---|---:|---|---|
| Phase 0 | 0.1 | Completed | Initial project definition, scope, architecture, database planning, payments, iCal sync, deployment, and phase documentation created. |
| Phase 1 | 1.1 | Completed | GitHub repository `trp-booking` created. |
| Phase 1 | 1.2 | Completed | Documentation committed first. |
| Phase 1 | 1.3 | Completed | Clean Next.js 15 setup completed after reverting the accidental Next 16 setup. |
| Phase 1 | 1.4 | Completed | TypeScript strict and ESLint kept enabled. |
| Phase 1 | 1.5 | Completed | shadcn/ui with Radix Luma preset installed. |
| Phase 1 | 1.6 | Completed | Base folders added: `config`, `features`, `lib`, `messages`, and `types`. |
| Phase 1 | 1.7 | Completed | Initial typed site config, accommodation config, localized messages, and centralized error foundation added. |
| Phase 2 | 2.1 | Completed | Initial marketing homepage shell added. |
| Phase 2 | 2.2 | Completed | Public layout foundation added with header, footer, navigation, and marketing sections. |
| Phase 2 | 2.3 | Completed | Static accommodation listing and detail pages added. |
| Phase 2 | 2.4 | Completed | Static image foundation added using optimized local WebP assets. |
| Phase 2 | 2.5 | Completed | Public copy centralization started and amenity icon foundation prepared. |
| Phase 2 | 2.6 | Completed | Public copy centralized in `messages/en.ts` and `messages/es.ts`; amenity labels and icons centralized through the typed amenity catalog. |

## Important Technical Decisions Already Applied

```text
- Next.js 15.5.20 is the target version.
- React Compiler is disabled for now.
- Code stays outside a src/ directory.
- TypeScript strict must remain enabled.
- shadcn/ui + Radix Luma is the design system foundation.
- No unstyled native browser UI should be used for public booking, payment, calendar, modal, select, alert, confirmation, or form interactions.
- Public copy should be centralized in message files instead of hardcoded in TSX components.
- Accommodation content can remain in typed config until it moves to the database.
- Amenity labels/icons are centralized in a catalog.
- TRP Booking must not grow into a PMS; TAMIAS remains the PMS/internal operations system.
```

## Next Recommended Work

```text
1. Perform visual QA on the public home and accommodation pages.
2. Review responsive behavior on mobile, tablet, and desktop.
3. Clean remaining user-facing copy that is still hardcoded in TSX.
4. Add basic static SEO metadata for public pages.
5. Start Prisma + Supabase setup only after the public static foundation is stable.
```
