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
Final-I.2 status: Implementation completed; owner acceptance pending
Final-I.3 status: Next / Not started
Final-I.4 status: Not started
Final-I.5 status: Not started
Final-I.6 status: Not started
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started
Final-I.9 status: Not started
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I is an owner-requested pre-Production addendum registered after the accepted Final-H closure. It does not rewrite the historical acceptance of Phase 12, Final-A through Final-H, or the complete Post-Phase-12 / Pre-Phase-13 Final Improvement Track at `6922cf27e31e63fde071c0d0a810b141e44b9f90`. Final-I.1 is completed and accepted at its feature head `9a15f349c1104671f5555d1988caa56756e5ff0c`; this documentation closure does not replace that accepted head. Phase 13 remains not started and is blocked until Final-I closes and receives owner acceptance.

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

Final-I.2 implementation is completed and owner acceptance remains pending. Its accepted scope is legacy/future-phase UI and copy cleanup only. It removes obsolete public/admin user-visible copy that incorrectly described completed functionality as an upcoming phase, next phase, next subphase, coming soon, future implementation, or similar roadmap language.

Implemented Final-I.2 scope:

```text
- removed the final black Home card "Próximamente booking online" and its unused component/localization keys
- removed the admin/accommodations preparation-buffer note "Los cambios se aplican a reservas confirmadas, holds activos, disponibilidad pública y futuros feeds..."
- rewrote stale Home hero, Home benefit/trust, reservation request, pending-hold, date-mutation negative-difference, and admin photo deletion copy to current behavior
- removed stale unused localization keys for property-detail booking-coming-soon, request hold-disabled, and phase-boundary notes
- reworded the final stale cancellation approval warning that still referenced `Phase 11.4`, preserving the accepted boundary that reservation cancellation does not automatically create or process a Refund
- preserved legitimate temporal copy such as "Próximas llegadas" and "Upcoming arrivals"
- added focused Final-I.2 tests under `tests/final-i`
```

Legitimate temporal copy must remain, including:

```text
Próximas llegadas
reservas próximas
upcoming arrivals
upcoming reservations
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

Final-I.3 will simplify the desktop admin notification center to recent notifications only, with no tabs and no Configuration view. Mobile browser and standalone PWA retain Notifications + Configuration. Notification details use a single accordion with one item open at a time. Push clicks route to `/admin/notifications?notification=<id>` and auto-expand the target notification. The internal Open action keeps the existing `targetPath` behavior.

Final-I.4 will remove visible raw/fallback URLs from guest-facing HTML email bodies while preserving CTA buttons. Plaintext email continues to include a labeled URL for non-HTML clients.

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
- No Production provider account, credential, DNS cutover, payment credential, database, media account, WhatsApp sender, FEL account, or public go-live is introduced by Final-I.1 or Final-I.2.
- No schema, migration, dependency, environment variable, scheduler, AdminNotificationType, Production, Final-I.3+, FEL, Final-G/H reopening, or Phase 13 work is part of Final-I.2.
- Existing Final-F.7 Zoho webhook signature verification, bootstrap behavior, Limited Data parsing, bounded persistence, notification-center serialization, and Web Push delivery remain preserved.
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
- Vercel / Hosted smoke - pending after push
- Hosted owner validation - pending for Final-I.2
```

## Hosted Owner Validation Completed

Owner Hosted validation completed and owner acceptance was explicit. The owner validated:

```text
- TRP-generated reservation/admin email still delivers normal operational email.
- Zoho receives the TRP-generated email without creating a false GUEST_EMAIL_RECEIVED push.
- Zoho receives the TRP-generated email without creating a false notification-center row.
- Genuine external email still creates GUEST_EMAIL_RECEIVED.
- Android Web Push delivery still works for genuine external email.
- /admin/notifications history still records the genuine external email notification.
```

Final-I.1 is completed and accepted on 2026-09-29 at accepted head `9a15f349c1104671f5555d1988caa56756e5ff0c`. Final-I.2 implementation is completed and owner acceptance remains pending. Final-I.3 is Next / Not started.
