# 129 — Pre-Phase-12 Package F.2 Acceptance Closure

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.2 Test Zoho Mail setup and DNS validation
Status: Completed and accepted
Acceptance date: 2026-08-07
Operational-validation repository head: 912cf1f79850517d19f73fa7f531c0492a7b429c
Strategy record: docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md
Operational runbook: docs/128-pre-phase-12-package-f-2-test-zoho-mail-setup-and-dns-validation.md
Next package: F.3 Transactional Reply-To alignment
Phase 12: Not started and not activated
```

## Acceptance Decision

Package F.2 is accepted. The isolated local/test human-correspondence provider is now
operational on Zoho Mail Lite for `juantzun.dev`, while the existing automatic Resend
sending domain remains isolated under `mail.trp-booking.juantzun.dev`.

No TRP Booking application code, Prisma schema, migration, dependency, OAuth client,
IMAP credential, production Zoho organization, production DNS record, or mailbox
content was added by F.2.

## Accepted Mailbox Contract

```text
Primary mailbox: admin@juantzun.dev
Spanish guest alias: reservas@juantzun.dev
English guest alias: reservations@juantzun.dev
DMARC aggregate alias: dmarc@juantzun.dev
DMARC forensic alias: dmarc-forensic@juantzun.dev
Mobile client: official Zoho Mail application
MFA: enabled
```

The three public sender identities are available from webmail and mobile. Replies are
configured to use the address to which the original message was sent.

## Accepted DNS and Authentication Result

```text
Authoritative DNS provider: Cloudflare
Root-domain mailbox provider: Zoho Mail Lite
Root MX: verified by Zoho
Root SPF: one valid Zoho-authorizing record; verified
DKIM selector: zmail
DKIM: verified, enabled, default
DMARC: monitoring mode (p=none)
Subdomain DMARC policy: none
SPF alignment: relaxed
DKIM alignment: relaxed
External SPF result: PASS
External DKIM result: PASS
External DMARC result: PASS
```

The Zoho onboarding generated `zmail` automatically. The onboarding flow did not
expose manual selector/key-length selection, so the provider-generated selector was
accepted after verified/enabled/default status and a real external DKIM PASS. The
full DKIM public key and domain-verification token are intentionally not duplicated in
this closure record. No private DKIM material was exposed.

The DMARC aggregate and forensic addresses route to dedicated folders through Zoho
incoming filters. Policy remains `p=none`; no quarantine/reject escalation is approved
by this package.

## Resend Isolation

The before-change DNS review identified technical records on separate hostnames,
including `mail.trp-booking.juantzun.dev` and `send.mail.trp-booking.juantzun.dev`.
Those records were retained. Zoho mailbox MX records were added only at the root
`juantzun.dev` hostname.

F.2 changed no application email environment value. At the accepted repository head,
local/test transactional From and Reply-To values still use the technical Resend
sending domain. This is intentional: F.3 owns the Reply-To alignment and the next real
Resend delivery-and-reply regression.

## Folder and Filter Decision

The initial runbook proposed separate folders for Spanish, English, and administrative
human mail. The accepted setup keeps human correspondence in Zoho's normal mailbox so
conversation threading and search remain provider-owned. Automatic filing is limited
to authentication telemetry:

```text
dmarc@juantzun.dev
-> DMARC Reports

dmarc-forensic@juantzun.dev
-> DMARC Forensic
```

Both filters were configured and validated.

## Functional Acceptance Matrix

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Isolated test Zoho organization active | PASS |
| 2 | `juantzun.dev` ownership verified | PASS |
| 3 | Root MX verified | PASS |
| 4 | Single root SPF verified | PASS |
| 5 | DKIM verified, enabled/default, external header PASS | PASS |
| 6 | DMARC monitoring policy verified, external header PASS | PASS |
| 7 | External -> `admin@juantzun.dev` | PASS |
| 8 | External -> `reservas@juantzun.dev` | PASS |
| 9 | External -> `reservations@juantzun.dev` | PASS |
| 10 | Reply from `admin@` uses `admin@` | PASS |
| 11 | Reply from `reservas@` uses `reservas@` | PASS |
| 12 | Reply from `reservations@` uses `reservations@` | PASS |
| 13 | New outbound message from each public identity | PASS |
| 14 | Web From selector exposes all three public identities | PASS |
| 15 | Mobile From selector and same-address reply policy | PASS |
| 16 | MFA enabled; recovery material excluded from repository | PASS |
| 17 | DMARC Reports / DMARC Forensic filters | PASS |
| 18 | Resend technical DNS hostnames retained unchanged | PASS |
| 19 | No production Zoho/DNS configuration introduced | PASS |
| 20 | No application code/schema/dependency/credential introduced | PASS |

## Security Closure

The repository does not contain:

```text
Zoho password
MFA seed or OTP
Recovery code
Session cookie
Application-specific password
OAuth client secret or refresh token
DKIM private key
Mailbox body or attachment
Personal recovery contact data
```

DMARC remains monitoring-only. Human mailbox content remains entirely provider-owned
and is not synchronized into TRP Booking. `EmailNotification` remains the application
source of truth only for automatic transactional notification history.

## F.3 Starting Contract

F.3 — Transactional Reply-To alignment is the next package.

Current repository values intentionally still show:

```text
EMAIL_FROM_ES=Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>
EMAIL_FROM_EN=Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>
EMAIL_REPLY_TO_ES=reservas@mail.trp-booking.juantzun.dev
EMAIL_REPLY_TO_EN=reservations@mail.trp-booking.juantzun.dev
```

F.3 must preserve the two `EMAIL_FROM_*` technical Resend identities and align only the
local/test Reply-To destinations to:

```text
EMAIL_REPLY_TO_ES=reservas@juantzun.dev
EMAIL_REPLY_TO_EN=reservations@juantzun.dev
```

Future production values remain isolated under `turefugioperfecto.com`. F.3 must not
introduce Zoho inbound synchronization, mailbox persistence, IMAP credentials, or
production Zoho configuration.

## F.3 Required Regression

After the Reply-To change, execute a real automatic transactional email in local/test
and verify:

```text
1. Resend delivery still succeeds.
2. From remains under mail.trp-booking.juantzun.dev.
3. Reply-To points to the matching juantzun.dev Zoho alias.
4. A human reply reaches Zoho.
5. A Zoho response uses the same public alias.
6. SPF/DKIM/DMARC remain acceptable for the automatic and human legs.
7. EmailNotification persistence/retry/history behavior is unchanged.
```

## Phase 12 Gate

Phase 12 remains `Not started`. Package F is still in progress because F.3, F.4, and
F.5 remain. Completing F.2 does not activate production readiness.
