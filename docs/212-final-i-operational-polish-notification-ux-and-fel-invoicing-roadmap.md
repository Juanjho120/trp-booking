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
Final-I.4 status: Implementation completed; Hosted owner validation + acceptance pending
Final-I.5 status: Next / Not started
Final-I.6 status: Not started
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started
Final-I.9 status: Not started
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I is an owner-requested pre-Production addendum registered after the accepted Final-H closure. It does not rewrite the historical acceptance of Phase 12, Final-A through Final-H, or the complete Post-Phase-12 / Pre-Phase-13 Final Improvement Track at `6922cf27e31e63fde071c0d0a810b141e44b9f90`. Final-I.1 is completed and accepted at its feature head `9a15f349c1104671f5555d1988caa56756e5ff0c`, and Final-I.2 is completed and accepted at `6451cb705d972c83a771a9ff39f6da80d130cf58`; Final-I.3 is completed and accepted on 2026-09-29 at accepted head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295` after Hosted owner validation of the desktop, Android mobile browser, Android standalone PWA, Push deep-link, and final mobile/PWA auto-scroll refinement. Final-I.4 implementation is completed with Hosted owner validation and acceptance pending. Phase 13 remains not started and is blocked until Final-I closes and receives owner acceptance.

## Subphase Structure

```text
Final-I.1 - Zoho internal-email suppression and notification-loop correction
Final-I.2 - Legacy/future-phase UI and copy cleanup
Final-I.3 - Admin notification-center desktop simplification + single accordion + Push deep-link
Final-I.4 - Guest-facing email visible-URL cleanup
Final-I.5 - FEL/INFILE fiscal/domain contract and architecture
Final-I.6 - FEL persistence + Admin draft/selection/preview module
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

Final-I.3 is completed and accepted on 2026-09-29 at accepted feature head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295`. Final Hosted owner validation passed across desktop browser, Android Chrome browser, Android standalone PWA, Push deep-link behavior, and the final mobile/PWA deep-link auto-scroll refinement. Final-I.4 implementation is completed; Hosted owner validation and acceptance remain pending.

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

## Final-I.4 Implementation Scope - Hosted Owner Validation Pending

Final-I.4 removes long raw action URLs visibly printed inside guest-facing HTML email bodies because those URLs can cause mobile email clients to zoom/reflow poorly. CTA buttons remain the HTML action surface, and text/plain email keeps labeled URLs because plaintext clients have no styled button.

Implemented guest-facing cleanup:

```text
- Arrival instructions: map CTA href preserved; visible raw map URL removed from the HTML body.
- Review invitation: review CTA href preserved; visible raw private review URL removed from the HTML body.
- Additional-charge payment request: payment CTA href preserved; visible raw private payment URL removed from the guest HTML body.
- Lifecycle date-change and stay-extension payment requests: payment CTA href preserved; visible raw private payment URL removed from the guest HTML body.
```

Preserved behavior:

```text
- HTML CTA `href` destinations remain unchanged.
- Text/plain email continues to include labeled action URLs for plaintext clients.
- Payment, reservation, review, and map URLs/tokens remain unchanged.
- Expiry behavior, routing, recipients, subjects, delivery/retry pipeline, React Email, `@react-email/render`, `EmailLayout`, `EmailButton`, localization architecture, and brand layout remain unchanged.
- Admin/internal visible URL fallbacks remain available, including additional-charge Admin reservation links and lifecycle adjustment Admin delivery-status emails.
```

The email audit covered `emails/**` and `lib/email/**`. Reservation-confirmed email remains a no-action-url control. Final-I.4 is presentation-only and introduced no schema, migration, dependency, environment, scheduler, API, Production resource, FEL implementation, or Phase 13 work.

Final-I.4 tests distinguish URL presence in HTML `href` attributes from forbidden visible text nodes, verify Spanish and English guest emails, preserve plaintext URLs, and include Admin regression coverage for shared templates where visible fallback URLs are still intentional.

Final-I.5 through Final-I.8 define FEL direction without inventing provider specifics:

```text
- Admin FEL module
- initial fiscal type: Factura de Pequeño Contribuyente
- one invoice may include one or more Reservations
- one lodging line per Reservation
- additional-charge lines per Reservation
- invoice-level option to group extra-charge lines
- fiscal receiver is separate from Reservation guest identity
- invoice values use immutable snapshots from the accepted financial source
- refund is not invoice cancellation
- credit note is a separate fiscal adjustment
- refund on already invoiced value may surface fiscal reconciliation required
- no automatic credit note until provider/accounting contract is frozen
- React Email + existing EmailLayout for delivery email
- PDF attachment expected
- XML certified document support to be decided from the official INFILE contract
- INFILE provider contract must not be invented
```

Unresolved FEL/INFILE questions remain carried forward:

```text
- USD/GTQ handling
- exchange rates
- DTE receiver fields
- CF/NIT/CUI/passport/foreign tax ID rules
- legal timing and eligibility around checkout
- INFILE transport
- INFILE authentication
- INFILE signature requirements
- certification response shape
- cancellation behavior
- credit note behavior
- idempotency
- retry and contingency behavior
- PDF retrieval
- XML retrieval
```

## Boundaries

```text
- Phase 13 remains blocked / not started until Final-I closes.
- No Production provider account, credential, DNS cutover, payment credential, database, media account, WhatsApp sender, FEL account, or public go-live is introduced by Final-I.1 through Final-I.4.
- No schema, migration, dependency, environment variable, scheduler, AdminNotificationType, Production, Final-I.5+, FEL, Final-G/H reopening, or Phase 13 work is part of Final-I.4.
- Final-I.5 is the next subphase and remains Not started until explicitly requested.
- Existing Final-F.7 Zoho webhook signature verification, bootstrap behavior, Limited Data parsing, bounded persistence, notification-center serialization, and immediate Web Push delivery remain preserved.
- `vercel.json` remains `{ "crons": [] }`.
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

Final-I.4 implementation is completed; Hosted owner validation + acceptance pending.

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

Final-I.1 is completed and accepted on 2026-09-29 at accepted head `9a15f349c1104671f5555d1988caa56756e5ff0c`. Final-I.2 is completed and accepted on 2026-09-29 at accepted head `6451cb705d972c83a771a9ff39f6da80d130cf58`. Final-I.3 is completed and accepted on 2026-09-29 at accepted head `8c5a9186e392f35bdbc998f463c5c3c6cd0be295`. Final-I.4 implementation is completed; Hosted owner validation + acceptance pending.
