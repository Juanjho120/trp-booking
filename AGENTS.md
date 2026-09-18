# AGENTS.md — TRP Booking Collaboration Rules

This file defines the working rules for TRP Booking.

## Project Identity

- Technical project name: `trp-booking`.
- Internal project name: `TRP Booking`.
- Public brand: `Tu Refugio Perfecto` / `Bungalows Tu Refugio Perfecto`.
- Official production domain: `turefugioperfecto.com`.
- Stable Test domain: `trp-booking.juantzun.dev`; the Vercel Test deployment and Phase 12 acceptance are completed. The current work boundary is the registered Post-Phase-12 / Pre-Phase-13 Final Improvement Track. Phase 13 remains Not started.
- This project is a direct booking website, not a PMS.
- TAMIAS remains the PMS / internal operations system.

## Current Active Work

- Phase 12 is completed and accepted.
- The Post-Phase-12 / Pre-Phase-13 Final Improvement Track is active.
- Final-A, Final-B, and Final-C are completed and accepted.
- Final-D is completed and accepted on 2026-09-18.
- Final-D.1 is completed and accepted.
- Final-D.2 is completed and accepted.
- Final-D.3 is completed and accepted on 2026-08-31 at `6a0d909fc325f4e8925677041be34c77c023c42b`.
- Final-D.4 is completed and accepted on 2026-09-14 at `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c`.
- Final-D.5 is completed and accepted on 2026-09-17 at `06b3de23fbae23a77b58b432760abf12afd5a6c7`.
- Final-D.6 is completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`.
- Final-D.7 is completed and accepted on 2026-09-18 at `fd75663bb28be8a95b15c341eaa51f74e521241b`.
- Final-D accepted feature head: `fd75663bb28be8a95b15c341eaa51f74e521241b`.
- Permanent Final-D regression gate: `npm run final-d:validate` — 66/66 accepted.
- Current package: Final-E — Reservation reviews and post-checkout invitation — In progress.
- Last accepted subphase: Final-E.1 — Review/invitation strategy, eligibility and security contract — Completed and accepted on 2026-09-18 at `e83ad8443bd533715058e701769b10c2d5505436`.
- Current/next subphase: Final-E.2 — Review/invitation persistence foundation and migration — Next / Not started.
- Final-D.4 implementation base: `6a0d909fc325f4e8925677041be34c77c023c42b`.
- Final-D.4 accepted implementation head: `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c`.
- Final-D.4 implementation record: `docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md`.
- Final-D.5 implementation base: `63f55e22d03270bce0d27be2197373e3ce3e5de8`.
- Final-D.5 accepted implementation head: `06b3de23fbae23a77b58b432760abf12afd5a6c7`.
- Final-D.5 implementation record: `docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md`.
- Final-D.6 implementation base: `1f3f30f63c0198afa219df9feea4f415cbc1ccd2`.
- Final-D.6 accepted implementation head: `965045c697a9bfd0a3318db9396b15214a0cd066`.
- Final-D.6 implementation and acceptance record: `docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md`.
- Final-D.7 implementation base: `0a511f4b87c3d8556593f9d48909a71d7bfab14c`.
- Final-D.7 accepted implementation/validation head: `fd75663bb28be8a95b15c341eaa51f74e521241b`.
- Final-D.7 implementation/acceptance record: `docs/185-final-d-7-integrated-regression-and-documentation-closure.md`.
- Final-E.1 implementation base: `2c9802b07ebf60e8953f32226962669eaf01cfc2`.
- Final-E.1 accepted strategy head: `e83ad8443bd533715058e701769b10c2d5505436`.
- Final-E.1 implementation and acceptance record: `docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md`.
- Final-E.2 is next but remains Not started until explicitly requested.
- Final-E.3, Final-E.4, Final-E.5, Final-E.6, and Final-E.7 remain Not started.
- Final-F, Final-G, and Final-H remain Not started.
- Phase 13 remains Not started and must not be activated implicitly.

## Environment Isolation

- `TRP_ENVIRONMENT=local|test|production` is the source of truth for the business/runtime environment.
- Phase 12 Test deployment and external-integration validation are completed and accepted.
- The Post-Phase-12 / Pre-Phase-13 Final Improvement Track continues implementation/validation against Local/Test boundaries and must not provision Production resources.
- Phase 13 is Production-only: provision company-owned infrastructure, deploy `TRP_ENVIRONMENT=production`, and perform controlled go-live work only after Final-H closes and the owner explicitly accepts the final improvement track.
- Do not infer the TRP environment only from `VERCEL_ENV`; the Test Vercel project may use a Vercel production deployment while remaining `TRP_ENVIRONMENT=test`.
- Do not infer that a documented target domain or environment contract is already deployed; verify deployment state explicitly before describing it as live.
- Local and Test intentionally reuse the same developer-owned Supabase database, Resend account/sending domain, Zoho organization/aliases, Cloudinary account, and Tilopay sandbox account.
- Test introduces a separate Vercel project in the existing developer account and a Test-specific `CRON_SECRET`; it does not introduce separate Test provider accounts.
- Test uses the real Airbnb inbound iCal URLs and will expose the TRP Booking Test outbound iCal for controlled real-listing validation. The owner intentionally accepts the shared Local/Test database and will control test data operationally; do not add environment partitioning or iCal filtering unless explicitly requested later.
- Existing `juantzun.dev` email DNS and Zoho configuration are reused for Test. Only the application-domain DNS required to attach `trp-booking.juantzun.dev` to Vercel is part of Phase 12.
- Production must not reuse developer-owned provider accounts. Phase 13 provisions new company-owned Vercel, Supabase, Resend, Zoho, Cloudinary, and Tilopay accounts, plus a company Gmail/Google identity for admin OAuth and production DNS for `turefugioperfecto.com`.
- Local enabled email delivery redirects only guest-audience messages to `EMAIL_TEST_RECIPIENT`; administrative messages continue to their intended `juantzun.dev` recipients.
- Test enabled email delivery sends guest messages to the intended reservation address and administrative messages to configured `juantzun.dev` recipients; `EMAIL_TEST_RECIPIENT` must be empty.
- Production delivery sends guest/admin messages to their intended recipients and requires administrative recipients under `turefugioperfecto.com`.
- Transactional email persistence always retains the intended recipient independently from the physical local-delivery override.

## Required Working Style

- Always inspect the actual repository state before proposing or making code changes.
- When working from a local clone, the local Git `HEAD`, index, and working tree are the source of truth.
- When reviewing repository state remotely through GitHub, use cache-busting where applicable and verify the current HEAD explicitly.
- Do not assume a file exists unless it has been verified.
- When Codex is working directly in the repository, modify the real working tree; do not create ZIP delivery packages unless explicitly requested.
- When working through a conversational artifact workflow that cannot edit the repository directly, non-trivial deliveries may use ZIPs containing real files with the repository folder structure preserved.
- For surgical changes, exact file names and exact snippets are acceptable when explicitly requested.
- Do not provide `.ps1` or `.sh` scripts as the main delivery method.
- Do not invent fields, database columns, components, services, scripts, or npm commands that are not present or explicitly proposed.
- Do not move the project toward PMS features unless explicitly requested.

## Git and Working-Tree Safety

Before modifying any file:

```text
- Inspect git status.
- Inspect the current HEAD.
- Read AGENTS.md.
- Read docs/10-phases.md.
- Read docs/11-progress-log.md.
- Read docs/160-post-phase-12-pre-phase-13-final-improvement-track.md while the Final Improvement Track is active.
- Read the authoritative record(s) for the active package/subphase.
```

Rules:

- Never reset, revert, overwrite, delete, or discard pre-existing owner changes unless explicitly asked.
- Treat uncommitted owner changes as authoritative working state that must be preserved.
- Do not amend, squash, rebase, rewrite, or force-update existing commits unless explicitly asked.
- Do not silently restore an older implementation because a historical document or prior assistant output differs from the current working tree.
- Do not make unrelated cleanup/refactors in the same task unless they are required for correctness and clearly documented.
- Review the final diff for accidental or unrelated changes before declaring work complete.

## Phase and Subphase Discipline

- Work on exactly one explicitly active phase/subphase at a time.
- Never begin the following subphase automatically.
- Do not implement future-subphase behavior "while already here".
- Do not activate Production or Phase 13 work from a Final Improvement Track task.
- A subphase may be declared completed only after implementation, required validation, documentation reconciliation, and owner acceptance are recorded.
- If documentation and the accepted repository state disagree, stop advancement and reconcile the authoritative trackers before implementing the next subphase.
- For the current handoff, Final-D.3 is accepted at `6a0d909fc325f4e8925677041be34c77c023c42b`; Final-D.4 is completed and accepted on 2026-09-14 at `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c`; Final-D.5 is completed and accepted on 2026-09-17 at `06b3de23fbae23a77b58b432760abf12afd5a6c7`; Final-D.6 is completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`; Final-D.7 and Final-D are completed and accepted on 2026-09-18 at `fd75663bb28be8a95b15c341eaa51f74e521241b`. Final-E is in progress; Final-E.1 is completed and accepted on 2026-09-18 at `e83ad8443bd533715058e701769b10c2d5505436`. Final-E.2 is Next / Not started, and Final-E.3 through Final-E.7 remain Not started until explicitly requested.

## Implementation Completion Gate

Before declaring a non-trivial implementation complete:

```text
- AGENTS.md reviewed.
- docs/10-phases.md reviewed.
- docs/11-progress-log.md reviewed.
- Active phase/subphase and implementation base confirmed.
- Relevant authoritative strategy/contract documents reviewed.
- git status and git diff reviewed.
- Public-facing and admin-facing copy reviewed when applicable.
- New visible copy is centralized in messages/es.ts and messages/en.ts.
- No new visible strings are introduced through feature-local copy files.
- No visible TSX labels, section titles, CTA copy, empty states, guardrails, or helper text are hardcoded directly in components.
- Visible reservation/payment statuses and event labels are localized when shown to users or admins.
- Relevant targeted validation is executed.
- Existing required regression gates are executed.
- npm run lint is executed when applicable.
- npm run build is executed when applicable.
- git diff --check is executed.
- No unrelated files are changed.
- Authoritative progress documentation is reconciled before moving to the next subphase.
```

If a required gate cannot be executed because of environment/provider limitations, report the exact blocker and do not claim the gate passed.

### Current validation commands

The repository currently exposes these permanent Final-track regression commands:

```text
npm run final-a:validate
npm run final-b:validate
npm run final-c:validate
npm run final-d:validate
```

Final-D.7 introduced the consolidated Final-D regression gate. For any future Final-D/Final-E continuation, run the relevant existing regression commands plus targeted tests/checks introduced or affected by the active subphase, together with the database/lint/build/diff checks required by the active record.

## Phase and Progress Tracking

- `docs/10-phases.md` is the official phase plan.
- `docs/11-progress-log.md` is the official progress tracker.
- `docs/160-post-phase-12-pre-phase-13-final-improvement-track.md` is the authoritative plan for the current Final-A through Final-H inter-phase track.
- `docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md` is the frozen Final-D behavioral/financial contract unless explicitly re-accepted after a documented change.
- `docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md` is the Final-D.3 implementation/acceptance record.
- `docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md` is the Final-D.4 implementation/acceptance record.
- `docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md` is the Final-D.5 implementation/acceptance record.
- `docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md` is the Final-D.6 implementation and acceptance record.
- `docs/185-final-d-7-integrated-regression-and-documentation-closure.md` is the Final-D.7 implementation/acceptance record and Final-D package closure record.
- `docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md` is the Final-E.1 implementation and acceptance record.
- Any completed phase or subphase must be reflected in the progress tracker before moving to a new major phase or subphase.
- When migrating to a new conversation or agent, use `AGENTS.md`, `README.md`, `docs/10-phases.md`, and `docs/11-progress-log.md` as the minimum continuity context. While the Final Improvement Track is active, also review `docs/160-post-phase-12-pre-phase-13-final-improvement-track.md` and the active package's authoritative records.
- Historical Phase 12 deployment work remains grounded by `docs/89-test-and-production-environment-strategy.md`, `docs/136-phase-12.1-test-deployment-and-environment-strategy.md`, and the Phase 12 closure records.

## Final-D Accepted Boundaries and Final-E.1 Accepted Boundary

Before implementing or continuing Final-E.2 or later work, read the complete Final-D.1 contract, the accepted D.2/D.3/D.4/D.5/D.6/D.7 records, and the accepted Final-E.1 record. Do not reopen D.1-D.7 or Final-E.1 unless new evidence or an explicit owner instruction requires it. Final-E.2 is Next / Not started, and Final-E.3 through Final-E.7 remain Not started until explicitly requested.

At minimum, preserve these frozen boundaries:

```text
- Private access uses the opaque GuestPaymentRequest token contract.
- Raw token appears only in the intended private URL and is never persisted or logged in plaintext.
- Token lookup uses the persisted SHA-256 hash; controlled reuse/resend may use the encrypted copy already established by D.3.
- A link is payable only while the request is PENDING and unexpired and its integrity checks pass.
- Initial expiry remains 168 hours / 7 days from request creation unless the frozen contract is explicitly changed and re-accepted.
- PaymentPurpose.ADDITIONAL_CHARGE and PaymentSubmissionSource.ADDITIONAL_CHARGE remain a distinct third payment branch.
- Payment amount/currency come only from the immutable GuestPaymentRequest snapshot.
- Validated APPROVED provider evidence is required before marking the request or charges PAID.
- Approved ancillary payment must not confirm/reconfirm the Reservation, mutate Reservation.total, mutate pricingSnapshot, alter stay cancellation-policy money, or complete a lifecycle date mutation.
- Rejected/failed payment attempts keep the still-valid request and charges PENDING and remain auditable.
- Provider callback/retry behavior must remain idempotent.
- The private guest page exposes only bounded guest-safe request context and must not grant access to admin reservation/payment/refund/lifecycle data.
- Final-E.1 is docs-only and must not implement schema/runtime/email/cron/UI behavior beyond documentation.
- Final-E.1 freezes one authentic review per eligible direct Reservation, checkout + 2 hours in America/Guatemala, a 7-day scheduler catch-up window, 30-day invitation expiry, REVIEW_INVITATION token crypto purpose, one-time private submission, moderation-before-publication, and zero Test Vercel cron registrations.
- Final-E.3 is a dormant domain foundation only: no cron registration, no public route, no REVIEW_INVITATION EmailNotification rows, no email delivery, and no automatic operational invitation creation.
- Final-E.4 is the first subphase allowed to activate scheduling and review-invitation email delivery, and it must add dispatcher support in the same changeset before any operational path can create REVIEW_INVITATION notification rows.
- Final-E.2, Final-E.3, Final-E.4, Final-E.5, Final-E.6, Final-E.7, Final-F, Final-G, Final-H, and Phase 13 must not begin automatically.
```

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

- Do not commit secrets, API keys, webhook secrets, iCal URLs with tokens, private guest payment tokens, or real credentials.
- Do not hardcode Airbnb iCal URLs in code or docs.
- Keep sensitive operational configuration in environment variables, secure database configuration, or admin-managed private settings.
- Do not store card data.
- Confirm reservations only after a provider payment result is validated server-side.
- Mark ancillary payment requests/charges paid only after validated provider evidence in the dedicated ancillary-payment branch.
- Validate prices, availability, guest counts, request status, request integrity, amount, and currency on the server as applicable.

## Deletion Rules

- Do not hard-delete reservation, payment, refund, guest, calendar, sync, AdditionalCharge, GuestPaymentRequest, request-item, or related operational-history data.
- Use soft delete/state transitions for admin-managed business records unless the documentation explicitly allows hard delete.
- Preserve operational history needed for auditability, troubleshooting, refunds, and reservation disputes.

## Reservation Rules

- Guests must not modify confirmed reservation dates directly from the public website.
- Date changes require admin authorization or cancellation and a new reservation according to the cancellation policy.
- Stay extensions require availability validation and additional payment handling when applicable.
- Confirmed reservations and imported Airbnb bookings must generate preparation buffer blocks automatically.
- Preparation buffer blocks must affect public availability and iCal exports unless manually unlocked by admin.
- Additional-charge collection is financially isolated from the accommodation stay value and must not silently mutate Reservation totals or stay pricing evidence.

## Development Standards

- Keep TypeScript strict enabled.
- Prefer typed configuration and explicit domain types.
- Use Zod for validation when forms and server actions are introduced.
- Keep business logic out of UI components when services are introduced.
- Use Prisma as the database access layer once the database phase starts.
- Do not introduce new dependencies without a clear reason.
- Do not integrate Tilopay, Cloudinary, Resend, Airbnb iCal, Twilio, or other providers before the corresponding phase/subphase permits it.
