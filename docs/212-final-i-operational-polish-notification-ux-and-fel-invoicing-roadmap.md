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
Final-I.1 status: Implementation completed; Hosted owner validation + acceptance pending
Final-I.2 status: Not started
Final-I.3 status: Not started
Final-I.4 status: Not started
Final-I.5 status: Not started
Final-I.6 status: Not started
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started
Final-I.9 status: Not started
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I is an owner-requested pre-Production addendum registered after the accepted Final-H closure. It does not rewrite the historical acceptance of Phase 12, Final-A through Final-H, or the complete Post-Phase-12 / Pre-Phase-13 Final Improvement Track at `6922cf27e31e63fde071c0d0a810b141e44b9f90`. Phase 13 remains not started and is blocked until Final-I closes and receives owner acceptance.

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

## Final-I.1 Implemented Scope

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

## Future Subphase Decisions

Final-I.2 will remove obsolete future-phase/public-admin copy that no longer matches the accepted state, including the home black `Próximamente booking online` card and admin/accommodations copy such as `Los cambios se aplican a reservas confirmadas...`. Legitimate time text such as `Próximas llegadas` must remain.

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
- No Production provider account, credential, DNS cutover, payment credential, database, media account, WhatsApp sender, FEL account, or public go-live is introduced by Final-I.1.
- No schema, migration, dependency, environment variable, scheduler, AdminNotificationType, Production, Final-I.2+, FEL, Final-G/H reopening, or Phase 13 work is part of Final-I.1.
- Existing Final-F.7 Zoho webhook signature verification, bootstrap behavior, Limited Data parsing, bounded persistence, notification-center serialization, and Web Push delivery remain preserved.
- `vercel.json` remains `{ "crons": [] }`.
```

## Validation Ledger

```text
npm run final-i:validate - PASS, 8/8
npm run final-f:validate - PASS, 125/125
npm run final-h:validate - PASS, 20/20
npm run env:validate - PASS
npm run db:validate - PASS
npm run db:generate - PASS
npm run db:migrate:status - PASS, database schema is up to date
npm run lint - PASS
npm run build - PASS
npm audit --omit=dev - PASS, 0 vulnerabilities
git diff --check - PASS
```

## Hosted Owner Validation Pending

Owner Hosted validation remains pending for Final-I.1. Suggested owner checks after Test deployment succeeds:

```text
A. Send a real external guest email to the accepted Zoho admin mailbox and confirm one GUEST_EMAIL_RECEIVED notification is created.
B. Trigger a TRP-origin transactional email from the active sending domain to the Zoho admin mailbox and confirm the webhook returns ignored/internal_sender with no ZohoInboundEmailEvent, AdminNotification, AdminPushDelivery, or Web Push notification.
```
