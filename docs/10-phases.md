# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started — Work has not begun.
In progress — Work has started but the phase is not complete.
Completed — Deliverables are implemented and committed.
Deferred — Intentionally postponed.
```

## Current Phase

```text
Current phase state: Phase 12 — Test Deployment & External Integration Validation — Completed and accepted on 2026-08-11
Current numbered phase: none active
Current work boundary: Post-Phase-12 / Pre-Phase-13 Final Improvement Track — Active
Current package: Final-C — Pricing rules: seasonal and length-of-stay — In progress
Current subphase: Final-C.5 — DATE_CHANGE/STAY_EXTENSION pricing integration — In progress
Final-C implementation base head: e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Final-C.1 status: Completed and accepted on 2026-08-25
Final-C.1 accepted strategy head: 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.1 record: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Final-C.2 implementation base head: 030dec0d8681de18db746b9aae882cadd54db966
Final-C.2 status: Completed and accepted on 2026-08-26
Final-C.2 accepted head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.2 record: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Final-B implementation base head: 0927feb18be35b8d96aca0205a75ee19445f15d4
Final-B.1 status: Completed and accepted on 2026-08-14
Final-B.1 accepted head: 2627161d5b3960995be0f517682f84272431c291
Final-B.2 implementation base head: 2627161d5b3960995be0f517682f84272431c291
Final-B.2 status: Completed and accepted on 2026-08-25
Final-B.2 accepted head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 implementation base head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 status: Completed and accepted on 2026-08-25
Final-B.3 accepted head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 implementation base head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 status: Completed and accepted on 2026-08-25
Final-B.4 accepted head: a3724f018449515363159ec9f23af892a21b24be
Final-B.5 implementation base head: a3724f018449515363159ec9f23af892a21b24be
Final-B.5 status: Completed and accepted on 2026-08-25
Final-B.5 accepted head: bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 implementation base head: bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 status: Completed and accepted on 2026-08-25
Final-B.6 accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B status: Completed and accepted on 2026-08-25
Final-B accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B.1 record: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Final-B.2 record: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Final-B.3 record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Final-B.4 record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Final-B.5 record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Final-B.6 record: docs/172-final-b-6-integrated-acceptance-regression-and-documentation-closure.md
Final-C.3 implementation base head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.3 status: Completed and accepted on 2026-08-26
Final-C.3 accepted head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Final-C.3 record: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
Final-C.4 implementation base head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Final-C.4 status: Completed and accepted on 2026-08-27
Final-C.4 accepted head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.4 record: docs/176-final-c-4-admin-pricing-rule-management.md
Final-C.5 implementation base head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.5 status: In progress — central lifecycle pricing integration prepared for validation
Final-C.5 record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
Next planned subphase after Final-C.5 acceptance: Final-C.6 — Integrated regression and documentation closure — Not started
Last completed package: Final-B — Admin external-calendar integrations — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-A.1 status: Completed and accepted on 2026-08-11
Final-A.1 accepted head: 19531568752a44446d0802d6581262260b881aaf
Final-A.2 status: Completed and accepted on 2026-08-11
Final-A.2 accepted head: 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 status: Completed and accepted on 2026-08-11
Final-A.3 accepted head: 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 status: Completed and accepted on 2026-08-11
Final-A.4 accepted head: 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Final-A.5 status: Completed and accepted on 2026-08-12
Final-A.5 accepted head: 4117435dd52f6278a205e314db95d336ce0f7662
Final-A.6 status: Completed and accepted on 2026-08-12
Final-A.6 suite commit: 6016b7950331bd528d39b819bad29689688d799c
Final-A.6 accepted head: 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-A status: Completed and accepted on 2026-08-12
Final-A accepted head: 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Track registration base: dac105088d2c46be05a900abed3dfe83e608e964
Track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Final-A strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Final-A.2 record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Final-A.5 record: docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
Final-A.6 record: docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
Last completed subphase: Final-C.4 Admin pricing-rule management — completed and accepted on 2026-08-27 at 0a57b9772da55a78e8d445dc06ea2b738b412f11
Phase 13 status: Not started
11.6.5 implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
11.6.5 acceptance: All 15 protected-history, ordering, relation, retry, ES/EN, responsive, security, and integrated criteria passed on 2026-08-05
11.6.5 implementation and acceptance document: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
11.6 status: Completed and accepted
11.6 accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
11.6 closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
11.7 status: Completed and accepted
11.7 acceptance: All 15 reduced cross-phase and technical-validation criteria passed on 2026-08-05
11.7 validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6
Phase 11 accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
Phase 11 closure document: docs/120-phase-11.7-validation-and-documentation-closure.md
Phase 12 status: Completed and accepted on 2026-08-11 — 12.1 through 12.6, 12.8, 12.9, and 12.10 accepted; 12.7 scheduler activation intentionally transferred to Phase 13
Phase 12.1 record: docs/136-phase-12.1-test-deployment-and-environment-strategy.md
Phase 12.2 accepted deployment source head: 91f513c57b6220ad8d1d32f9a198a3d5099b1fd7
Phase 12.2 record: docs/137-phase-12.2-vercel-test-project-and-first-deployment.md
Phase 12.2 acceptance closure: docs/138-phase-12.2-acceptance-closure.md
Phase 12.3 status: Completed and accepted on 2026-08-10
Phase 12.3 validated repository head: dcea31801351b40029c8c194949e91d0a5642407
Phase 12.3 record: docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md
Phase 12.3 acceptance closure: docs/140-phase-12.3-acceptance-closure.md
Phase 12.4 status: Completed and accepted on 2026-08-10
Phase 12.4 accepted repository head: 4956fe08c033d0265d5400639c94d8b4927ddaf5
Phase 12.4 record: docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
Phase 12.4.1 status: Completed and accepted on 2026-08-10
Phase 12.4.1 record: docs/142-phase-12.4.1-hosted-database-pooling-correction.md
Phase 12.4 acceptance closure: docs/143-phase-12.4-acceptance-closure.md
Phase 12.5 status: Completed and accepted on 2026-08-10
Phase 12.5 accepted functional head: 409e299eee233d852a9ffee0aef20561b0931c4d
Phase 12.5 record: docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md
docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md
docs/147-phase-12.5-acceptance-closure.md
docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md
Phase 12.5.1 record: docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md
Phase 12.5.1.1 record: docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md
Phase 12.5 acceptance closure: docs/147-phase-12.5-acceptance-closure.md
Phase 12.6 status: Completed and accepted on 2026-08-10
Phase 12.6 accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c
Phase 12.6 record: docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md
Phase 12.6.1 status: Completed and accepted on 2026-08-10
Phase 12.6.1 implementation commit: 5a120e49fb2e6196d64fc98e608552b217b7522f
Phase 12.6.1 record: docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md
Phase 12.6.1.1 status: Completed and accepted on 2026-08-10
Phase 12.6.1.1 accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c
Phase 12.6.1.1 record: docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md
Phase 12.6 acceptance closure: docs/151-phase-12.6-acceptance-closure.md
Phase 12.7 status: Deferred to Phase 13 on 2026-08-11 — no Test scheduler activation required
Phase 12.7 record: docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md
Phase 12.8 status: Completed and accepted on 2026-08-11 — Full Internet E2E regression
Phase 12.8 acceptance base head: 9f7594e5423a7f78163c1f0bad645823f9c17e8d
Phase 12.8 start record: docs/153-phase-12.8-full-internet-e2e-regression-start.md
Phase 12.8 matrix: docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md
Phase 12.8 acceptance closure: docs/155-phase-12.8-acceptance-closure.md
Phase 12.9 status: Completed and accepted on 2026-08-11 — Test observability, security, and recovery readiness
Phase 12.9 closure: docs/158-phase-12.9-acceptance-closure.md
Phase 12.10 status: Completed and accepted on 2026-08-11 — Phase 12 validation and closure
Phase 12.10 validated repository head: ebe28579872cbc2414573ef852b15139a2501551
Phase 12 closure: docs/159-phase-12.10-phase-12-validation-and-closure.md
Next work: validate and accept Final-C.5 DATE_CHANGE/STAY_EXTENSION pricing integration, then begin Final-C.6 integrated regression and documentation closure only after acceptance; Phase 13 remains blocked until Final-H closes and the track is explicitly accepted
Next planned numbered phase: Phase 13 — Production Infrastructure, Deployment & Go-Live — Not started
Pre-Phase-12 Improvement Track status: Completed and accepted — Packages A, B, C, E, and F accepted; Package D remains deferred outside the current gate
Pre-Phase-12 Improvement Track registration base: 992bf4ae465576a275a31e9ca3c5ca9ab3414500
Pre-Phase-12 Improvement Track plan: docs/121-pre-phase-12-improvement-track.md
Package A implementation record: docs/122-pre-phase-12-package-a-public-flow-and-ui-corrections.md
Package A status: Completed and accepted at ec1e6ce7f43099864788f28ae30a87214afe554d
Package B implementation record: docs/123-pre-phase-12-package-b-durable-payment-attempt-history.md
Package B status: Completed and accepted at 795a95fec81bc7ff3f177304f2df3df35c4d59e6
Package C implementation record: docs/124-pre-phase-12-package-c-admin-cron-console.md
Package C status: Completed and accepted at 5a039aa451628e8ac9712c166bdd0a4605c8813f
Package D status: Deferred — awaiting financial policy decisions
Package E implementation record: docs/125-pre-phase-12-package-e-public-location-map.md
Package E status: Completed and accepted on 2026-08-06
Package E accepted functional head: 113ed0198cee66650556409066e996693bf6db35
Package E closure document: docs/126-pre-phase-12-package-e-acceptance-closure.md
Package F status: Completed and accepted on 2026-08-07; integrated validation passed without a deployed Vercel Test environment
Package F strategy base head: cab7d71e34d230cdf49e013921764f6386d3fa2f
Package F strategy document: docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md
Package F.2 status: Completed and accepted on 2026-08-07
Package F.2 record: docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md
Package F.2 closure record: docs/129-pre-phase-12-package-f-2-acceptance-closure.md
Package F.3 status: Completed and accepted on 2026-08-07
Package F.3 accepted head: c75a943a9f36c31e146594d7ad03eedb44635f89
Package F.3 record: docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
Package F.3 closure record: docs/131-pre-phase-12-package-f-3-acceptance-closure.md
Package F.4 status: Completed and accepted on 2026-08-07
Package F.4 accepted head: 7e0432f90836c5d4200ff528832eb48e69d1e642
Package F.4 record: docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md
Package F.4 closure record: docs/133-pre-phase-12-package-f-4-acceptance-closure.md
Package F.5 status: Completed and accepted on 2026-08-07
Package F.5 validated repository head: a188ae304df6b377ed4ad9099c9f7d83c2365262
Package F.5 record: docs/134-pre-phase-12-package-f-5-integrated-validation-and-documentation-closure.md
Package F closure record: docs/135-pre-phase-12-package-f-integrated-acceptance-closure.md
11.5.1 strategy base commit: 3d1487f31ca74fc5a41573b4ab206ce9ad838bb5
11.5.1 strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md
11.5.1 accepted commit: e0b77658c74ee2d7a30c96f529d5f7f4451ab045
11.5.2 implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md
11.5.2 implementation commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f
11.5.2 acceptance: Completed on 2026-07-30 after backend and reduced calendar matrices passed
11.5.2.1 correction document: docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md
11.5.2.1 implementation commit: ab432fdc1e9d3ffb1ff868fd43a6fe70c5999a5e
11.5.2.1 type-safety follow-ups: f57a777f26ab919e95098dfc13ee11b44f423b02, 56023423f4545914f43856ea44398e8d90301820
11.5.2/11.5.2.1 accepted head: 56023423f4545914f43856ea44398e8d90301820
11.5.2/11.5.2.1 closure document: docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md
11.5.3 implementation commit: bf216e7796151d10a01902efac9dea8d36f29f31
11.5.3 type-safety follow-up: 9130831029441e024ebd3bc93e4f1e7904ca99c1
11.5.3 implementation document: docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md
11.5.3 functional matrix: Passed on 2026-08-03
11.5.3.1 accepted head: ece97aa72aec1b0c1eb13f2d21b6b8d862d9c4d4
11.5.3.1 correction document: docs/108-phase-11.5.3.1-transaction-resilience-and-datepicker-positioning.md
11.5.3/11.5.3.1 closure document: docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md
11.5.4 implementation and accepted head: c996716aaad897c4e583a0d83b31b87bfece8e08
11.5.4 implementation document: docs/110-phase-11.5.4-final-positive-zero-completion.md
11.5.4 acceptance: Completed on 2026-08-03 after all 17 local/test matrix criteria passed
11.5.4 closure document: docs/111-phase-11.5.4-acceptance-closure.md
11.5.5 implementation commit: e1e62859bc76a19ba0afb79e397f30b4e8c396fa
11.5.5 type-safety follow-ups: 5abf48d8ccb5c9f5484de0dca28ca1a546bf8b80, da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 implementation document: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
11.5.5 acceptance: Completed on 2026-08-04 after all 24 local/test matrix criteria passed
11.5.5 closure document: docs/113-phase-11.5.5-acceptance-closure.md
11.5.6 integrated matrix: Passed on 2026-08-04; all 8 reduced end-to-end cases passed
11.5 accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508
11.5 closure document: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md
11.4 accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc
11.4 implementation document: docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
11.4.1 correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
11.4.2 implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
11.4 closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md
Last completed phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Phase 11 closure document: docs/120-phase-11.7-validation-and-documentation-closure.md
```

---

## Phase 8 — Reservation Flow

Status: **Completed**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Completed subphases:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

---

## Phase 9 — Tilopay Sandbox Integration

Status: **Completed**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation flow and close the operational payment, admin, availability, and preparation-buffer gaps required before Phase 10 email notifications.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
9.6 Confirm reservation only after validated payment — Completed
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX — Completed
9.7 Admin reservation and payment review — Completed
9.8 Automatic preparation buffers in availability — Completed
9.9 Admin preparation buffer settings and manual unlock behavior — Completed
9.9.1 Admin navigation and property calendar operations — Completed
9.10 Phase 9 documentation update and closure — Completed
```

Phase 9 rules preserved:

```text
- Do not store card data.
- Keep all Tilopay credentials server-side only.
- Do not expose raw provider payloads in public API responses.
- Do not set Reservation.status = CONFIRMED until payment validation succeeds.
- Keep failed/rejected payment states auditable.
- Do not send Resend emails in Phase 9.
- Do not add PMS features.
```

### Phase 9.4 result

```text
- Tilopay SDK V2 became the preferred checkout foundation.
- The backend obtains SDK access server-side and exposes only safe initialization data.
- Payment.providerReference stores the unique Tilopay order number.
- Card fields remain browser/SDK-managed and are never sent to the TRP Booking backend.
```

### Phase 9.5 result

```text
- Redirect handling resolves the payment by providerReference/orderNumber.
- Tilopay consult is executed server-side.
- OrderHash V2 is validated with HMAC-SHA256.
- Payment status can become APPROVED, REJECTED, or FAILED.
- Public result pages do not trust redirect parameters as final payment truth.
```

### Phase 9.6 result

```text
- Reservation confirmation is payment-driven and idempotent.
- Only an active PENDING_PAYMENT reservation with an APPROVED payment can become CONFIRMED.
- Reservation.confirmedAt is set and Reservation.expiresAt is cleared.
- Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 result

```text
- Tilopay preflight validation and sandbox hardening were added.
- Expired reservation confirmation is prevented.
- Retryable provider issues map to safe bilingual messages.
- Payment retry and result pages distinguish payment status from reservation status.
- SDK client failures are recorded using safe operational diagnostics.
- The public reservation flow guides the guest to the relevant quote, hold, payment, or error area.
```

### Phase 9.7 result

```text
- Protected admin visibility was added for reservations, payments, and safe SDK diagnostics.
- Visible statuses and copy are localized.
- Payment-driven confirmation remains the only confirmation path.
- No card number, CVV, expiration date, or tokenized card data is exposed.
```

### Phase 9.8 result

```text
- CONFIRMED reservations dynamically block stay dates and preparation-buffer ranges.
- Active PENDING_PAYMENT holds block stay dates and preparation buffers only while expiresAt > now.
- Expired holds, EXPIRED reservations, and PENDING_PAYMENT rows without expiresAt do not block availability.
- Property preparation settings and composed-listing dependency rules are used by availability.
- Confirmed buffers are represented consistently in future Airbnb iCal export calculations.
```

### Phase 9.9 result

```text
- Option B was selected: dynamic direct-reservation buffers plus auditable override records.
- Admin can configure preparation days before/after per accommodation from 0 through 30.
- A one-day PREPARATION_BUFFER CalendarBlock records each manual unlock.
- Availability and iCal export subtract only the matching override range.
- Reservation stay dates remain blocked.
- Property changes and unlock operations create AdminAuditLog records.
```

### Phase 9.9.1 result

```text
- A shared protected admin layout provides responsive sidebar navigation, optimistic active state, and route loading feedback.
- /admin remains a compact dashboard.
- Reservations and payments use dedicated searchable, filterable, paginated routes.
- Visible accommodation/status/payment-method selectors use the shared Radix design-system component.
- The Tilopay SDK-required tlpy_payment_method native field remains hidden and synchronized.
- The normal checkout and retry flow reuse the same stable Tilopay checkout component.
- Visa, Mastercard, and American Express acceptance indicators appear below the card-number field.
- Accommodation settings use a dedicated route.
- The property calendar shows direct reservations, active holds, Airbnb blocks, manual blocks, maintenance, preparation buffers, overrides, and composed-listing inheritance.
- New manual blocks are allowed only across fully available future dates and are revalidated server-side.
- Manual release, preparation unlock, and preparation restore preserve audit history.
- Successful and failed admin mutations use accessible auto-dismissing snackbars with distinct variants and manual dismissal.
```

### Phase 9.10 result

```text
- Phase 9 implementation and operational boundaries were consolidated in README and the official trackers.
- Phase 9.9.1 was marked completed after local implementation acceptance.
- The remaining operational Airbnb iCal setup and real E2E validation were explicitly deferred to Phase 12 Test Deployment & External Integration Validation.
- Phase 10 — Email Notifications became the next active phase.
```

Deferred Phase 9 operational item:

```text
Real Airbnb iCal import/export E2E validation requires secure operational external_calendars rows, real import URLs, and export tokens.
```

---

## Phase 9.11 — Admin MVP and Brand Identity Completion

Status: **Completed**

Goal: Close the documented MVP admin and brand-identity gaps before Phase 10 so public, admin, metadata, and future transactional email surfaces use the same approved brand system.

Subphase status:

```text
9.11.1-A Production raster assets — Completed
9.11.1-B Reusable brand components — Completed
9.11.1-C Application and metadata integration — Completed
9.11.1-D Responsive QA and documentation closure — Completed
9.11.2 Accommodation content management — Completed
9.11.3 Property photo management — Completed
9.11.4 Amenities and house rules — Completed
9.11.5 Reservation and payment detail views — Completed
9.11.6 Phase 9.11 validation and documentation closure — Completed
```

### Phase 9.11.1 result

```text
- Approved raster masters exist for the primary wordmark and icon-only mark.
- BrandLogo and BrandMark centralize runtime paths, intrinsic dimensions, aspect ratios, and accessibility defaults.
- The public header, public footer, admin navigation, and branded admin login use the reusable components.
- Next.js favicon, application icon, Apple touch icon, Open Graph, and Twitter metadata use the approved assets.
- Favicon-scale assets use only the mark without text.
- Long footer contact values wrap on narrow screens.
- The compact mobile admin header prioritizes menu, mark, and language controls without horizontal overflow.
- The branded admin sign-in page permits vertical scrolling on short displays.
- Auth.js authorization, Google OAuth verification, JWT roles, server-side admin allowlist, and safe callback behavior remain unchanged.
- Resend delivery and transactional email templates remain deferred to Phase 10.
```

### Phase 9.11.2 result

```text
- Authorized admins can edit bilingual property names, short descriptions, and long descriptions.
- Admins can edit maximum guests, bedroom count, bathroom count, check-in time, and optional check-out time.
- The existing /admin/accommodations page separates public content management from preparation-buffer settings.
- Slug, price, currency, status, composition, photos, amenities, rules, and preparation settings are not editable through the content editor.
- Zod validates the PATCH request and the service repeats normalization and domain validation.
- expectedUpdatedAt prevents an older browser tab from silently overwriting newer property content.
- PROPERTY_CONTENT_UPDATED audit rows record the actor, changed fields, and before/after values.
- Public accommodation pages already read Property content from PostgreSQL and therefore reflect accepted updates without a separate synchronization step.
- Soft-deleted or unsupported property records cannot be edited.
- No Prisma schema migration, photo management, amenity/rule management, pricing workflow, email delivery, or PMS behavior was added.
```

### Phase 9.11.3 result

```text
- Each supported accommodation has a protected /admin/accommodations/[propertyId]/photos route.
- Authorized admins can upload JPG, PNG, and WEBP files up to 10 MB with required bilingual alternative text.
- Image bytes upload directly from the browser to Cloudinary through a short-lived signed request; the Cloudinary API secret remains server-side.
- Finalization verifies the exact owned public ID, provider resource type, upload type, actual format, byte size, delivery URLs, and recent creation time before persistence.
- Active galleries support up to 40 photos, sequential ordering, exactly one cover, bilingual alt-text editing, and soft deletion.
- Structural mutations use an optimistic gallery revision and serializable transactions so stale tabs do not silently overwrite order, cover, or deletion changes.
- Deleting the cover promotes the first remaining ordered image; the final active photo cannot be deleted.
- PROPERTY_IMAGE_UPLOADED, PROPERTY_IMAGE_ALT_TEXT_UPDATED, PROPERTY_IMAGES_REORDERED, PROPERTY_IMAGE_COVER_CHANGED, and PROPERTY_IMAGE_SOFT_DELETED preserve AdminAuditLog history.
- Soft deletion retains the PropertyImage row and Cloudinary asset until a restore/permanent-purge lifecycle is explicitly approved.
- Public listing and detail pages already read active PropertyImage rows, isCover, sortOrder, and bilingual alt text from PostgreSQL.
- No Prisma migration, amenity/rule management, pricing workflow, reservation/payment action, email delivery, or PMS behavior was added.
```

### Phase 9.11.4 result

```text
- Shared catalog content is managed from /admin/catalogs with Amenities and House Rules tabs.
- Property-specific assignment remains under /admin/accommodations/[propertyId]/amenities-rules.
- Authorized admins can assign or unassign active amenities and house rules while preserving at least one of each per accommodation.
- Catalog content remains bilingual and amenity icons remain restricted to the approved typed icon catalog.
- Admins can create new amenity and house-rule catalog rows; new entries start unassigned.
- The server generates immutable runtime keys from the English label and safely resolves key collisions.
- Catalog updates and soft deletions use expectedUpdatedAt.
- Soft deletion removes replaceable membership rows, sets deletedAt/deletedById, and rejects any operation that would leave an accommodation without an active item in that domain.
- AMENITY_CREATED, AMENITY_CONTENT_UPDATED, AMENITY_SOFT_DELETED, HOUSE_RULE_CREATED, HOUSE_RULE_CONTENT_UPDATED, HOUSE_RULE_SOFT_DELETED, and PROPERTY_AMENITIES_RULES_UPDATED preserve AdminAuditLog history.
- Public accommodation pages read active assignments and bilingual catalog content from PostgreSQL.
- Selecting a local property photo produces an object-URL preview, and the admin can explicitly clear that selection before upload.
- Check-in and optional check-out values use styled 30-minute selectors and server-side validation.
- Static amenity ordering accepts runtime-created catalog keys without weakening the typed static icon catalog.
- No Prisma migration, catalog hard deletion, restore/purge UI, price/status editing, reservation/payment action, email delivery, or PMS behavior was added.
```

### Phase 9.11.5 result

```text
- /admin/reservations/[reservationId] provides a protected, read-only reservation detail view.
- /admin/payments/[paymentId] provides a protected, read-only payment detail view.
- Reservation and payment list cards expose localized detail actions.
- Reservation detail includes guest, stay, pricing, hold, and ordered payment-attempt information.
- Payment detail includes safe allowlisted diagnostics, parent reservation context, and ordered SDK client events.
- Reservation and payment detail pages provide cross-navigation without introducing mutation actions.
- Payment.rawPayload is processed only server-side and is never returned as raw JSON.
- PaymentClientEvent.sdkPayload is not selected or exposed.
- The implementation reuses centralized bilingual copy and localized statuses.
- No Prisma migration, seed change, reservation/payment mutation, email delivery, calendar mutation, refund action, date-change action, or PMS behavior was added.
```

### Phase 9.11.6 result

```text
- Phase 9.11 validation and accepted implementation boundaries are consolidated in README and the official trackers.
- Phase 9.11.5 is recorded as completed after the final list/detail route structure was reported working and committed.
- The authoritative closure record is docs/84-phase-9.11-validation-and-documentation-closure.md.
- Phase 10 — Email Notifications is the next official phase and must begin by defining explicit implementation subphases.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, provider credential, email delivery, reservation/payment mutation, or PMS behavior was added by the closure subphase.
```

---

## Phase 10 — Email Notifications

Status: **Completed**

Goal: Add safe, bilingual, idempotent email notifications for the direct-booking lifecycle without changing payment-driven reservation confirmation.

Subphase status:

```text
10.1 Email notification strategy and environment contract — Completed
10.2 Persistence and Resend provider foundation — Completed
10.3 Bilingual branded reservation-confirmation templates — Completed
10.4 Guest and admin confirmation notification orchestration — Completed
10.5 Retry processing and admin delivery visibility — Completed
10.5.1 Manual resend and delivery recovery controls — Completed
10.6 Arrival instructions scheduling and content — Completed
10.7 Validation and documentation closure — Completed
```

Phase 10 rules:

```text
- Email delivery never determines payment approval.
- Email failure never rolls back or downgrades a valid confirmed reservation.
- Provider network calls do not run inside the reservation-confirmation database transaction.
- Resend credentials, sender configuration, and recipient overrides remain server-side only.
- Permanent database deduplication is required in addition to provider idempotency.
- Transactional email copy and subjects remain centralized in messages/es.ts and messages/en.ts.
- Email records retain safe delivery-attempt history without raw provider payloads or secrets.
- Initial automatic emails are RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION.
- PAYMENT_APPROVED is not sent separately because the reservation-confirmation email already communicates success.
- Automatic rejected/failed-payment emails are deferred from the initial MVP to avoid duplicate or noisy messages across payment retries.
- Cancellation, refund, date-change, stay-extension, and related Phase 11 emails remain deferred.
- Arrival instructions use approved property-specific timing and database-owned bilingual content; rotating secrets are never stored in source-controlled copy.
- No PMS behavior is added.
```

### Phase 10.1 result

```text
- The current repository and Phase 9.11 closure were reviewed before defining email architecture.
- EmailNotification already provides the initial audit record, but it lacks a permanent deduplication key and retry-claim fields.
- The public booking locale reaches pending-hold creation but is not currently persisted on Reservation.
- The reservation-confirmation service remains the only valid business trigger after an APPROVED payment.
- Resend is selected as a server-side provider through the official Node.js SDK.
- The database will own permanent deduplication; the stable database key will also be sent as the Resend idempotency key.
- Notification intents will be created transactionally with reservation confirmation, while provider delivery occurs only after commit.
- Test and production recipient behavior will be controlled through validated server-side environment configuration.
- Bilingual React email templates will reuse the approved brand assets and centralized ES/EN copy without introducing a second visible-copy source.
- The explicit Phase 10 roadmap is documented in docs/85-email-notification-strategy-and-phase-10-roadmap.md.
- No application code, Prisma schema, migration, dependency, environment variable, credential, email delivery, or PMS behavior was added in 10.1.
```

### Phase 10.2 result

```text
- resend 6.17.2 is added as the only provider dependency.
- Reservation.preferredLocale stores es or en and existing rows default safely to es.
- EmailNotification gains a permanent unique deduplicationKey and PROCESSING status.
- attemptCount, lastAttemptAt, nextAttemptAt, processingStartedAt, and errorCode support later bounded retry processing.
- Existing EmailNotification rows receive deterministic legacy/<id> keys before the NOT NULL and UNIQUE constraints are applied.
- lib/env/server.ts validates disabled, test, and production email modes without requiring a provider key while delivery is disabled.
- Test mode redirects every intended recipient to one validated EMAIL_TEST_RECIPIENT.
- Production mode requires HTTPS links and official-domain sender/reply-to addresses.
- A typed server-side Resend adapter uses the database key as the provider idempotency key and normalizes failures into safe internal codes.
- The existing pending-hold service persists the request locale only when creating a new hold; reused holds keep their original stored locale.
- No email template, notification intent, confirmation trigger, retry worker, admin delivery view, or real email send is activated in 10.2.
- Detailed implementation and migration guidance is documented in docs/86-email-persistence-and-resend-provider-foundation.md.
- The accepted implementation was committed as 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72.
```

### Phase 10.3 result

```text
- messages/es.ts and messages/en.ts gain matching transactional-email namespaces for guest and admin confirmation messages.
- A shared React email layout uses email-safe table markup, inline styles, absolute brand URLs, and the approved primary logo.
- buildReservationConfirmedEmail returns the bilingual guest subject, HTML, and plain-text alternative.
- buildAdminNewReservationEmail returns the bilingual administrative subject, HTML, and plain-text alternative with a protected reservation-detail link.
- A strict typed input contract and Zod validation normalize reservation data before rendering; guest output must match the stored preferred locale.
- Dates, stay length, guest count, arrival time, currency, country, and confirmation timestamps are formatted by locale.
- Guest output excludes admin links, raw provider data, card information, access codes, and PMS-only content.
- No EmailNotification intent, reservation-confirmation hook, provider call, retry worker, migration, or dependency change is added.
- The implementation record is docs/87-bilingual-branded-reservation-confirmation-templates.md.
- The accepted implementation was committed as 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

### Phase 10.4 result

```text
- The payment-driven confirmation service creates or reuses one guest intent and one intent per configured admin recipient in the same database transaction that confirms the reservation.
- Existing APPROVED callbacks use the same confirmation service and therefore backfill or reuse missing intents idempotently.
- Permanent deduplication keys follow reservation-confirmed/<reservationId>/<recipient> and admin-new-reservation/<reservationId>/<recipient>.
- Provider delivery starts only after the transaction commits.
- Immediate delivery atomically claims PENDING rows as PROCESSING before rendering or calling Resend.
- The stored recipient always remains the intended guest/admin recipient; test-mode rerouting stays inside the provider adapter.
- SENT requires a provider message ID. Safe template/provider failures become FAILED without changing Payment or Reservation.
- Disabled or invalid email configuration leaves intents PENDING and returns the existing successful confirmation result.
- The accepted implementation and follow-ups are recorded through 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d.
- FAILED retries, nextAttemptAt scheduling, stale claims, bounded attempt limits, cron processing, and admin visibility remain in 10.5.
- Manual resend remains outside the initial Phase 10 roadmap.
- No Prisma schema, migration, environment variable, dependency, arrival scheduling, or PMS behavior is added.
- The implementation record is docs/88-guest-admin-confirmation-notification-orchestration.md.
```

### Phase 10.5 result

```text
- A CRON_SECRET-protected /api/cron/process-email-notifications endpoint processes a maximum of 20 due rows per execution.
- Retryable errors use centralized 5-minute, 15-minute, 1-hour, and 6-hour delays with a maximum of 5 total attempts.
- PROCESSING claims older than 10 minutes are eligible for safe recovery; exhausted stale claims become terminal FAILED rows.
- Atomic updateMany claims and processingStartedAt ownership tokens prevent concurrent or stale workers from finalizing the same row.
- The worker never retries SENT or SKIPPED notifications and reuses the permanent deduplication key as the Resend idempotency key.
- Existing retryable FAILED rows with no nextAttemptAt remain eligible, preserving compatibility with failures created before 10.5.
- Reservation detail now includes safe read-only notification history with localized type/status labels and bounded diagnostics.
- No raw provider payload, secret, schema migration, dependency, arrival scheduling, or PMS behavior was added.
- Local retry, stale-claim, maximum-attempt, concurrency, idempotency, admin-visibility, and payment/reservation isolation tests were accepted.
- Accepted commits: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1 and f77625f1d95095d7ebfd270007e1cbc54b667762.
- The implementation record is docs/91-email-retry-processing-and-admin-delivery-visibility.md.
```

### Phase 10.5.1 result

```text
- Eligible PENDING, FAILED, and SENT confirmation notifications expose a protected manual action.
- Each request creates a separate MANUAL EmailNotification with a new deduplication key, parent linkage, requesting admin, requested timestamp, and AdminAuditLog entry.
- Existing source delivery history is not rewritten; automatic and immediate claims require both no manual child and the source version observed during discovery.
- PROCESSING, SKIPPED, unsupported types, and notifications for non-confirmed reservations are rejected.
- A client-generated request UUID makes API retries idempotent and concurrent duplicate submissions resolve to one manual row.
- A styled Sheet and centralized ES/EN copy distinguish retry from sending another copy and warn about duplicate delivery after SENT.
- Manual delivery runs only after the creation transaction and reuses the existing provider, template, claim, failure, and retry pipeline.
- No raw provider payload, secret, payment mutation, reservation mutation, arrival scheduling, dependency, or PMS behavior is added.
- Local recovery, duplicate-warning, request-idempotency, concurrency, audit, and payment/reservation isolation tests were accepted.
- Accepted commit: 355c72490d416a257b9827d31c67223a97200491.
- The implementation record is docs/92-manual-resend-and-delivery-recovery-controls.md.
```

### Phase 10.6 result

```text
- PropertyArrivalInstructions stores an enabled flag, 1–168-hour lead time, exact address, optional HTTPS map URL, and bilingual ES/EN operational instructions.
- The accepted default is 48 hours before the property's configured check-in time in America/Guatemala.
- Reservations confirmed inside the lead window become immediately eligible. Same-day confirmations remain eligible even after the configured check-in time; only reservations whose check-in date is before the current date in America/Guatemala do not create a new intent.
- Reservation confirmation creates an idempotent ARRIVAL_INSTRUCTIONS intent inside the existing transaction when configuration is complete.
- A CRON_SECRET-protected scheduler runs every 30 minutes and backfills upcoming confirmed reservations within the maximum lead-time horizon.
- EmailNotification stores scheduledFor, a reservation check-in snapshot, and the arrival-settings version.
- Deduplication includes reservation, check-in date, settings version, and intended recipient; stale versions are marked SKIPPED before provider delivery.
- The bilingual branded email contains schedule, exact address, optional map link, approved operational instructions, active bilingual house rules, and support contact.
- RESERVATION_CONFIRMED and ARRIVAL_INSTRUCTIONS render the accommodation's active assigned house rules in the guest's stored locale at delivery time.
- Admin editing is optimistic, audited, and warns against storing access codes, lockbox codes, Wi-Fi passwords, or other rotating secrets.
- The existing worker, retry limits, Resend idempotency, test routing, and read-only delivery history are reused.
- No payment mutation, reservation confirmation change, new dependency, environment variable, or PMS behavior is added.
- Accepted implementation and follow-up commits run from e75a50f6b7a929ff1e167c590284086c6259130b through 17be3fdf752a10932bae3f7192f55b16d80ac8e3.
- The implementation record is docs/93-arrival-instructions-scheduling-and-content.md.
```

### Phase 10.7 result

```text
- Phase 10 local/test acceptance evidence and final operational boundaries are consolidated in README and the official trackers.
- The closure records successful bilingual confirmation/admin delivery, permanent deduplication, bounded retry, stale-claim recovery, manual resend, arrival scheduling, same-day eligibility, version/date supersession, and active house-rule rendering.
- Email failures remain isolated from approved Payment and confirmed Reservation state.
- Real production-recipient delivery and production-provider observability remain deferred to Phase 13; hosted Test validation belongs to Phase 12.
- Phase 11 becomes the next official phase and must begin by defining explicit cancellation, refund, authorized date-change, and stay-extension subphases.
- The authoritative closure record is docs/94-phase-10-validation-and-documentation-closure.md.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, credential, provider call, payment/reservation mutation, or PMS behavior is added by 10.7.
```

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Completed**

Goal: Add safe, auditable, idempotent cancellation, refund, authorized date-change, and stay-extension workflows without creating unrestricted guest self-service mutation or expanding TRP Booking into a PMS.

Subphase status:

```text
11.1 Lifecycle strategy, policy, and provider boundary — Completed
11.2 Lifecycle request persistence and audit foundation — Completed
11.3 Admin cancellation decision and availability release — Completed
11.4 Refund authorization and Tilopay reconciliation — Completed
11.4.1 Observed Tilopay contract and evidence-based reconciliation — Completed
11.4.2 Extraordinary refund authorization and consult evidence lock — Completed
11.5 Authorized date changes and stay extensions — Completed
11.5.1 Strategy, pricing, independent holds, and financial-adjustment contract — Completed
11.5.2 Admin request creation, quote, and availability validation — Completed
11.5.2.1 Admin availability datepicker and own-reservation exclusion UX — Completed
11.5.3 Approval, requested-date hold, and adjustment payment — Completed
11.5.3.1 Transaction resilience and admin datepicker positioning — Completed
11.5.4 Final date-change and stay-extension completion — Completed
11.5.5 Negative-difference and failed-completion refund integration — Completed
11.5.6 Integrated acceptance and documentation closure — Completed
11.6 Lifecycle notifications and admin operational history — Completed
11.6.1 Notification contract and persistence relations — Completed
11.6.2 Bilingual lifecycle email templates — Completed
11.6.3 Transactional intent orchestration and delivery — Completed
11.6.4 Lifecycle adjustment payment-link notifications and email corrections — Completed
11.6.5 Protected operational history and acceptance — Completed
11.7 Validation and documentation closure — Completed
```

Phase 11 rules:

```text
- Reservation status owns the stay and availability lifecycle; Payment and Refund own financial reversals.
- Guests do not edit confirmed dates directly from the public website.
- Initial cancellation/change/extension requests are recorded and decided by authorized admins.
- Cancellation and refund are separate, auditable decisions.
- Refund authorization, failure, or approval never changes the Reservation lifecycle status or rewrites historical attempts.
- The approved cancellation matrix returns 100% at 7 or more days before check-in, 50% from 72 hours through less than 7 days, and 0% below 72 hours.
- Policy timing uses the property's configured check-in time in America/Guatemala.
- Full and partial refunds cannot exceed the validated captured payment amount.
- Tilopay officially documents POST /api/v1/processModification with type 2 for refund and type 3 for reversal.
- Sandbox responses, errors, duplicate behavior, retries, and idempotency are validated in 11.4 before production execution.
- Merchant-portal processing remains an operational fallback.
- Authorized date changes and extensions revalidate availability, composed dependencies, buffers, and server-side pricing.
- The existing 15-minute public pending-reservation hold and the accepted 60-minute lifecycle-adjustment hold are separate timers with separate constants and persistence; neither duration may change the other.
- Full date changes reprice the complete requested stay at current pricing; stay extensions preserve the confirmed original total and price only added nights at current pricing.
- A positive financial difference must be paid before new dates are applied; zero differences require no payment; negative differences create a separate exact lifecycle-adjustment refund authorization without rolling back completed dates.
- Lifecycle emails are created only after the underlying transition commits and never determine that transition.
- No hard deletion, raw provider exposure, card-data handling, unauthenticated lifecycle mutation, or PMS behavior is added.
```

### Phase 11.1 result

```text
- The current schema already contains cancellation/refund statuses, Refund persistence, cancelledAt, AdminAuditLog, and reserved lifecycle email types.
- No typed lifecycle request record, old/new snapshot, adjustment-payment relation, or temporary requested-date hold currently exists.
- New flows must not set an active reservation to PARTIALLY_REFUNDED because current availability uses CONFIRMED as the active direct-reservation blocker.
- Cancellation changes Reservation to CANCELLED; Payment and Refund record full/partial financial reversals.
- Guests request authorization through approved support channels; the initial MVP has no insecure public mutation or lookup endpoint.
- The approved cancellation matrix is 100% refund at 7 or more days before check-in, 50% from 72 hours through less than 7 days, and 0% below 72 hours.
- Same-day, after-check-in, and no-show cancellations fall in the standard 0% window unless a separately approved exception is recorded.
- Date changes preserve the original reservation ID/history and apply only after final availability validation and any required additional payment.
- Stay extensions are specialized date changes and require availability validation plus the price difference when applicable.
- Official Tilopay documentation defines POST /api/v1/processModification, bearer authentication, orderNumber, amount, key, type 2 refund, and type 3 reversal.
- Response/error/idempotency/sandbox validation is intentionally assigned to 11.4 and will be recorded from actual endpoint tests before production execution.
- The strategy record is docs/95-phase-11-lifecycle-strategy-and-roadmap.md.
- The corrective record is docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md.
- Fee treatment, admin exception authority, and exact date-change repricing remain explicit decisions for their corresponding implementation subphases.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, environment variable, provider request, lifecycle mutation, or PMS behavior is added by 11.1 or its correction.
```

### Phase 11.2 result

```text
- ReservationLifecycleRequest persists typed cancellation, date-change, and stay-extension requests with request state, actors, timestamps, snapshots, idempotency, and optimistic concurrency.
- PaymentPurpose distinguishes initial reservation payments from lifecycle adjustment payments.
- LifecycleRequestHold persists requested-date holds and participates in availability and preparation buffers only while active and unexpired.
- Refund status and processing mode are separated without silently reinterpreting historical records.
- Reservation REFUNDED and PARTIALLY_REFUNDED values remain historical compatibility states and are not used by new active-stay flows.
- The accepted implementation commit is 2495aa891fd26938550960f94fdbea700151350f.
- The implementation record is docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md.
```

### Phase 11.3 result

```text
- Authorized admins can record an idempotent cancellation request from reservation detail using an approved support channel.
- The server snapshots the confirmed reservation, validated initial payment, and exact 100% / 50% / 0% policy result using the property check-in time in America/Guatemala.
- Approval changes Reservation from CONFIRMED to CANCELLED and completes the request inside a serializable transaction.
- Rejection preserves the confirmed reservation and availability.
- Cancellation releases dynamic stay and preparation-buffer availability without deleting operational history.
- Pending and failed arrival-instruction notifications become SKIPPED; existing SENT history remains unchanged.
- Refund creation, Tilopay execution, payment financial-state changes, and lifecycle emails remain deferred.
- Local/test cancellation, policy-boundary, concurrency, idempotency, availability-release, and arrival-supersession tests were reported successful.
- The accepted implementation commit is c609ea0e5b4654da86436dba79477455681d7b14.
- The implementation record is docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md.
```

### Phase 11.4 result

```text
- Authorized admins can create idempotent full/partial PENDING Refund records within both the frozen policy allowance and captured-payment balance.
- PENDING, PROCESSING, APPROVED, and historical MANUAL amounts participate in cumulative protection; confirmed FAILED attempts remain historical but release their reserved balance.
- Tilopay processModification type 2 execution is sandbox-only and occurs only after the Refund transaction commits.
- Unknown provider responses and timeouts remain PROCESSING and require explicit reconciliation; they are never blindly retried or treated as success.
- Existing Tilopay consult and audited portal evidence can reconcile APPROVED/FAILED outcomes.
- Payment changes to PARTIALLY_REFUNDED or REFUNDED only after an approved reconciliation; standard cancellation refunds preserve CANCELLED, while extraordinary compensation preserves the current CONFIRMED or CANCELLED reservation state.
- Safe diagnostics expose bounded codes, descriptions, references, and response shapes without raw provider values or credentials.
- The original 11.4 package added no migration; 11.4.2 adds only the Refund authorization-type migration. No dependency, environment variable, refund email, public mutation endpoint, or PMS behavior is added.
- Cases 1–17 of the real sandbox matrix are complete; case 18 is documented as not required because `/consult` returned all required movements; the final UI, reconciliation, idempotency, concurrency, financial-state, and audit acceptance suite passed before closure.
- The implementation record is docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md.
```

### Phase 11.4.1 result

```text
- Cases 1–16 establish the sandbox processModification contract through sanitized responses and Tilopay portal financial verification.
- HTTP 200 alone is not success; 1101 / Transaction is approved / provider reference is the accepted response contract.
- Known codes 12 and 96 are rejected outcomes even when HTTP is 200 and a provider attempt reference is created.
- Accepted responses remain PROCESSING until matching evidence is reconciled; known rejected responses become FAILED without changing Payment.
- Sequential duplicate requests are not idempotent and concurrent duplicates can both reach Tilopay.
- A safe /consult observer enumerates bounded financial candidates and excludes the top-level response wrapper.
- Consult reconciliation requires exact reference, normalized Refund/2 type, absolute amount, currency when returned, code, and description evidence.
- The UI locks consult-derived outcome/reference and defaults inconclusive cases to explicit portal fallback.
- Type 3 remains outside the normal refund workflow.
- The original 11.4.1 correction added no migration; the 11.4.2 follow-up adds only the authorization-type migration. No dependency, environment variable, production execution, lifecycle email, public mutation, or PMS behavior is added.
- The correction record is docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md.
- Case 17 confirms that `/consult` returns the original Payment and all known Refund attempts; case 18 `consultTransactions` is not required. Accepted, inconclusive, portal-fallback, tampering, replay, and final-state tests passed.
```

### Phase 11.4.2 result

```text
- Refund.authorizationType distinguishes LEGACY_UNSPECIFIED, STANDARD_POLICY, and EXTRAORDINARY authorizations.
- Existing rows migrate conservatively as LEGACY_UNSPECIFIED; new rows default to STANDARD_POLICY.
- Standard refunds remain linked to a completed cancellation and consume the frozen policy allowance.
- Extraordinary refunds use a dedicated reservation endpoint, link directly to the validated initial Payment, and set lifecycleRequestId = null.
- Extraordinary refunds are available while Reservation is CONFIRMED or CANCELLED and never change that lifecycle status.
- Legacy and standard committed Refunds consume policy allowance; extraordinary Refunds do not.
- Every committed Refund type consumes the remaining captured-payment balance, so cumulative refunds cannot exceed Payment.amount.
- Admins may authorize an extraordinary refund after the policy allowance is exhausted, when policy is zero, or as compensation during an active stay.
- The extraordinary form identifies the exception, requires a reason, and warns that it is outside policy and does not cancel the reservation.
- Conclusive `/consult` evidence recognizes both Refund and 2 movement types and locks outcome, source, mode, and provider reference.
- The server rejects switching conclusive consult evidence to portal fallback or altering its derived outcome/reference.
- Authorization type is retained through provider and reconciliation audit events.
- The existing 11.4.2 authorization-type migration is retained; this scope correction needs no additional migration, dependency, environment variable, lifecycle-email implementation, public mutation, or PMS behavior.
- The implementation record is docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md.
- Migration, standard and extraordinary authorization, consult locking, portal fallback, tampering protection, idempotency, concurrency, financial-state, and audit acceptance passed. The closure record is docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

### Phase 11.4 acceptance closure

```text
- Standard partial accumulation, approved and failed portal fallback, accepted and inconclusive consult handling, and cumulative payment protection passed.
- UI and backend locks rejected outcome, source, processing-mode, and provider-reference tampering with ADMIN_REFUND_RECONCILIATION_CONFLICT.
- Authorization, execution, and reconciliation replay tests were idempotent and did not duplicate provider calls or financial effects.
- Concurrent standard, extraordinary, and mixed authorizations remained bounded by Payment.amount.
- Extraordinary refunds rejected unsupported Reservation states and non-INITIAL_RESERVATION payments.
- FAILED extraordinary attempts released committed payment balance while preserving audit history and Reservation state.
- UI-4 rejected consult evidence is documented as synthetic under the normal flow because known processModification rejection codes transition directly to FAILED; the defensive consult classifier remains retained.
- UI-8 approved portal fallback passed through an externally executed controlled sandbox movement and audited portal reconciliation.
- Accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc.
- Closure record: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

### Phase 11.5.1 accepted strategy and pricing contract

```text
- 11.5 is split into strategy, request/quote, approval/payment, completion, refund-integration, and acceptance subphases.
- DATE_CHANGE and STAY_EXTENSION remain admin-recorded requests for CONFIRMED direct reservations; guest self-service mutation remains unavailable.
- Initial 11.5 scope changes dates only. Property and guest count remain unchanged.
- DATE_CHANGE must be requested before the original check-in; STAY_EXTENSION keeps the original check-in and may be approved before the current check-out, including during an active stay.
- Requested check-out cannot exceed 365 days from the Guatemala business date.
- PENDING_REVIEW requests expire after 24 hours if not decided.
- PENDING_RESERVATION_HOLD_DURATION_MINUTES remains 15 for new public reservations.
- LIFECYCLE_ADJUSTMENT_HOLD_DURATION_MINUTES is a separate future constant of 60 minutes for approved positive-difference requests only.
- The lifecycle hold uses LifecycleRequestHold and never changes Reservation.expiresAt or the normal pending-reservation timeout.
- Full date changes use a fresh server-side quote for the complete requested stay.
- Stay extensions preserve originalTotal and add only the current server-side price of the added nights.
- Positive differences create a linked LIFECYCLE_ADJUSTMENT Payment and hold; dates apply only after APPROVED payment and final serializable availability revalidation.
- Zero differences complete in one serializable operation without Payment or LifecycleRequestHold.
- Negative differences require a separate RefundAuthorizationType.LIFECYCLE_ADJUSTMENT path for the exact absolute difference; refund execution remains independent and failure never restores old dates.
- If an adjustment Payment is approved after hold expiry or final completion cannot apply, the original dates remain and the approved adjustment payment requires a compensating lifecycle-adjustment refund.
- The current Reservation ID and CONFIRMED status are preserved after a completed date change or extension.
- The accepted strategy record is docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md.
```

### Phase 11.5.2 completed and accepted

```text
- Authorized admins can record DATE_CHANGE and STAY_EXTENSION requests from protected reservation detail.
- Creation snapshots the confirmed Reservation, validated INITIAL_RESERVATION Payment, guest/contact data, dates, guest count, pricing, currency, and Reservation.updatedAt.
- Full DATE_CHANGE requests price the complete requested stay with the current nightly price; STAY_EXTENSION requests preserve the original total and price only added nights.
- The existing availability domain validates requested dates, preparation buffers, composed dependencies, calendar blockers, and active lifecycle holds while excluding only the current Reservation.
- Successful requests remain PENDING_REVIEW and display original/requested dates, totals, financialDifference, pricing mode, availability-at-creation, creator, channel, and 24-hour review expiry.
- Creation is idempotent, uses a permanent client UUID/database key, rejects altered replays, fences Reservation.updatedAt, and commits in a serializable transaction.
- Stale PENDING_REVIEW date-mutation requests are expired before a replacement request is created.
- Request creation records bounded LIFECYCLE_DATE_CHANGE_REQUESTED or LIFECYCLE_STAY_EXTENSION_REQUESTED audit metadata.
- No approval/rejection, 60-minute LifecycleRequestHold, LIFECYCLE_ADJUSTMENT Payment, Reservation mutation, Refund, provider call, lifecycle email, Prisma migration, dependency, environment variable, or PMS behavior is added.
- The implementation record is docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md.
- The complete backend/local matrix passed on 2026-07-30, including pricing, availability, boundaries, conflicts, idempotency, concurrency, expiry, audit, and unchanged financial/lifecycle state.
- A positive PENDING_REVIEW quote correctly creates no Payment; adjustment payment creation remains assigned to 11.5.3 after approval.
- The configured Property.checkOutTime is authoritative for extension eligibility; end of the Guatemala calendar day remains the null/blank fallback.
- The backend matrix and the 11.5.2.1 reduced calendar matrix passed; 11.5.2 is completed and accepted at head 56023423f4545914f43856ea44398e8d90301820.
```

### Phase 11.5.2.1 completed and accepted

```text
- The admin request dialog replaces free-text dates with a styled availability-aware range calendar.
- A protected reservation-scoped endpoint loads blocked dates while deriving propertyId and excludeReservationId on the server.
- The current Reservation stay and derived buffers are excluded only from the admin proposal calendar; unrelated blockers remain disabled.
- DATE_CHANGE selects a complete replacement range; STAY_EXTENSION fixes the original check-in and accepts only a later check-out.
- Month loading is accumulated during the open dialog and failures prevent request submission.
- The public blocked-dates endpoint, public booking calendar, 15-minute pending hold, and server-side request validation remain unchanged.
- No approval, 60-minute hold, adjustment Payment, Tilopay call, Reservation mutation, Refund, email, Prisma migration, dependency, environment variable, or PMS behavior is added.
- The correction record is docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md.
- The complete reduced matrix passed on 2026-07-30, including own stay/buffer availability, unrelated blockers, DATE_CHANGE, fixed-check-in STAY_EXTENSION, month loading, load failure, financial isolation, public-calendar regression, and ES/EN parity.
- Accepted implementation commit: ab432fdc1e9d3ffb1ff868fd43a6fe70c5999a5e.
- Type-safety follow-ups: f57a777f26ab919e95098dfc13ee11b44f423b02 and 56023423f4545914f43856ea44398e8d90301820.
- Accepted head and closure base: 56023423f4545914f43856ea44398e8d90301820.
- Closure record: docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md.
```

### Phase 11.5.3 and 11.5.3.1 completed and accepted

```text
- Protected idempotent approval/rejection is implemented for pending DATE_CHANGE and STAY_EXTENSION requests.
- Positive approval creates one independent 60-minute ACTIVE LifecycleRequestHold and one exact PENDING Payment with purpose LIFECYCLE_ADJUSTMENT.
- Zero and negative approvals remain APPROVED without applying dates in 11.5.3; negative approval first checks exact remaining captured refund balance.
- An AES-256-GCM opaque handoff binds request, hold, payment, purpose, and expiration without guest-email/reservation lookup.
- Existing Tilopay SDK session, preflight, telemetry, redirect, and server validation branch safely for lifecycle adjustment tokens.
- Hold expiry converges hold/request/pending-payment state without touching Reservation.expiresAt or the public 15-minute hold.
- Explicit 10-second maxWait, 20-second timeout, and bounded P2034 retries removed first-attempt transaction failures.
- The datepicker popup is anchored directly below its trigger.
- The complete local/test matrix and focused correction passed on 2026-08-03.
- Accepted head: ece97aa72aec1b0c1eb13f2d21b6b8d862d9c4d4.
- Closure record: docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md.
```

### Phase 11.5.4 completed and accepted

```text
- Positive requests complete only after one exact APPROVED LIFECYCLE_ADJUSTMENT Payment and one matching active unexpired hold pass final validation.
- Zero-difference requests complete atomically inside the approval transaction with no Payment or hold.
- The shared Serializable completion transaction applies requested Reservation dates/pricing, preserves Reservation.id, CONFIRMED, and confirmedAt, completes the request, and releases a positive hold.
- Final availability excludes only the current Reservation and its own hold; all unrelated blockers, buffers, and composed dependencies remain authoritative.
- Redirect replay and concurrent completion are idempotent and produce one Reservation mutation, one COMPLETED transition, and one RELEASED hold.
- Stale snapshots, unavailable dates, invalid holds, invalid Payments, and timing-boundary failures preserve the original Reservation.
- Old PENDING/FAILED arrival intents become SKIPPED, SENT history remains, and at most one new eligible intent is created for the updated check-in.
- The completed opaque guest page hides checkout and cannot create another payment attempt.
- No lifecycle email is created; the public checkout and 15-minute hold remain unchanged.
- All 17 local/test acceptance criteria passed on 2026-08-03, including ES/EN parity and npm run build.
- Implementation and accepted head: c996716aaad897c4e583a0d83b31b87bfece8e08.
- Implementation record: docs/110-phase-11.5.4-final-positive-zero-completion.md.
- Closure record: docs/111-phase-11.5.4-acceptance-closure.md.
```

### Phase 11.5.5 completed and accepted

```text
- RefundAuthorizationType.LIFECYCLE_ADJUSTMENT and its migration are accepted.
- Negative shortened-stay DATE_CHANGE requests apply requested dates/pricing and create one exact Refund against the initial Payment.
- STAY_EXTENSION preserves check-in and moves check-out later; reducing nights remains DATE_CHANGE.
- Failed positive completion preserves original dates and creates one exact compensating Refund against the approved adjustment Payment.
- Provider execution/reconciliation, balance protection, replay, concurrency, arrival supersession, public-hold regression, no-lifecycle-email boundary, and ES/EN parity passed.
- All 24 acceptance criteria passed on 2026-08-04.
- Accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145.
- Implementation record: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md.
- Closure record: docs/113-phase-11.5.5-acceptance-closure.md.
```

### Phase 11.5.6 completed and accepted

```text
- Consolidated the accepted evidence from 11.5.2 through 11.5.5 without repeating every prior matrix.
- All eight reduced integrated cases passed on 2026-08-04: positive DATE_CHANGE, positive STAY_EXTENSION, zero DATE_CHANGE, shortened-stay negative DATE_CHANGE, failed-positive compensation, 15/60-minute hold isolation, availability/buffer/composed-listing regression, and replay/concurrency regression.
- Positive, zero, negative, and failed-positive compensation branches operate as one coherent lifecycle feature.
- Reservation identity/history, Payment/Refund ownership, availability, preparation buffers, composed dependencies, arrival supersession, and lifecycle-email deferral remain intact.
- Public and lifecycle holds remain independent at 15 and 60 minutes.
- No application code was required by the integrated closure.
- Accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508.
- Closure record: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md.
```

### Phase 11.6.1 result

```text
- Added the four administrative EmailNotificationType values required by the eight-email contract.
- Added nullable lifecycleRequestId and refundId links with indexed ON DELETE SET NULL foreign keys.
- Added centralized typed metadata and deduplication-key rules for all guest/admin lifecycle events.
- Preserved mandatory reservation ownership and all existing notification history.
- Performed no historical backfill and activated no template or delivery behavior.
- Accepted commit: 8996de10fadd676b1de41951e528c84aa6583f03.
- Implementation record: docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md.
```

### Phase 11.6.2 completed and accepted

```text
- Eight bilingual guest/admin lifecycle template builders are committed.
- Lint and build passed at 6eb4a18c9e7476266cae8c627318fa83ff27fb0d.
- Manual rendering, content, and inbox acceptance is consolidated into 11.6.3 to avoid duplicate execution.
- Implementation record: docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md.
```

### Phase 11.6.3 completed and accepted

```text
- The integrated lifecycle inbox matrix passed across all accepted lifecycle and refund branches.
- ES/EN HTML and plain text, guest/admin routing, retry recovery, replay deduplication, and domain failure isolation were accepted.
- Accepted commit: 5fed1ca0423190cd51a9c710d00c9216b65883a9.
- Accepted follow-up observations were assigned to 11.6.4.
- Implementation record: docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md.
```

### Phase 11.6.4 completed and accepted

```text
- Positive DATE_CHANGE and STAY_EXTENSION approvals create/recover and deliver one guest payment-link notification after the domain commit.
- Guest SENT and terminal FAILED outcomes create one administrative result notification per configured recipient without claiming inbox delivery or opening.
- Open, copy, protected manual email, duplicate-warning, active-delivery, failed-only, UUID idempotency, source preservation, and worker recovery behavior passed.
- Completed DATE_CHANGE copy correctly differentiates positive, zero, and negative financial branches in ES and EN HTML/plain text.
- Email failures do not roll back or alter Reservation, lifecycle request, hold, Payment, Refund, or completed dates.
- All 20 acceptance criteria passed on 2026-08-05.
- Implementation commit: ffbed6b8c1b1d3dbd6fc61cee0e0c0f4d21d9c53.
- Compilation fixes: 92e182e46796502335b8c3c171377c363d5521ae, 308721dd11f87e098cb639dca7356ebc35b0e67f.
- Accepted head: 308721dd11f87e098cb639dca7356ebc35b0e67f.
- Authoritative record: docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md.
```

### Phase 11.6.5 completed and accepted

```text
- The protected reservation detail exposes one responsive, read-only operational timeline without creating a new persistence source.
- Lifecycle requests, holds, initial and adjustment Payments, Refunds, EmailNotifications, retry state, manual parent/child links, source/result links, actors, and timestamps render through the accepted typed projection.
- Deterministic descending ordering and the stable event-ID tie-breaker passed.
- No-lifecycle empty state, cancellation, positive/zero/negative DATE_CHANGE, STAY_EXTENSION, compensating Refund, notification relations, retry states, existing recovery controls, ES/EN desktop/mobile behavior, and security boundaries passed.
- Raw provider payloads, private tokens, credentials, card data, full email bodies, and unfiltered AdminAuditLog.metadata remain excluded.
- No schema, migration, dependency, environment-variable, public endpoint, mutation action, or PMS behavior was added.
- All 15 acceptance criteria passed on 2026-08-05.
- Implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Implementation and acceptance record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

### Phase 11.6 acceptance closure

```text
- Phase 11.6.1 through 11.6.5 are completed and accepted.
- Lifecycle notification contracts, bilingual templates, transactional intent orchestration, post-commit delivery, adjustment-payment links, delivery-result relations, retry/manual recovery, and protected operational history operate through the accepted Phase 10 foundation.
- Email delivery remains isolated from Reservation, lifecycle-request, hold, Payment, Refund, and date-transition state.
- Permanent deduplication, test routing, bounded retry, stale recovery, ES/EN output, source/result relations, manual parent/child history, safe diagnostics, and protected admin visibility were accepted.
- No historical email backfill, guest self-service mutation, raw provider exposure, card-data handling, hard deletion, or PMS behavior was introduced.
- Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

### Phase 11.7 validation and documentation closure

```text
- All 15 reduced cross-phase criteria passed on 2026-08-05.
- Cancellation, standard/extraordinary refunds, evidence-based reconciliation, positive/zero/negative/failed-positive date mutations, stay extensions, independent holds, availability, buffers, composed dependencies, lifecycle emails, retry/manual recovery, and protected operational history remained coherent.
- ES/EN responsive and accessible output, centralized copy, safe diagnostics, restricted-data boundaries, idempotency, concurrency protection, and failure isolation passed.
- Environment validation, Prisma generation/validation/migration status, lint, build, whitespace validation, and clean repository status passed.
- No application code, schema, migration, seed, dependency, environment variable, or Phase 12 behavior was added.
- Validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6.
- Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Authoritative closure record: docs/120-phase-11.7-validation-and-documentation-closure.md.
```

### Phase 11 acceptance closure

```text
- Phase 11.1 through 11.7 are completed and accepted.
- Reservation owns stay and availability state; Payment and Refund own financial state; typed lifecycle requests, holds, notifications, and bounded audit evidence preserve operational history.
- Guest self-service lifecycle mutation, raw provider exposure, card-data handling, hard deletion, history rewrite, and PMS behavior remain excluded.
- At Phase 11 closure, Phase 12 remained Not started while the registered Pre-Phase-12 Improvement Track completed Packages A, B, C, E, and F; Phase 12 was later activated as Test-only work in 12.1 on 2026-08-10.
```

### Phase 11.6 requirements accepted during 11.4.2

```text
- RESERVATION_CANCELLED goes to the guest only after the cancellation transaction commits and must not promise an unconfirmed refund.
- ADMIN_RESERVATION_CANCELLED uses a separate administrative template with policy, decision, actor, payment state, and protected reservation detail.
- REFUND_PROCESSED goes to the guest only after reconciliation commits Refund.status = APPROVED and Payment becomes PARTIALLY_REFUNDED or REFUNDED.
- ADMIN_REFUND_PROCESSED uses a separate administrative template with refund type, amount, reason, actors, reconciliation source, safe reference, and payment transition.
- No refund email is created for PENDING, PROCESSING, provider-accepted-pending, inconclusive consult, or FAILED outcomes.
- Phase 11.6 added typed optional lifecycleRequestId/refundId EmailNotification links and stable per-recipient deduplication keys.
- The completed implementation reuses the Phase 10 post-commit Resend, retry, test-routing, and recovery foundation.
```

---

## Phase 12 — Test Deployment & External Integration Validation

Status: **Completed and accepted on 2026-08-11 — 12.1 through 12.6, 12.8, 12.9, and 12.10 accepted; 12.7 scheduler activation intentionally transferred to Phase 13**

Goal: Create TRP Booking's first real Internet-accessible Test deployment and validate the already-built application against real hosted infrastructure and external integrations without creating or using production-company provider accounts.

Approved Test ownership boundary:

```text
Vercel: new TRP Booking Test project in the developer's existing personal Vercel account
Application domain: trp-booking.juantzun.dev
TRP_ENVIRONMENT: test
Database: same developer-owned Supabase database used by Local
Resend: same personal account/domain used by Local
Zoho: same juantzun.dev organization/aliases used by Local
Cloudinary: same personal account used by Local
Tilopay: same sandbox account used by Local
CRON_SECRET: new Test-only secret
Airbnb inbound iCal: real listing URLs
TRP outbound iCal: expose Test URL and perform controlled validation against real Airbnb listings
Email DNS/Zoho DNS: reuse existing juantzun.dev configuration; no new mail-provider DNS setup
Application DNS: attach trp-booking.juantzun.dev to the Vercel Test project
```

Local and Test intentionally share the same database and provider accounts listed above. The owner accepts responsibility for controlling Local/Test data used during real Airbnb iCal validation. Phase 12.1 does not add environment-specific reservation/iCal partitioning or filtering.

12.2 deployment correction:
- The first Vercel project/deployment attempt was rejected before a deployment record was created because the project was on Hobby while `vercel.json` declared schedules every 5 and 30 minutes.
- The cron endpoints remain part of the application; only Vercel scheduler registration is deferred.
- Test keeps Vercel scheduler registration disabled and may remain on Hobby; the accepted application cron routes and manual admin execution remain available.
- The former 12.7 requirement to upgrade Test to Vercel Pro and register recurring schedules was removed on 2026-08-11 for cost reasons and deferred to Phase 13.
- Phase 13 must activate the approved schedules only when `TRP_ENVIRONMENT=production`; Test must continue generating zero scheduler registrations.
- This decision does not change application cron handlers, `CRON_SECRET`, business behavior, or the approved schedules themselves.

Planned subphases:

```text
12.1 Test deployment and environment strategy — Completed and accepted on 2026-08-10
12.2 Vercel Test project and first deployment — Completed and accepted on 2026-08-10
12.3 Test environment variables and provider wiring — Completed and accepted on 2026-08-10
12.4 Test custom domain, Auth.js, and external callback validation — Completed and accepted on 2026-08-10
12.5 Real Airbnb inbound iCal integration — Completed and accepted on 2026-08-10
12.6 TRP Booking Test outbound iCal and controlled Airbnb round-trip — Completed and accepted on 2026-08-10
12.7 Vercel Cron deployment and scheduler validation — Deferred to Phase 13; no Test activation
12.8 Full Internet E2E regression — Completed and accepted on 2026-08-11
12.9 Test observability, security, and recovery readiness — Completed and accepted on 2026-08-11
12.10 Phase 12 validation and closure — Completed and accepted on 2026-08-11
```

Authoritative 12.1 record: `docs/136-phase-12.1-test-deployment-and-environment-strategy.md`.

12.2 acceptance: the dedicated Test project produced its first successful Vercel Production Deployment from `main` with `TRP_ENVIRONMENT=test`, using Vercel's generated HTTPS URL and with scheduler registration intentionally absent. The stable custom domain remains deferred to 12.4 and the approved cron schedules were originally deferred to 12.7; the 2026-08-11 decision moved actual scheduler activation to Phase 13. Authoritative 12.2 records: `docs/137-phase-12.2-vercel-test-project-and-first-deployment.md` and `docs/138-phase-12.2-acceptance-closure.md`.

12.3 configuration boundary:
- Audit the existing Vercel Production-environment variables used by the Test project instead of recreating or rotating already-valid Local/Test credentials.
- Keep the 12.2 core wiring for Supabase, Auth.js, Cloudinary, Tilopay sandbox, `TRP_ENVIRONMENT=test`, and the dedicated Test `CRON_SECRET`.
- Add the accepted Test Resend/email contract and set `EMAIL_DELIVERY_MODE=test`; Test guest delivery uses the intended reservation recipient, Test admin delivery uses `admin@juantzun.dev`, and `EMAIL_TEST_RECIPIENT` remains absent/empty.
- `EMAIL_PUBLIC_BASE_URL` is configured to the approved stable Test target `https://trp-booking.juantzun.dev` even though domain attachment/navigation acceptance remains 12.4 work.
- `AUTH_URL` remains deferred to 12.4, `AIRBNB_ICAL_IMPORT_URLS_JSON` remains deferred to 12.5, and Vercel cron registration remains absent in Test; the 2026-08-11 decision moved activation to Phase 13.
- Environment-variable changes require a new Vercel Production Deployment before they are accepted.
- 12.3 validates configuration and hosted baseline health; it does not claim Google OAuth, Tilopay callback, custom-domain, Airbnb, or scheduler E2E acceptance.

12.3 acceptance: the owner completed the Vercel Production-environment audit, enabled the accepted Test Resend/email contract, redeployed successfully, and reported all 19 hosted acceptance checks passing on repository head `dcea31801351b40029c8c194949e91d0a5642407`. Authoritative records: `docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md` and `docs/140-phase-12.3-acceptance-closure.md`.

12.4 execution boundary:
- Attach only the application subdomain `trp-booking.juantzun.dev` to the Vercel Test project; existing juantzun.dev email DNS remains untouched.
- Keep `AUTH_TRUST_HOST=true` and leave `AUTH_URL` unset initially; the repository already treats it as optional for Auth.js v5, so host inference must be observed before adding any override.
- Register the exact Google OAuth redirect URI `https://trp-booking.juantzun.dev/api/auth/callback/google` while preserving the existing localhost redirect URI.
- Validate the implemented Tilopay browser redirect plus server-side consult path through `/api/payments/tilopay/redirect`.
- The configured `/api/payments/tilopay/webhook` target has no current route handler and is not claimed or registered as an accepted webhook in 12.4; if Tilopay requires or calls it, 12.4 remains open for an explicit correction.
- Airbnb remains deferred to 12.5–12.6 and Vercel scheduler registration remains absent in Test and is deferred to Phase 13.

Authoritative 12.4 record: `docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md`.

12.4 observed hosted progress:
- `trp-booking.juantzun.dev` is attached to the Test Vercel project and serves valid HTTPS.
- The existing Google OAuth web client required `https://trp-booking.juantzun.dev` under Authorized JavaScript origins in addition to the exact redirect URI; localhost remains preserved.
- Hosted Google OAuth/admin authentication is working with `AUTH_TRUST_HOST=true` and without introducing an `AUTH_URL` override.
- 12.4.1 corrected the Vercel runtime `DATABASE_URL` from Supabase Session pooler (`5432`) to Transaction pooler (`6543`) with serverless-safe connection limiting while leaving `DIRECT_URL` unchanged; the observed `EMAXCONNSESSION` failures stopped after redeploy.
- The hosted pending-hold 500 was corrected by propagating the active transaction client through reservation pricing/property reads.
- The final controlled Tilopay sandbox flow passed on the stable Test domain after the pending-hold correction.
- 12.4 is completed and accepted at repository head `4956fe08c033d0265d5400639c94d8b4927ddaf5`.

Authoritative 12.4.1 record: `docs/142-phase-12.4.1-hosted-database-pooling-correction.md`.
Authoritative 12.4 closure: `docs/143-phase-12.4-acceptance-closure.md`.

12.5 acceptance summary:
- The three real Airbnb export `.ics` URLs were configured privately in Vercel Test and mapped to the actual `ExternalCalendar.id` records without committing or logging provider tokens.
- Hosted manual sync succeeded for all three configured calendars and the final unchanged-feed execution was idempotent: zero imported events, zero removed events, zero newly created blocks, and zero active duplicate blocks.
- The real feed exposed `Reserved` versus `Airbnb (Not available)` semantics. 12.5.1 corrected provider events to source-property-only persistence and limited TRP preparation buffers to real `Reserved` events.
- The initial Bungalow/Refugio Completo feed mapping was accidentally crossed; correcting the private environment mapping proved the existing REMOVED + soft-delete reconciliation path recovered safely without manual destructive cleanup.
- 12.5.1.1 consolidated multiple effective Airbnb blockers and Airbnb/preparation overlap only in the admin presentation while preserving independent auditable rows.
- Final `ExternalCalendar` rows were ACTIVE; final sync logs were ADMIN/SUCCESS with null failure/error fields; Runtime Logs showed no raw Airbnb URL or token.
- `vercel.json` remained `crons = []` and no TRP outbound feed was connected to Airbnb during 12.5.
- Accepted functional head: `409e299eee233d852a9ffee0aef20561b0931c4d`.

Authoritative 12.5 records: `docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md`, `docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md`, `docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md`, and `docs/147-phase-12.5-acceptance-closure.md`.

12.6 acceptance summary:
- 12.6.1 established an explicit outbound ownership boundary: confirmed direct reservations and their effective TRP preparation buffers remain canonical from Reservation state; export-eligible CalendarBlock state is limited to TRP-owned manual, maintenance, and non-provider preparation records.
- Provider-origin `AIRBNB` blocks, provider-linked preparation artifacts, and physical composed-dependency copies are excluded from outbound feeds.
- VEVENT identity is stable for the same normalized range and the permanent UID namespace is `turefugioperfecto.com`.
- 12.6.1.1 added Airbnb-compatible `/api/ical/<token>.ics` access while preserving the same private token hash and extensionless diagnostic compatibility.
- The existing three ExternalCalendar records were transitioned to BIDIRECTIONAL with import/export enabled; unique raw tokens were generated privately and only SHA-256 hashes were persisted.
- All three private Test feeds returned valid safe calendars and were connected to the matching real Airbnb listings without cross-mapping.
- The Apartment/Bungalow/Complete outbound matrix passed with controlled TRP `MANUAL_BLOCK` signals before provider connection and remained correct through the real Airbnb round-trip.
- A controlled Apartment signal completed TRP -> Airbnb -> TRP without expanding the range, creating feedback preparation days, or making Bungalow unavailable through a reflected Complete dependency.
- Removing the TRP source removed it from outbound feeds, Airbnb released the imported unavailability, TRP inbound reconciliation removed/soft-deleted the reflected provider state, and effective availability recovered.
- A second unchanged inbound sync was idempotent and the active duplicate-block query returned zero rows.
- No raw Airbnb import URL/token or TRP export token appeared in Vercel Runtime Logs, UI, docs, or git during acceptance.
- `vercel.json` remained `crons = []` throughout 12.6.
- Accepted head: `543e0b4bc4cd700e6ebc3a29415981aeae91a13c`.

Authoritative 12.6 records: `docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md`, `docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md`, `docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md`, and `docs/151-phase-12.6-acceptance-closure.md`.

12.7 decision boundary:
- The original Test scheduler-deployment runbook is superseded by the 2026-08-11 cost/scope decision.
- Test does not require Vercel Pro and does not register recurring schedules; the current static `vercel.json` remains `{"crons": []}` during Phase 12.
- The four existing cron routes, shared registry, overlap protection, durable history, and protected manual admin console remain part of the application and may be exercised manually in Test.
- Actual Vercel scheduler activation, recurrence evidence, and production `SCHEDULED` history move to Phase 13.
- Before Production activation, migrate static Vercel configuration to an environment-aware programmatic configuration (`vercel.ts` or an equivalent supported Vercel config) that returns the four approved cron registrations only when `TRP_ENVIRONMENT=production` and returns no cron registrations for `local`, `test`, missing, or unknown values.
- Do not maintain separate Test and Production application-code branches merely to vary cron registration. The environment/project configuration is the boundary.
- Keep the approved schedule contract unchanged: Airbnb sync and arrival scheduling every 30 minutes; hold expiration and email processing every 5 minutes.

Authoritative 12.7 deferral record: `docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md`.
12.8 start record: `docs/153-phase-12.8-full-internet-e2e-regression-start.md`.
12.8 execution matrix: `docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md`.
12.8 acceptance closure: `docs/155-phase-12.8-acceptance-closure.md`.

12.9 acceptance summary:
- Vercel Runtime/Build Log hygiene passed with no secret, private iCal, card, auth-token, or unexplained active 5xx exposure.
- Durable CronJobExecution, Airbnb sync, EmailNotification, and financial/lifecycle histories remained useful and safely normalized after short-lived runtime logs expire.
- Hosted public/admin Auth.js behavior, cookie metadata, cron authorization, sensitive-file probes, and invalid Tilopay API handling failed closed as required.
- Stage D measured the real hosted header baseline, then added `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and removed `X-Powered-By`; Vercel-provided HSTS remained intact. Comprehensive CSP enforcement is a Phase 13 go-live gate because Tilopay's complete Production runtime origin set must be measured before freezing policy.
- Static `NEXT_PUBLIC`, tracked-secret, console-output, and browser-network audits exposed no real server/provider secret, private iCal token, or card data to the TRP backend.
- The owner moved Supabase backup/PITR/restore validation and database-disaster-recovery rehearsal to the isolated Production infrastructure in Phase 13; Prisma validation and migration status still passed in Test.
- General, payment/refund, email, Airbnb, and cron recovery table-tops passed without manufacturing outages.
- Dependency remediation updated Next to `15.5.23`, NextAuth to `5.0.0-beta.32` / `@auth/core 0.41.3`, aligned `eslint-config-next`, moved `shadcn` to development tooling, and restricted Next image optimization to the configured TRP Cloudinary namespace. The final audit retained four high-severity transitive findings that were individually reviewed as non-applicable to TRP's execution path or mitigated by the accepted image boundary; no unresolved applicable high/critical finding remained.
- Final validators, Prisma status, lint, build, whitespace checks, clean repository state, hosted auth/public/image smoke, and security-header revalidation passed on the accepted application/security head `c6791cde5ae99a7b16d4582705f994b7963d115c`.

Authoritative 12.9 records: `docs/156-phase-12.9-observability-security-recovery-readiness.md`, `docs/157-phase-12.9-http-security-header-hardening.md`, and `docs/158-phase-12.9-acceptance-closure.md`.
12.10 completed the final Phase 12 reconciliation and closure on 2026-08-11. The validated closure base was `ebe28579872cbc2414573ef852b15139a2501551`; the authoritative closure record is `docs/159-phase-12.10-phase-12-validation-and-closure.md`.

Phase 12 explicitly excludes company-owned production account provisioning, production payment credentials, production email/DNS cutover, production database/media setup, and public go-live. Those belong to Phase 13.

---

## Inter-Phase Work — Post-Phase-12 / Pre-Phase-13 Final Improvement Track

Status: **Active — Final-A and Final-B are completed and accepted; Final-C is in progress at Final-C.5; Phase 13 remains Not started**

Goal: Complete the final owner-approved feature, correctness, communication, pricing, and performance round before Production while preserving the accepted Test/Production ownership boundary.

Packages:

```text
Final-A Reservation financial correctness and effective stay value — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
  Final-A.1 Financial source-of-truth and refund-allocation contract — Completed and accepted on 2026-08-11 at 19531568752a44446d0802d6581262260b881aaf
  Final-A.2 Central financial summary and cancellation-policy correction — Completed and accepted on 2026-08-11 at 9f4e04068726451ca87614dd99b1f10656510825
  Final-A.3 Standard and extraordinary multi-payment refund authorization — Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453
  Final-A.4 Negative DATE_CHANGE multi-payment integration — Completed and accepted on 2026-08-11 at 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
  Final-A.5 Admin UX, notification copy, and operational-history integration — Completed and accepted on 2026-08-12 at 4117435dd52f6278a205e314db95d336ce0f7662
  Final-A.6 Integrated acceptance and documentation closure — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-B Admin external-calendar integrations — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
  Final-B.1 External-calendar admin strategy and security contract — Completed and accepted on 2026-08-14 at 2627161d5b3960995be0f517682f84272431c291; record: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
  Final-B.2 Outbound-token encrypted persistence and rotation foundation — Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d; record: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
  Final-B.3 Admin external-calendar read model and integration UI — Completed and accepted on 2026-08-25 at 84e3f5158e76527a82b2b6655664ec9ab073ea44; record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
  Final-B.4 Airbnb inbound configuration and operational actions — Completed and accepted on 2026-08-25 at a3724f018449515363159ec9f23af892a21b24be; record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
  Final-B.5 TRP outbound Copy URL / Rotate URL / export controls — Completed and accepted on 2026-08-25 at bc6b3db1bec219913164ef267fe5279b19f49a27; record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
  Final-B.6 Integrated acceptance, regression and documentation closure — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613; record: docs/172-final-b-6-integrated-acceptance-regression-and-documentation-closure.md
Final-C Pricing rules: seasonal and length-of-stay — In progress
  Final-C.1 Pricing strategy, precedence and persistence contract — Completed and accepted on 2026-08-25 at 16d8b0411e573aaaa6b510ddb27a9b5d9c666478; record: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
  Final-C.2 Pricing persistence foundation and migration — Completed and accepted on 2026-08-26 at 2168262784b0a8213062b0d84ca9fe6069e98fc6; record: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
  Final-C.3 Central pricing engine and public quote/pending-reservation integration — Completed and accepted on 2026-08-26 at c8fc39d111d7b33ee4a375264c5a3c25030de185; record: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
  Final-C.4 Admin pricing-rule management — Completed and accepted on 2026-08-27 at 0a57b9772da55a78e8d445dc06ea2b738b412f11; record: docs/176-final-c-4-admin-pricing-rule-management.md
  Final-C.5 DATE_CHANGE/STAY_EXTENSION pricing integration — In progress; implementation base 0a57b9772da55a78e8d445dc06ea2b738b412f11; record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
  Final-C.6 Integrated regression and documentation closure — Not started
Final-D Additional charges and guest payment requests — Not started
Final-E Reservation reviews and post-checkout invitation — Not started
Final-F Twilio WhatsApp communication and staff alerts — Not started
Final-G Performance audit and optimization — Not started
Final-H Integrated regression and final improvement-track closure — Not started
```

Final-C explicitly excludes last-minute pricing/discount rules.

Authoritative track plan: `docs/160-post-phase-12-pre-phase-13-final-improvement-track.md`.

Final-A strategy and subphase roadmap: `docs/161-final-a-financial-correctness-strategy-and-roadmap.md`.

Final-A.2 implementation/validation record: `docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md`.

Final-A.3 implementation/validation record: `docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md`.

Final-A.4 implementation/validation record: `docs/164-final-a-4-negative-date-change-multi-payment-integration.md`.

Final-A.5 implementation/validation record: `docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md`.

Final-A.6 integrated acceptance record: `docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md`.

Phase 13 must not start until Final-H is completed and the owner explicitly accepts this track.

---

## Phase 13 — Production Infrastructure, Deployment & Go-Live

Status: **Not started — Phase 12 is accepted; the registered Final Improvement Track must complete through Final-H and be explicitly accepted before Production work begins**

Goal: Provision a fully company-owned production stack, deploy `TRP_ENVIRONMENT=production`, validate production integrations, and perform a controlled public launch.

Production ownership boundary:

```text
Vercel: new company-owned account/project
Supabase: new company-owned account/project
Tilopay: new company-owned production account/credentials
Resend: new company-owned account and production sending domain
Zoho: new company-owned organization for turefugioperfecto.com
Cloudinary: new company-owned account
Admin Google OAuth: company-owned Gmail/Google identity
DNS: configure turefugioperfecto.com for the production application and email providers
CRON_SECRET: new Production-only secret
Airbnb iCal: real production inbound/outbound integration
```

The exact Phase 13 subphase breakdown will be frozen only after the registered Post-Phase-12 / Pre-Phase-13 Final Improvement Track is completed through Final-H and explicitly accepted. Phase 13 is not activated by track registration. No personal/developer provider credential should become a Production dependency.
