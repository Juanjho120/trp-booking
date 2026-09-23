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
- Last completed and accepted package: Final-E — Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at `3843a6637300201bcb44b7ed235952afda02d880`.
- Final-E accepted feature head: `3843a6637300201bcb44b7ed235952afda02d880`.
- Current package: Final-F — WhatsApp communication and staff alerts — Active under Final-F Architecture Revision R1.
- Previous accepted subphase: Final-F.4 — Guest inbound WhatsApp, safe Reservation matching and protected admin inbox — Completed and accepted on 2026-09-22 at `7912b233f5cc8b8aa726f17aeb30eaa7d15ae291`.
- Last accepted subphase: Final-F.R1 — 360dialog + Meta Coexistence architecture revision — Completed and accepted on 2026-09-23 at `4c94db87ebd9df225944ce76c78f98462e4755d1`.
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
- Final-E.2 implementation base: `2e1b26850c55364db8450fafc2bb35c6d89a2c3b`.
- Final-E.2 accepted implementation head: `f77938c5606ed636b697dc1af41c111a22ba1593`.
- Final-E.2 implementation and acceptance record: `docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md`.
- Final-E.3 implementation base: `6cc737c1e846563069b5f71cbd60b34064ffc160`.
- Final-E.3 accepted implementation head: `c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030`.
- Final-E.3 implementation and acceptance record: `docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md`.
- Final-E.4 implementation base: `19199e6382b4daa7651417c37c1958ad59300373`.
- Final-E.4 accepted implementation head: `e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1`.
- Final-E.4 implementation and acceptance record: `docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md`.
- Final-E.5 implementation base: `2baddeb520c01cd860a73f84a22bd4ec5d0a148c`.
- Final-E.5 accepted implementation head: `f37f4802219aeb80d10f92b406e0a4847b10f15d`.
- Final-E.5 implementation and acceptance record: `docs/190-final-e-5-private-guest-review-submission.md`.
- Final-E.5 is completed and accepted on 2026-09-21.
- Final-E.6 implementation base: `2b56d43d60da3558ce692e18f4756f1c862bcb17`.
- Final-E.6 accepted implementation head: `82f1c27ba2af41d9ade9f8f57348bf66e18f800f`.
- Final-E.6 implementation and acceptance record: `docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md`.
- Final-E.6 is completed and accepted on 2026-09-21.
- Final-E.7 implementation base: `4df7cbc07b6ae9789a62f568d1e3ab69a808d596`.
- Final-E.7 accepted implementation/validation head: `3843a6637300201bcb44b7ed235952afda02d880`.
- Final-E.7 implementation/validation and acceptance record: `docs/192-final-e-7-integrated-regression-and-documentation-closure.md`.
- Final-E.7 is completed and accepted on 2026-09-21.
- Final-E is completed and accepted on 2026-09-21.
- Permanent Final-E regression gate: `npm run final-e:validate` — 88/88 accepted.
- Final-F.1 implementation base: `c6dbe2309f0cd373701fc9444f7f15879692f423`.
- Final-F.1 accepted implementation head: `d5db6a2605a03e75db7c16238a43cd5f79dde6d8`.
- Final-F.1 implementation and acceptance record: `docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md`.
- Final-F.2 implementation base: `ba47dc9f22f4d61a01c13066f84e15ae8ad549f7`.
- Final-F.2 initial implementation head: `13e6dcadc9fa8930cd8166aebb8049093ce6fa3c`.
- Final-F.2 accepted implementation/validation head: `03861cb2d5daef7cca8bb759d16a0ef050d86b41`.
- Final-F.2 implementation and acceptance record: `docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md`.
- Final-F.2 is completed and accepted on 2026-09-22 after owner Sandbox onboarding / Hosted Test provider validation.
- Final-F.3 implementation base: `673e43c4d3f8f25a9aee5ee196552574637776dd`.
- Final-F.3 initial implementation head: `ee6194f2d51969aae56aab2b5351314326c3ed8a`.
- Final-F.3 accepted implementation/validation head: `f0a465349b5217f7318146ad5b2de13f1d641a13`.
- Final-F.3 implementation record: `docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md`.
- Final-F.3 is completed and accepted on 2026-09-22.
- Final-F.4 implementation base: `24e6d58060d62cf89924ddb75af29738fddf4dd1`.
- Final-F.4 accepted implementation/validation head: `7912b233f5cc8b8aa726f17aeb30eaa7d15ae291`.
- Final-F.4 implementation and acceptance record: `docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md`.
- Final-F.4 is completed and accepted on 2026-09-22 at `7912b233f5cc8b8aa726f17aeb30eaa7d15ae291`.
- Final-F.5 implementation base: `29e29283e002b11d4275465f05f4785d70eae3df`.
- Final-F.5 implementation record: `docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md`.
- Final-F.5 Twilio-based implementation is completed at `551199a3e562be7c7fd9861760c3e38cafbf0b15`, but was superseded before owner acceptance by Final-F Architecture Revision R1; do not run the former Twilio Sandbox/Hosted Test F.5 acceptance path.
- Final-F.R1 current authoritative architecture contract: `docs/198-final-f-architecture-revision-360dialog-coexistence.md`.
- Final-F.R1 is completed and accepted on 2026-09-23 at `4c94db87ebd9df225944ce76c78f98462e4755d1`.
- Final-F.R2 is the next subphase but remains Not started until explicitly requested.
- Final-F.R3 and Final-F.R4 remain Not started.
- Final-F.6 is blocked until Final-F.R2 through Final-F.R4 complete and remains Not started until explicitly requested.
- Final-F.7 through Final-F.8 remain Not started.
- Final-G and Final-H remain Not started.
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
- For the current handoff, Final-D.3 is accepted at `6a0d909fc325f4e8925677041be34c77c023c42b`; Final-D.4 is completed and accepted on 2026-09-14 at `7d996fd20db42b2560df11f7e00d7a5e9cc0d18c`; Final-D.5 is completed and accepted on 2026-09-17 at `06b3de23fbae23a77b58b432760abf12afd5a6c7`; Final-D.6 is completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`; Final-D.7 and Final-D are completed and accepted on 2026-09-18 at `fd75663bb28be8a95b15c341eaa51f74e521241b`. Final-E is completed and accepted on 2026-09-21 at `3843a6637300201bcb44b7ed235952afda02d880`; Final-E.1 is completed and accepted on 2026-09-18 at `e83ad8443bd533715058e701769b10c2d5505436`. Final-E.2 is completed and accepted on 2026-09-18 at `f77938c5606ed636b697dc1af41c111a22ba1593`. Final-E.3 is completed and accepted on 2026-09-18 at `c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030`. Final-E.4 is completed and accepted on 2026-09-18 at `e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1`; Final-E.5 is completed and accepted on 2026-09-21 at `f37f4802219aeb80d10f92b406e0a4847b10f15d`; Final-E.6 is completed and accepted on 2026-09-21 at `82f1c27ba2af41d9ade9f8f57348bf66e18f800f`; Final-E.7 is completed and accepted on 2026-09-21 at `3843a6637300201bcb44b7ed235952afda02d880`. Final-F is active; Final-F.1 is completed and accepted on 2026-09-21 at `d5db6a2605a03e75db7c16238a43cd5f79dde6d8`; Final-F.2 is completed and accepted on 2026-09-22 at `03861cb2d5daef7cca8bb759d16a0ef050d86b41`; Final-F.3 is completed and accepted on 2026-09-22 at `f0a465349b5217f7318146ad5b2de13f1d641a13`; Final-F.4 is completed and accepted on 2026-09-22 at `7912b233f5cc8b8aa726f17aeb30eaa7d15ae291`; Final-F.5 Twilio-based implementation is completed at `551199a3e562be7c7fd9861760c3e38cafbf0b15` but superseded before owner acceptance by Final-F Architecture Revision R1; Final-F.R1 is completed and accepted on 2026-09-23 at `4c94db87ebd9df225944ce76c78f98462e4755d1`; Final-F.R2 is Next / Not started; Final-F.R3-R4 remain Not started; Final-F.6 is blocked until Final-F.R2 through Final-F.R4 complete; Final-F.7 through Final-F.8 remain Not started; Final-G, Final-H, and Phase 13 remain Not started.

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
npm run final-e:validate
```

Final-D.7 introduced the consolidated Final-D regression gate. Final-E.7 introduced the consolidated Final-E regression gate and it is accepted at 88/88. For any future Final-F or later continuation, run the relevant existing regression commands plus targeted tests/checks introduced or affected by the active subphase, together with the database/lint/build/diff checks required by the active record.

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
- `docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md` is the Final-E.2 implementation and acceptance record.
- `docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md` is the Final-E.3 implementation and acceptance record.
- `docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md` is the Final-E.4 implementation and acceptance record.
- `docs/190-final-e-5-private-guest-review-submission.md` is the Final-E.5 implementation and acceptance record.
- `docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md` is the Final-E.6 implementation and acceptance record.
- `docs/192-final-e-7-integrated-regression-and-documentation-closure.md` is the Final-E.7 implementation/validation record.
- `docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md` is the historical accepted Final-F.1 strategy and implementation record.
- `docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md` is the accepted Final-F.2 provider/onboarding implementation and acceptance record.
- `docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md` is the accepted Final-F.3 implementation/validation record.
- `docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md` is the Final-F.4 implementation and acceptance record.
- `docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md` is the historical Final-F.5 Twilio-based implementation record; it was superseded before owner acceptance by Final-F.R1 and must not be marked accepted.
- `docs/198-final-f-architecture-revision-360dialog-coexistence.md` is the accepted current authoritative Final-F architecture contract for every decision revised by Final-F.R1; Final-F.R1 was completed and accepted on 2026-09-23 at `4c94db87ebd9df225944ce76c78f98462e4755d1`.
- For revised Final-F decisions, `docs/198-final-f-architecture-revision-360dialog-coexistence.md` overrides conflicting future-facing or provider-specific guidance in `docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md` and `docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md`.
- Any completed phase or subphase must be reflected in the progress tracker before moving to a new major phase or subphase.
- When migrating to a new conversation or agent, use `AGENTS.md`, `README.md`, `docs/10-phases.md`, and `docs/11-progress-log.md` as the minimum continuity context. While the Final Improvement Track is active, also review `docs/160-post-phase-12-pre-phase-13-final-improvement-track.md` and the active package's authoritative records.
- Historical Phase 12 deployment work remains grounded by `docs/89-test-and-production-environment-strategy.md`, `docs/136-phase-12.1-test-deployment-and-environment-strategy.md`, and the Phase 12 closure records.

## Final-D Accepted Boundaries, Final-E Accepted Boundaries, and Final-F Boundaries

Before continuing Final-F.R2 or later work, read the complete Final-D.1 contract, the accepted D.2/D.3/D.4/D.5/D.6/D.7 records, the accepted Final-E.1 record, the accepted Final-E.2 record, the accepted Final-E.3 record, the accepted Final-E.4 record, the accepted Final-E.5 record, the accepted Final-E.6 record, the accepted Final-E.7 record, the Final-F.1 record, the accepted Final-F.2 record, the accepted Final-F.3 record, the accepted Final-F.4 record, the Final-F.5 implementation record, and the Final-F.R1 architecture revision record (`docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md`, `docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md`, `docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md`, `docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md`, `docs/190-final-e-5-private-guest-review-submission.md`, `docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md`, `docs/192-final-e-7-integrated-regression-and-documentation-closure.md`, `docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md`, `docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md`, `docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md`, `docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md`, `docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md`, and `docs/198-final-f-architecture-revision-360dialog-coexistence.md`). Do not reopen D.1-D.7, Final-E.1, Final-E.2, Final-E.3, Final-E.4, Final-E.5, Final-E.6, Final-E.7, Final-E, Final-F.1, Final-F.2, Final-F.3, Final-F.4, or Final-F.5 unless new evidence or an explicit owner instruction requires it.

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
- Final-E.2 introduced only dormant persistence/schema/token-purpose groundwork: ReviewInvitation and Review persistence, REVIEW_INVITATION enum/relation support, SCHEDULE_REVIEW_INVITATIONS enum reservation, REVIEW_INVITATION crypto purpose/AAD, and no operational row creation, email delivery, cron registration, public route, review submission, admin moderation, or public review surface.
- Final-E.3 is a dormant domain foundation only: no cron registration, no public route, no REVIEW_INVITATION EmailNotification rows, no email delivery, and no automatic operational invitation creation.
- Final-E.4 activates review-invitation scheduling and email delivery together, including the internal cron registry/manual protected route and REVIEW_INVITATION dispatcher support; it keeps `vercel.json` empty, does not add `/resenas`, `/admin/reviews`, schema migrations, or `npm run final-e:validate`, and is completed and accepted at `e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1`.
- Final-E.5 adds only private guest review submission for `/resenas/[token]` and `POST /api/reviews/[token]`, one-time `ReviewInvitation` consumption, `Review` creation as `PENDING`, safe guest display-name snapshots, localized private UX, noindex/nofollow metadata, and deterministic behavioral coverage. It keeps `vercel.json` empty, does not add `/resenas`, `/admin/reviews`, public published reviews, admin moderation, schema migrations, provider calls, or `npm run final-e:validate`; it is completed and accepted at `f37f4802219aeb80d10f92b406e0a4847b10f15d`.
- Final-E.6 adds admin review moderation at `/admin/reviews`, protected PATCH moderation with `getAdminSessionActor()` and `isValidAdminMutationOrigin()`, exact PENDING -> PUBLISHED / PUBLISHED -> HIDDEN / HIDDEN -> PUBLISHED transitions, `expectedUpdatedAt` concurrency fencing, same-transaction safe AdminAuditLog evidence, public `/resenas`, PUBLISHED-only active-property review listing, safe public DTOs, plain-text comment rendering, and centralized ES/EN copy. It keeps `vercel.json` empty, does not add schema migrations, review editing/deletion, invitation/email mutations, provider calls, or `npm run final-e:validate`; it is completed and accepted at `82f1c27ba2af41d9ade9f8f57348bf66e18f800f`.
- Final-E.7 adds the permanent `npm run final-e:validate` gate and integrated closure coverage. The owner-acceptance follow-up adds only `ADMIN_REVIEW_SUBMITTED` admin email intent creation on successful private review submission, immediate post-commit best-effort delivery limited to those committed notification IDs, the enum-only `email_notification_type` migration, shared admin routing, dispatcher/template support, and deterministic tests. It keeps `vercel.json` empty, does not call `processEmailNotifications()` from guest submission, does not add `EmailNotification.reviewId`, historical review backfill, manual resend support for submitted-review admin emails, review editing/deletion, invitation token changes, public route changes, or Final-F scope. Final-E.7 and Final-E are completed and accepted on 2026-09-21 at `3843a6637300201bcb44b7ed235952afda02d880`.
- Final-F is active with Final-F.1 through Final-F.4 completed and accepted. Final-F.1 and Final-F.2 remain historical accepted records, but their provider-specific Twilio target decisions are superseded by Final-F.R1.
- Final-F target provider architecture is 360dialog only, backed by Meta WhatsApp Cloud API + WhatsApp Business App Coexistence. Do not retain a parallel Twilio path for guest inbound, guest outbound, status callbacks, staff automatic alerts, templates, or provider onboarding.
- WhatsApp Business App is the primary human guest-messaging interface and native guest-message notification source. `/admin/whatsapp` remains as protected historical conversation view, Reservation context, phone-based candidate view, unread/internal TRP context, alternative reply channel, and delivery/status evidence; it is not the only human channel and does not replace WhatsApp Business App.
- Future 360dialog/Meta provider migration must support standard inbound `messages`, `statuses`, and `smb_message_echoes`. Staff replies sent from WhatsApp Business App must be persisted as OUTBOUND `WhatsAppMessage` rows idempotently by provider message id, without calling the provider again or creating a second outbound send.
- `history` onboarding sync is optional/controlled future scope; `smb_app_state_sync` is not a core TRP requirement and must not be introduced without documented need.
- Local/Test will use a real developer-company-owned WhatsApp Business App number under the developer company's Meta Business Portfolio, WABA/Coexistence setup, and 360dialog channel/subscription. Hosted Test remains the authoritative real-provider acceptance environment; Local real-provider use must be explicit/controlled and may require a public tunnel.
- Production will use a different real WhatsApp Business App number owned by Tu Refugio Perfecto under Tu Refugio Perfecto's own Meta Business Portfolio, WABA, and 360dialog channel/subscription. Developer/Test credentials, phone numbers, channel IDs, WABA IDs, or API keys must not be reused in Production, and Production must not fall back to Test.
- 360dialog does not serve as the telephony provider for normal Coexistence numbers. Use a valid business-owned mobile/SIM/eSIM-capable number active in WhatsApp Business App before onboarding. Meta-provided `+1 555` Embedded Signup numbers are not suitable for TRP Coexistence and must not be chosen for Developer Coexistence or Production.
- Twilio-specific `X-Twilio-Signature` is no longer target webhook security. Future 360dialog webhooks must use HTTPS, a high-entropy configured webhook authentication header/secret, strict expected Meta-format payload parsing, and must never expose D360 API keys, webhook secrets, WABA credentials, or provider secrets to browser, logs, or database rows.
- Final-F.2 is completed and accepted on 2026-09-22 at `03861cb2d5daef7cca8bb759d16a0ef050d86b41`. Its Twilio Sandbox/provider foundation remains historical accepted work but is superseded by R1 and must be replaced during the R2-R4 correction track.
- Final-F.3 implementation adds dormant Prisma schema/migration support for `WhatsAppConversation`, `WhatsAppMessage`, `StaffWhatsAppRecipient`, and `StaffWhatsAppAlert`, with optional Reservation/Review/message source relations, E.164 and opt-in constraints, provider SID/deduplication uniqueness, retry/status metadata, and deterministic source/migration tests. It remains conceptually reusable, but future provider-neutral cleanup must evaluate `providerMessageSid`, Twilio SID-specific constraints, and Twilio-specific naming, conceptually generalizing them to `providerMessageId` or an equivalent provider-neutral contract. R1 does not implement that migration.
- Final-F.4 product behavior remains completed and accepted: `/admin/whatsapp`, guest conversation history, safe phone normalization, Reservation matching/candidates, tabs, unread, mark-read, and message history. The Twilio-specific transport/webhook implementation beneath F.4 is superseded and must be replaced during the correction track without revoking F.4 owner acceptance.
- Final-F.5 Twilio-based implementation adds admin outbound free-form WhatsApp replies inside the server-enforced 24-hour customer-service window, `clientRequestId` idempotency, durable outbound intent, status convergence, concurrency hardening, and the protected `/admin/whatsapp` reply composer. It was superseded before owner acceptance and must not be marked accepted; reusable product/domain behavior must migrate to 360dialog/Meta.
- Staff phone identity must be checked before guest matching.
- Final-F now has exactly six active operational staff alert classes: `RESERVATION_CONFIRMED`, `RESERVATION_CANCELLED`, `CHECK_IN_MINUS_48H`, `CHECK_OUT_MINUS_6H`, `REVIEW_SUBMITTED`, and `GUEST_EMAIL_RECEIVED`.
- `GUEST_WHATSAPP_RECEIVED` and `StaffWhatsAppRecipient.guestWhatsAppReceivedEnabled` are legacy / deprecated / inactive schema artifacts after R1. Final-F.6 must not generate `GUEST_WHATSAPP_RECEIVED`; physical schema cleanup can be evaluated during provider migration and must not be destructive solely for documentation cleanliness.
- Zoho remains the human mailbox; TRP may ingest only bounded inbound-email event metadata for staff alerts and must not persist email body, HTML, attachments, mailbox search, inbox, sent, drafts, human replies, spam filtering, or retention data.
- Final-F.R1 is completed and accepted on 2026-09-23 at `4c94db87ebd9df225944ce76c78f98462e4755d1`. Final-F.R2 is the next subphase but remains Not started until explicitly requested. Final-F.R3, Final-F.R4, Final-F.6 through Final-F.8, Final-G, Final-H, and Phase 13 must not begin automatically.
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
- Do not integrate Tilopay, Cloudinary, Resend, Airbnb iCal, Twilio, 360dialog, or other providers before the corresponding phase/subphase permits it.
