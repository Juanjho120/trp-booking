# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase state: Phase 12 — Test Deployment & External Integration Validation — Completed and accepted on 2026-08-11
Current numbered phase: none active
Current work boundary: Post-Phase-12 / Pre-Phase-13 Final Improvement Track — Active
Last completed and accepted package: Final-E — Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E accepted feature head: 3843a6637300201bcb44b7ed235952afda02d880
Current package: Final-F — Public WhatsApp Contact and Admin Notifications — Active under accepted Final-F.R3 architecture rebaseline
Last accepted subphase: Final-F.R4 — WhatsApp backend/provider decommission, provider/schema cleanup and public floating WhatsApp contact — Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Current subphase: Final-F.R5 — Android Admin PWA/Web Push foundation — Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending
Final-F.1 implementation base head: c6dbe2309f0cd373701fc9444f7f15879692f423
Final-F.1 accepted implementation head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 implementation base head: ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 status: Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-F.3 implementation base head: 673e43c4d3f8f25a9aee5ee196552574637776dd
Final-F.3 initial implementation head: ee6194f2d51969aae56aab2b5351314326c3ed8a
Final-F.3 accepted implementation/validation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 status: Completed and accepted on 2026-09-22 at f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 record: docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md
Final-F.4 implementation base head: 24e6d58060d62cf89924ddb75af29738fddf4dd1
Final-F.4 status: Completed and accepted on 2026-09-22 at 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291
Final-F.4 record: docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md
Final-F.5 status: Twilio-based implementation completed at 551199a3e562be7c7fd9861760c3e38cafbf0b15 but superseded before owner acceptance by Final-F Architecture Revision R1; record: docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md; Final-F.R1 record: docs/198-final-f-architecture-revision-360dialog-coexistence.md; Final-F.R2 status: Implementation completed at 4e5d7dee3444dfbb427468a1c2ebbf6a94b70e5c with hardening at 26e197c851e6305b848eb9da76ae1a89912500c5, but superseded before owner acceptance by Final-F.R3 architecture rebaseline; record: docs/199-final-f-r2-360dialog-provider-foundation-and-developer-test-coexistence-onboarding.md; Final-F.R3 status: Completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; record: docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md; Final-F.R4 status: Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; record: docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md; Final-F.R5 status: Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8 status: Not started
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
Final-C.5 status: Completed and accepted on 2026-08-27
Final-C.5 feature head: a88b26c0e2782daad7ea3215eb5b12f8f5124806
Final-C.5 accepted head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.5 record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
Final-C.6 implementation base head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.6 closure-gate commit: 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe
Final-C.6 status: Completed and accepted on 2026-08-28
Final-C.6 accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Final-C.6 record: docs/178-final-c-6-integrated-regression-and-documentation-closure.md
Final-C status: Completed and accepted on 2026-08-28
Final-C accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Final-D implementation base head: 0839b2935fdc2349d23de6ce6b38177504e514c6
Final-D.1 status: Completed and accepted on 2026-08-31
Final-D.1 accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.1 record: docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md
Final-D.2 implementation base head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 status: Completed and accepted on 2026-08-31
Final-D.2 accepted head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.2 record: docs/180-final-d-2-additional-charge-persistence-foundation-and-migration.md
Final-D.3 implementation base head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 status: Completed and accepted on 2026-08-31
Final-D.3 accepted head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.3 record: docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md
Final-D.4 implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 status: Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection
Final-D.4 accepted implementation head: 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Final-D.4 record: docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md
Final-D.5 status: Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration
Final-D.5 implementation base head: 63f55e22d03270bce0d27be2197373e3ce3e5de8
Final-D.5 accepted implementation head: 06b3de23fbae23a77b58b432760abf12afd5a6c7
Final-D.5 record: docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Final-D.6 status: Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history
Final-D.6 accepted implementation head: 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.6 record: docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 implementation base head: 0a511f4b87c3d8556593f9d48909a71d7bfab14c
Final-D.7 status: Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Integrated regression and documentation closure
Final-D.7 accepted implementation/validation head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D.7 record: docs/185-final-d-7-integrated-regression-and-documentation-closure.md
Final-D status: Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D permanent regression: npm run final-d:validate — 66/66 PASS
Final-E.1 implementation base head: 2c9802b07ebf60e8953f32226962669eaf01cfc2
Final-E.1 status: Completed and accepted on 2026-09-18 — Review/invitation strategy, eligibility and security contract
Final-E.1 accepted strategy head: e83ad8443bd533715058e701769b10c2d5505436
Final-E.1 record: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Final-E.2 implementation base head: 2e1b26850c55364db8450fafc2bb35c6d89a2c3b
Final-E.2 status: Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593 — Review/invitation persistence foundation and migration
Final-E.2 accepted implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Final-E.3 implementation base head: 6cc737c1e846563069b5f71cbd60b34064ffc160
Final-E.3 status: Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 accepted implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Final-E.4 implementation base head: 19199e6382b4daa7651417c37c1958ad59300373
Final-E.4 status: Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1 — Review-invitation scheduling, cron integration and email delivery
Final-E.4 accepted implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Final-E.5 implementation base head: 2baddeb520c01cd860a73f84a22bd4ec5d0a148c
Final-E.5 status: Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d — Private guest review submission
Final-E.5 accepted implementation head: f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.5 record: docs/190-final-e-5-private-guest-review-submission.md
Final-E.6 implementation base head: 2b56d43d60da3558ce692e18f4756f1c862bcb17
Final-E.6 status: Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f — Admin moderation and public published-review presentation
Final-E.6 accepted implementation head: 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 record: docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md
Final-E.7 implementation base head: 4df7cbc07b6ae9789a62f568d1e3ab69a808d596
Final-E.7 accepted implementation/validation head: 3843a6637300201bcb44b7ed235952afda02d880
Final-E.7 status: Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880 — Integrated regression and documentation closure
Final-E permanent regression: npm run final-e:validate — 88/88 accepted
Final-E.7 record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Last completed package: Final-E — Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
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
Final Improvement Track registration base: dac105088d2c46be05a900abed3dfe83e608e964
Final Improvement Track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Final-A strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Final-A.2 record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Final-A.5 record: docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
Final-A.6 record: docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
Phase 13 status: Not started
Last updated: 2026-09-23
Last completed package: Final-E — Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Previous accepted implementation subphase: Final-F.4 Guest inbound WhatsApp, safe Reservation matching and protected admin inbox — completed and accepted on 2026-09-22 at 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291
Current package: Final-F — Public WhatsApp Contact and Admin Notifications — Active under accepted Final-F.R3 architecture rebaseline
Last accepted subphase: Final-F.R4 WhatsApp backend/provider decommission, provider/schema cleanup and public floating WhatsApp contact — Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Current subphase: Final-F.R5 Android Admin PWA/Web Push foundation — Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending
Final-F.1 implementation base head: c6dbe2309f0cd373701fc9444f7f15879692f423
Final-F.1 accepted implementation head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 implementation base head: ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 status: Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-F.3 implementation base head: 673e43c4d3f8f25a9aee5ee196552574637776dd
Final-F.3 initial implementation head: ee6194f2d51969aae56aab2b5351314326c3ed8a
Final-F.3 accepted implementation/validation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 status: Completed and accepted on 2026-09-22 at f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 record: docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md
Final-F.4 implementation base head: 24e6d58060d62cf89924ddb75af29738fddf4dd1
Final-F.4 status: Completed and accepted on 2026-09-22 at 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291
Final-F.4 record: docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md
Final-F.5 status: Twilio-based implementation completed at 551199a3e562be7c7fd9861760c3e38cafbf0b15 but superseded before owner acceptance by Final-F Architecture Revision R1; record: docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md; Final-F.R1 record: docs/198-final-f-architecture-revision-360dialog-coexistence.md; Final-F.R2 status: Implementation completed at 4e5d7dee3444dfbb427468a1c2ebbf6a94b70e5c with hardening at 26e197c851e6305b848eb9da76ae1a89912500c5, but superseded before owner acceptance by Final-F.R3 architecture rebaseline; record: docs/199-final-f-r2-360dialog-provider-foundation-and-developer-test-coexistence-onboarding.md; Final-F.R3 status: Completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; record: docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md; Final-F.R4 status: Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; record: docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md; Final-F.R5 status: Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8 status: Not started
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
Phase 12.1 documentation base: ede3881a0d2d341018c107fe0cfe5ba0a7f9c490
Phase 12.1 record: docs/136-phase-12.1-test-deployment-and-environment-strategy.md
Phase 12.2 status: Completed and accepted on 2026-08-10
Phase 12.2 accepted deployment source head: 91f513c57b6220ad8d1d32f9a198a3d5099b1fd7
Phase 12.2 record: docs/137-phase-12.2-vercel-test-project-and-first-deployment.md
Phase 12.2 acceptance closure: docs/138-phase-12.2-acceptance-closure.md
Vercel cron registration: intentionally absent in Test; Test may remain on Hobby. The 2026-08-11 decision defers production-only scheduler activation and recurrence validation to Phase 13
Phase 12.3 status: Completed and accepted on 2026-08-10
Phase 12.3 validated repository head: dcea31801351b40029c8c194949e91d0a5642407
Phase 12.3 record: docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md
docs/140-phase-12.3-acceptance-closure.md
docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
docs/142-phase-12.4.1-hosted-database-pooling-correction.md
docs/143-phase-12.4-acceptance-closure.md
docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
Phase 12.3 acceptance closure: docs/140-phase-12.3-acceptance-closure.md
docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
Phase 12.4 status: Completed and accepted on 2026-08-10
Phase 12.4 accepted repository head: 4956fe08c033d0265d5400639c94d8b4927ddaf5
Phase 12.4 record: docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
Phase 12.4.1 status: Completed and accepted on 2026-08-10
Phase 12.4.1 record: docs/142-phase-12.4.1-hosted-database-pooling-correction.md
Phase 12.4 acceptance closure: docs/143-phase-12.4-acceptance-closure.md
Phase 12.5 status: Completed and accepted on 2026-08-10
Phase 12.5 accepted functional head: 409e299eee233d852a9ffee0aef20561b0931c4d
Phase 12.5 record: docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
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
Phase 12.9 validated application/security head: c6791cde5ae99a7b16d4582705f994b7963d115c
Phase 12.9 matrix: docs/156-phase-12.9-observability-security-recovery-readiness.md
Phase 12.9 HTTP header hardening: docs/157-phase-12.9-http-security-header-hardening.md
Phase 12.9 acceptance closure: docs/158-phase-12.9-acceptance-closure.md
Phase 12.10 status: Completed and accepted on 2026-08-11 — Phase 12 validation and closure
Phase 12.10 validated repository head: ebe28579872cbc2414573ef852b15139a2501551
Phase 12 closure record: docs/159-phase-12.10-phase-12-validation-and-closure.md
Post-Phase-12 / Pre-Phase-13 Final Improvement Track: Active — Final-A, Final-B, Final-C, Final-D and Final-E completed and accepted; Final-F is Active under accepted Final-F.R3 architecture rebaseline with Final-F.1 through Final-F.4 completed and accepted; Final-F.5 superseded before owner acceptance; Final-F.R1 completed and accepted historically on 2026-09-23 at 4c94db87ebd9df225944ce76c78f98462e4755d1 but superseded for future target decisions by R3; Final-F.R2 implementation completed but superseded before owner acceptance; Final-F.R3 completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; Final-F.R4 completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; Final-F.R5 implementation completed / acceptance pending; Final-F.6-F.8 Not started; Final-G/H remain Not started
Final-A status: Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49 — Reservation financial correctness and effective stay value
Final-A.1 status: Completed and accepted on 2026-08-11 at 19531568752a44446d0802d6581262260b881aaf — Financial source-of-truth and refund-allocation contract
Final-A.2 status: Completed and accepted on 2026-08-11 at 9f4e04068726451ca87614dd99b1f10656510825 — Central financial summary and cancellation-policy correction
Final-A.3 status: Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453 — Standard and extraordinary multi-payment refund authorization
Final-A.4 status: Completed and accepted on 2026-08-11 at 1c5ea765543e46b89beb64ecb3c06141e8efd8e4 — Negative DATE_CHANGE multi-payment integration
Final-A.5 status: Completed and accepted on 2026-08-12 at 4117435dd52f6278a205e314db95d336ce0f7662 — Admin UX, notification copy, and operational-history integration
Final-A.6 status: Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49 — Integrated acceptance and documentation closure
Final-A strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Final-A.2 record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Final-A.5 record: docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
Final-A.6 record: docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
Final-B status: Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613 — Admin external-calendar integrations
Final-B implementation base head: 0927feb18be35b8d96aca0205a75ee19445f15d4
Final-B.1 status: Completed and accepted on 2026-08-14 at 2627161d5b3960995be0f517682f84272431c291 — External-calendar admin strategy and security contract
Final-B.1 record: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Final-B.2 status: Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d — Outbound-token encrypted persistence and rotation foundation
Final-B.2 record: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Final-B.3 status: Completed and accepted on 2026-08-25 at 84e3f5158e76527a82b2b6655664ec9ab073ea44 — Admin external-calendar read model and integration UI
Final-B.3 record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Final-B.4 status: Completed and accepted on 2026-08-25 at a3724f018449515363159ec9f23af892a21b24be — Airbnb inbound configuration and operational actions
Final-B.5 status: Completed and accepted on 2026-08-25 at bc6b3db1bec219913164ef267fe5279b19f49a27 — TRP outbound Copy URL / Rotate URL / export controls
Final-B.5 record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Final-B.6 status: Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613 — Integrated acceptance, regression and documentation closure
Final-C status: Completed and accepted on 2026-08-28 at dca50f51abe1836d3b678b762693219143b12099 — Pricing rules: seasonal and length-of-stay; last-minute pricing explicitly excluded
Final-C.1 status: Completed and accepted on 2026-08-25 — Pricing strategy, precedence and persistence contract
Final-C.1 implementation base head: e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Final-C.1 accepted strategy head: 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.1 record: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Final-C.2 status: Completed and accepted on 2026-08-26 — Pricing persistence foundation and migration
Final-C.2 accepted head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.2 implementation base head: 030dec0d8681de18db746b9aae882cadd54db966
Final-C.2 record: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Final-C.3 status: Completed and accepted on 2026-08-26 at c8fc39d111d7b33ee4a375264c5a3c25030de185 — Central pricing engine and public quote/pending-reservation integration
Final-C.4 status: Completed and accepted on 2026-08-27
Final-C.4 accepted head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.5 implementation base head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.5 status: Completed and accepted on 2026-08-27 at 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.5 record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
Final-C.6 status: Completed and accepted on 2026-08-28 at accepted feature head dca50f51abe1836d3b678b762693219143b12099 — Integrated regression and documentation closure; closure-gate commit 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe; implementation base 4fd36fd25484adda7d24a7df4da3c1738835474c; record: docs/178-final-c-6-integrated-regression-and-documentation-closure.md
Final-D status: Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Additional charges and guest payment requests
Final-D.1 implementation base head: 0839b2935fdc2349d23de6ce6b38177504e514c6
Final-D.1 status: Completed and accepted on 2026-08-31
Final-D.1 accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.1 record: docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md
Final-D.2 implementation base head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 status: Completed and accepted on 2026-08-31
Final-D.2 accepted head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.2 record: docs/180-final-d-2-additional-charge-persistence-foundation-and-migration.md
Final-D.3 implementation base head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 status: Completed and accepted on 2026-08-31
Final-D.3 accepted head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.3 record: docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md
Final-D.4 implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 status: Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection
Final-D.4 accepted implementation head: 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Final-D.4 record: docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md
Final-D.5 status: Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration
Final-D.5 implementation base head: 63f55e22d03270bce0d27be2197373e3ce3e5de8
Final-D.5 accepted implementation head: 06b3de23fbae23a77b58b432760abf12afd5a6c7
Final-D.5 record: docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Final-D.6 status: Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history
Final-D.6 accepted implementation head: 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.6 record: docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 implementation base head: 0a511f4b87c3d8556593f9d48909a71d7bfab14c
Final-D.7 status: Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Integrated regression and documentation closure
Final-D.7 accepted implementation/validation head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D.7 record: docs/185-final-d-7-integrated-regression-and-documentation-closure.md
Final-D accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D permanent regression: npm run final-d:validate — 66/66 PASS
Final-E status: In progress — Reservation reviews and post-checkout invitation
Final-E.1 status: Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436 — Review/invitation strategy, eligibility and security contract
Final-E.1 record: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Final-E.2 status: Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593 — Review/invitation persistence foundation and migration
Final-E.2 accepted implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 implementation base head: 2e1b26850c55364db8450fafc2bb35c6d89a2c3b
Final-E.2 record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Final-E.3 status: Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030 — Eligibility and invitation/token lifecycle foundation
Final-E.3 accepted implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Final-E.4 status: Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1 — Review-invitation scheduling, cron integration and email delivery
Final-E.4 implementation base head: 19199e6382b4daa7651417c37c1958ad59300373
Final-E.4 accepted implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Final-E.5 status: Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d — Private guest review submission
Final-E.6 status: Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f — Admin moderation and public published-review presentation
Final-E.6 implementation base head: 2b56d43d60da3558ce692e18f4756f1c862bcb17
Final-E.6 accepted implementation head: 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 record: docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md
Final-E.7 accepted implementation/validation head: 3843a6637300201bcb44b7ed235952afda02d880
Final-E.7 status: Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880 — Integrated regression and documentation closure
Final-E permanent regression: npm run final-e:validate — 88/88 accepted
Final-E.7 record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-F status: Active under accepted Final-F.R3 architecture rebaseline — Public WhatsApp Contact and Admin Notifications
Final-F.1 status: Completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8 — Twilio/WhatsApp + staff-alert strategy, onboarding, templates and security contract
Final-F.1 implementation base head: c6dbe2309f0cd373701fc9444f7f15879692f423
Final-F.1 accepted implementation head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 status: Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41 — Twilio Sandbox provider foundation, webhook signature validation and Test onboarding
Final-F.2 implementation base head: ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-F.3 implementation base head: 673e43c4d3f8f25a9aee5ee196552574637776dd
Final-F.3 initial implementation head: ee6194f2d51969aae56aab2b5351314326c3ed8a
Final-F.3 accepted implementation/validation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 status: Completed and accepted on 2026-09-22 at f0a465349b5217f7318146ad5b2de13f1d641a13
Final-F.3 record: docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md
Final-F.4 implementation base head: 24e6d58060d62cf89924ddb75af29738fddf4dd1
Final-F.4 status: Completed and accepted on 2026-09-22 at 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291
Final-F.4 record: docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md
Final-F.5 status: Twilio-based implementation completed at 551199a3e562be7c7fd9861760c3e38cafbf0b15 but superseded before owner acceptance by Final-F Architecture Revision R1; record: docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md; Final-F.R1 record: docs/198-final-f-architecture-revision-360dialog-coexistence.md; Final-F.R2 status: Implementation completed at 4e5d7dee3444dfbb427468a1c2ebbf6a94b70e5c with hardening at 26e197c851e6305b848eb9da76ae1a89912500c5, but superseded before owner acceptance by Final-F.R3 architecture rebaseline; record: docs/199-final-f-r2-360dialog-provider-foundation-and-developer-test-coexistence-onboarding.md; Final-F.R3 status: Completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; record: docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md; Final-F.R4 status: Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; record: docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md; Final-F.R5 status: Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8 status: Not started
Final-G status: Not started — Performance audit and optimization
Final-H status: Not started — Integrated regression and final improvement-track closure
Final Improvement Track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Phase 13 status: Not started — Production Infrastructure, Deployment & Go-Live remains blocked until Final-H is completed and the Final Improvement Track is explicitly accepted
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
11.5.4 functional matrix: Passed on 2026-08-03; all 17 criteria passed
11.5.4 closure document: docs/111-phase-11.5.4-acceptance-closure.md
11.5.5 implementation commit: e1e62859bc76a19ba0afb79e397f30b4e8c396fa
11.5.5 type-safety follow-ups: 5abf48d8ccb5c9f5484de0dca28ca1a546bf8b80, da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 implementation document: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
11.5.5 functional matrix: Passed on 2026-08-04; all 24 criteria passed
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

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The backend calls Tilopay server-side and exposes only safe initialization data.
Payment.providerReference stores the unique provider order number.
Card number, CVV, expiration, and card tokens never reach the backend.
```

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation

Status: **Completed**

```text
Redirect handling resolves Payment by providerReference/orderNumber.
Tilopay consult runs server-side.
OrderHash V2 uses HMAC-SHA256 validation.
Redirect query parameters are not final payment truth.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

```text
Reservation confirmation is payment-driven and idempotent.
Only APPROVED payment for an active PENDING_PAYMENT reservation can confirm it.
Reservation.confirmedAt is set and expiresAt is cleared.
Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 — Sandbox Hardening and Checkout UX

Status: **Completed**

```text
Tilopay preflight and OrderHash validation were hardened.
Expired reservation confirmation is prevented.
Retryable provider issues map to safe bilingual messages.
SDK client failures use safe operational diagnostics.
Payment and reservation statuses remain distinct and localized.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

```text
Protected admin visibility exists for reservations, payments, and safe SDK diagnostics.
Visible copy and statuses are bilingual.
Payment-driven confirmation remains the only confirmation path.
No card data, manual confirmation, cancellation, refund, date change, email, or PMS action was added.
```

### Phase 9.8 — Automatic Preparation Buffers

Status: **Completed**

```text
CONFIRMED reservations block stay dates and preparation buffers.
Active PENDING_PAYMENT holds block only while expiresAt is in the future.
Expired or invalid holds do not block availability.
Property buffer settings and composed-listing dependencies are respected.
```

### Phase 9.9 — Preparation Buffer Settings and Unlocks

Status: **Completed**

```text
Dynamic direct-reservation buffers use auditable override records.
Preparation days are editable from 0 through 30.
One-day PREPARATION_BUFFER CalendarBlock rows record admin unlocks.
Availability and iCal subtract only matching overrides.
Reservation stay dates remain blocked.
```

### Phase 9.9.1 — Admin Navigation and Property Calendar

Status: **Completed**

```text
The protected admin layout provides responsive sidebar navigation and route feedback.
Reservations and payments use dedicated searchable, filterable, paginated routes.
Visible selectors use the shared Radix design-system component.
The property calendar supports effective blockers, composed inheritance, manual blocks, and preparation overrides.
Successful and failed admin mutations use accessible snackbars.
```

### Phase 9.10 — Phase 9 Documentation Closure

Status: **Completed**

```text
Phase 9 behavior and boundaries were consolidated in README and official trackers.
Real Airbnb iCal operational configuration remains deferred to production readiness.
No credentials, card data, private iCal URLs, or provider secrets were documented.
```

### Phase 9.11 — Admin MVP and Brand Identity Completion

Status: **Completed**

```text
BrandLogo and BrandMark are used across public, admin, sign-in, metadata, and favicon surfaces.
Accommodation content, Cloudinary photos, amenity and house-rule catalogs, assignments, and read-only reservation/payment details are protected, bilingual, validated, and audited.
Photo, catalog, and accommodation mutations preserve optimistic concurrency and soft-delete history.
No manual reservation confirmation, cancellation, refund, guest date mutation, payment override, email delivery, or PMS expansion was added.
Closure document: docs/84-phase-9.11-validation-and-documentation-closure.md.
```

### Phase 10.1 — Email Notification Strategy and Environment Contract

Status: **Completed**

```text
Database-owned permanent deduplication and provider idempotency were selected.
Provider network calls run only after the reservation-confirmation transaction commits.
Guest RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION are the initial automatic messages.
Transactional email copy remains centralized in messages/es.ts and messages/en.ts.
```

### Phase 10.2 — Persistence and Resend Provider Foundation

Status: **Completed**

```text
Added Resend 6.17.2, environment isolation, Reservation.preferredLocale, permanent notification deduplication, PROCESSING, retry metadata, and a safe server-side provider adapter.
No templates, notification intents, confirmation hooks, retry cron, admin email UI, or actual delivery were introduced by this subphase.
Accepted commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72.
```

### Phase 10.3 — Bilingual Branded Reservation-Confirmation Templates

Status: **Completed**

```text
Guest and admin confirmation subjects, HTML, and plain-text templates use centralized bilingual copy and the approved brand system.
Strict typed inputs and Zod normalization prevent unsafe provider, card, admin-only, or PMS data from appearing in guest output.
Accepted commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

### Phase 10.4 — Guest and Admin Confirmation Notification Orchestration

Status: **Completed and accepted**

```text
Guest and per-admin notification intents are created or reused transactionally with reservation confirmation.
Provider delivery starts only after commit and atomically claims PENDING rows.
Repeated APPROVED callbacks reuse permanent deduplication keys.
Test mode preserves intended recipients while delivering only to EMAIL_TEST_RECIPIENT.
Accepted head: 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d.
```

### Phase 10.5 — Retry Processing and Admin Delivery Visibility

Status: **Completed and accepted**

```text
A protected worker applies bounded retries, stale PROCESSING recovery, atomic claims, and maximum-attempt enforcement.
Reservation detail shows safe, localized delivery history.
Payment remains APPROVED and Reservation remains CONFIRMED when delivery fails.
Accepted commits: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1 and f77625f1d95095d7ebfd270007e1cbc54b667762.
```

### Phase 10.5.1 — Manual Resend and Delivery Recovery Controls

Status: **Completed and accepted**

```text
Eligible confirmation notifications can create separate audited MANUAL delivery rows without rewriting source history.
Client request IDs and unique keys make retries and concurrent submissions idempotent.
Manual delivery reuses the existing provider and bounded retry pipeline.
Accepted commit: 355c72490d416a257b9827d31c67223a97200491.
```

### Phase 10.6 — Arrival Instructions Scheduling and Content

Status: **Completed and accepted**

```text
Property-owned bilingual arrival settings, scheduling, templates, house-rule rendering, version/date supersession, and idempotent intent creation were added.
The existing worker, Resend provider, retry limits, test routing, and admin history are reused.
Rotating secrets and PMS behavior remain prohibited.
Implementation document: docs/93-arrival-instructions-scheduling-and-content.md.
```

### Phase 10.7 — Validation and Documentation Closure

Status: **Completed**

```text
Phase 10 implementation and local/test evidence are consolidated in README and official trackers.
Production-recipient delivery and production-provider operational acceptance remain deferred to Phase 13; deployed Test validation belongs to Phase 12.
Closure document: docs/94-phase-10-validation-and-documentation-closure.md.
```

### Phase 11.1 — Lifecycle Strategy, Policy, and Provider Boundary

Status: **Completed**

```text
Reservation owns stay and availability state; Payment and Refund own financial state.
Cancellation and refund are separate decisions.
The approved direct-booking cancellation matrix is 100% at 7 or more days, 50% from 72 hours to less than 7 days, and 0% below 72 hours.
Policy timing uses the property's check-in time in America/Guatemala.
Guests use approved support channels; no unauthenticated lifecycle mutation endpoint is introduced.
Tilopay processModification type 2 is the refund boundary; actual sandbox behavior was assigned to 11.4.
Strategy and correction documents: docs/95-phase-11-lifecycle-strategy-and-roadmap.md and docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md.
```

### Phase 11.2 — Lifecycle Request Persistence and Audit Foundation

Status: **Completed and accepted**

```text
ReservationLifecycleRequest owns typed request state, actors, snapshots, timestamps, idempotency, and optimistic concurrency.
PaymentPurpose distinguishes initial and adjustment payments.
LifecycleRequestHold participates in availability only while active and unexpired.
Accepted commit: 2495aa891fd26938550960f94fdbea700151350f.
Implementation document: docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md.
```

### Phase 11.3 — Admin Cancellation Decision and Availability Release

Status: **Completed and accepted**

```text
Protected creation and decision flows snapshot the confirmed reservation, payment, and exact policy result.
Approval changes Reservation to CANCELLED and releases status-driven availability.
Rejection preserves the reservation.
Pending/failed arrival intents become SKIPPED while SENT history remains.
Accepted commit: c609ea0e5b4654da86436dba79477455681d7b14.
Implementation document: docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md.
```

### Phase 11.4 — Refund Authorization and Tilopay Reconciliation

Status: **Completed and accepted**

```text
Refund authorization is protected, idempotent, and bounded by policy and captured-payment balance.
Tilopay type-2 execution is sandbox-only and occurs after authorization commit.
Known rejected responses fail safely; uncertain or accepted-pending responses require evidence-backed reconciliation.
Only APPROVED reconciliation changes Payment financial state.
Extraordinary compensation is independent from cancellation and preserves CONFIRMED or CANCELLED Reservation status.
Accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc.
Closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

### Phase 11.4.1 — Observed Tilopay Contract and Evidence-Based Reconciliation

Status: **Completed and accepted**

```text
The accepted sandbox success contract is HTTP 200, code 1101, approved description, and provider reference.
Codes 12 and 96 are rejected outcomes.
Sequential and concurrent provider duplicates prove that TRP Booking must own idempotency.
Consult reconciliation requires matching reference, order, Refund/2 movement, amount, currency when available, code, and description.
Correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md.
```

### Phase 11.4.2 — Extraordinary Refund Authorization and Consult Evidence Lock

Status: **Completed and accepted**

```text
Refund.authorizationType distinguishes legacy, standard-policy, and extraordinary compensation.
Extraordinary refunds link to the validated initial Payment, may apply to CONFIRMED or CANCELLED reservations, and never change Reservation lifecycle status.
All committed refund types remain cumulatively bounded by Payment.amount.
Conclusive consult evidence locks outcome, source, mode, and provider reference.
Implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md.
```

### Phase 11.5.1 — Strategy, Pricing, Independent Holds, and Financial-Adjustment Contract

Status: **Completed and accepted**

```text
The public pending-reservation hold remains 15 minutes and is independent from the 60-minute lifecycle-adjustment hold.
Full date changes reprice the requested stay; extensions preserve original total and price only added nights.
Positive differences require an adjustment Payment and hold; zero requires neither; negative requires an exact lifecycle-adjustment refund path.
Approved adjustment payment that cannot complete requires compensation while original dates remain unchanged.
Strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md.
```

### Phase 11.5.2 — Admin Request Creation, Quote, and Availability Validation

Status: **Completed and accepted**

```text
Protected request creation snapshots the confirmed Reservation and validated initial Payment, calculates authoritative pricing, and validates availability while excluding only the current Reservation.
Creation is idempotent, concurrent-safe, stale-fenced, audited, and bilingual.
Positive, zero, negative, timing, availability, and expiry matrices passed.
Implementation commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f.
Implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md.
```

### Phase 11.5.2.1 — Admin Availability Datepicker and Own-Reservation Exclusion UX

Status: **Completed and accepted**

```text
The styled admin range calendar excludes only the current Reservation and its derived buffers.
Every unrelated blocker remains disabled.
DATE_CHANGE, fixed-check-in STAY_EXTENSION, loading, failure protection, public-calendar regression, and ES/EN parity passed.
Accepted head: 56023423f4545914f43856ea44398e8d90301820.
Closure document: docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md.
```

### Phase 11.5.3 — Approval, Requested-Date Hold, and Adjustment Payment

Status: **Completed and accepted**

```text
Protected idempotent approval/rejection is implemented.
Positive approval creates one active 60-minute hold and one exact pending LIFECYCLE_ADJUSTMENT Payment.
Zero and negative approvals create no payment or hold at this boundary.
Opaque AES-256-GCM guest handoff isolates request, hold, payment, purpose, and expiration.
Tilopay SDK, preflight, telemetry, redirect, retry rotation, and hold expiry remain purpose-safe.
Functional matrix passed on 2026-08-03.
Implementation document: docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md.
```

### Phase 11.5.3.1 — Transaction Resilience and Admin Datepicker Positioning

Status: **Completed and accepted**

```text
Serializable transactions define 10-second maxWait and 20-second timeout.
P2034 conflicts retry complete idempotent transactions up to three times.
The availability calendar opens directly below its trigger.
First-attempt creation/decision and focused concurrency tests passed.
Accepted head: ece97aa72aec1b0c1eb13f2d21b6b8d862d9c4d4.
Closure document: docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md.
```

### Phase 11.5.4 — Final Positive/Zero Completion

Status: **Completed and accepted**

```text
Zero DATE_CHANGE and STAY_EXTENSION complete atomically inside approval with no Payment or hold.
Positive completion runs only after exact server-validated APPROVED LIFECYCLE_ADJUSTMENT payment evidence and an active matching hold.
The shared Serializable completion transaction revalidates immutable Reservation state, timing, requested pricing, availability, buffers, dependencies, payment, and hold.
Reservation.id, CONFIRMED, and confirmedAt are preserved while requested dates/pricing are applied.
Positive completion releases the hold; replay and concurrent completion are idempotent.
Stale snapshots, unrelated blockers, invalid holds, invalid Payments, and timing failures preserve original dates/prices.
Old PENDING/FAILED arrival intents become SKIPPED, SENT history remains, and at most one new eligible arrival intent is created.
The opaque completed page hides checkout and creates no additional attempt.
No lifecycle email is created and the public checkout and 15-minute hold remain unchanged.
All 17 acceptance criteria passed on 2026-08-03, including ES/EN parity and npm run build.
Implementation and accepted head: c996716aaad897c4e583a0d83b31b87bfece8e08.
Implementation document: docs/110-phase-11.5.4-final-positive-zero-completion.md.
Closure document: docs/111-phase-11.5.4-acceptance-closure.md.
```

### Phase 11.5.5 — Negative-Difference and Failed-Completion Refund Integration

Status: **Completed and accepted**

```text
Negative shortened-stay DATE_CHANGE requests apply requested dates/pricing and create one exact lifecycle-adjustment Refund against the initial Payment.
STAY_EXTENSION preserves check-in, moves check-out later, and prices only added nights; reducing nights is DATE_CHANGE.
Approved adjustment Payments whose final mutation cannot commit preserve original dates and create one exact compensating Refund.
Failed negative Refunds preserve completed dates; failed compensation preserves the approved adjustment Payment and original Reservation.
Replay, concurrency, evidence locking, balance protection, arrival supersession, public-hold regression, no-lifecycle-email boundary, and ES/EN parity passed.
All 24 acceptance criteria passed on 2026-08-04.
Accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145.
Implementation record: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md.
Closure record: docs/113-phase-11.5.5-acceptance-closure.md.
```

### Phase 11.5.6 — Integrated Acceptance and Documentation Closure

Status: **Completed and accepted**

```text
The reduced integrated matrix passed all eight cases on 2026-08-04.
Positive DATE_CHANGE, positive STAY_EXTENSION, zero DATE_CHANGE, shortened-stay negative DATE_CHANGE, and failed-positive compensation completed with the accepted Payment/Refund ownership rules.
The 15-minute public hold and 60-minute lifecycle hold remained independent.
Availability, preparation buffers, composed-listing dependencies, arrival supersession, replay, concurrency, standard/extraordinary Refund regression, public checkout, ES/EN parity, and lifecycle-email deferral remained intact.
No application code change was required.
Accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508.
Closure document: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md.
```

## Completed Work — Phase 11.6.1

### Phase 11.6.1 — Notification Contract and Persistence Relations

Status: **Completed and accepted**

```text
The eight guest/admin lifecycle notification types and authoritative triggers are frozen.
EmailNotification has optional typed lifecycleRequestId and refundId relations while reservationId remains mandatory.
Stable normalized per-recipient deduplication keys are centralized for lifecycle-request and refund sources.
The migration preserved existing history and performed no historical backfill.
Prisma migration/generation, lint, build, and functional validation passed.
Accepted commit: 8996de10fadd676b1de41951e528c84aa6583f03.
Implementation document: docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md.
```

## Completed Work — Phase 11.6.2

### Phase 11.6.2 — Bilingual Lifecycle Email Templates

Status: **Completed and accepted — technical validation**

```text
Eight branded guest/admin HTML and plain-text template builders are committed.
The user's checkout passed lint and build at 6eb4a18c9e7476266cae8c627318fa83ff27fb0d.
Manual subject, content, HTML/text, ES/EN, and inbox verification is intentionally consolidated into the integrated 11.6.3 matrix.
Implementation document: docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md.
```

## Completed Work — Phase 11.6.3

### Phase 11.6.3 — Transactional Intent Orchestration and Delivery

Status: **Completed and accepted**

```text
The integrated lifecycle inbox matrix passed successfully on 2026-08-04.
Guest/admin intent ownership, permanent deduplication, post-commit delivery, test routing, retries, stale recovery, replay safety, and failure isolation were accepted.
The accepted head is 5fed1ca0423190cd51a9c710d00c9216b65883a9.
Three follow-up observations were accepted for the next subphase without reopening the completed orchestration contract.
Implementation document: docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md.
```

## Completed Work — Phase 11.6.4

### Phase 11.6.4 — Lifecycle Adjustment Payment-Link Notifications and Email Corrections

Status: **Completed and accepted**

```text
Positive DATE_CHANGE and STAY_EXTENSION requests notify the guest with the private adjustment-payment link while preserving the original dates until payment and successful completion.
Guest SENT and terminal FAILED results create separate administrative delivery-result notifications without claiming inbox delivery or opening.
Protected manual sending, duplicate and active-delivery warnings, failed-only behavior, UUID idempotency, source preservation, and missing-intent worker recovery passed.
Completed DATE_CHANGE copy differentiates positive, zero, and negative financial branches; REFUND_PROCESSED remains the only final refund confirmation.
All 20 local, inbox, retry, idempotency, recovery, copy, security, and domain-isolation criteria passed on 2026-08-05.
Implementation commit: ffbed6b8c1b1d3dbd6fc61cee0e0c0f4d21d9c53.
Compilation fixes: 92e182e46796502335b8c3c171377c363d5521ae, 308721dd11f87e098cb639dca7356ebc35b0e67f.
Accepted head: 308721dd11f87e098cb639dca7356ebc35b0e67f.
Authoritative record: docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md.
```

## Completed Work — Phase 11.6.5

### Phase 11.6.5 — Protected Operational History and Acceptance

Status: **Completed and accepted**

```text
The protected reservation detail exposes one responsive, read-only operational timeline without creating a new persistence source.
Lifecycle requests, holds, initial and adjustment Payments, Refunds, EmailNotifications, retry state, manual parent/child links, source/result links, actors, and timestamps render through the accepted typed projection.
Deterministic descending ordering and the stable event-ID tie-breaker passed.
No-lifecycle empty state, cancellation, positive/zero/negative DATE_CHANGE, STAY_EXTENSION, compensating Refund, notification relations, retry states, existing recovery controls, ES/EN desktop/mobile behavior, and security boundaries passed.
Raw provider payloads, private tokens, credentials, card data, full email bodies, and unfiltered AdminAuditLog.metadata remain excluded.
No schema, migration, dependency, environment-variable, public endpoint, mutation action, or PMS behavior was added.
All 15 acceptance criteria passed on 2026-08-05.
Implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Implementation and acceptance document: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

## Completed Work — Phase 11.6

### Phase 11.6 — Lifecycle Notifications and Admin Operational History

Status: **Completed and accepted**

```text
Phase 11.6.1 through 11.6.5 are completed and accepted.
Lifecycle notification contracts, bilingual templates, transactional intent orchestration, post-commit delivery, adjustment-payment links, delivery-result relations, retry/manual recovery, and protected operational history operate through the accepted Phase 10 foundation.
Email delivery remains isolated from Reservation, lifecycle-request, hold, Payment, Refund, and date-transition state.
Permanent deduplication, test routing, bounded retry, stale recovery, ES/EN output, source/result relations, manual parent/child history, safe diagnostics, and protected admin visibility were accepted.
No historical email backfill, guest self-service mutation, raw provider exposure, card-data handling, hard deletion, or PMS behavior was introduced.
Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

## Completed Work — Phase 11.7

### Phase 11.7 — Validation and Documentation Closure

Status: **Completed and accepted**

```text
All 15 reduced cross-phase criteria passed on 2026-08-05.
Cancellation policy boundaries, cancellation decisions, standard and extraordinary refunds, evidence-based reconciliation, positive/zero/negative/failed-positive date mutations, stay extensions, independent holds, availability, buffers, composed dependencies, lifecycle emails, retry/manual recovery, and protected operational history remained coherent.
ES/EN responsive and accessible output, centralized copy, safe diagnostics, restricted-data boundaries, idempotency, concurrency protection, and failure isolation passed.
Environment validation, Prisma generation/validation/migration status, lint, build, whitespace validation, and clean repository status passed.
No application code, schema, migration, seed, dependency, environment variable, or Phase 12 behavior was required.
Validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6.
Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Authoritative closure record: docs/120-phase-11.7-validation-and-documentation-closure.md.
```

## Completed Work — Phase 11

### Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Completed and accepted**

```text
Phase 11.1 through 11.7 are completed and accepted as one coherent lifecycle feature.
Reservation owns stay and availability state; Payment and Refund own financial state; typed requests, holds, notifications, and bounded audit evidence preserve operational history.
Guest self-service lifecycle mutation, raw provider exposure, card-data handling, hard deletion, history rewrite, and PMS behavior remain excluded.
At the Pre-Phase-12 track closure, Phase 12 remained Not started. On 2026-08-10 the owner explicitly activated Phase 12 as Test-only deployment and external-integration validation.
The registered Pre-Phase-12 Improvement Track remains completed and accepted; Packages A, B, C, E, and F are accepted and Package D remains deferred outside the gate.
```

## Inter-Phase Work — Pre-Phase-12 Improvement Track

Status: **Completed and accepted — Packages A, B, C, E, and F accepted; Package D deferred outside the current gate**

```text
Packages A, B, C, E, and F remain the approved Phase 12 gate.
Package D remains deferred until the owner confirms future financial policies.
Package A was accepted at ec1e6ce7f43099864788f28ae30a87214afe554d.
Package B was accepted at 795a95fec81bc7ff3f177304f2df3df35c4d59e6.
Package C was accepted at 5a039aa451628e8ac9712c166bdd0a4605c8813f.
Package E was accepted on 2026-08-06 with closure record docs/126-pre-phase-12-package-e-acceptance-closure.md.
Package F.1 replaces the application-owned inbound/outbound mailbox proposal with Zoho Mail Lite for human correspondence, Resend for automatic transactional delivery, preserved reservation-level EmailNotification history, and a future protected reservation-to-Zoho navigation action.
Package F.1 was accepted on 2026-08-06 at strategy base cab7d71e34d230cdf49e013921764f6386d3fa2f.
Package F.2 was completed and accepted on 2026-08-07 after the isolated juantzun.dev Zoho Mail Lite mailbox, aliases, root-domain authentication, same-address reply behavior, mobile access, MFA, DMARC report filters, and controlled external authentication checks passed. No TRP application code, schema, migration, dependency, OAuth credential, IMAP credential, production Zoho configuration, or Resend subdomain record was changed.
Package F.3 was completed and accepted on 2026-08-07 at c75a943a9f36c31e146594d7ad03eedb44635f89 after the original ES/EN Reply-To round-trip matrix and the reduced local/test routing-refinement regression passed. Resend remains automatic-delivery-only, human replies route to Zoho, local guest delivery retains the safety-recipient override, test-mode routing uses intended guest recipients, admin mail remains centralized in juantzun.dev, and production configuration remains untouched.
Package F.4 was completed and accepted on 2026-08-07 at 7e0432f90836c5d4200ff528832eb48e69d1e642 after the full desktop/mobile ES/EN handoff matrix and technical validation passed. The protected reservation detail now provides a separate HTTPS Zoho Mail handoff with best-effort clipboard copy, native-app opening where supported by the operating system, clean mobile-web fallback, and no mailbox ingestion or OAuth integration.
Package F.5 was completed and accepted on 2026-08-07 at validation head a188ae304df6b377ed4ad9099c9f7d83c2365262 after all owner-executed technical and integrated checks passed. No Vercel Test deployment existed during acceptance; the documented `trp-booking.juantzun.dev` URL remains a planned Phase 12 target rather than deployed evidence.
Package F is completed and accepted. The Pre-Phase-12 gate is satisfied with Packages A, B, C, E, and F accepted; Package D remains deferred outside the current gate.
Phase 12 was explicitly activated on 2026-08-10 with 12.1; production work is separated into Phase 13.
Implementation plan: docs/121-pre-phase-12-improvement-track.md.
Package F strategy: docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md.
Package F.2 operational record: docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md.
Package F.2 closure: docs/129-pre-phase-12-package-f-2-acceptance-closure.md.
Package F.3 implementation: docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md.
Package F.3 closure: docs/131-pre-phase-12-package-f-3-acceptance-closure.md.
Package F.4 implementation: docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md.
Package F.4 closure: docs/133-pre-phase-12-package-f-4-acceptance-closure.md.
Package F.5 integrated validation: docs/134-pre-phase-12-package-f-5-integrated-validation-and-documentation-closure.md.
Package F closure: docs/135-pre-phase-12-package-f-integrated-acceptance-closure.md.
```

## Phase 12 — Test Deployment & External Integration Validation

### Phase 12.1 — Test deployment and environment strategy

Status: **Completed and accepted on 2026-08-10**

```text
- Phase 12 is Test-only; Phase 13 is Production-only.
- No Vercel deployment exists for TRP Booking yet at 12.1 closure.
- 12.2 will create the TRP Booking Test project in the developer's existing personal Vercel account.
- Test target domain is trp-booking.juantzun.dev.
- Local and Test intentionally share the same developer-owned Supabase database.
- Test reuses Local's personal Resend account/domain, juantzun.dev Zoho organization/aliases, personal Cloudinary account, and Tilopay sandbox account.
- Test uses a new Test-specific CRON_SECRET.
- Existing juantzun.dev email DNS/Zoho setup is reused; only the application-domain DNS required to attach trp-booking.juantzun.dev to Vercel is new.
- Test will use the real Airbnb inbound iCal URLs and expose the TRP Test outbound iCal for controlled validation on the real Airbnb listings.
- The owner will control shared Local/Test data operationally; no environment-specific iCal filtering or reservation partitioning is introduced by 12.1.
- Phase 13 will provision new company-owned Vercel, Supabase, Tilopay, Resend, Zoho, and Cloudinary accounts, production DNS, a company Gmail/Google admin identity, and a separate Production CRON_SECRET.
- No application code, schema, migration, dependency, secret, provider account, DNS record, or deployment is changed by 12.1 itself.
- Documentation base: ede3881a0d2d341018c107fe0cfe5ba0a7f9c490.
- Authoritative record: docs/136-phase-12.1-test-deployment-and-environment-strategy.md.
- Next subphase: 12.2 Vercel Test project and first deployment.
```

### Phase 12.2 — Vercel Test project and first deployment

Status: **Completed and accepted on 2026-08-10**

```text
- The Test project import/configuration was initiated in the developer-owned Vercel account.
- The initial attempt produced no deployment record because Vercel rejected the project configuration before build/deployment creation.
- Root cause: the Test project is currently on Hobby while the approved `vercel.json` schedules run every 5 and 30 minutes; Hobby permits cron schedules only once per day.
- The correction does not weaken or change the approved scheduler frequencies.
- `vercel.json` intentionally contains `"crons": []` during 12.2 through 12.6 so the first hosted Test deployment can be created without registering schedulers prematurely.
- All four cron API endpoints remain present and protected by the existing application logic.
- The original 12.7 Test-Pro requirement was superseded on 2026-08-11. Test remains without Vercel scheduler registration and may stay on Hobby.
- Phase 13 must activate exactly the approved schedules in Production only:
  - `/api/cron/sync-airbnb-calendars` -> `*/30 * * * *`
  - `/api/cron/expire-pending-reservation-holds` -> `*/5 * * * *`
  - `/api/cron/process-email-notifications` -> `*/5 * * * *`
  - `/api/cron/schedule-arrival-instructions` -> `*/30 * * * *`
- No cron execution is expected or accepted as part of 12.2.
- After the correction, the first Vercel Production Deployment for the Test project completed successfully and the owner reported it working without problems.
- The deployment uses the Vercel-generated HTTPS baseline; the temporary alias is intentionally not treated as the stable Test domain.
- `trp-booking.juantzun.dev` remains unattached and is validated later in 12.4.
- No Vercel cron schedule is registered; `vercel.json` remains `crons = []` through 12.6.
- Accepted deployment source head: 91f513c57b6220ad8d1d32f9a198a3d5099b1fd7.
- Implementation/correction record: docs/137-phase-12.2-vercel-test-project-and-first-deployment.md.
- Acceptance closure: docs/138-phase-12.2-acceptance-closure.md.
- Next subphase: 12.3 Test environment variables and provider wiring.
```

### Phase 12.3 — Test environment variables and provider wiring

Status: **Completed and accepted on 2026-08-10**

```text
- 12.3 uses the accepted Vercel Test project and Production Deployment model from 12.2 while TRP_ENVIRONMENT remains test.
- Existing Local/Test-approved Supabase, Auth.js, Cloudinary, and Tilopay sandbox values are audited in Vercel rather than rotated or duplicated without cause.
- The dedicated Test CRON_SECRET remains configured, but no Vercel cron schedule is registered through 12.6.
- The complete Test Resend/email contract is added to Vercel and EMAIL_DELIVERY_MODE becomes test.
- Test From addresses remain on mail.trp-booking.juantzun.dev.
- Test Reply-To addresses remain reservas@juantzun.dev and reservations@juantzun.dev.
- Test admin delivery remains admin@juantzun.dev.
- EMAIL_TEST_RECIPIENT remains absent/empty in Test.
- EMAIL_PUBLIC_BASE_URL targets https://trp-booking.juantzun.dev; actual domain/link navigation is not accepted until 12.4.
- AUTH_URL remains deferred to 12.4.
- AIRBNB_ICAL_IMPORT_URLS_JSON remains deferred to 12.5.
- Environment changes must be followed by a new Vercel Production Deployment; previous deployments do not receive changed variables.
- 12.3 does not claim Google OAuth, Tilopay callback, custom-domain, Airbnb, or Vercel scheduler E2E acceptance.
- The owner completed the Vercel environment audit, Test Resend/email wiring, Production redeploy, and reported all 19 hosted acceptance checks passing.
- Validated repository head: dcea31801351b40029c8c194949e91d0a5642407.
- Authoritative record: docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md.
- Acceptance closure: docs/140-phase-12.3-acceptance-closure.md.
- Next subphase: 12.4 Test custom domain, Auth.js, and external callback validation.
```

### Phase 12.4 — Test custom domain, Auth.js, and external callback validation

Status: **Completed and accepted on 2026-08-10**

```text
- trp-booking.juantzun.dev is attached to the accepted Vercel Test project and serves valid HTTPS.
- AUTH_TRUST_HOST=true remains active and AUTH_URL remains unset because hosted host inference works correctly.
- The Local/Test Google OAuth client preserves localhost and includes the stable Test Authorized JavaScript origin and callback URI.
- Allowlisted Google sign-in and protected /admin access passed on the stable Test domain.
- 12.4.1 moved the hosted runtime DATABASE_URL to the Supabase Transaction pooler and eliminated the observed EMAXCONNSESSION failures while DIRECT_URL remained unchanged.
- The pending-hold hosted 500 was corrected by propagating the active transaction client through reservation pricing/property reads.
- The controlled Tilopay sandbox checkout/redirect/consult validation passed after the pending-hold correction.
- No webhook support is claimed: /api/payments/tilopay/webhook still has no route handler in the accepted 12.4 scope.
- Airbnb remained deferred to 12.5–12.6 and Vercel schedules remained absent in Test; activation is now deferred to Phase 13.
- Accepted repository head: 4956fe08c033d0265d5400639c94d8b4927ddaf5.
- Authoritative record: docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md.
- Acceptance closure: docs/143-phase-12.4-acceptance-closure.md.
```

### Phase 12.4.1 — Hosted database pooling correction

Status: **Completed and accepted on 2026-08-10**

```text
- Hosted Test initially used the Supabase Session pooler for DATABASE_URL and repeatedly hit EMAXCONNSESSION / max clients reached with pool_size 15.
- Vercel Test runtime DATABASE_URL was changed to the Supabase/Supavisor Transaction pooler on port 6543.
- The runtime URL retains schema=trp_booking and uses the serverless connection-limiting contract approved during correction.
- DIRECT_URL was intentionally left unchanged for direct/Prisma CLI and migration use.
- No Local database split was introduced; Local and Test still share the same developer-owned Supabase database.
- After redeploy, the owner confirmed the application/admin navigation no longer reproduced the max-client failures.
- This is an infrastructure/environment correction; no application business logic changed.
- Authoritative record: docs/142-phase-12.4.1-hosted-database-pooling-correction.md.
```

### Phase 12.5 — Real Airbnb inbound iCal integration

Status: **Completed and accepted on 2026-08-10**

```text
- Three real Airbnb export feeds were mapped privately to the three active ExternalCalendar records in Vercel Test.
- A temporary private configuration mistake crossed the Bungalow and Refugio Completo feed URLs; correcting the mapping proved event REMOVED reconciliation and block soft deletion without destructive cleanup.
- Real provider data exposed both `Reserved` and `Airbnb (Not available)` events.
- 12.5.1 corrected provider-event persistence to the source property only and restricted TRP preparation buffers to real `Reserved` events; generic Airbnb unavailability remains blocking without extra TRP buffers.
- Composed-listing availability remains dynamic through the availability service instead of physical cross-property AIRBNB copies.
- 12.5.1 implementation commit: 438f3b95afecdfed5e4fd2df0b3a89856f276dbd.
- 12.5.1.1 consolidated equivalent effective blockers in the admin calendar without changing persisted rows, including multiple Airbnb origins and Airbnb + preparation overlap.
- 12.5.1.1 accepted head: 409e299eee233d852a9ffee0aef20561b0931c4d.
- Final unchanged-feed manual sync succeeded for all three calendars with zero events imported, zero events removed, zero blocks created, and zero active duplicate blocks.
- Final ExternalCalendar status was ACTIVE; sync execution was ADMIN/SUCCESS with null failures; Runtime Logs contained no raw Airbnb URL/token.
- `vercel.json` remained `crons = []` and no TRP outbound feed was imported into Airbnb.
- Accepted functional head: 409e299eee233d852a9ffee0aef20561b0931c4d.
- Records: docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md, docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md, docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md, docs/147-phase-12.5-acceptance-closure.md.
- Next subphase: 12.6 TRP Booking Test outbound iCal and controlled Airbnb round-trip.
```

### Phase 12.6 — TRP Booking Test outbound iCal and controlled Airbnb round-trip

Status: **Completed and accepted on 2026-08-10**

```text
- 12.6.1 implemented and validated outbound ownership/loop prevention, stable VEVENT identity, and the permanent `turefugioperfecto.com` UID namespace.
- Provider-origin AIRBNB blocks, provider-linked preparation artifacts, and physical composed-dependency copies do not enter TRP outbound feeds.
- Confirmed direct reservations, effective direct preparation, MANUAL_BLOCK, and MAINTENANCE ownership remain export-eligible through the dynamic composed-listing matrix.
- 12.6.1 implementation commit: 5a120e49fb2e6196d64fc98e608552b217b7522f.
- 12.6.1.1 added `.ics` URL compatibility without rotating raw tokens or changing their persisted SHA-256 hashes.
- 12.6.1.1 accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c.
- Three existing ExternalCalendar rows were transitioned to BIDIRECTIONAL/import+export enabled with unique private raw tokens and hash-only persistence.
- Three safe private `.ics` feeds returned HTTP 200/text-calendar, stable UIDs, and no sensitive guest/payment/admin/provider data; Vercel Runtime Logs did not expose raw tokens.
- The isolated Apartment/Bungalow/Complete MANUAL_BLOCK matrix passed before provider connection and all temporary signals disappeared after release.
- The three feeds were connected to the matching real Airbnb listings and provider import reflected the expected TRP-owned blocks without cross-mapping.
- A controlled Apartment round-trip completed TRP -> Airbnb -> TRP without expanding dates, creating feedback buffers, or contaminating Bungalow through Complete.
- Recovery passed: releasing the TRP source removed it from outbound, Airbnb released its imported copy, TRP reconciled reflected provider state to removed/soft-deleted history, and effective availability recovered.
- A second unchanged sync was idempotent and the active duplicate-block query returned zero rows.
- `vercel.json` remained `crons = []` throughout acceptance.
- Accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c.
- Records: docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md, docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md, docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md, docs/151-phase-12.6-acceptance-closure.md.
- Next subphase after the 2026-08-11 scheduler deferral decision: 12.8 Full Internet E2E regression.
```

### Phase 12.7 — Vercel Cron deployment and scheduler validation

Status: **Deferred to Phase 13 on 2026-08-11**

```text
- The owner decided not to upgrade the Test Vercel project to Pro solely to validate recurring cron delivery.
- Test keeps zero Vercel scheduler registrations and may remain on Hobby.
- `vercel.json` remains `crons = []` during Phase 12.
- The existing CRON_SECRET-protected routes, shared registry, durable CronJobExecution history, overlap protection, stale recovery, and protected manual admin console remain accepted application behavior.
- Manual Test execution remains available when Phase 12 regression needs to exercise a cron-owned business service.
- Real Vercel scheduler registration, recurrence, and SCHEDULED-trigger acceptance are moved to Phase 13.
- Phase 13 must use one codebase and an environment-aware Vercel configuration: production returns the four approved schedules; test/local/missing/unknown environment returns zero schedules.
- The approved frequencies remain unchanged.
- Authoritative deferral and production-only activation contract: docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md.
- Next active subphase: 12.8 Full Internet E2E regression.
```

### Phase 12.8 — Full Internet E2E regression

Status: **Completed and accepted on 2026-08-11**

```text
- The hosted A–H reduced regression completed successfully against the stable Test domain.
- Public ES/EN/mobile smoke, pending-hold isolation, Tilopay sandbox approval, guest/admin email delivery, Reply-To/Zoho handoff, Google OAuth/admin detail, and confirmed availability behavior passed.
- A paid direct Apartment reservation propagated through TRP outbound iCal to the matching Airbnb/Complete listing behavior without Bungalow contamination or feedback expansion.
- Standard cancellation froze the expected 100% policy result, released availability independently, and the one STANDARD_POLICY sandbox refund reconciled APPROVED with Payment REFUNDED while Reservation remained CANCELLED.
- Final outbound cleanup, Airbnb release, inbound reconciliation/soft-delete, and availability recovery passed.
- The second unchanged sync completed with eventsImported=0, eventsRemoved=0, blocksCreated=0; the accepted active duplicate-block query returned 0 rows.
- env/email/Airbnb/admin-calendar/db validators, lint, build, git diff --check, and clean git status all passed.
- No Production resource, credential, Vercel schedule, application-code change, schema change, migration, dependency, or runtime configuration change was introduced for 12.8.
- Acceptance base head: 9f7594e5423a7f78163c1f0bad645823f9c17e8d.
- Start record: docs/153-phase-12.8-full-internet-e2e-regression-start.md.
- Execution matrix: docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md.
- Acceptance closure: docs/155-phase-12.8-acceptance-closure.md.
```

### Phase 12.9 — Test observability, security, and recovery readiness

Status: **Completed and accepted on 2026-08-11**

```text
- Runtime/build-log hygiene, durable operational observability, fail-closed hosted auth/API behavior, security headers, secret/client exposure, incident-response table-tops, and final technical readiness passed.
- Security remediation updated Next/Auth.js, removed default technology disclosure, added low-risk HTTP headers, and restricted the Next image optimizer to the configured TRP Cloudinary namespace.
- Comprehensive CSP, Production monitoring/alerting, Vercel scheduler recurrence, and Supabase backup/PITR/restore validation remain explicit Phase 13 gates.
- Validated application/security head: c6791cde5ae99a7b16d4582705f994b7963d115c.
- Acceptance closure: docs/158-phase-12.9-acceptance-closure.md.
```

### Phase 12.10 — Phase 12 validation and closure

Status: **Completed and accepted on 2026-08-11**

```text
- Reconciled the complete Phase 12 record and confirmed 12.1–12.6, 12.8, and 12.9 accepted.
- Confirmed 12.7 is an intentional Phase 13 transfer rather than an incomplete Test gate.
- Confirmed Production carry-forwards for company ownership, scheduler activation/recurrence, persistent monitoring/alerting, comprehensive CSP, Supabase backup/PITR/RPO/RTO/restore, fresh dependency/security audit, and Production branding/provider migration.
- Final reduced technical closure passed: env validation, Prisma validation/migration status, lint, build, git diff --check, and clean repository state.
- Validated repository head: ebe28579872cbc2414573ef852b15139a2501551.
- Authoritative closure: docs/159-phase-12.10-phase-12-validation-and-closure.md.
- Phase 12 is completed and accepted.
- Phase 13 remains Not started.
- The next work boundary is an owner-defined Post-Phase-12 / Pre-Phase-13 Final Improvement Track whose scope has not yet been frozen.
```

## Inter-Phase Work — Post-Phase-12 / Pre-Phase-13 Final Improvement Track

Status: **Active — Final-A, Final-B, Final-C, Final-D and Final-E completed and accepted; Final-F is Active under accepted Final-F.R3 architecture rebaseline with Final-F.1 through Final-F.4 completed and accepted; Final-F.5 superseded before owner acceptance; Final-F.R1 completed and accepted historically on 2026-09-23 at 4c94db87ebd9df225944ce76c78f98462e4755d1 but superseded for future target decisions by R3; Final-F.R2 implementation completed but superseded before owner acceptance; Final-F.R3 completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; Final-F.R4 completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; Final-F.R5 implementation completed / acceptance pending; Final-F.6-F.8 Not started; Final-G and Final-H remain Not started**

```text
Registration base: dac105088d2c46be05a900abed3dfe83e608e964
Authoritative plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Final-A Reservation financial correctness and effective stay value — Completed and accepted on 2026-08-12
Final-B Admin external-calendar integrations — Completed and accepted on 2026-08-25
Final-C Pricing rules: seasonal and length-of-stay — Completed and accepted on 2026-08-28
Final-D Additional charges and guest payment requests — Completed and accepted on 2026-09-18
Final-E Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
  Final-E.1 Review/invitation strategy, eligibility and security contract — Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436
  Final-E.2 Review/invitation persistence foundation and migration — Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
  Final-E.3 Eligibility and invitation/token lifecycle foundation — Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
  Final-E.4 Review-invitation scheduling, cron integration and email delivery — Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1; record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
  Final-E.5 Private guest review submission — Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d; record: docs/190-final-e-5-private-guest-review-submission.md
  Final-E.6 Admin moderation and public published-review presentation — Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f; record: docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md
  Final-E.7 Integrated regression and documentation closure — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880; record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-F — Public WhatsApp Contact and Admin Notifications — Active under accepted Final-F.R3 architecture rebaseline
  Final-F.1 Twilio/WhatsApp + staff-alert strategy, onboarding, templates and security contract — Completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8; record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
  Final-F.2 Twilio Sandbox provider foundation, webhook signature validation and Test onboarding — Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41; record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
  Final-F.3 WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation — Completed and accepted on 2026-09-22 at f0a465349b5217f7318146ad5b2de13f1d641a13; implementation base 673e43c4d3f8f25a9aee5ee196552574637776dd; record: docs/195-final-f-3-whatsapp-conversation-message-staff-recipient-alert-persistence-foundation.md
  Final-F.4 Guest inbound WhatsApp, safe Reservation matching and protected admin inbox — Completed and accepted on 2026-09-22 at 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291; implementation base 24e6d58060d62cf89924ddb75af29738fddf4dd1; record: docs/196-final-f-4-guest-inbound-whatsapp-safe-reservation-matching-and-protected-admin-inbox.md
  Final-F.5 Admin outbound replies, 24-hour service-window enforcement and Twilio status callbacks — Twilio-based implementation completed at 551199a3e562be7c7fd9861760c3e38cafbf0b15 but superseded before owner acceptance by Final-F Architecture Revision R1; implementation base 29e29283e002b11d4275465f05f4785d70eae3df; record: docs/197-final-f-5-admin-outbound-replies-24h-window-and-status-callback-convergence.md
  Final-F.R1 360dialog + Meta Coexistence architecture revision — Completed and accepted historically on 2026-09-23 at 4c94db87ebd9df225944ce76c78f98462e4755d1; future target decisions superseded by R3; record: docs/198-final-f-architecture-revision-360dialog-coexistence.md
  Final-F.R2 — Implementation completed at 4e5d7dee3444dfbb427468a1c2ebbf6a94b70e5c with hardening at 26e197c851e6305b848eb9da76ae1a89912500c5, but superseded before owner acceptance by Final-F.R3 architecture rebaseline; record: docs/199-final-f-r2-360dialog-provider-foundation-and-developer-test-coexistence-onboarding.md
  Final-F.R3 — Admin Web Push + public WhatsApp architecture rebaseline — Completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0; record: docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md
  Final-F.R4 — WhatsApp backend/provider decommission, provider/schema cleanup and public floating WhatsApp contact — Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; implementation base e30acaf3e26d823172316bac4fdd79daf3cbf411; accepted implementation/validation head ae0db63efdabfa3bc952a8a2a71220de231ebc18; record: docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md
  Final-F.R5 — Android Admin PWA/Web Push foundation — Implementation completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending
  Final-F.6 — Admin Web Push operational notifications for RESERVATION_CONFIRMED, RESERVATION_CANCELLED, CHECK_IN_MINUS_48H, CHECK_OUT_MINUS_6H and REVIEW_SUBMITTED — Not started
  Final-F.7 — Zoho incoming-email bounded metadata + GUEST_EMAIL_RECEIVED Admin Web Push — Not started
  Final-F.8 — Android PWA/Web Push integrated regression, public WhatsApp contact acceptance and Final-F documentation closure — Not started
  Final-G Performance audit and optimization — Not started
  Final-H Integrated regression and final improvement-track closure — Not started
Phase 13 — Not started
```

Track rules recorded at registration:

```text
- Final-C does not include a last-minute rate/discount feature.
- Final-A corrects the effective financial value of a stay before pricing and additional-charge work proceeds.
- Final-F now separates the public guest WhatsApp contact from backend processing: guests use the official WhatsApp Business App number through a public deep link, while ADMIN operational notifications move to email + Android Web Push.
- Final-G compares a hosted performance baseline against the completed feature set before accepting optimization work.
- Test keeps zero Vercel scheduler registrations; Phase 13 remains the Production-only scheduler/provider/go-live boundary.
- Phase 13 planning remains blocked until Final-H closes and the owner explicitly accepts this track.
```


### Final-C.5 — DATE_CHANGE / STAY_EXTENSION pricing integration

Status: **Completed and accepted on 2026-08-27**

```text
- Central lifecycle pricing integration feature head: a88b26c0e2782daad7ea3215eb5b12f8f5124806.
- Snapshot narrowing correction head: 4fd36fd25484adda7d24a7df4da3c1738835474c.
- Accepted C.5 head: 4fd36fd25484adda7d24a7df4da3c1738835474c.
- DATE_CHANGE now reprices the complete requested replacement stay through the central Final-C engine.
- STAY_EXTENSION preserves accepted nights, prices only added nights, and uses resulting total stay length for LOS eligibility.
- Lifecycle requests persist original/requested pricing evidence and all POSITIVE/ZERO/NEGATIVE completion branches promote the accepted requested snapshot to Reservation.
- Legacy extensions preserve historical totals without fabricating rule evidence.
- Owner validation after the C.5 implementation and narrowing correction completed without further reported errors.
- Record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md.
```

### Final-C.6 — Integrated regression and documentation closure

Status: **Completed and accepted on 2026-08-28**

```text
- Implementation base head: 4fd36fd25484adda7d24a7df4da3c1738835474c.
- Closure-gate commit: 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe.
- Accepted feature head: dca50f51abe1836d3b678b762693219143b12099.
- C.6 extends the existing final-c:validate gate instead of creating a parallel validator.
- Final-C validation passed 41/41 registered tests.
- The consolidated matrix across base/LOS, seasonal precedence, public quote/pending holds, historical stability, lifecycle, and admin/security/audit contracts passed.
- Hosted Test and owner acceptance completed successfully, including the final pricing UX refinements.
- Final-C is completed and accepted on 2026-08-28.
- Final-D is now in progress at Final-D.3; Final-D.1 and Final-D.2 are completed and accepted.
- Phase 13 remains Not started.
- Record: docs/178-final-c-6-integrated-regression-and-documentation-closure.md.
```

### Final-D.1 — Additional-charge/payment-request strategy and financial-isolation contract

Status: **Completed and accepted on 2026-08-31**

```text
- Implementation base head: 0839b2935fdc2349d23de6ce6b38177504e514c6.
- Accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f.
- Freezes ancillary-charge categories, charge/request state, grouping, private-link security, Tilopay branching, refund allocation, email delivery, admin UX, concurrency, and financial-isolation boundaries.
- Additional-charge money remains separate from Reservation.total, currentStayValue, standard cancellation-policy entitlement, and DATE_CHANGE/STAY_EXTENSION stay pricing.
- D.1 changes documentation only; no schema, migration, runtime code, provider call, visible UI behavior, or Production infrastructure is introduced.
- Owner acceptance advances the package to Final-D.2.
- Record: docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md.
```

### Final-D.2 — Persistence foundation and migration

Status: **Completed and accepted on 2026-08-31 at `74ac3011eb22277a896d81c92897f1bee6a4d51b`**

```text
- Implementation base head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f.
- Adds the AdditionalCharge / GuestPaymentRequest / immutable item / ancillary refund-allocation persistence foundation.
- Extends PaymentPurpose, PaymentSubmissionSource and RefundAuthorizationType with ADDITIONAL_CHARGE and reserves ADDITIONAL_CHARGE_PAYMENT_REQUIRED for D.6.
- Adds nullable historical-safe relations from Payment and EmailNotification to GuestPaymentRequest.
- Adds one additive migration; no historical Reservation, Payment, Refund or EmailNotification data is rewritten or backfilled.
- Runtime admin creation, private checkout, ancillary refund execution and email delivery remain deferred to D.3-D.6.
- Record: docs/180-final-d-2-additional-charge-persistence-foundation-and-migration.md.
```


### Final-D.3 — Admin charge management and payment-request creation

Status: **Completed and accepted on 2026-08-31 at 6a0d909fc325f4e8925677041be34c77c023c42b**

```text
- Implementation base head: 74ac3011eb22277a896d81c92897f1bee6a4d51b.
- Adds protected admin create/edit/cancel management for positive USD ancillary charges inside Reservation → Financial.
- Groups one or more eligible PENDING charges into one immutable GuestPaymentRequest using server-authoritative totals and item snapshots.
- Uses Serializable transactions, optimistic updatedAt fencing and a client request id to guard concurrent/idempotent mutations.
- Generates 256-bit request-token material only after idempotent replay is ruled out; persists SHA-256 lookup hash plus AES-256-GCM recoverable copy with dedicated GUEST_PAYMENT_REQUEST AAD.
- Keeps raw access tokens out of D.3 API responses, admin DOM and audit metadata.
- Cancelling an unpaid PENDING request preserves immutable request history; attached unpaid charges remain PENDING and become eligible for a new request once the cancelled request is no longer active.
- Does not create Payment, Refund or EmailNotification rows; does not call Tilopay or Resend; does not expose a guest payment URL yet.
- Reservation.total, accepted pricing evidence, current stay value, cancellation-policy base and stay-refund balance remain isolated from ancillary money.
- Extends the payment-attempt history label contract so the D.2 ADDITIONAL_CHARGE source can never be displayed as initial checkout.
- Centralizes all new visible admin copy in messages/es.ts and messages/en.ts and uses the existing shadcn/Radix/Tailwind interaction primitives.
- Static/regression and Local/Test functional validation were completed and owner acceptance was recorded on 2026-08-31 at 6a0d909fc325f4e8925677041be34c77c023c42b; Final-D.4 has since been completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c.
- Record: docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md.
```


### Final-D.4 — Private guest payment link and Tilopay collection

Status: **Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c**

```text
- Implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b.
- Added private guest payment links at /reservas/cargos/[token] backed by GuestPaymentRequest token-hash lookup.
- Added the protected admin Copy private link action without rendering or retaining the raw URL in admin component state.
- Prepared one logical Tilopay Payment per GuestPaymentRequest with PaymentPurpose.ADDITIONAL_CHARGE and PaymentSubmissionSource.ADDITIONAL_CHARGE.
- Reused the accepted Tilopay SDK, preflight, redirect/result, client-event and payment-attempt abstractions for the distinct ancillary branch.
- Approved provider evidence marks only the immutable request and included AdditionalCharge rows PAID; it does not confirm/reconfirm a Reservation, mutate Reservation.total, mutate pricing evidence, change cancellation-policy stay money, or complete lifecycle date mutations.
- Rejected or failed provider outcomes keep the request and charges pending and auditable for retry while the request remains valid.
- Added guest-safe bilingual public copy and admin/error copy in messages/es.ts and messages/en.ts.
- Added focused source-contract validation under tests/final-d without adding an npm final-d:validate script.
- Validation passed locally: D.4 targeted 25/25, Final-A 44/44, Final-B 38/38, Final-C 41/41, Prisma validate/generate/migrate status/deploy/status, lint, build, and git diff --check after documentation reconciliation.
- Hosted Test owner acceptance completed on 2026-09-14: the private GuestPaymentRequest link loaded, React #418 did not reproduce, Additional Charges appeared in its own tab between Reservation lifecycle and Refunds, Prepare secure payment prepared checkout, the ADDITIONAL_CHARGE Payment was created, the Tilopay form displayed, and the flow no longer returned TILOPAY_SDK_SESSION_UNEXPECTED_ERROR.
- Final-D.5 completed owner acceptance on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7.
- Record: docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md.
```

### Final-D.5 — Additional-charge refunds and financial-summary integration

Status: **Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7**

```text
- Implementation base head: 63f55e22d03270bce0d27be2197373e3ce3e5de8.
- Added RefundAuthorizationType.ADDITIONAL_CHARGE authorization against real ADDITIONAL_CHARGE Payments.
- Persisted charge-level refund evidence through AdditionalChargeRefundAllocation without adding a new migration.
- Reused the existing Tilopay refund execution, consult and reconciliation routes for ancillary refunds; no alternate provider client or endpoint was introduced.
- Approved ancillary refund evidence updates only Payment financial status and AdditionalCharge financial status (PAID/PARTIALLY_REFUNDED/REFUNDED).
- Failed ancillary attempts do not update AdditionalCharge statuses and release reserved ancillary refundable balance.
- Added Final-A financial-summary integration for additionalChargeGrossAmount, additionalChargeCapturedAmount and additionalChargeRefundedAmount while keeping Reservation.total, current stay value, cancellation-policy money and stay refund balances isolated.
- Added admin UX in the existing Additional Charges tab for per-charge balances, refund history/evidence, refund authorization, Execute, Consult and Reconcile.
- At D.5 closure, D.6 email delivery/resend/history remained outside the D.5 scope; D.7 consolidated closure was not started.
- Validation executed locally: Final-D targeted 40/40, Final-A 44/44, Final-B 38/38, Final-C 41/41, rollback-only Local/Test DB validation, Prisma generate/validate/migrate status, lint, build and git diff --check.
- Hosted Test owner acceptance completed on 2026-09-17: the Additional Charges tab displayed the refund workflow, ancillary refund authorization, Tilopay Sandbox execution, Consult, Reconcile, partial refund, full refund, AdditionalCharge and Payment transitions to PARTIALLY_REFUNDED then REFUNDED, correct remaining refundable balance ending at 0, no flow errors, and correct separation from the stay refund workflow.
- Final-D.6 has since been completed and accepted on 2026-09-18 at `965045c697a9bfd0a3318db9396b15214a0cd066`; Final-D.7 and Final-D have since been completed and accepted on 2026-09-18 at `fd75663bb28be8a95b15c341eaa51f74e521241b`.
- Record: docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md.
```

### Final-D.6 — Email delivery and protected operational UX/history

Status: **Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066**

```text
- Implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2.
- Accepted implementation head: 965045c697a9bfd0a3318db9396b15214a0cd066.
- Created the ADDITIONAL_CHARGE_PAYMENT_REQUIRED email renderer and transactional intent path for GuestPaymentRequest creation.
- The automatic notification intent is created in the same Serializable transaction as the payment request and delivered best-effort only after commit.
- Replay of the same admin clientRequestId reuses the existing request and does not create a duplicate notification.
- Delivery eligibility requires a PENDING, unexpired, integrity-valid GuestPaymentRequest and verified token hash/encrypted-token consistency before the private URL is rendered.
- Manual resend reuses the existing request/token through the generic email-notification resend endpoint and keeps parent/child notification history.
- The Additional Charges admin tab now exposes safe notification state, resend controls, and protected operational history relations without raw tokens, private URLs, encrypted tokens, provider diagnostics, or raw error messages.
- D.7 consolidated closure, Final-E/F/G/H, Phase 13 and Production work were not started.
- Accepted validation evidence: Final-D targeted/integrated 63/63, Final-A 44/44, Final-B 38/38, Final-C 41/41, db:generate, db:validate, db:migrate:status with Local/Test Supabase 19 migrations up to date, lint, build, git diff --check, and Vercel deployment SUCCESS for the accepted head.
- Owner Hosted Test acceptance completed on 2026-09-18 after the full ancillary charge email/payment/refund flow and corrected Email Delivery 3/3 guest/admin presentation passed.
- Final-D.7 and Final-D have since completed owner acceptance on 2026-09-18 at `fd75663bb28be8a95b15c341eaa51f74e521241b`; the permanent `npm run final-d:validate` gate is accepted at 66/66.
- Record: docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md.
```

### Final-D.7 — Integrated regression and documentation closure

Status: **Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b**

```text
- Implementation base head: 0a511f4b87c3d8556593f9d48909a71d7bfab14c.
- Accepted implementation/validation head: fd75663bb28be8a95b15c341eaa51f74e521241b.
- Final-D accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b.
- Added the permanent package script `npm run final-d:validate`.
- Added D.7 integrated acceptance coverage for D.3 charge-domain and grouping/request invariants that were not directly covered by the prior D.4-D.6-focused suite.
- Final-D validation now passes 66/66 deterministic, non-destructive tests.
- Final-A, Final-B and Final-C permanent regression gates remain compatible.
- Prisma generate/validate passed; Local/Test migration status reports 19 migrations and database schema up to date after network-enabled status check.
- Lint passed.
- Build passed after network-enabled Google Fonts fetch; the sandbox-only first build attempt failed on font fetch.
- Final-D is completed and accepted on 2026-09-18.
- Final-E is completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880; Final-F is Active under accepted Final-F.R3 architecture rebaseline with Final-F.1 through Final-F.4 completed and accepted, Final-F.5 superseded before owner acceptance by Final-F Architecture Revision R1, Final-F.R1 completed and accepted historically but superseded for future target decisions by R3, Final-F.R2 completed but superseded before owner acceptance, and Final-F.R3 completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0. Final-F.R4 is completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; Final-F.R5 implementation is completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8, Final-G/H and Phase 13 remain Not started.
- Record: docs/185-final-d-7-integrated-regression-and-documentation-closure.md.
```

### Final-E.1 — Review/invitation strategy, eligibility and security contract

Status: **Completed and accepted on 2026-09-18**

```text
- Implementation base head: 2c9802b07ebf60e8953f32226962669eaf01cfc2.
- Accepted strategy head: e83ad8443bd533715058e701769b10c2d5505436.
- Created docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md.
- Corrected and froze the Final-E subphase split through E.7.
- Froze eligibility around Reservation.checkOutDate + Property.checkOutTime in America/Guatemala.
- Froze null/blank/invalid checkout time as fail closed with no invitation.
- Froze scheduler catch-up to eligibleAt >= now - 7 days to prevent historical spam.
- Froze one ReviewInvitation lifecycle and one Review per Reservation.
- Froze 256-bit review invitation token handling with SHA-256 lookup, encrypted retry copy and REVIEW_INVITATION crypto purpose/AAD.
- Froze 30-day invitation expiration, one-time atomic submission, safe display-name snapshot, PENDING/PUBLISHED/HIDDEN moderation and published-only public surface.
- Froze reuse of EmailNotification retry/provider infrastructure with an explicit reviewInvitationId relation direction.
- Froze optional schedule-review-invitations cron registry direction while keeping Test Vercel crons empty.
- Froze E.3 as dormant domain/token/eligibility foundation with no operational scheduler, public route, email intent creation or delivery.
- Froze E.4 as the first subphase that may activate scheduling and REVIEW_INVITATION email delivery, with dispatcher support and ReviewInvitation + EmailNotification transactional creation in the same changeset.
- No Prisma migration, runtime code, API route, page, email template, cron registration, provider call or validation script was added.
- Owner acceptance was explicitly recorded on 2026-09-18 after the delivery activation boundary correction.
- Final-E.2 is completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593.
- Final-E.3 is completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030; Final-E.4 is completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1; Final-E.5 is completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d; Final-E.6 is completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f; Final-E.7 and Final-E are completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880.
- Final-F is Active under accepted Final-F.R3 architecture rebaseline with Final-F.1 through Final-F.4 completed and accepted, Final-F.5 superseded before owner acceptance by Final-F Architecture Revision R1, Final-F.R1 completed and accepted historically but superseded for future target decisions by R3, Final-F.R2 completed but superseded before owner acceptance, and Final-F.R3 completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0. Final-F.R4 is completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; Final-F.R5 implementation is completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8, Final-G/H and Phase 13 remain Not started.
```

### Final-E.2 — Review/invitation persistence foundation and migration

Status: **Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593**

```text
- Implementation base head: 2e1b26850c55364db8450fafc2bb35c6d89a2c3b.
- Adds dormant ReviewInvitation and Review persistence, including database uniqueness for one invitation and one review per Reservation.
- Adds ReviewInvitationStatus and ReviewModerationStatus enums.
- Reserves CronJobKey.SCHEDULE_REVIEW_INVITATIONS and EmailNotificationType.REVIEW_INVITATION without registering a cron or creating notification rows.
- Adds EmailNotification.reviewInvitationId as a nullable relation for the future E.4 delivery path.
- Adds REVIEW_INVITATION crypto purpose/AAD support separate from GUEST_PAYMENT_REQUEST.
- Adds foundation migration 20260918173000_final_e_2_review_invitation_persistence_foundation, corrective migration 20260918183000_final_e_2_expand_review_guest_display_name, and follow-up enum-only migration 20260921120000_final_e_owner_acceptance_admin_review_submitted_notification; the database now has 22 migrations.
- No ReviewInvitation, Review, REVIEW_INVITATION EmailNotification, cron execution, public review route, email template, admin moderation, public review surface, or provider row is created operationally.
- Final-E.3 is completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030; Final-E.4 is completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1.
- Record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md.
```

### Final-E.3 — Eligibility and invitation/token lifecycle foundation

Status: **Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030**

```text
- Implementation base head: 6cc737c1e846563069b5f71cbd60b34064ffc160.
- Adds dormant review domain helpers under lib/reviews for Guatemala checkout/eligibleAt calculation, business eligibility, scheduler catch-up, token material and lifecycle primitives.
- Checkout uses Reservation.checkOutDate plus normalized Property.checkOutTime in America/Guatemala; null, blank or invalid checkout time fails closed.
- Business eligibility and scheduler eligibility remain separate; scheduler catch-up is bounded to 7 * 24 hours and inclusive at both boundaries.
- CONFIRMED, historical REFUNDED/PARTIALLY_REFUNDED and post-checkout CANCELLED compatibility are evaluated from confirmation, checkout timing, Review absence and cancellation evidence rather than status alone.
- Review invitation tokens use 256-bit lowercase hex raw tokens, SHA-256 lowercase hashes, encrypted recoverable copies and REVIEW_INVITATION reservation-bound crypto purpose/AAD.
- ensureReviewInvitationInTransaction is transaction-scoped, deterministic-testable and does not open or commit its own transaction.
- Existing ReviewInvitation returns the same lifecycle and never rotates token material; existing Review prevents new invitation creation.
- Expiration convergence and cancellation primitives transition only ACTIVE rows, clear accessTokenEncrypted and keep consumedAt null for EXPIRED/CANCELLED.
- No cron registration, Vercel cron, /resenas route, /admin/reviews route, REVIEW_INVITATION EmailNotification row, email renderer, dispatcher, public review submission, moderation UI, schema migration or final-e:validate script was added.
- Final-E targeted validation passed 18/18.
- Owner acceptance was explicitly recorded on 2026-09-18 after the concurrency hardening correction for `ensureReviewInvitationInTransaction`; the owner also verified the corresponding Vercel deployment successfully.
- Final-E.4 is completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1.
- Record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md.
```

### Final-E.4 — Review-invitation scheduling, cron integration and email delivery

Status: **Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1**

```text
- Implementation base head: 19199e6382b4daa7651417c37c1958ad59300373.
- Activates review-invitation scheduling and REVIEW_INVITATION email delivery using the accepted E.1-E.3 contracts.
- Creates/reuses ReviewInvitation plus REVIEW_INVITATION EmailNotification intent inside one caller-owned Serializable transaction with bounded P2034 retry.
- Adds the internal protected cron route /api/cron/schedule-review-invitations and registry slug schedule-review-invitations for manual/Test execution while keeping vercel.json empty.
- Adds bilingual ES/EN review invitation email rendering with only guest-safe context and the private one-time /resenas/{token} URL.
- Adds REVIEW_INVITATION dispatcher support before generic reservation email handling.
- Preserves token secrecy: raw review tokens are not persisted and are reconstructed only from the encrypted invitation token for email delivery.
- Does not add /resenas, /admin/reviews, review submission, moderation, public review listing, schema migration, Vercel cron registration, or npm run final-e:validate.
- Final-E targeted validation passed 35/35.
- Existing Final-A/B/C/D regression gates passed 44/44, 38/38, 41/41 and 66/66.
- Database checks passed with 21 migrations applied/up to date.
- Owner acceptance was explicitly recorded on 2026-09-18 after the relation-integrity isolation, race-safe REVIEW_INVITATION intent creation, and actionable repair discovery corrections.
- Final-E.5 is completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d.
- Record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md.
```

### Final-E.5 — Private guest review submission

Status: **Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d**

```text
- Implementation base head: 2baddeb520c01cd860a73f84a22bd4ec5d0a148c.
- Adds the private noindex/nofollow guest review page at /resenas/[token] and the submission API at POST /api/reviews/[token].
- Resolves ReviewInvitation access tokens by SHA-256 hash only and never passes raw tokens from server components into client props.
- Returns only a bounded guest-safe summary DTO: state, locale, propertyName, and active-link expiry.
- Shares persisted invitation business-eligibility evaluation with E.4 email delivery so existing invitations use checkoutAtSnapshot and eligibleAt instead of recalculating mutable checkout rules.
- Accepts exactly one plain-text comment and integer rating 1 through 5, derives a safe guestDisplayName snapshot from Reservation.guestName, creates Review as PENDING, and atomically consumes the invitation with accessTokenEncrypted cleared.
- Handles replay, concurrent submission races, expired links, cancelled/business-revoked links, already-submitted links, invalid tokens, and invalid historical guest names without creating duplicate reviews.
- Does not add admin moderation, /admin/reviews, a public /resenas listing, public published-review cards, schema migrations, Vercel cron registrations, provider calls, or npm run final-e:validate.
- Final-E targeted validation passed 55/55.
- Final-A, Final-B, Final-C and Final-D regression gates passed 44/44, 38/38, 41/41 and 66/66.
- Database checks passed with 21 migrations applied/up to date.
- Vercel deployment for accepted head f37f4802219aeb80d10f92b406e0a4847b10f15d is SUCCESS.
- Real shared-Test guest review emails during implementation validation: NONE.
- Owner acceptance was explicitly recorded on 2026-09-21 after the implementation commit and independent-review hardening follow-up.
- Final-E.6 is completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f.
- Record: docs/190-final-e-5-private-guest-review-submission.md.
```

### Final-E.6 — Admin moderation and public published-review presentation

Status: **Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f**

```text
- Implementation base head: 2b56d43d60da3558ce692e18f4756f1c862bcb17.
- Adds the protected admin review moderation surface at /admin/reviews.
- Adds protected PATCH /api/admin/reviews/[reviewId]/moderation with admin session and same-origin checks.
- Enforces the exact PENDING -> PUBLISHED, PUBLISHED -> HIDDEN, and HIDDEN -> PUBLISHED moderation state machine.
- Preserves first-publication publishedAt semantics and repairs anomalous hidden rows with null publishedAt on republish.
- Enforces expectedUpdatedAt optimistic concurrency and updateMany stale fences inside a Serializable transaction.
- Writes one safe AdminAuditLog entry per successful moderation transition without comment, guest contact, token, payment, refund, or provider payload metadata.
- Adds the public /resenas listing with PUBLISHED-only, active-property-only server-side query, safe public DTO, plain-text comment rendering, public pagination, SEO metadata, and ES/EN centralized copy.
- Adds admin and public navigation entries through centralized copy.
- Does not add review editing, review deletion, ReviewInvitation mutation, email mutation, schema migrations, Vercel cron registrations, provider calls, or npm run final-e:validate.
- Final-E targeted validation passed 65/65.
- Final-A, Final-B, Final-C and Final-D regression gates passed 44/44, 38/38, 41/41 and 66/66.
- Database checks passed with 21 migrations applied/up to date.
- Vercel deployment for accepted head 82f1c27ba2af41d9ade9f8f57348bf66e18f800f is SUCCESS.
- Real shared-Test guest review emails during implementation validation: NONE.
- Owner acceptance was explicitly recorded on 2026-09-21 after independent runtime, moderation, public DTO, privacy and tests review.
- Final-E.7 and Final-E are completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880.
- Record: docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md.
```

### Final-E.7 — Integrated regression and documentation closure

Status: **Completed and accepted on 2026-09-21**

```text
- Implementation base head: 4df7cbc07b6ae9789a62f568d1e3ab69a808d596.
- Added the permanent package script `npm run final-e:validate`.
- Added integrated E.7 acceptance coverage for the accepted E.1-E.6 lifecycle from eligibility through invitation, REVIEW_INVITATION email intent, private submission, PENDING review, admin publish/hide/republish, and public PUBLISHED-only visibility.
- Added source-contract coverage for the permanent gate, accepted routes, zero Vercel crons, absence of review edit/delete APIs, and absence of Twilio/WhatsApp review delivery surfaces.
- Final-E validation now passes 88/88 deterministic, non-destructive tests.
- Final-A, Final-B, Final-C and Final-D regression gates passed 44/44, 38/38, 41/41 and 66/66.
- Database checks passed with 22 migrations applied/up to date.
- Email contract validation, lint, build and git diff --check passed.
- Runtime product behavior changes: NONE.
- Final-E package acceptance is completed on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880.
- Final-F is Active under accepted Final-F.R3 architecture rebaseline with Final-F.1 through Final-F.4 completed and accepted, Final-F.5 superseded before owner acceptance by Final-F Architecture Revision R1, Final-F.R1 completed and accepted historically but superseded for future target decisions by R3, Final-F.R2 completed but superseded before owner acceptance, and Final-F.R3 completed and accepted on 2026-09-24 at be80af9b36f285c7669986e9c9b4d6676042f6f0. Final-F.R4 is completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18; Final-F.R5 implementation is completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8, Final-G/H and Phase 13 remain Not started.
- Record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md.
```

### Final-F.R4 — WhatsApp backend/provider decommission, provider/schema cleanup and public floating WhatsApp contact

Status: **Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18**

```text
- Implementation base head: e30acaf3e26d823172316bac4fdd79daf3cbf411.
- Removed active Twilio WhatsApp runtime, webhook routes, probe script, env validation and direct npm dependency.
- Removed active 360dialog runtime, webhook route, probe script and env validation.
- Removed /admin/whatsapp, the Admin WhatsApp API routes, Admin WhatsApp helpers/DTOs, Admin sidebar navigation item and Admin WhatsApp page copy.
- Removed WhatsAppConversation, WhatsAppMessage, StaffWhatsAppRecipient, StaffWhatsAppAlert and provider-specific WhatsApp enums from the active Prisma schema.
- Added cleanup migration 20260924130000_final_f_r4_remove_whatsapp_backend without editing historical migrations.
- Added NEXT_PUBLIC_WHATSAPP_PHONE_E164 as the public build-time WhatsApp contact contract, plus shared wa.me URL helpers and a localized floating public WhatsApp action.
- Preserved ReservationLifecycleRequestChannel.WHATSAPP as a human lifecycle request channel.
- Final-F targeted R4 validation passed 24/24 after elevated rerun.
- Prisma format, validate and generate passed; migrate status initially reported the R4 cleanup migration pending before deploy and reports the database schema up to date after deploy.
- Local/Test cleanup migration deploy was applied after explicit owner authorization; subsequent migrate status reports 26 migrations and database schema up to date.
- Final-E validation passed 88/88; lint passed; build passed after network-enabled Google Fonts fetch.
- Final-D validation passed 66/66 after an explicitly authorized test-only D.6 active-request fixture stabilization; the accepted expiresAt <= now runtime eligibility rule remains unchanged.
- Hosted Test public WhatsApp validation, Vercel SUCCESS, and explicit owner acceptance completed on 2026-09-25.
- Android/current Chromium and desktop/web public WhatsApp handoff were accepted; iOS/iPadOS remains Deferred.
- Final-F.R5 implementation is completed; Hosted Test VAPID setup + Android installed-PWA controlled push validation + explicit owner acceptance pending; Final-F.6-F.8, Final-G/H and Phase 13 remain Not started.
- Record: docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md.
```

## Continuity Notes for New Conversations

Minimum context files:

```text
README.md
AGENTS.md
.env.example
package.json
prisma/schema.prisma
docs/10-phases.md
docs/11-progress-log.md
docs/84-phase-9.11-validation-and-documentation-closure.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/86-email-persistence-and-resend-provider-foundation.md
docs/87-bilingual-branded-reservation-confirmation-templates.md
docs/88-guest-admin-confirmation-notification-orchestration.md
docs/89-test-and-production-environment-strategy.md
docs/90-transactional-email-brand-logo-hosting.md
docs/91-email-retry-processing-and-admin-delivery-visibility.md
docs/92-manual-resend-and-delivery-recovery-controls.md
docs/93-arrival-instructions-scheduling-and-content.md
docs/94-phase-10-validation-and-documentation-closure.md
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md
docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md
docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md
docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md
docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md
docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md
docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md
docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md
docs/108-phase-11.5.3.1-transaction-resilience-and-datepicker-positioning.md
docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md
docs/110-phase-11.5.4-final-positive-zero-completion.md
docs/111-phase-11.5.4-acceptance-closure.md
docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
docs/113-phase-11.5.5-acceptance-closure.md
docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md
docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md
docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md
docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md
docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md
docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
docs/120-phase-11.7-validation-and-documentation-closure.md
docs/121-pre-phase-12-improvement-track.md
docs/122-pre-phase-12-package-a-public-flow-and-ui-corrections.md
docs/123-pre-phase-12-package-b-durable-payment-attempt-history.md
docs/124-pre-phase-12-package-c-admin-cron-console.md
docs/125-pre-phase-12-package-e-public-location-map.md
docs/126-pre-phase-12-package-e-acceptance-closure.md
docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md
docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md
docs/129-pre-phase-12-package-f-2-acceptance-closure.md
docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
docs/131-pre-phase-12-package-f-3-acceptance-closure.md
docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md
docs/133-pre-phase-12-package-f-4-acceptance-closure.md
docs/134-pre-phase-12-package-f-5-integrated-validation-and-documentation-closure.md
docs/135-pre-phase-12-package-f-integrated-acceptance-closure.md
docs/136-phase-12.1-test-deployment-and-environment-strategy.md
docs/137-phase-12.2-vercel-test-project-and-first-deployment.md
docs/138-phase-12.2-acceptance-closure.md
docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md
docs/140-phase-12.3-acceptance-closure.md
docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
docs/142-phase-12.4.1-hosted-database-pooling-correction.md
docs/143-phase-12.4-acceptance-closure.md
docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md
docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md
docs/147-phase-12.5-acceptance-closure.md
docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md
docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md
docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md
docs/151-phase-12.6-acceptance-closure.md
docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md
docs/153-phase-12.8-full-internet-e2e-regression-start.md
docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md
docs/155-phase-12.8-acceptance-closure.md
docs/156-phase-12.9-observability-security-recovery-readiness.md
docs/157-phase-12.9-http-security-header-hardening.md
docs/158-phase-12.9-acceptance-closure.md
docs/159-phase-12.10-phase-12-validation-and-closure.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
lib/admin/reservation-cancellation.ts
lib/admin/reservation-date-mutation.ts
lib/reservations/date-mutation-completion.ts
lib/reservations/lifecycle-adjustment-holds.ts
lib/payments/lifecycle-adjustment-handoff.ts
lib/reservations/cancellation-policy.ts
lib/admin/refunds.ts
lib/payments/tilopay-api-client.ts
lib/reservations/confirmation.ts
lib/reservations/pending-holds.ts
lib/email/arrival-instructions.ts
lib/admin/arrival-instructions.ts
types/admin-reservation-date-mutation.ts
types/admin-reservation-cancellation.ts
types/admin-refund.ts
types/reservation-confirmation.ts
types/reservation-pending-hold.ts
types/admin-arrival-instructions.ts
scripts/observe-tilopay-modification.ts
scripts/observe-tilopay-consult.ts
config/site.ts
lib/env/server.ts
messages/es.ts
messages/en.ts
```
