# 212 - Final-I: Operational Polish, Notification UX and FEL Invoicing Roadmap

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track addendum
Package: Final-I - Operational Polish, Notification UX & FEL Invoicing
Status: Active
Registration date: 2026-09-29
Registration base head: 950ff5e6948fb2a74cda03f81efdb7c676b33c73
Historical accepted Final-H head: 6922cf27e31e63fde071c0d0a810b141e44b9f90
Historical accepted complete-track head: 6922cf27e31e63fde071c0d0a810b141e44b9f90
Final-I.1 status: Completed and accepted on 2026-09-29
Accepted Final-I.1 head: 9a15f349c1104671f5555d1988caa56756e5ff0c
Final-I.2 status: Completed and accepted on 2026-09-29
Accepted Final-I.2 head: 6451cb705d972c83a771a9ff39f6da80d130cf58
Final-I.3 status: Completed and accepted on 2026-09-29
Accepted Final-I.3 head: 8c5a9186e392f35bdbc998f463c5c3c6cd0be295
Final-I.4 status: Completed and accepted on 2026-09-30
Accepted Final-I.4 head: 8e2d7d56a8e81a860833b05f4a28cba8a517bad4
Final-I.5 status: Completed and accepted on 2026-09-30
Accepted Final-I.5 head: fde3ae06427af1f8905e6f7589263c199f918553
Final-I.5 implementation and acceptance record: docs/213-final-i-5-fel-fiscal-domain-contract-and-architecture.md
Final-I.6 status: Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Final-I.6 implementation and acceptance record: docs/214-final-i-6-fel-persistence-admin-draft-module.md
Final-I.6.1 status: Implementation in progress
Final-I.6.1 registration record: docs/215-final-i-6-1-interim-operational-hardening.md
Workstream E status: Completed; provider trigger configuration + Hosted validation PASS on 2026-10-02
Workstream A status: Completed; Hosted owner validation PASS on 2026-10-05
Workstream B+C status: Implemented; validation completed; Hosted owner validation pending
Workstream D status: Not started
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I is an owner-requested pre-Production addendum registered after the accepted Final-H closure. It does not rewrite the historical acceptance of Phase 12, Final-A through Final-H, or the complete Post-Phase-12 / Pre-Phase-13 Final Improvement Track at `6922cf27e31e63fde071c0d0a810b141e44b9f90`. Final-I.1 is completed and accepted at its feature head `9a15f349c1104671f5555d1988caa56756e5ff0c`, and Final-I.2 is completed and accepted at `6451cb705d972c83a771a9ff39f6da80d130cf58`; Final-I.3 is completed and accepted on 2026-09-29 at accepted head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295` after Hosted owner validation of the desktop, Android mobile browser, Android standalone PWA, Push deep-link, and final mobile/PWA auto-scroll refinement. Final-I.4 is completed and accepted on 2026-09-30 at accepted feature head `8e2d7d56a8e81a860833b05f4a28cba8a517bad4` after Hosted/mobile owner validation of representative guest emails. Final-I.5 is completed and accepted on 2026-09-30 at accepted head `fde3ae06427af1f8905e6f7589263c199f918553`; the provider-independent FEL fiscal domain contract remains recorded in `docs/213-final-i-5-fel-fiscal-domain-contract-and-architecture.md`. Final-I.6 is completed and accepted on 2026-10-02 at accepted feature head `80469abda146d0d50516ab598a514a9ccea2db6d`; the implementation and acceptance record is `docs/214-final-i-6-fel-persistence-admin-draft-module.md`. Final-I.6.1 is implementation in progress as provider-independent interim operational hardening while Final-I.7 remains blocked; Workstream E is completed with provider trigger configuration + Hosted validation PASS on 2026-10-02, Workstream A timezone resolution correction is completed with Hosted owner validation PASS on 2026-10-05, and Workstreams B+C are implemented with Hosted owner validation pending. The I.6.1 record is `docs/215-final-i-6-1-interim-operational-hardening.md`. Phase 13 remains not started and is blocked until Final-I closes and receives owner acceptance.

Final-I.5 canonical amount-source hardening freezes `FelCommercialSourceAllocation.amountSnapshot` and `FelCommercialSourceAllocation.currencySnapshot` as the only canonical commercial amount source for future draft line totals. `FelLineSource` is frozen as provenance/evidence only: its rows are never summed to compute `FelLineItem.amount` or `FelDocument` totals, including when `sourceRole = AMOUNT_SOURCE`. Conceptual mandatory `FelLineSource.sourceAmount` / `sourceCurrency` fields were removed from the I.5 persistence contract to avoid two divergent monetary sources of truth; any supporting monetary evidence belongs only inside `sourceSnapshotJson` as non-authoritative audit/reproduction metadata.

## Subphase Structure

```text
Final-I.1 - Zoho internal-email suppression and notification-loop correction
Final-I.2 - Legacy/future-phase UI and copy cleanup
Final-I.3 - Admin notification-center desktop simplification + single accordion + Push deep-link
Final-I.4 - Guest-facing email visible-URL cleanup
Final-I.5 - FEL/INFILE fiscal/domain contract and architecture
Final-I.6 - FEL persistence + Admin draft/selection/preview module
Final-I.6.1 - Interim Operational Hardening
Final-I.7 - INFILE provider integration: certification, cancellation, credit notes, retry/contingency
Final-I.8 - FEL delivery email/PDF/XML/history UX
Final-I.9 - Integrated A-I regression, Hosted acceptance and renewed pre-Phase-13 closure
```

Final-I.7 is blocked until the owner provides official INFILE technical documentation and Test credentials. No INFILE transport, authentication, certification, cancellation, credit-note, retry, contingency, PDF, or XML behavior may be invented before that contract is frozen.

## Final-I.1 Accepted Scope And Hosted Validation

Final-I.1 corrects the Zoho inbound-email notification loop where a TRP-generated transactional email delivered from the active Resend sending domain to the Zoho admin mailbox could re-enter through the Zoho webhook and be classified as `GUEST_EMAIL_RECEIVED`.

The implemented suppression classifies the actual webhook `fromAddress` as internal when its exact case-insensitive domain equals either:

```text
- the active correspondence domain from environmentConfig
- the active transactional sending domain from environmentConfig
```

Accepted Local/Test domains:

```text
juantzun.dev
mail.trp-booking.juantzun.dev
```

Accepted Production domains:

```text
turefugioperfecto.com
mail.turefugioperfecto.com
```

The comparison is exact after email-domain normalization. It does not use substring or suffix matching, so lookalikes such as `evilmail.trp-booking.juantzun.dev`, `mail.trp-booking.juantzun.dev.attacker.example`, `eviljuantzun.dev`, and `juantzun.dev.attacker.example` remain external.

Internal sender suppression happens after webhook signature verification and Limited Data parsing, but before reservation matching, `ZohoInboundEmailEvent`, `AdminNotification`, `AdminPushDelivery`, and Web Push delivery. Suppressed internal sender events return:

```json
{ "ok": true, "status": "ignored", "reason": "internal_sender" }
```

Final-I.1 preserves external guest replies, accepted recipient-domain checks, signature verification, SHA-256 raw-body fingerprint idempotency, and reservation matching. It does not classify Reply-To; only the actual provider `fromAddress` determines internal suppression.

Owner Hosted validation passed on 2026-09-29 and explicitly accepted Final-I.1 at:

```text
9a15f349c1104671f5555d1988caa56756e5ff0c
```

Accepted Hosted evidence:

```text
A. TRP-generated reservation/admin email
- normal operational notification/email occurred
- Zoho received the TRP-generated email
- no false GUEST_EMAIL_RECEIVED Web Push was created
- no false notification-center row was created

B. Genuine external email
- Zoho webhook processed the external incoming email
- GUEST_EMAIL_RECEIVED was created
- Android Web Push was delivered
- the notification appeared in /admin/notifications
```

The external flow remains:

```text
external guest email
-> Zoho Limited Data webhook
-> GUEST_EMAIL_RECEIVED
-> Reservation matching when eligible
-> AdminNotification
-> AdminPushDelivery
-> Android Web Push
-> /admin/notifications history
```

## Future Subphase Decisions

Final-I.2 is completed and accepted on 2026-09-29 at accepted head `6451cb705d972c83a771a9ff39f6da80d130cf58`. Its accepted scope is legacy/future-phase UI and copy cleanup only. It removes obsolete public/admin user-visible copy that incorrectly described completed functionality as an upcoming phase, next phase, next subphase, coming soon, future implementation, or similar roadmap language.

Implemented Final-I.2 scope:

```text
- removed the final black Home "Próximamente booking online" CTA section
- removed its unused component and bilingual localization keys
- removed the admin/accommodations settingsImpact informational block
- removed stale unused property-detail future-booking copy
- removed stale Phase 8 request/pending-hold localization keys
- rewrote stale Home hero, Home benefit/trust, reservation request, pending-hold, date-mutation negative-difference, and admin photo deletion copy to current behavior
- rewrote current reservation-request copy to current booking behavior
- rewrote pending-hold copy to current payment behavior
- rewrote stale negative-adjustment/refund roadmap copy to current implemented behavior
- rewrote photo-deletion copy to remove subphase language
- removed stale unused localization keys for property-detail booking-coming-soon, request hold-disabled, and phase-boundary notes
- reworded the final stale cancellation approval warning that still referenced `Phase 11.4`, preserving the accepted boundary that reservation cancellation does not automatically create or process a Refund
- removed the remaining visible Phase 11.4 cancellation warning
- preserved legitimate temporal copy such as "Próximas llegadas" / "Upcoming arrivals" and "Próximo intento" / "Next attempt"
- added focused Final-I.2 tests under `tests/final-i`
```

Legitimate temporal copy must remain, including:

```text
Próximas llegadas
reservas próximas
upcoming arrivals
upcoming reservations
Próximo intento
Next attempt
```

Stale candidates reviewed and removed or rewritten from user-facing ES/EN copy:

```text
Próximamente integraremos disponibilidad, pagos seguros con Tilopay y sincronización con Airbnb.
Pagos seguros con Tilopay en la fase de booking
Próximamente booking online
Las próximas fases agregarán calendario, reservas directas, pagos y sincronización con Airbnb.
El calendario de disponibilidad y el pago en línea se agregarán en próximas fases.
En esta fase todavía no se crea una reservación ni se inicia pago.
Crear hold de reserva en la siguiente fase
El pago directo se integrará en la siguiente subfase
Subfase 8.4...
La diferencia negativa requiere la integración de reembolso de la siguiente subfase...
Phase 11.4
```

Final-I.2 reviewed each stale candidate for reachability before removing it. Unused localization fields were removed only after confirming no remaining code references. Reachable negative-date-difference admin copy was rewritten to describe the implemented refund workflow instead of a future subphase.

## Final-I.3 Accepted Scope And Hosted Validation

Final-I.3 is completed and accepted on 2026-09-29 at accepted feature head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295`. Final Hosted owner validation passed across desktop browser, Android Chrome browser, Android standalone PWA, Push deep-link behavior, and the final mobile/PWA deep-link auto-scroll refinement. Final-I.4 is completed and accepted on 2026-09-30 at accepted head `8e2d7d56a8e81a860833b05f4a28cba8a517bad4`.

Accepted responsive behavior:

```text
Desktop browser:
- /admin/notifications renders only the Recent notifications / Notificaciones recientes history surface.
- Tabs navigation is not rendered.
- Configuration content is not rendered.
- The page behaves as a notification center/history only.

Mobile browser:
- Notifications + Configuration tabs remain available.
- Configuration remains available for initial Android/PWA setup.

Standalone Android PWA:
- Notifications + Configuration tabs remain available.

iOS/iPadOS:
- remains Deferred.

Responsive breakpoint:
- the mobile viewport helper uses `(max-width: 767px)`, matching Tailwind's `md` boundary.
- `display-mode: standalone` always keeps Configuration available even outside the mobile viewport.
- no user-agent parsing is used.
```

Accepted accordion contract:

```text
- notification rows use the existing Accordion component
- Accordion uses type="single" and collapsible
- only one notification can be expanded at a time
- the open notification can be collapsed
- collapsed headers show read/unread state, title, and timestamp
- expanded content preserves body, bounded Zoho metadata, target Open action, Open Zoho Mail when applicable, and explicit Mark as read when unread
- opening/closing an accordion item does not mark the notification read
```

Accepted Push/deep-link contract:

```text
- Web Push payload now carries a bounded notificationId in addition to the existing targetPath
- targetPath remains the business target used by the in-page Open action
- Push navigation deep-link is separate from AdminNotification.targetPath
- AdminNotification.targetPath remains the business destination for the internal Open action and stored target paths are not rewritten
- service-worker notification clicks route to /admin/notifications?notification=<notificationId> when the identifier is valid
- invalid or missing notificationId falls back to /admin/notifications
- notificationId is treated only as an opaque identifier, never as a path or URL
- mobile browser and standalone PWA valid initial deep-links keep the Notifications tab active and auto-scroll once to the expanded target accordion header
- the deep-link scroll accounts for the sticky Admin header with scroll margin so the read/unread badge, timestamp, title, and expanded content are immediately visible
- desktop browser deep-links, unknown/malformed identifiers, and manual accordion changes do not request forced scrolling
- auto-scroll uses a one-time guard, `scroll-mt-20`, two `requestAnimationFrame` layout-settling frames, `scrollIntoView` with `block="start"`, and smooth scrolling unless `prefers-reduced-motion` is active; no CSS selector is built from raw query input
- scroll/open continues to have no read-state side effect; Mark as read remains explicit
- no guest email, phone, payment data, email body/content, provider IDs, tokens, secrets, or push endpoint/key material is added to the Push payload
```

Accepted targeted retrieval contract:

```text
- /admin/notifications parses ?notification=<id> with a bounded helper
- malformed query values are ignored safely
- unknown/unavailable IDs produce normal notification-center display without error
- valid IDs outside the recent list can be fetched with one bounded ADMIN-authenticated lookup
- the targeted notification is merged into the normal recent list without duplicates
- default recent-history query remains bounded
- no public notification lookup endpoint was introduced
```

## Final-I.4 Accepted Scope And Hosted/Mobile Validation

Final-I.4 is completed and accepted on 2026-09-30. The accepted Final-I.4 feature head is:

```text
8e2d7d56a8e81a860833b05f4a28cba8a517bad4
```

This documentation-only closure commit must not replace that feature head as the accepted Final-I.4 implementation head.

Final-I.4 removes duplicated long raw action URLs from visible guest-facing HTML email body text only. It does not delete action URLs from email entirely.

Accepted HTML/plaintext contract:

```text
HTML:
- CTA button remains.
- action URL remains in the CTA href.
- action URL is not printed as duplicated visible body text below the button.

text/plain:
- labeled action URL remains visible for plaintext clients.
```

Accepted guest-facing cleanup:

```text
Arrival Instructions
- mapUrl remains the CTA href.
- raw mapUrl no longer appears visibly below the button.

Review Invitation
- reviewUrl remains the CTA href.
- raw reviewUrl no longer appears visibly below the button.

Additional Charge Payment Required
- paymentUrl remains the guest CTA href.
- raw paymentUrl no longer appears visibly below the button.

Lifecycle Adjustment Payment Required
- Date Change paymentUrl remains the CTA href.
- Stay Extension paymentUrl remains the CTA href.
- raw paymentUrl no longer appears visibly in guest HTML.
```

Admin-facing and guest-facing URL presentation remain intentionally distinct. Final-I.4 intentionally did not remove existing Admin/internal visible URL fallbacks, including:

```text
- additional-charge Admin reservation links
- Admin Date Change payment-link delivery-status email
- Admin Stay Extension payment-link delivery-status email
- admin-new-reservation email
- admin-review-submitted email
```

Final-I.4 did not change:

```text
- CTA destinations
- map URLs
- review URLs
- payment URLs
- reservation/review/payment tokens
- expiry behavior
- recipient routing
- subjects
- preview text
- React Email
- @react-email/render
- EmailLayout
- EmailButton
- email persistence
- email retry policy
- Resend provider
- sender addresses
- reply-to behavior
- scheduler
```

`reservation-confirmed-email.tsx` remained a no-action-URL regression control.

Owner Hosted/mobile validation passed for representative real emails:

```text
Arrival Instructions
PASS
- map CTA visible
- no long raw map URL underneath
- mobile width/layout normal
- CTA opens correct destination

Review Invitation
PASS
- review CTA visible
- no raw review URL underneath
- mobile width/layout normal
- CTA opens correct destination

Additional Charge Payment Required
PASS
- payment CTA visible
- no raw payment URL underneath
- mobile width/layout normal
- CTA opens correct destination

Lifecycle Adjustment Payment Required
PASS
- representative Date Change or Stay Extension email validated
- payment CTA visible
- no raw payment URL underneath
- mobile width/layout normal
- CTA opens correct destination
```

Owner acceptance was explicit on 2026-09-30. Vercel for the accepted feature head was SUCCESS.

## Final-I.5 Completed And Accepted - Final-I.6 Prepared

Final-I.5 - FEL/INFILE fiscal/domain contract and architecture - is completed and accepted on 2026-09-30 at accepted head `fde3ae06427af1f8905e6f7589263c199f918553`. Its provider-independent architecture contract remains implemented as `docs/213-final-i-5-fel-fiscal-domain-contract-and-architecture.md`.

Final-I.5 remains an architecture/contract subphase only. It freezes the TRP Booking fiscal domain model and provider-independent FEL architecture before implementing persistence or calling INFILE. Provider transport remains deferred to Final-I.7.

Final-I.5 does not invent undocumented INFILE endpoints, authentication, payloads, headers, cancellation APIs, credit-note APIs, PDF/XML endpoints, idempotency semantics, retry semantics, response fields, status lookup behavior, or duplicate-handling semantics.

Owner business goal:

```text
- Admin must eventually support issuing Guatemala FEL documents for completed stays.
- Primary use case: Factura Pequeño Contribuyente.
- Admin must be able to create one fiscal document for one reservation or multiple reservations.
- A fiscal document may contain one lodging line per reservation plus eligible extra/additional-charge lines.
```

Illustrative future line examples:

```text
Reservación del 15 al 16 de Agosto (1 noche)
Reservación del 16 al 18 de Agosto (2 noches)
Transporte (Desde Antigua a Panajachel)
Daños (Manchas a paredes)
```

Additional-charge grouping requirement:

```text
- Admin must eventually choose between individual extra lines and one grouped extras line for the complete invoice.
- Example grouped line: Servicios y cargos adicionales, or equivalent finalized fiscal description.
- Even when displayed as one grouped fiscal line, internal source mappings must preserve which AdditionalCharge, GuestPaymentRequestItem, refund/allocation, and reservation contributed to that fiscal line.
- Grouping must not destroy source traceability.
```

Fiscal receiver boundary:

```text
booking guest != fiscal receiver
```

A fiscal receiver may require independent fiscal identity data such as legal/fiscal name, NIT or applicable tax identifier, fiscal address, email, and other provider/SAT-required receiver fields. Do not assume `Reservation.guestName` or `Reservation.guestEmail` alone are sufficient. Exact receiver fields remain blocked until official fiscal/provider/accounting guidance is available.

Provider-independent lifecycle concept:

```text
DRAFT
READY
SUBMITTING
CERTIFIED
REJECTED
RETRY_PENDING
```

Final-I.5 freezes this lifecycle distinction in `docs/213`: cancellation is an operation/state on the original certified DTE, not a negative invoice.

Document-type architecture must support at minimum the conceptual distinction between:

```text
SMALL_TAXPAYER_INVOICE
CREDIT_NOTE
```

Exact SAT/INFILE DTE codes and provider identifiers must not be invented. Invoice cancellation is separate from Credit Note issuance.

Fiscal/payment separation:

```text
reservation cancellation
!=
payment refund
!=
FEL document cancellation
!=
credit note
```

Do not automatically assume every refund creates a credit note, or that reservation cancellation creates DTE cancellation. Exact fiscal rules must be frozen later using official documentation and accounting guidance.

Invoice source-of-truth principle:

```text
- FEL must use immutable fiscal snapshots.
- An issued/certified invoice must not be calculated dynamically from current mutable reservation records.
- Conceptual sources include reservation pricing snapshot, lodging totals, additional charges, GuestPaymentRequestItem snapshots, refund allocations, frozen receiver data, and frozen exchange-rate/currency data if applicable.
- Once a DTE is certified, the fiscal representation must remain historically reproducible.
```

Double-counting prevention is mandatory. Final-I.5 documents the relationship between `Reservation.total` and `AdditionalCharge` / `GuestPaymentRequestItem` before any persistence implementation. Future FEL implementation must not naively invoice `Reservation.total + all AdditionalCharges` without proving which amounts are already included.

Candidate conceptual entities for later Final-I.6 implementation, not to be created during this closure:

```text
FelDocument
FelDocumentReservation
FelLineItem
FelProviderAttempt
FelCreditAllocation
```

Potential responsibilities:

```text
FelDocument:
- document type
- status
- currency
- receiver fiscal snapshot
- totals
- provider certification identity
- authorization/UUID
- series
- number
- certification timestamps
- cancellation state
- original-document relation where appropriate

FelDocumentReservation:
- maps a fiscal document to one or more reservations
- preserves reservation-level source snapshot/reference

FelLineItem:
- immutable displayed fiscal line
- quantity
- description
- unit price
- amount
- tax/fiscal attributes when contract is known
- source mapping

FelProviderAttempt:
- operation
- attempt number
- request fingerprint/idempotency reference
- safe provider response metadata
- status
- error classification
- timestamps

FelCreditAllocation:
- maps a credit note or fiscal adjustment back to original fiscal lines/documents and relevant financial/refund sources
```

Names remain conceptual for Final-I.6 implementation planning. Final-I.5 freezes the provider-independent contract without modifying Prisma.

Invoice eligibility:

```text
- Owner preference: Admin creates invoices for stays after checkout.
- Treat after checkout as the current TRP application eligibility rule.
- Do not claim Guatemala law requires this exact timing unless verified separately.
- Final-I.5 distinguishes TRP business eligibility rules from legal/provider requirements.
```

Later Final-I.6 Admin workflow concept:

```text
Admin > FEL / Facturación
Admin selects eligible reservations.
Selection should support one reservation or multiple reservations with the same intended fiscal receiver and compatible currency/fiscal conditions.
Admin reviews receiver, lodging lines, extra charges, grouped vs individual extras, fiscal totals, and saves DRAFT.
Certification does not belong to Final-I.6 unless the exact provider contract is available.
```

Open fiscal/provider questions that must remain unresolved until official provider/SAT/accounting confirmation:

```text
- USD/GTQ handling
- exchange rates
- taxable base
- rounding
- CF
- NIT
- other receiver identification
- invoice amount thresholds
- DTE receiver fields
- INFILE transport
- INFILE authentication
- INFILE signatures
- certification request/response schema
- authorization UUID
- series
- number
- status fields
- idempotency
- duplicate handling
- timeout reconciliation
- status lookup
- cancellation
- credit notes
- PDF retrieval
- XML retrieval
- error taxonomy
- rate limits
- retry guidance
- Test environment behavior
```

Do not silently convert USD to GTQ. Do not hard-code CF/NIT thresholds or legal rules unless supported by current official documentation.

Provider-independent persistence boundary:

```text
TRP fiscal domain
-> provider adapter
-> INFILE
```

The eventual persistence model must store normalized TRP fiscal fields, not make INFILE response JSON the database schema. Provider-specific payload/response details should remain isolated behind an adapter boundary.

Durable operation principle for later implementation:

```text
persist fiscal intention / immutable snapshot
COMMIT
attempt provider operation best-effort
persist result

if retryable:
durable retry/recovery
```

Network timeout is not automatically equivalent to certification failure. If timeout occurs after INFILE may have certified the DTE, TRP must reconcile status before blindly resubmitting. Exact status/idempotency mechanisms remain blocked on official INFILE documentation.

Retry classification concept:

```text
network timeout
5xx
provider temporary failure
-> potentially RETRY_PENDING

validation/business rejection
-> REJECTED
-> no blind retry until corrected
```

No retries, cron, scheduler, provider call, schema, or migration are introduced by this closure. A future `PROCESS_FEL_DOCUMENTS` Production cron may be needed, but must not be added during Final-I.5. The accepted Production cron registry remains exactly the current six jobs until a later FEL contract explicitly requires another one.

Final-I.7 remains blocked until the owner provides official INFILE Postman/OpenAPI/Swagger/integration manual plus Test credentials.

Final-I.5 implemented deliverable:

```text
architecture/domain documentation
field/relationship contract
state machine
source-of-truth rules
grouping rules
fiscal receiver contract
invoice eligibility rules
provider boundary
open-question register
I.6 persistence/UI implementation plan
I.7 provider-integration blocker list
```

Final-I.5 acceptance must answer:

```text
What exactly is a fiscal document in TRP?
How does one document relate to one/multiple reservations?
How are lodging amounts sourced?
How are extra charges sourced?
How is double counting prevented?
How are grouped extra lines traced back to original sources?
What receiver data is frozen?
When does a reservation become invoice-eligible?
What is immutable after certification?
How are cancellation, refund and credit note separated?
Which questions remain blocked on official INFILE/SAT/accounting documentation?
What exactly will I.6 implement?
What exactly remains deferred to I.7?
```

Owner architecture acceptance was explicit on 2026-09-30. Accepted Final-I.5 architecture head:

```text
fde3ae06427af1f8905e6f7589263c199f918553
```

The documentation-only acceptance closure commit must not replace that accepted feature/architecture head.

Final-I.5 accepted architecture preserves:

```text
PAYMENT != FISCAL LINE

Reservation / GuestPaymentRequestItem
-> FelCommercialSourceAllocation.amountSnapshot
-> FelLineItem.amount
-> FelDocument.total

FelLineSource
= provenance / evidence only
= never arithmetic input

FelCommercialSourceAllocation
= exclusive commercial source ownership
+ canonical immutable commercial amount snapshot
```

## Final-I.6 Completed And Accepted - Final-I.7 Blocked

Final-I.6 remains provider-independent and is completed and accepted on 2026-10-02 at accepted feature head `80469abda146d0d50516ab598a514a9ccea2db6d`. Hosted owner validation ultimately passed after the owner-requested workflow and design-system corrections applied during I.6 validation. Implemented and accepted I.6 scope:

```text
Prisma FEL persistence
one migration

FelDocument
FelDocumentReservation
FelLineItem
FelLineSource
FelCommercialSourceAllocation
FelProviderAttempt
FelCreditAllocation

DB unique source-consumption constraints
XOR CHECK constraint
transactional draft source claiming/release
Admin /admin/fel
eligible reservation selection
one/multiple reservation drafts
fiscal receiver form
frozen Fiscal Receiver form order
future NIT/CUI receiver-validation contract
individual/grouped extras
server-authoritative draft preview
same-draft edit/save-changes source ownership
immutable allocation snapshots
line totals from allocations
document totals from persisted lines
draft history/open-edit/save-changes/discard
explicit CREATE vs EDIT mode
no implicit last-draft selection
new-invoice local reset
receiver email suggestions from selected Reservations
receiver country suggestions inferred from Reservation phone
design-system Select controls for receiver identifier/email/country suggestions
dd/MM/yyyy eligible-card dates
night/night(s) localization
history snapshot card removed
saved snapshot retained only in explicit edit context
```

Final-I.6 works without INFILE credentials, transport, external receiver-validation runtime, certification endpoint, cancellation endpoint, Credit Note endpoint, PDF/XML API, provider idempotency, provider retry/status lookup, FEL cron registration, or Production resources. Certification controls remain unavailable until Final-I.7 unblocks. NIT/CUI receiver validation remains documented future I.7 work and is not active in the I.6 UI or API.

Final-I.6 freezes the Admin `/admin/fel` Fiscal Receiver form order as `Identifier type -> Identifier -> Receiver name -> Email -> Country -> Address` / `Tipo de identificación -> Identificación -> Nombre del receptor -> Correo -> País -> Dirección`. This order is intentional because future authoritative NIT/CUI validation resolves the fiscal receiver name from the identifier before the Admin reaches the name field.

The latest Hosted-feedback correction simplifies Admin FEL drafting into explicit CREATE and EDIT modes. `/admin/fel` opens in clean CREATE mode with no selected document, even when draft history exists. History rows are navigation only; an existing draft enters EDIT only after explicit open/edit. CREATE mode exposes preview and save draft. EDIT mode exposes preview, single save changes, discard draft, and new invoice as appropriate. The old user-facing receiver-update versus rebuild distinction is removed; save changes preserves the same `FelDocument.id`, keeps source ownership under `FelCommercialSourceAllocation`, and rolls back without partially mutating the original draft if a conflict occurs.

The post-save continuity correction keeps a newly created draft open as the current explicit EDIT document. Successful `Guardar borrador` / `Save draft` now accepts the returned saved snapshot, preserves receiver email/country as manual snapshot values, keeps the just-saved Reservations visible through the saved-draft fallback after refreshed eligibility data no longer includes allocated sources, hides `Guardar borrador`, and shows `Guardar cambios`, `Descartar borrador`, `Nueva factura`, and `Snapshot guardado`. Page load and refresh still start in clean CREATE mode unless the Admin explicitly creates a draft or opens one from history.

Receiver guest contact data remains a suggestion source only, not fiscal identity. Selected Reservations can suggest receiver email values by trimmed, case-insensitive deduplication and receiver country values inferred from Reservation phone metadata through `libphonenumber-js` with a safe Reservation-country fallback. Manual Admin receiver email/country input is not overwritten by later selection changes, and existing draft receiver snapshots win when opened for edit. Eligible Reservation cards now display `dd/MM/yyyy` date-only ranges and localized singular/plural nights. The history-tab saved snapshot mirror was removed; the saved snapshot remains only in the new-invoice tab while explicitly editing a draft.

Hosted owner validation of the latest draft flow passed functionally, including new draft creation, post-save EDIT context preservation, Reservation/receiver/snapshot retention, save-changes, new-invoice reset, history reopen, discard, and source release. Owner review then identified a visual/design-system violation: the Fiscal Receiver identifier type selector, multiple-email suggestion selector, and multiple-country suggestion selector still used native browser `<select>` controls. Those selectors now use the existing shadcn/Radix Select implementation from `components/ui/select.tsx` while preserving identifier-type behavior, email AUTO/MANUAL behavior, country AUTO/MANUAL behavior, localized `Other` options, suggestion derivation, and manual input safeguards. Final-I regression coverage now rejects native `<select>` / `<option>` usage in the Admin FEL component and verifies the project Select import plus all three selector flows.

Final-I.7 must implement authoritative provider-backed receiver validation for both `NIT` and `CUI` through the configured FEL provider, using server-only authenticated INFILE integration once official documentation and Test credentials exist. Future provider-neutral lookup states are `IDLE`, `VALIDATING`, `VALID`, `NOT_FOUND`, and `UNAVAILABLE`, with provider result families `FOUND`, `NOT_FOUND`, and `UNAVAILABLE`. Local syntax checks may reject clearly malformed values, but local format validation is not authoritative taxpayer/person existence validation.

For future `NIT` validation, the Admin enters the NIT, TRP normalizes it, the server-side receiver lookup adapter calls INFILE, and a valid lookup sets `receiverIdentifier` to the normalized NIT and `receiverName` to the official provider-returned name. For future `CUI` validation, the same flow applies with provider-validated CUI and provider-returned name. In both cases, the receiver name should remain read-only while the validated identifier remains unchanged; changing identifier type, identifier, or validated receiver name invalidates lookup state and any server-authoritative preview. Provider unavailability must never be shown as an invalid identifier.

Final-I.7 certification readiness must require successful authoritative validation for `NIT` and `CUI` before any document can move toward certification. Draft persistence may remain operationally permissive if I.7 requires it for recovery, but an unvalidated identifier string is not enough for certification readiness. `CONSUMIDOR_FINAL` does not run NIT/CUI lookup and must not be treated as a fake NIT. `PASSPORT_FOREIGN` and `OTHER` remain manually supplied unless official provider documentation defines another mechanism.

SAT-domain carry-forward: `IDReceptor` can represent NIT or CUI; when CUI is used, `TipoEspecial = CUI`. This remains a future provider/XML mapping concern for I.7 and does not add SAT XML generation in I.6.

Final-I.6 implementation record: `docs/214-final-i-6-fel-persistence-admin-draft-module.md`.

Final-I.6 hardening added `npm run final-i:db:validate` as an explicit DB-backed Test-only integration gate. It verifies real Prisma/PostgreSQL draft creation, Reservation source uniqueness, GuestPaymentRequestItem source uniqueness, persisted individual line ordering, grouped invoice-wide line behavior, XOR enforcement, rollback safety, discard source release, non-DRAFT edit rejection, and same-draft preview ownership with targeted fixture cleanup.

Final-I.7 carry-forward: before any `FelCreditAllocation` is created by provider integration, the implementation must ensure `originalLineItemId` belongs to `originalDocumentId`, preferably through a composite database relationship. I.6 does not add a second migration for this deferred provider-integration prerequisite.

Owner formal acceptance: PASS on 2026-10-02. The documentation-only closure commit does not replace the accepted Final-I.6 feature head `80469abda146d0d50516ab598a514a9ccea2db6d`.

Final-I.6 is Completed and accepted on 2026-10-02. Final-I.8 and Final-I.9 remain Not started. Final-I.7 remains Blocked pending official INFILE technical documentation and Test credentials.

## Final-I.6.1 Implementation In Progress - Interim Operational Hardening

Final-I.6.1 is Implementation in progress. It is a provider-independent interim package requested by the owner while Final-I.7 remains blocked pending official INFILE technical documentation + Test credentials. The registration record is `docs/215-final-i-6-1-interim-operational-hardening.md`.

Workstream E status: Completed; provider trigger configuration + Hosted validation PASS on 2026-10-02.

Workstream A status: Completed; Hosted owner validation PASS on 2026-10-05.

Workstream B+C status: Implemented; validation completed; Hosted owner validation pending.

Registered workstreams:

```text
E - Zoho guest-correspondence trigger hardening / DMARC false-positive fix
A - Guest phone-country inference
B - GuestPaymentRequest expiration cron
C - Financial Admin Web Push notifications
D - Reservation Additional Charges nested tabs + single accordions
```

Frozen implementation sequence:

```text
1. E - Zoho guest-correspondence trigger hardening
2. A - Guest phone-country inference
3. B+C - GuestPaymentRequest expiration cron + financial Admin Push foundation
4. D - Additional Charges tabs + accordions
5. Integrated regression + Hosted owner acceptance
```

Final-I.6.1 does not reopen Final-I.6, does not replace accepted Final-I.6 head `80469abda146d0d50516ab598a514a9ccea2db6d`, and does not supersede Final-I.7. Final-I.8 remains reserved for FEL delivery email/PDF/XML/history UX, Final-I.9 remains reserved for integrated Final-I closure, and Phase 13 remains Blocked / Not started until Final-I closes.

Workstream E corrects the initial registration boundary: TRP must not replace Final-F.7 runtime correspondence-domain compatibility with exact-alias runtime matching because Zoho Limited Data may expose a mailbox-normalized recipient. The owner configured the existing Zoho outgoing webhook with provider-side Any / OR positive recipient conditions for `admin@juantzun.dev`, `reservas@juantzun.dev`, and `reservations@juantzun.dev`; Hosted validation passed on 2026-10-02 with DMARC Reports and DMARC Forensic negative cases producing no false `GUEST_EMAIL_RECEIVED` event or Admin Push, while external mail to all three intended aliases still followed the accepted guest/admin correspondence path. Runtime domain matching remains defense in depth over the Limited Data representation; no DMARC subject, sender or keyword heuristic is introduced.

Workstream A implements guest phone-country inference as a convenience default only. Initial Workstream A Hosted validation discovered a real IP-country false positive: physical Guatemala / VPN OFF / Vercel country US. The first timezone-confidence implementation treated every multi-country IANA timezone as ambiguous. Hosted Sensors validation showed this was too conservative: Europe/London and Asia/Tokyo both fell back to the inaccurate Vercel US IP country. The corrected policy preserves ordered timezone-country metadata and uses an agreeing IP country to disambiguate; otherwise it uses the timezone's primary supported country. Hosted owner validation passed on 2026-10-05 for physical Guatemala / VPN OFF with browser timezone America/Guatemala -> Guatemala/+502, US IP + Europe/London -> UK/+44, US IP + Asia/Tokyo -> Japan/+81, France IP + France browser/Sensors timezone -> France/+33, and manual guest-country override remaining authoritative. The endpoint still reads only Vercel's coarse `x-vercel-ip-country` ISO2 header, validates it through the shared phone-country catalog, returns only `{ country }`, uses `no-store`, and exposes no IP/location/header metadata. Browser timezone remains client-only and is never sent to `/api/geo/phone-country`, request headers, request body, database rows, Reservation records, audit records, analytics, or any persistence surface. Guest manual country selection permanently wins over any asynchronous inference result. No GPS, external geolocation provider, inferred metadata persistence, schema, migration, environment variable, or public property-page request-header read was added; `app/alojamientos/[slug]/page.tsx` keeps `export const revalidate = 300`.

## Boundaries

```text
- Phase 13 remains blocked / not started until Final-I closes.
- No Production provider account, credential, DNS cutover, payment credential, database, media account, WhatsApp sender, FEL account, or public go-live is introduced by Final-I.1 through Final-I.6.1.
- Workstreams B+C intentionally add one enum-only migration, one protected cron registry entry/route, one localized cron copy entry, and three bounded AdminNotification types; `vercel.json` remains `{ "crons": [] }` and no Production scheduler is activated.
- No dependency beyond `countries-and-timezones` static timezone metadata for Workstream A, environment variable, Production resource, external receiver lookup, INFILE transport, certification, Credit Note issuing workflow, PDF/XML retrieval, Final-I.7 provider integration, Final-G/H reopening, or Phase 13 work is part of Final-I.6.1.
- Final-I.7 is blocked pending official INFILE technical documentation + Test credentials and must not begin until explicitly requested.
- Existing Final-F.7 Zoho webhook signature verification, bootstrap behavior, Limited Data parsing, bounded persistence, notification-center serialization, and immediate Web Push delivery remain preserved.
- `vercel.json` remains `{ "crons": [] }`; the new GPR expiration cron is registered for protected manual/admin execution evidence only until Production scheduler activation is explicitly handled later.
```

## Validation Ledger

```text
Final-I.2 implementation validation:
- npm run final-i:validate - PASS, 12/12
- npm run final-h:validate - PASS, 20/20
- npm run env:validate - PASS
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
- Vercel - SUCCESS
- Hosted/owner visual validation - PASS
Final-I.3 implementation validation:
- npm run final-i:validate - PASS, 22/22
- npm run final-f:validate - PASS, 125/125
- npm run final-h:validate - PASS, 20/20
- npm run env:validate - PASS
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.3 mobile/PWA deep-link auto-scroll refinement validation:
- npm run final-i:validate - PASS, 23/23; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run final-f:validate - PASS, 125/125
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.3 documentation closure validation:
- npm run final-i:validate - PASS, 23/23; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.4 implementation validation:
- npm run final-i:validate - PASS, 29/29; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run final-f:validate - PASS, 125/125
- npm run final-h:validate - PASS, 20/20
- npm run env:validate - PASS; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning and Prisma major-version update notice only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date; initial sandbox run returned Schema engine error before the escalated rerun passed
- npm run lint - PASS
- npm run build - PASS; initial sandbox run failed to fetch Google Fonts for next/font before the escalated rerun passed; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities; initial sandbox run could not reach the audit endpoint/cache before the escalated rerun passed
- git diff --check - PASS
- Vercel - SUCCESS
- Hosted/mobile owner validation - PASS
- Owner acceptance - PASS on 2026-09-30 at accepted feature head 8e2d7d56a8e81a860833b05f4a28cba8a517bad4
Final-I.4 documentation acceptance closure validation:
- npm run final-i:validate - PASS, 29/29; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.5 implementation validation:
- npm run final-i:validate - PASS, 35/35; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run final-h:validate - PASS, 20/20; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run env:validate - PASS; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date; initial sandbox run returned Schema engine error before the escalated rerun passed
- npm run lint - PASS
- npm run build - PASS; initial sandbox run failed to fetch Google Fonts for next/font before the escalated rerun passed; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities; initial sandbox run could not reach the audit endpoint/cache before the escalated rerun passed
- git diff --check - PASS
Final-I.5 source-consumption hardening validation:
- npm run final-i:validate - PASS, 36/36; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run final-h:validate - PASS, 20/20; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run env:validate - PASS; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date; initial sandbox run returned Schema engine error before the escalated rerun passed
- npm run lint - PASS
- npm run build - PASS; initial sandbox run failed to fetch Google Fonts for next/font before the escalated rerun passed; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities; initial sandbox run could not reach the audit endpoint/cache before the escalated rerun passed
- git diff --check - PASS
Final-I.5 canonical amount-source hardening validation:
- npm run final-i:validate - PASS, 36/36; executed outside the sandbox after the known sandbox-only tsx startup failure mode
- npm run final-h:validate - PASS, 20/20; executed outside the sandbox after the known sandbox-only tsx startup failure mode
- npm run env:validate - PASS; executed outside the sandbox after the known sandbox-only tsx startup failure mode
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 29 migrations, database schema is up to date
- npm run lint - PASS
- npm run build - PASS; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS
Final-I.5 documentation acceptance closure validation:
- Vercel - SUCCESS for accepted head fde3ae06427af1f8905e6f7589263c199f918553
- Owner architecture acceptance - PASS on 2026-09-30
- npm run final-i:validate - PASS, 36/36
- git diff --check - PASS
Final-I.6 implementation validation:
- npm run final-i:validate - PASS, 53/53 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-i:db:validate - PASS, 12/12 with TRP_ENVIRONMENT=test; an initial date-change fixture setup violated the existing lifecycle delta CHECK and was corrected before the final pass
- npm run final-f:validate - PASS, 125/125
- npm run final-h:validate - PASS, 20/20
- npm run env:validate - PASS
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only after a retry because the first attempt overlapped a DB suite Prisma engine file lock
- npm run db:migrate:status - PASS, 30 migrations, database schema is up to date
- npm run lint - PASS
- npm run build - PASS; initial TypeScript narrowing failure in the former NIT lookup UI handling was corrected before the final pass; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS
Final-I.6 Hosted UX editing workflow correction validation:
- npm run final-i:validate - PASS, 57/57 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-f:validate - PASS, 125/125 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-h:validate - PASS, 20/20 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run env:validate - PASS after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:status - PASS, 30 migrations, database schema is up to date after rerun outside the sandbox because the sandbox run returned Schema engine error
- npm run lint - PASS
- npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
- npm audit --omit=dev - PASS, 0 vulnerabilities after rerun outside the sandbox because the sandbox audit endpoint/cache request failed
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 post-save context preservation correction validation:
- npm run final-i:validate - PASS, 57/57 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-h:validate - PASS, 20/20 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run lint - PASS
- npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 Admin FEL design-system Select correction validation:
- npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run final-h:validate - PASS, 20/20 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- npm run lint - PASS
- npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 documentation acceptance closure validation:
- Accepted Final-I.6 feature head - 80469abda146d0d50516ab598a514a9ccea2db6d
- Owner Hosted validation - PASS
- Owner formal acceptance - PASS on 2026-10-02
- npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.1 registration validation:
- npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.1 Workstream E architecture-correction validation:
- npm run final-i:validate - PASS, 61/61 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.1 Workstream E Hosted validation + Workstream A implementation validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 65/65
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.1 Workstream A confidence hardening validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; after stale tracker assertions were updated to the new Workstream A status, rerun outside the sandbox PASS, 67/67
- npm run final-h:validate - PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- npm audit --omit=dev - PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.1 Workstream A timezone resolution correction validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 67/67
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- npm audit --omit=dev - sandbox attempt failed against the npm audit endpoint/cache; rerun outside the sandbox PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only


Workstreams B+C implementation validation:
- npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
- npm run db:migrate:deploy - initial sandbox attempt returned Schema engine error; rerun outside the sandbox PASS, applied 20261005130000_final_i_6_1_financial_operations_hardening
- npm run db:migrate:status - initial sandbox attempt returned Schema engine error; rerun outside the sandbox PASS, 31 migrations, database schema is up to date
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 72/72
- TRP_ENVIRONMENT=test npm run final-i:db:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; after a test-only DB fixture size reduction preserved the existing line-order/grouped-extra assertions under the accepted transaction timeout, rerun outside the sandbox PASS, 14/14
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS
- npm audit --omit=dev - sandbox attempt failed against the npm audit endpoint/cache; rerun outside the sandbox PASS, 0 vulnerabilities
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Final-I.1 Hosted Owner Validation Completed

Owner Hosted validation completed and owner acceptance was explicit. The owner validated:

```text
- TRP-generated reservation/admin email still delivers normal operational email.
- Zoho receives the TRP-generated email without creating a false GUEST_EMAIL_RECEIVED push.
- Zoho receives the TRP-generated email without creating a false notification-center row.
- Genuine external email still creates GUEST_EMAIL_RECEIVED.
- Android Web Push delivery still works for genuine external email.
- /admin/notifications history still records the genuine external email notification.
```

## Final-I.3 Hosted Owner Functional Validation Completed

Owner Hosted validation completed on 2026-09-29 and owner acceptance was explicit. The accepted Final-I.3 implementation head remains:

```text
8c5a9186e392f35bdbc998f463c5c3c6cd0be295
```

This documentation-only closure commit does not replace that accepted Final-I.3 feature head.

Owner Hosted validation passed for:

```text
Desktop web:
- no tabs
- no Configuration
- recent notifications visible
- accordion single-open behavior correct

Android Chrome browser:
- Notifications + Configuration tabs preserved
- Configuration remains accessible
- accordion works

Android standalone PWA:
- Notifications + Configuration tabs preserved
- accordion works

Push deep-link:
- newly generated notification opens TRP Admin
- exact notification accordion expands
- notification remains unread until explicit action
- Open action uses original business targetPath

Final mobile/PWA scroll refinement:
- Push opens exact notification
- target accordion header is immediately visible below sticky Admin header
- expanded content appears below it
- later manual accordion changes do not trigger forced scrolling
```

Final-I.4 is completed and accepted on 2026-09-30 at accepted head `8e2d7d56a8e81a860833b05f4a28cba8a517bad4`.

## Final-I.2 Hosted Owner Visual Validation Completed

Owner Hosted visual validation completed and owner acceptance was explicit on 2026-09-29. The accepted Final-I.2 implementation head remains:

```text
6451cb705d972c83a771a9ff39f6da80d130cf58
```

This documentation-only closure commit does not replace that accepted Final-I.2 feature head.

Owner visual validation passed for:

```text
Home:
- final black coming-soon card removed
- Hero no longer describes availability/payment as future work

Public reservation flow:
- no Phase 8 / next phase / next subphase roadmap language

Admin accommodations:
- no settingsImpact card/note

Admin cancellation:
- no Phase 11.4 reference
- cancellation/refund separation explained as current behavior
```

Final-I.1 is completed and accepted on 2026-09-29 at accepted head `9a15f349c1104671f5555d1988caa56756e5ff0c`. Final-I.2 is completed and accepted on 2026-09-29 at accepted head `6451cb705d972c83a771a9ff39f6da80d130cf58`. Final-I.3 is completed and accepted on 2026-09-29 at accepted head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295`. Final-I.4 is completed and accepted on 2026-09-30 at accepted head `8e2d7d56a8e81a860833b05f4a28cba8a517bad4`.
