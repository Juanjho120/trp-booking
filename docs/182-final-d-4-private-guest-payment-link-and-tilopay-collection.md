# Final-D.4 — Private guest payment link and Tilopay collection

Status: **Implemented and locally validated on 2026-09-11; owner acceptance pending**

```text
Package: Final-D — Additional charges and guest payment requests — In progress
Subphase: Final-D.4 — Private guest payment link and Tilopay collection
Implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b
Implementation record: this D.4 implementation commit
Owner acceptance: Pending; do not mark D.4 accepted until the owner explicitly accepts it
Next subphase: Final-D.5 — Additional-charge refunds and financial-summary integration — Not started
Phase 13: Not started
```

## Scope Implemented

- Added the private guest payment page at `/reservas/cargos/[token]` for `GuestPaymentRequest` payment collection.
- Added a protected admin Copy private link action that decrypts the recoverable D.3 token only server-side, verifies its SHA-256 hash, returns the URL with `no-store`, copies it through the Clipboard API, and does not render or keep the raw URL in component state.
- Added the D.4 ancillary payment domain service that resolves private access by token hash, expires overdue pending requests, validates immutable request/item amount and currency snapshots, and prepares one logical Tilopay `Payment` with `PaymentPurpose.ADDITIONAL_CHARGE`.
- Integrated the additional-charge branch into the accepted Tilopay SDK session, preflight, submission-attempt, client-event, and redirect/result flows.
- Preserved the established initial-reservation and lifecycle-adjustment branches while keeping D.4 on `PaymentSubmissionSource.ADDITIONAL_CHARGE`.
- On validated approved Tilopay evidence, marks the request and included additional charges paid through a Serializable transaction and audit log without confirming/reconfirming the reservation, mutating `Reservation.total`, mutating `pricingSnapshot`, altering stay cancellation-policy money, or completing any lifecycle date mutation.
- On rejected/failed provider outcomes, keeps the request and charges pending and routes safely back to the private payment page while preserving auditable payment-attempt history.
- Added bilingual centralized public/admin/payment error copy in `messages/es.ts` and `messages/en.ts`.
- Added a focused Final-D.4 source-contract validation suite under `tests/final-d` without adding or inventing an `npm run final-d:validate` package script.

## Security and Isolation Notes

- Raw guest-payment tokens remain limited to the intended private URL and transient server/client request handling for that URL.
- Normal guest summary DTOs omit `requestId`, `reservationId`, `additionalChargeId`, guest name, guest email, and raw token fields.
- The Tilopay SDK session DTO and `returnData` use a non-secret `guest-payment-request` marker instead of returning the raw token.
- Preflight and client-event APIs receive the raw token only as the private-page reference, validate it by hash, and persist the real reservation id in operational history without persisting the token.
- D.4 does not implement refunds, email delivery/resend/history, consolidated Final-D closure, review invitations, WhatsApp, performance work, or Phase 13 production work.

## Validation Executed

```text
npm run db:validate — Passed; Prisma schema valid.
npm run db:generate — Passed; Prisma Client generated.
npm run db:migrate:status — Initial sandbox attempt failed with a generic Schema engine error against Supabase; rerun with network access passed, 17 migrations found, database schema up to date.
npm run lint — Passed.
npm run build — Initial sandbox attempt failed because Next could not fetch Google Fonts; rerun with network access passed after the D.4 TypeScript fix.
npx tsx --tsconfig tests/final-d/tsconfig.json tests/final-d/run.ts — Passed 7/7 with a temporary NODE_OPTIONS preload for the Node 22 Windows os.userInfo ENOMEM issue; no repository files were changed for that workaround.
npm run final-a:validate — Passed 44/44 with the same temporary tsx preload.
npm run final-b:validate — Passed 38/38 with the same temporary tsx preload.
npm run final-c:validate — Passed 41/41 with the same temporary tsx preload.
git diff --check — Passed after documentation reconciliation.
```

## Acceptance State

Final-D.4 implementation and executable local validation are complete in this change set, but Final-D.4 is **not accepted** until owner acceptance is explicitly recorded. Final-D.5 remains Not started.
