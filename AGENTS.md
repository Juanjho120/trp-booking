# AGENTS.md — TRP Booking Collaboration Rules

This file defines the working rules for TRP Booking.

## Project Identity

- Technical project name: `trp-booking`.
- Internal project name: `TRP Booking`.
- Public brand: `Tu Refugio Perfecto` / `Bungalows Tu Refugio Perfecto`.
- Official domain target: `turefugioperfecto.com.gt`.
- This project is a direct booking website, not a PMS.
- TAMIAS remains the PMS / internal operations system.

## Required Working Style

- Always review the current repository state before suggesting code changes.
- Always use cache-busting when reviewing GitHub repository contents.
- Do not assume a file exists unless it has been verified.
- For non-trivial changes, provide a ZIP with real files respecting the folder structure.
- For surgical changes, provide exact file names and exact snippets.
- Do not provide `.ps1` or `.sh` scripts as the main delivery method.
- Do not invent fields, database columns, components, or services that are not documented or explicitly proposed.
- Do not move the project toward PMS features unless explicitly requested.

## ZIP Delivery Gate

Before preparing any ZIP delivery for this repository, the implementation must pass this gate:

```text
- AGENTS.md reviewed.
- docs/10-phases.md reviewed.
- docs/11-progress-log.md reviewed.
- Current phase/subphase confirmed.
- Public-facing and admin-facing copy reviewed.
- New visible copy is centralized in messages/es.ts and messages/en.ts.
- No new visible strings are introduced through feature-local copy files.
- No visible TSX labels, section titles, CTA copy, empty states, guardrails, or helper text are hardcoded directly in components.
- Visible reservation/payment statuses and event labels are localized when shown to users or admins.
- No .ps1 or .sh files are used as the main delivery method.
- ZIP contains real files respecting the repository folder structure.
```

If any gate item cannot be satisfied, the ZIP must not be delivered until the issue is fixed or explicitly documented.

## Phase and Progress Tracking

- `docs/10-phases.md` is the official phase plan.
- `docs/11-progress-log.md` is the official progress tracker.
- Any completed phase or subphase must be reflected in the progress tracker before moving to a new major phase.
- When migrating to a new conversation, use `README.md`, `docs/10-phases.md`, and `docs/11-progress-log.md` as the minimum continuity context.

## UI and Design System Rules

- Do not use unstyled native browser UI for user-facing booking, payment, calendar, modal, select, alert, confirmation, or form interactions.
- Do not use native `alert()`, `confirm()`, or `prompt()`.
- Do not expose native browser date pickers as the main booking calendar.
- All public-facing and admin-facing interactions must use the project design system.
- Use styled, accessible components based on the approved UI stack.
- Approved UI foundation: shadcn/ui + Radix UI + Tailwind CSS.

## Copy, i18n, and Error Message Rules

- User-facing public copy must be centralized in `messages/es.ts` and `messages/en.ts`.
- Admin-facing copy must also be centralized in `messages/es.ts` and `messages/en.ts`.
- Avoid hardcoding user-facing labels, section titles, CTA copy, and page text directly inside TSX components.
- Do not introduce feature-local visible copy files for public or admin UI.
- Accommodation content may remain in typed configuration until it moves to the database.
- Error messages must be centralized, reusable, bilingual, and grouped by domain.
- Do not show raw provider errors from Prisma, Tilopay, Resend, Cloudinary, Airbnb iCal, or other services directly to users.
- Amenity labels and icons must be centralized in the typed amenity catalog.

## Security Rules

- Do not commit secrets, API keys, webhook secrets, iCal URLs with tokens, or real credentials.
- Do not hardcode Airbnb iCal URLs in code or docs.
- Keep sensitive operational configuration in environment variables, secure database configuration, or admin-managed private settings.
- Do not store card data.
- Confirm reservations only after a provider payment result is validated server-side.
- Validate prices, availability, and guest counts on the server.

## Deletion Rules

- Do not hard-delete reservation, payment, refund, guest, calendar, or sync history data.
- Use soft delete for admin-managed business records unless the documentation explicitly allows hard delete.
- Preserve operational history needed for auditability, troubleshooting, refunds, and reservation disputes.

## Reservation Rules

- Guests must not modify confirmed reservation dates directly from the public website.
- Date changes require admin authorization or cancellation and a new reservation according to the cancellation policy.
- Stay extensions require availability validation and additional payment handling when applicable.
- Confirmed reservations and imported Airbnb bookings must generate preparation buffer blocks automatically.
- Preparation buffer blocks must affect public availability and iCal exports unless manually unlocked by admin.

## Development Standards

- Keep TypeScript strict enabled.
- Prefer typed configuration and explicit domain types.
- Use Zod for validation when forms and server actions are introduced.
- Keep business logic out of UI components when services are introduced.
- Use Prisma as the database access layer once the database phase starts.
- Do not introduce new dependencies without a clear reason.
- Do not integrate Tilopay, Cloudinary, Resend, or Airbnb iCal before the corresponding phase.
