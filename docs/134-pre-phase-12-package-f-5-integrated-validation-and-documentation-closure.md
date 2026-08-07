# 134 — Pre-Phase-12 Package F.5 Integrated Validation and Documentation Closure

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.5 — Integrated validation and documentation closure
Status: Validation plan prepared — owner execution and acceptance pending
Validation base: e0420835ae67c6da5cc7a1a47529f16394b1f75c
Validation-base commit: docs(email): close package F.4 Zoho navigation acceptance
F.1 strategy base: cab7d71e34d230cdf49e013921764f6386d3fa2f
F.2 accepted operational head: 912cf1f79850517d19f73fa7f531c0492a7b429c
F.3 accepted head: c75a943a9f36c31e146594d7ad03eedb44635f89
F.4 accepted head: 7e0432f90836c5d4200ff528832eb48e69d1e642
Phase 12: Not started and not activated
```

## Objective

F.5 is the final Package F subpackage. It adds no feature behavior.

Its purpose is to prove that the accepted F.1 through F.4 boundaries work together on
the current repository head and that the documentation accurately describes the final
architecture before Package F is declared completed.

The integrated contract is:

```text
Automatic transactional delivery
TRP Booking -> Resend -> guest/admin intended delivery
                         |
                         +-> Reply-To -> Zoho human correspondence

Human correspondence
Guest -> reservas@ / reservations@ -> Zoho mailbox -> same-alias human reply

Application history
Reservation -> EmailNotification durable transactional history

Operational handoff
Reservation detail -> copy guest email + HTTPS Zoho Mail navigation
```

TRP Booking remains a direct-booking application, not an email client, shared inbox,
CRM, help desk, or PMS.

## Accepted Boundaries Carried Into F.5

### F.1 — Strategy and provider boundary

```text
- Resend owns automatic application-generated transactional delivery.
- Zoho Mail owns human inbox/sent correspondence, search, threading, drafts,
  attachments, spam filtering, mobile access, and human replies.
- EmailNotification remains the application-owned transactional history.
- No application-owned mailbox clone is authorized.
```

### F.2 — Local/test Zoho Mail

```text
Primary mailbox: admin@juantzun.dev
Spanish alias: reservas@juantzun.dev
English alias: reservations@juantzun.dev
Root-domain mailbox provider: Zoho Mail Lite
MFA: enabled
SPF: PASS
DKIM: PASS
DMARC: PASS
Mobile client: official Zoho Mail application
```

### F.3 — Transactional routing

```text
LOCAL
Guest physical delivery -> EMAIL_TEST_RECIPIENT
Admin physical delivery -> intended juantzun.dev admin recipient
Subject prefix -> [LOCAL]
Persisted guest recipient -> original reservation guest email

TEST
Guest physical delivery -> intended reservation guest email
Admin physical delivery -> intended juantzun.dev admin recipient
EMAIL_TEST_RECIPIENT -> empty
Subject prefix -> [TEST]

PRODUCTION
Guest/admin physical delivery -> intended production recipients
EMAIL_TEST_RECIPIENT -> empty
Subject prefix -> none
No production send is authorized in F.5
```

Human Reply-To remains:

```text
Local/Test ES -> reservas@juantzun.dev
Local/Test EN -> reservations@juantzun.dev
Production ES -> reservas@turefugioperfecto.com
Production EN -> reservations@turefugioperfecto.com
```

Transactional logos remain on the approved permanent Cloudinary HTTPS asset.

### F.4 — Reservation-to-Zoho handoff

```text
- Protected reservation detail exposes a separate guest-correspondence card.
- The persisted reservation guest email is displayed and copied best-effort.
- Zoho Mail opens through the configured normal HTTPS entry point.
- Mobile may open the installed Zoho Mail app through OS association; otherwise the
  mobile web fallback is valid.
- No OAuth, mailbox API, message/thread persistence, IMAP credential, mailto handoff,
  undocumented provider URL, or HTML scraping is introduced.
```

## F.5 Technical Gate

Run on the exact validation head after applying no uncommitted feature changes:

```bash
npm run email:contract:validate
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
```

Expected result: all commands pass.

`db:validate` is included only as an integrated safety check. F.5 adds no Prisma schema
or migration.

## Reduced Integrated Acceptance Matrix

F.5 deliberately does not repeat every F.2, F.3, and F.4 test. Prior accepted evidence
remains authoritative. The following matrix samples each boundary together on the
current head.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Email contract validation | `npm run email:contract:validate` passes |
| 2 | Environment validation | `npm run env:validate` passes |
| 3 | Prisma validation | `npm run db:validate` passes without schema changes |
| 4 | Lint | `npm run lint` passes |
| 5 | Build | `npm run build` passes |
| 6 | Diff hygiene | `git diff --check` passes |
| 7 | Fresh Test booking | One new controlled Test reservation completes Tilopay sandbox payment and becomes `CONFIRMED` |
| 8 | Test guest transactional delivery | `RESERVATION_CONFIRMED` physically reaches the reservation guest address with `[TEST]` |
| 9 | Test guest headers | From uses the test Resend sending domain; ES Reply-To routes to `reservas@juantzun.dev`; Cloudinary logo renders |
| 10 | Test admin delivery | `ADMIN_NEW_RESERVATION` reaches `admin@juantzun.dev` with `[TEST]` |
| 11 | Transactional persistence | Guest/admin `EmailNotification` rows persist their intended recipients and successful delivery state |
| 12 | Human ES round trip | Replying to the Test guest email reaches Zoho through `reservas@juantzun.dev`; Zoho reply uses the same alias and reaches the guest |
| 13 | Authentication | Representative transactional message reports SPF PASS, DKIM PASS, and DMARC PASS |
| 14 | English parity | Re-send an existing accepted EN guest confirmation; `[TEST]`, English From identity, and `Reply-To: reservations@juantzun.dev` remain correct |
| 15 | Human EN round trip | One EN reply reaches the Zoho mailbox through `reservations@juantzun.dev`; human reply keeps the English alias |
| 16 | Local guest isolation | Re-send an existing local guest confirmation: persisted recipient remains the guest while physical delivery goes only to `EMAIL_TEST_RECIPIENT` with `[LOCAL]` |
| 17 | Local admin isolation | Re-send the corresponding local admin notification: physical delivery goes to the intended `juantzun.dev` admin mailbox, not `EMAIL_TEST_RECIPIENT` |
| 18 | Reservation-to-Zoho desktop handoff | Current reservation detail shows guest email, copies it, opens Zoho HTTPS, and allows searching the human conversation |
| 19 | Mobile handoff smoke | Current reservation detail remains responsive; Zoho app may open through OS association or web fallback remains usable |
| 20 | Domain-state isolation | Zoho navigation and email resend checks do not alter Reservation, Payment, Refund, dates, holds, or lifecycle-request state |
| 21 | Transactional-history preservation | Existing `EmailNotification` history, manual-resend child history, retry metadata, and intended-recipient evidence remain visible |
| 22 | Security/provider boundary | No mailbox content, OAuth credential, refresh token, message body, thread ID, password, or raw provider response is introduced into application persistence |
| 23 | Production isolation | No production Zoho organization, DNS, credential, or real production email delivery is changed or exercised; production contract remains static-only |
| 24 | Documentation consistency | F.1–F.4 records and current runtime behavior agree with this final integrated contract |

## Detailed Execution Runbook

### A. Technical validation

Run:

```bash
npm run email:contract:validate
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
```

Do not continue to Package F acceptance if any command fails.

### B. One fresh Test end-to-end reservation

Use the stable Test deployment:

```text
https://trp-booking.juantzun.dev
```

Use Spanish for this representative full booking and a controlled guest mailbox that
is not `admin@juantzun.dev`.

1. Create one reservation.
2. Complete the normal Tilopay sandbox payment.
3. Confirm the Payment is `APPROVED`.
4. Confirm the Reservation is `CONFIRMED`.
5. Confirm the guest `RESERVATION_CONFIRMED` email physically reaches the entered guest
   address.
6. Confirm the automatic `ADMIN_NEW_RESERVATION` physically reaches
   `admin@juantzun.dev`.
7. Confirm the guest message has `[TEST]` and the approved test Resend From identity.
8. Confirm `Reply-To: reservas@juantzun.dev`.
9. Confirm the approved Cloudinary logo renders.
10. Confirm SPF, DKIM, and DMARC report PASS on the representative guest message.

In reservation transactional history verify:

```text
RESERVATION_CONFIRMED
Intended recipient = reservation guest email

ADMIN_NEW_RESERVATION
Intended recipient = admin@juantzun.dev
```

The Test environment must not redirect the guest message to `EMAIL_TEST_RECIPIENT`.

### C. Spanish human round trip

From the controlled guest mailbox, reply to the representative Spanish confirmation.

Expected flow:

```text
Guest mailbox
  -> Reply-To reservas@juantzun.dev
  -> Zoho
  -> physical admin@juantzun.dev mailbox
  -> Reply from reservas@juantzun.dev
  -> guest mailbox
```

Do not send the human reply through Resend.

### D. English parity without another full booking

Reuse an existing accepted English reservation from the F.3/F.4 test set when
available.

From the protected reservation detail, manually send the eligible guest confirmation
again.

Validate:

```text
Subject prefix: [TEST]
From: English test Resend identity
Reply-To: reservations@juantzun.dev
Physical recipient: reservation guest email
Persisted intended recipient: reservation guest email
```

Reply once from the guest mailbox and confirm the human round trip keeps
`reservations@juantzun.dev` as the Zoho sender identity.

If no usable English reservation remains, create one controlled Test reservation; do
not weaken the matrix to skip English Reply-To parity.

### E. Local routing smoke without another payment

Use an existing confirmed local reservation.

Manual guest resend:

```text
Persisted intended recipient -> reservation guest email
Physical delivery -> EMAIL_TEST_RECIPIENT
Subject -> [LOCAL]
```

Manual admin resend:

```text
Persisted intended recipient -> admin@juantzun.dev
Physical delivery -> admin@juantzun.dev
Subject -> [LOCAL]
```

The administrative message must not be redirected to `EMAIL_TEST_RECIPIENT`.

### F. Reservation-to-Zoho handoff

Using the current Test reservation:

Desktop:

```text
- card displays exact reservation guest email
- action copies the email when clipboard permission allows
- Zoho Mail opens through HTTPS
- copied email can be pasted into Zoho search
- matching human correspondence can be located
```

Mobile smoke:

```text
- no horizontal overflow
- action remains usable
- guest email copy remains best-effort
- installed Zoho app opening is acceptable when the OS association handles it
- Zoho mobile web fallback is equally acceptable
```

Native application opening is not a strict requirement because F.4 intentionally uses
only the stable HTTPS entry point and owns no Zoho message permalink.

### G. State and security boundary

Before and after the Zoho handoff and manual email resends, verify there is no
unexpected mutation to:

```text
Reservation.status
Reservation dates
Payment status
Refund status
Lifecycle request state
Lifecycle holds
Availability state
```

The expected application persistence remains transactional `EmailNotification`
history only. Manual resend may create its already-approved auditable child
notification; it must not rewrite the source history.

F.5 must not introduce or require:

```text
Zoho OAuth client ID
Zoho OAuth client secret
Zoho refresh token
Zoho mailbox password
Zoho accountId
Zoho message/thread IDs
EmailThread
EmailMessage
EmailAttachment
InboundEmailEvent
ReservationEmailConversation
```

## Production Boundary

F.5 does not perform a production mail test.

Production remains future Phase 12 work and must stay isolated:

```text
Production correspondence domain: turefugioperfecto.com
Production Resend sending domain: mail.turefugioperfecto.com
Production Zoho organization: not configured/activated by Package F test work
Production real guest delivery: not exercised in F.5
```

The existing automated environment/email contract validation is the representative
production safety evidence for this package.

## Acceptance Gate

F.5 can be accepted only when:

```text
- all six technical commands pass;
- all 24 integrated matrix checks pass;
- no corrective feature implementation is required;
- F.1 through F.4 boundaries still match runtime behavior;
- production remains untouched;
- Package F documentation is internally consistent.
```

If a test exposes a defect, F.5 remains open. Fix the defect in the smallest relevant
boundary, rerun only the affected checks plus the integrated dependency checks, and do
not mark Package F completed prematurely.

## Closure Action After Acceptance

After the owner reports the matrix as successful:

```text
1. Update this document to Completed and accepted with the actual validation head.
2. Update README.md continuity/status where applicable.
3. Update docs/10-phases.md.
4. Update docs/11-progress-log.md.
5. Update docs/121-pre-phase-12-improvement-track.md.
6. Update docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md.
7. Mark F.1 through F.5 completed and accepted.
8. Mark Package F completed and accepted.
9. Keep Phase 12 Not started until an explicit activation decision is made.
10. Re-evaluate the Pre-Phase-12 gate: Packages A, B, C, E, and F should then be
    accepted, while Package D remains intentionally deferred outside the current gate.
```

F.5 completion does not automatically activate Phase 12. It only completes the
approved Package F gate item and makes the repository ready for the explicit Phase 12
activation decision.
