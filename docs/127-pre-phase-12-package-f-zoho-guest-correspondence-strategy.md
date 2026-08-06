# 127 — Pre-Phase-12 Package F Zoho Guest Correspondence Strategy

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.1 Strategy, provider boundary, and environment contract
Status: Completed and accepted — F.2 operational setup in progress
Strategy and acceptance date: 2026-08-06
Strategy base head: cab7d71e34d230cdf49e013921764f6386d3fa2f
Previous accepted package: Package E — Public location and map configuration
Previous closure: docs/126-pre-phase-12-package-e-acceptance-closure.md
Active subpackage: F.2 Test Zoho Mail setup and DNS validation
F.2 record: docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md
Phase 12: Not started and not activated
```

## Decision Summary

Package F no longer builds an inbound/outbound mailbox inside TRP Booking.

The accepted architecture separates two responsibilities:

```text
TRP Booking + Resend
- Own automatic transactional notification intent, rendering, delivery, retries,
  idempotency, safe diagnostics, and reservation-level notification history.

Zoho Mail Lite
- Own human guest correspondence, inbox and sent folders, conversation threading,
  spam filtering, attachments, drafts, search, mobile access, and replies from the
  same public address that received the guest message.
```

This decision intentionally avoids turning TRP Booking into a general email client,
shared inbox, help desk, CRM, or PMS.

## Superseded Package F Scope

The earlier Package F proposal required:

```text
- A protected /admin/emails inbox and sent center.
- Resend inbound receiving and webhooks.
- EmailThread, EmailMessage, EmailAttachment, and inbound-event persistence.
- Stored inbound and outbound message bodies.
- Application-owned threading, reply handling, and attachment processing.
```

That proposal is superseded by this document and must not be implemented without a
new explicit owner decision.

The revised Package F does not add an application-owned inbox, does not ingest human
email content, and does not replace the existing reservation-level transactional
notification history.

## Accepted Responsibility Boundary

### TRP Booking remains responsible for

```text
- EmailNotification and its current schema, relations, retry state, manual resend
  history, source/result relations, safe errors, and provider identifiers.
- RESERVATION_CONFIRMED, ADMIN_NEW_RESERVATION, ARRIVAL_INSTRUCTIONS, cancellation,
  refund, date-change, stay-extension, and payment-link notifications already
  accepted through Phases 10 and 11.
- The current transactional email section in protected reservation detail.
- Resend environment isolation, provider idempotency, test-recipient routing, and
  post-commit failure isolation.
- A future protected navigation action from a reservation to the corresponding
  Zoho guest conversation or provider search.
```

### Zoho Mail remains responsible for

```text
- Receiving human messages at reservas@, reservations@, and admin@.
- Sending human replies from the same public address that received the message.
- Human conversation threading, inbox/sent organization, spam filtering, drafts,
  signatures, attachments, search, mobile access, and mailbox retention.
- Manual creation of new Spanish, English, or administrative conversations.
```

### Resend remains responsible for

```text
- Automatic application-generated delivery only.
- Existing sending subdomains under mail.trp-booking.juantzun.dev for local/test and
  mail.turefugioperfecto.com for production.
- No human inbox, no inbound receiving, and no manual guest correspondence.
```

## EmailNotification Preservation Contract

`EmailNotification` remains unchanged by the Package F strategy.

```text
- Do not convert EmailNotification into a mailbox or general message table.
- Do not add inbound human correspondence to EmailNotification.
- Do not remove or replace the transactional email history currently rendered in
  reservation detail.
- Do not backfill historical email bodies or reconstruct sent content from current
  reservation data.
- Do not weaken permanent deduplication, retries, manual resend relations, or safe
  provider diagnostics.
```

The reservation detail must continue showing transactional notifications exactly as
it does before Package F. A separate guest-correspondence action may be added near
that section, but the existing section remains the authoritative application history.

## Mailbox and Alias Policy

One Zoho mailbox is sufficient while one owner operates all guest correspondence.

### Local and test Zoho organization

```text
Provider account: Separate personal/test Zoho organization
Plan: Zoho Mail Lite
Hosted domain: juantzun.dev
Primary mailbox: admin@juantzun.dev
Spanish alias: reservas@juantzun.dev
English alias: reservations@juantzun.dev
Primary mobile client: Zoho Mail mobile application
Allowed TRP environments: local and test only
```

### Production Zoho organization

```text
Provider account: Separate Tu Refugio Perfecto company Zoho organization
Plan: Zoho Mail Lite
Hosted domain: turefugioperfecto.com
Primary mailbox: admin@turefugioperfecto.com
Spanish alias: reservas@turefugioperfecto.com
English alias: reservations@turefugioperfecto.com
Primary mobile client: Zoho Mail mobile application
Allowed TRP environment: production only
```

Test and production must not share a Zoho organization, OAuth client, password,
refresh token, mailbox identifier, domain, or integration secret.

Zoho email aliases deliver to the same mailbox and are selectable in the `From`
field. This supports one paid user while preserving the three public identities.

## Human Sender Policy

Replies must use the public address that received the guest message:

```text
Received at reservas@...      -> reply from reservas@...
Received at reservations@...  -> reply from reservations@...
Received at admin@...         -> reply from admin@...
```

New human conversations follow this policy:

```text
Spanish guest conversation -> reservas@...
English guest conversation -> reservations@...
Administrative conversation -> admin@...
```

This is an operational Zoho rule. TRP Booking must not send human replies through
Resend or impersonate the Zoho mailbox.

## Transactional From and Reply-To Policy

Resend continues using isolated technical sending subdomains. Replies route to Zoho.

### Local and test

```text
Spanish From:
Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>

Spanish Reply-To:
reservas@juantzun.dev

English From:
Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>

English Reply-To:
reservations@juantzun.dev
```

### Production

```text
Spanish From:
Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>

Spanish Reply-To:
reservas@turefugioperfecto.com

English From:
Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>

English Reply-To:
reservations@turefugioperfecto.com
```

The current environment variables remain the source of truth for transactional From
and Reply-To values. F.3 must update documentation and configuration values without
changing the accepted Resend delivery pipeline.

## DNS and MX Separation

The domain root receives human mail through Zoho. The existing Resend subdomain sends
automatic email. They are separate DNS hostnames and must not compete for the same MX
responsibility.

### Local and test DNS ownership

```text
juantzun.dev
- MX -> Zoho Mail
- Root-domain SPF/DKIM/DMARC -> Zoho requirements

mail.trp-booking.juantzun.dev
- Resend sending-domain DNS remains isolated under this subdomain
- No Zoho mailbox hosting is required on this hostname
```

### Production DNS ownership

```text
turefugioperfecto.com
- MX -> Zoho Mail
- Root-domain SPF/DKIM/DMARC -> Zoho requirements

mail.turefugioperfecto.com
- Resend sending-domain DNS remains isolated under this subdomain
- No Zoho mailbox hosting is required on this hostname
```

Only the exact MX records shown in the corresponding Zoho Admin Console may be added
to the root domain. Do not copy example MX values between Zoho data centers or
accounts. Existing MX records from another mailbox provider must be reviewed before
replacement because competing root-domain MX records can cause failed or inconsistent
delivery.

SPF must remain one valid record per hostname. Root-domain Zoho SPF and Resend
subdomain SPF are independent because they authorize different hostnames.

## Zoho Setup Runbook for F.2

F.2 is an operational configuration subpackage. It introduces no TRP application code.

### Test organization setup

```text
1. Create the personal/test Zoho Mail organization.
2. Select Zoho Mail Lite.
3. Add juantzun.dev as the hosted domain.
4. Verify domain ownership using the exact TXT or CNAME value generated by Zoho.
5. Review existing juantzun.dev MX records before changing them.
6. Configure the exact MX records shown by the Zoho Admin Console.
7. Configure the Zoho-generated SPF and DKIM records.
8. Add or review DMARC after SPF and DKIM validate.
9. Create admin@juantzun.dev as the primary mailbox.
10. Add reservas@juantzun.dev and reservations@juantzun.dev as aliases.
11. Confirm each alias appears in the Zoho `From` selector.
12. Create folders or filters based on To/Cc for Spanish, English, and admin mail.
13. Install the Zoho Mail mobile application and enable multi-factor authentication.
14. Send and receive controlled tests through all three addresses.
15. Confirm mail.trp-booking.juantzun.dev remains verified and functional in Resend.
```

### Production organization setup

Repeat the same process later in a separate company-owned Zoho organization using:

```text
turefugioperfecto.com
admin@turefugioperfecto.com
reservas@turefugioperfecto.com
reservations@turefugioperfecto.com
```

No personal/test Zoho credential, OAuth client, recovery address, or API token may be
reused in production.

## Mobile and IMAP Decision

The approved mobile client is the official Zoho Mail application.

```text
- No IMAP configuration is required in the Zoho Mail mobile application.
- IMAP remains available in Mail Lite for optional third-party email clients.
- TRP Booking must not connect to Zoho using IMAP username/password credentials.
- Application-specific passwords, when required by a third-party client with MFA,
  remain client credentials and must never be committed to TRP Booking.
```

IMAP synchronizes mailbox contents for email clients. It is not the approved server
integration mechanism for reservation navigation.

## TRP-to-Zoho Navigation Strategy

The desired protected reservation action is:

```text
Open guest conversation
```

Its input is the current reservation guest email and, when available, a previously
validated Zoho thread identifier. The action must never expose mailbox credentials or
email content to the browser.

Implementation priority:

```text
1. Prefer an official stable Zoho deep link or provider-supported thread navigation.
2. If no stable deep link exists, open Zoho Mail and provide the normalized guest
   email as the search value through a safe supported mechanism.
3. If exact navigation cannot be achieved without provider API access, evaluate a
   server-side read-only OAuth search integration.
4. Do not scrape Zoho HTML, construct undocumented internal URLs, or store mailbox
   passwords.
```

A general mailbox link plus a visible/copyable guest email is the accepted fallback.
An exact thread link is desirable but must not be implemented through undocumented
provider behavior.

## Zoho API and OAuth Boundary

There is no generic Zoho Mail API key for the planned application integration.
Zoho Mail REST APIs use OAuth 2.0.

If F.4 requires server-side search, the integration must use a server-based OAuth
application with Authorization Code Flow and offline access.

Minimum candidate read-only permissions:

```text
ZohoMail.accounts.READ
ZohoMail.messages.READ
```

Expected non-secret identifiers and secret material:

```text
Non-secret runtime metadata
- Zoho data center / accounts-server location
- Zoho Mail API base URL
- Zoho mailbox accountId

Secrets
- OAuth client ID
- OAuth client secret
- OAuth refresh token
```

Exact environment-variable names are deferred until the F.4 provider-discovery step.
Do not create unused credentials during F.2.

Security rules:

```text
- Separate OAuth clients and refresh tokens for test and production.
- Store secrets only in local ignored environment files or deployment secret storage.
- Never persist access tokens, refresh tokens, passwords, message bodies, attachment
  bytes, or raw OAuth responses in application tables.
- Request read-only scopes only; no message send, reply, delete, move, flag, or admin
  scopes are approved.
- Refresh access tokens server-side only.
- Respect the Zoho data center returned during authorization.
- Disable the integration cleanly when Zoho OAuth is not configured.
```

The Zoho API may search messages and return thread identifiers, but Package F does
not authorize displaying or persisting message bodies inside TRP Booking.

## Persistence Decision

No new email-conversation persistence is approved in F.1.

Do not add:

```text
EmailThread
EmailMessage
EmailAttachment
InboundEmailEvent
ReservationEmailConversation
```

A minimal reservation-to-provider identifier may be proposed later only if:

```text
- Zoho exposes a stable thread identifier or official permalink suitable for the
  protected admin workflow.
- Search alone is insufficient.
- The record stores no body, headers, attachments, recipients, or OAuth secrets.
- Optimistic concurrency and audit requirements are defined.
- The owner explicitly approves the migration before implementation.
```

## Reservation Detail Contract

The protected reservation detail keeps its existing transactional email section.

Package F may add a separate action or card that includes:

```text
- Guest email address.
- Expected correspondence mailbox based on locale or the selected address.
- Open guest conversation / Search in Zoho Mail action.
- Safe fallback instructions when no exact conversation can be resolved.
```

The action must not imply that TRP Booking has ingested, synchronized, or verified the
contents of the external mailbox.

## Revised Package F Subpackages

```text
F.1 Strategy, provider boundary, and environment contract
    Status: Completed and accepted on 2026-08-06

F.2 Test Zoho Mail setup and DNS validation
    Status: In progress — owner-assisted operational setup and evidence collection
    Scope: configure juantzun.dev, mailbox, aliases, filters, mobile access, MFA,
    DNS authentication, and controlled send/receive validation

F.3 Transactional Reply-To alignment
    Status: Not started
    Scope: route local/test Resend replies to juantzun.dev Zoho aliases and preserve
    production Reply-To values for the separate future company account

F.4 Reservation-to-Zoho navigation
    Status: Not started
    Scope: add the protected reservation action using an official deep link, safe
    search handoff, or separately validated read-only OAuth search

F.5 Integrated validation and documentation closure
    Status: Not started
    Scope: verify separation, aliases, sender identity, mobile behavior, transactional
    history preservation, navigation, secrets, ES/EN copy, and Phase 12 gate evidence
```

## Explicit Non-Goals

```text
- No /admin/emails mailbox clone.
- No inbound Resend receiving domain or webhook.
- No full inbox or sent-message synchronization.
- No stored human message body, HTML, headers, attachment bytes, or search index.
- No application-owned email threading or reply composer.
- No IMAP connection from TRP Booking.
- No Zoho password or application-specific password in TRP Booking.
- No Zoho API send/reply/delete/move/flag operations.
- No shared-inbox assignment, tags, SLA, automation, marketing, newsletter, CRM, AI,
  or PMS behavior.
- No removal of the existing reservation transactional notification section.
```

## F.1 Acceptance Matrix

```text
1. EmailNotification remains the transactional source of truth — PASS
2. Reservation transactional email history remains in place — PASS
3. Human correspondence moves to Zoho Mail Lite — PASS
4. Resend remains automatic-delivery-only — PASS
5. Test and production Zoho organizations are isolated — PASS
6. Test domain juantzun.dev and production domain turefugioperfecto.com are explicit — PASS
7. One primary mailbox plus Spanish/English aliases is approved — PASS
8. Reply-from-the-address-received policy is explicit — PASS
9. Root-domain Zoho MX and Resend sending-subdomain DNS are separated — PASS
10. Zoho Mail mobile application is the approved mobile client — PASS
11. IMAP is excluded from TRP application integration — PASS
12. Optional application integration uses server-side read-only OAuth only — PASS
13. No inbound webhook, email body persistence, or mailbox clone is approved — PASS
14. Reservation navigation uses official provider behavior with a safe fallback — PASS
15. Revised F.1 through F.5 implementation sequence is approved — PASS
16. No application code, schema, migration, dependency, or secret was added — PASS
```

## Validation Gate

This is a documentation-only strategy package.

```text
- AGENTS.md reviewed.
- docs/10-phases.md reviewed.
- docs/11-progress-log.md reviewed.
- docs/85-email-notification-strategy-and-phase-10-roadmap.md reviewed.
- docs/89-test-and-production-environment-strategy.md reviewed.
- prisma/schema.prisma EmailNotification contract reviewed.
- Latest repository head verified at cab7d71e34d230cdf49e013921764f6386d3fa2f.
- Official Zoho domain, alias, IMAP, REST API, search, and OAuth documentation reviewed.
- No application code changed.
- No Prisma schema or migration changed.
- No dependency changed.
- No environment variable or credential added.
- No DNS record changed by this documentation package.
- No email sent.
- No Phase 12 or PMS behavior activated.
```

## Official Provider References Reviewed

```text
Zoho custom-domain setup:
https://www.zoho.com/mail/help/adminconsole/add-domains.html

Zoho aliases and From selection:
https://www.zoho.com/mail/help/adminconsole/user-settings.html

Zoho IMAP access:
https://www.zoho.com/mail/help/imap-access.html

Zoho Mail REST API index:
https://www.zoho.com/mail/help/api/

Zoho message search API:
https://www.zoho.com/mail/help/api/get-search-emails.html

Zoho server-based OAuth applications:
https://www.zoho.com/developer/oauth/web-server-apps/overview.html
```

## Handoff to F.2

Package F.1 is completed and accepted. Package F.2 is now in progress as an owner-assisted operational setup; no TRP application implementation has started.

F.2 follows `docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md`. It must capture the real Zoho data center, exact generated public DNS records, mailbox and alias validation, reply-from-the-received-address behavior, mobile access, MFA, filters, and controlled send/receive evidence without recording any password, DKIM private material, OAuth secret, recovery code, or mailbox content in the repository.
