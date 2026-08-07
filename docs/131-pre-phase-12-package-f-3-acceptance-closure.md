# 131 — Pre-Phase 12 Package F.3 Acceptance Closure

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.3 — Transactional Reply-To and environment-aware recipient routing
Status: Completed and accepted
Acceptance date: 2026-08-07
Initial implementation commit: 4b4f1cfa93b1cdb483f098ffffb981236b4f90a5
Accepted head: c75a943a9f36c31e146594d7ad03eedb44635f89
Implementation record: docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
Previous closure: docs/129-pre-phase-12-package-f-2-acceptance-closure.md
Next package: F.4 — Reservation-to-Zoho navigation
Phase 12: Not started
```

## Closure Decision

Package F.3 is formally completed and accepted. The owner reported both the original full ES/EN Reply-To round-trip matrix and the reduced routing-refinement regression matrix passing successfully after commit `c75a943a9f36c31e146594d7ad03eedb44635f89`.

The accepted implementation keeps the provider boundary explicit:

```text
Automatic transactional email -> Resend
Human guest correspondence     -> Zoho Mail
Transactional delivery history -> EmailNotification
Human mailbox history          -> Zoho Mail
```

No mailbox synchronization, message-body persistence, IMAP integration, Zoho send/reply API integration, Prisma migration, or production-provider activation was introduced.

## Accepted Environment Routing

### Local

```text
TRP_ENVIRONMENT=local
EMAIL_DELIVERY_MODE=test

guest audience -> physical delivery to EMAIL_TEST_RECIPIENT
admin audience -> intended juantzun.dev admin recipient
subject prefix -> [LOCAL]
```

The intended guest recipient remains stored in `EmailNotification.recipient`; only local guest physical delivery is redirected.

### Stable test

```text
TRP_ENVIRONMENT=test
EMAIL_DELIVERY_MODE=test

guest audience -> intended reservation recipient
admin audience -> intended juantzun.dev admin recipient
EMAIL_TEST_RECIPIENT -> empty
subject prefix -> [TEST]
```

This allows production-like recipient behavior while preserving test-only Resend, Tilopay sandbox, test-domain, database, and Zoho boundaries.

### Future production

```text
TRP_ENVIRONMENT=production
EMAIL_DELIVERY_MODE=production

guest audience -> intended reservation recipient
admin audience -> intended turefugioperfecto.com admin recipient
EMAIL_TEST_RECIPIENT -> empty
subject prefix -> none
```

Production credentials, provider accounts, DNS, and mailbox configuration remain untouched by F.3.

## Accepted Reply-To Boundary

```text
local/test ES -> reservas@juantzun.dev
local/test EN -> reservations@juantzun.dev
production ES -> reservas@turefugioperfecto.com
production EN -> reservations@turefugioperfecto.com
```

Automatic From identities remain on the technical Resend sending subdomains. Human replies therefore leave the transactional provider boundary and enter the appropriate Zoho alias.

## Brand Asset Acceptance

The canonical transactional logo is the permanent public Cloudinary asset documented in F.3. The shared email layout now preserves these rules:

```text
local      -> Cloudinary image; no localhost clickable logo link
test       -> Cloudinary image; link to https://trp-booking.juantzun.dev
production -> Cloudinary image; link to https://turefugioperfecto.com
```

No template-specific logo fork was introduced.

## Acceptance Evidence

The owner reported the following gates passing:

```text
Original ES automatic delivery and Reply-To round trip: PASS
Original EN automatic delivery and Reply-To round trip: PASS
Zoho same-alias human reply behavior: PASS
SPF: PASS
DKIM: PASS
DMARC: PASS
EmailNotification intended-recipient persistence: PASS
Retry/history behavior: PASS

Reduced routing-refinement regression:
- email:contract:validate: PASS
- env:validate: PASS
- lint: PASS
- build: PASS
- git diff --check: PASS
- local guest -> EMAIL_TEST_RECIPIENT: PASS
- local admin -> juantzun.dev admin mailbox: PASS
- local [LOCAL] subject: PASS
- local Cloudinary logo/no localhost link: PASS
- stable-test guest -> intended recipient: PASS
- stable-test admin -> juantzun.dev admin mailbox: PASS
- stable-test [TEST] subject: PASS
- stable-test Cloudinary logo/site link: PASS
- stable-test Reply-To smoke test -> Zoho: PASS
- production isolation: PASS
```

## Persistence and Business-Logic Safety

F.3 changes only the email configuration/provider boundary and shared email presentation needed by the accepted routing contract. It does not change:

```text
- reservation confirmation rules
- Tilopay payment approval or reconciliation
- cancellation/refund/date-change/stay-extension transitions
- EmailNotification intent creation
- permanent deduplication keys
- retry and stale-processing recovery
- manual resend history
- arrival-instruction scheduling
- Prisma schema or migrations
```

Email failure remains isolated from accepted payment and reservation state.

## Security and Secrets

No password, MFA code, recovery code, Resend API key, Zoho OAuth secret, private DKIM material, provider token, mailbox message body, or attachment content is recorded in repository documentation.

The documented Cloudinary asset URL, email domains, aliases, and public DNS/authentication outcomes are non-secret configuration/evidence.

## Formal Acceptance

```text
Package F.3: COMPLETED AND ACCEPTED
Accepted head: c75a943a9f36c31e146594d7ad03eedb44635f89
Acceptance date: 2026-08-07
Phase 12: NOT STARTED
```

The official phase/progress trackers now advance Package F to F.4.

## Handoff to F.4

Next package:

```text
F.4 — Reservation-to-Zoho navigation
```

F.4 must first validate current official Zoho Mail navigation/search capabilities. The intended result is a protected reservation-detail action that hands off guest correspondence context to Zoho without making TRP Booking a mailbox client.

F.4 must preserve these boundaries:

```text
- no /admin/emails mailbox clone
- no inbound Resend receiving
- no stored human message bodies, headers, threads, or attachments
- no IMAP credentials
- no undocumented Zoho URL scraping
- no Zoho send/reply/delete operations
- read-only OAuth search only if official deep-link/search navigation is insufficient and separately approved
- production Zoho configuration remains untouched
```

F.5 remains the final integrated validation and Package F documentation closure after F.4 acceptance.
