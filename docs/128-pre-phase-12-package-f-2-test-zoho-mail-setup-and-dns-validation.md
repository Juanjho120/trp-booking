# 128 — Pre-Phase-12 Package F.2 Test Zoho Mail Setup and DNS Validation

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.2 Test Zoho Mail setup and DNS validation
Status: In progress — owner-assisted operational setup and evidence collection
Start date: 2026-08-06
Base head: f9a18cc555ca8eb28fd7f450d746e98e4e66622b
Strategy record: docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md
Previous subpackage: F.1 Strategy, provider boundary, and environment contract
Next subpackage after acceptance: F.3 Transactional Reply-To alignment
Phase 12: Not started and not activated
```

## Goal

Configure and validate the isolated local/test Zoho Mail Lite organization for
`juantzun.dev` without changing TRP Booking application code or production email
infrastructure.

F.2 establishes the human-correspondence mailbox used during local and stable test
work:

```text
Primary mailbox: admin@juantzun.dev
Spanish alias: reservas@juantzun.dev
English alias: reservations@juantzun.dev
Approved mobile client: Zoho Mail mobile application
Human email provider: Zoho Mail Lite
Automatic email provider: Resend, unchanged
```

## Scope Boundary

F.2 is provider and DNS configuration only.

Included:

```text
- Create or activate the separate personal/test Zoho Mail organization.
- Add and verify juantzun.dev.
- Capture a safe before-change DNS inventory.
- Configure the exact Zoho MX records shown for the selected data center.
- Configure one valid root-domain SPF record.
- Generate, publish, verify, and enable a Zoho DKIM selector.
- Publish an initial monitoring DMARC policy after SPF and DKIM pass.
- Create admin@juantzun.dev.
- Add reservas@juantzun.dev and reservations@juantzun.dev as aliases.
- Configure reply-from-the-address-received behavior.
- Configure folders and incoming filters for the three addresses.
- Configure display names and optional per-alias signatures.
- Install the Zoho Mail mobile application.
- Enable MFA and preserve recovery material outside the repository.
- Run controlled external send, receive, reply, alias, mobile, and DNS tests.
- Confirm the independent Resend sending subdomain remains working.
```

Excluded:

```text
- No TRP Booking application code.
- No Prisma schema or migration.
- No dependency or environment-variable change.
- No Zoho OAuth client, refresh token, API integration, or API scope.
- No IMAP/SMTP credential in TRP Booking.
- No production Zoho organization or turefugioperfecto.com DNS change.
- No Resend Receiving, inbound webhook, mailbox synchronization, or stored message.
- No change to EmailNotification or reservation transactional history.
- No change to the existing mail.trp-booking.juantzun.dev Resend records.
```

## Security and Evidence Rules

The following must never be committed, pasted into a ticket, or included in a ZIP:

```text
- Zoho password.
- MFA seed or one-time code.
- Recovery code.
- Session cookie.
- Application-specific password.
- OAuth client secret or refresh token.
- DKIM private key.
- Raw email body, attachment, or guest correspondence.
- Personal recovery email or telephone number unless intentionally redacted.
```

The following values are public DNS or non-secret operational metadata and may be
recorded after configuration:

```text
- Zoho data center/region.
- Domain verification method and status.
- MX hosts and priorities.
- SPF TXT value.
- DKIM selector and public TXT value.
- DMARC TXT value.
- Mailbox and alias addresses.
- Filter names and conditions.
- Dates and PASS/FAIL outcomes of controlled tests.
```

Screenshots used for troubleshooting must redact account identifiers, recovery data,
billing details, mailbox content, and any token-like value that is not a public DNS
record.

## Required Access

Before starting, the owner must have:

```text
- Access to the Zoho Mail test organization or ability to create it.
- Access to the authoritative DNS manager for juantzun.dev.
- Access to the Resend test account for verification only.
- An external mailbox not hosted in the new Zoho organization for round-trip tests.
- A mobile device for Zoho Mail application and MFA validation.
```

The authoritative DNS manager is the provider to which the current nameservers point.
Adding records at the registrar has no effect when authoritative nameservers point
somewhere else.

## Stage 0 — Before-Change DNS Inventory

Do not change MX, SPF, DKIM, or DMARC until the current root-domain records have been
captured.

Record the following from the authoritative DNS manager:

```text
Nameservers
- Current authoritative nameservers

Root juantzun.dev
- Existing MX records and priorities
- Existing TXT records beginning with v=spf1
- Existing _dmarc TXT record
- Existing DKIM selectors, if known
- Whether Cloudflare Email Routing or another forwarding service is enabled

Resend test sending subdomain
- Existing records under mail.trp-booking.juantzun.dev
- Existing send.mail.trp-booking.juantzun.dev records
- Existing resend._domainkey.mail.trp-booking.juantzun.dev record
```

Safety rules:

```text
- Export or capture the current DNS state before editing.
- Do not edit nameservers.
- Do not edit website A, AAAA, CNAME, Vercel, Cloudinary, or unrelated TXT records.
- Do not delete Resend records under mail.trp-booking.juantzun.dev.
- If Cloudflare Email Routing is active on the root domain, disable or migrate it
  deliberately before installing Zoho MX records; it manages competing root MX data.
- Do not create two SPF records on the same hostname.
```

## Stage 1 — Create the Test Zoho Mail Organization

Use a personal/test Zoho organization that will never become the production Tu
Refugio Perfecto organization.

```text
Plan: Zoho Mail Lite
Hosted domain: juantzun.dev
Organization purpose: TRP Booking local/test guest correspondence
Production use: Forbidden
```

Record only:

```text
Zoho data center/region: ____________________
Organization created/activated date: ____________________
Plan confirmed: ____________________
```

Do not place the billing account, login identifier, recovery email, telephone number,
or password in repository documentation.

## Stage 2 — Add and Verify juantzun.dev

Use manual TXT verification as the default F.2 method. This avoids granting automated
DNS changes and produces a clear audit trail even when Zoho offers Domain Connect.

Zoho Admin Console path:

```text
Domains
-> Add
-> juantzun.dev
-> Verify Domain Ownership
-> Add a TXT record in DNS
```

Cloudflare-style DNS entry:

```text
Type: TXT
Name: @
Content: exact zoho-verification=... value generated for juantzun.dev
TTL: Auto or the provider's recommended low value
```

Rules:

```text
- Copy the value from the current test organization only.
- Do not reuse a verification value from another domain or Zoho account.
- Do not add quotation marks manually unless the DNS UI requires them.
- Wait for public propagation, then select Verify TXT Record in Zoho.
- After successful verification, remove the temporary verification TXT only if Zoho
  explicitly indicates it is no longer required.
```

Evidence:

```text
Verification method: TXT
Verification status: ____________________
Verification date: ____________________
Temporary TXT removed/retained: ____________________
```

## Stage 3 — Create the Primary Mailbox

Create exactly one paid mailbox for the current one-owner operation:

```text
admin@juantzun.dev
```

Recommended public display name:

```text
Tu Refugio Perfecto Test
```

This mailbox is the administrative identity and the physical inbox that also receives
messages sent to the Spanish and English aliases.

Acceptance checks:

```text
- admin@juantzun.dev appears as an active user/mailbox.
- Webmail login succeeds.
- Inbox and Sent folders are available.
- No production domain or production recovery credential is attached.
```

## Stage 4 — Configure Root MX Records

Configure only the exact MX values shown under the `juantzun.dev` domain in the Zoho
Admin Console. Zoho MX targets can vary by data center.

Zoho Admin Console path:

```text
Domains
-> juantzun.dev
-> Email Configuration
-> MX
```

DNS rules:

```text
- Host/name is the root (@) unless Zoho explicitly shows another value.
- Copy every target and priority exactly.
- Remove or disable prior root mailbox-provider MX records after the before-change
  inventory confirms they are no longer required.
- Do not mix Zoho root MX records with Cloudflare Email Routing, Google Workspace,
  Microsoft 365, or another mailbox provider.
- Do not alter Resend subdomain records.
- MX records are DNS records and must not be proxied.
```

Record the exact public values:

| Priority | MX target | Zoho status | Public lookup |
| --- | --- | --- | --- |
| `_____` | `____________________` | `_____` | `_____` |
| `_____` | `____________________` | `_____` | `_____` |
| `_____` | `____________________` | `_____` | `_____` |

Acceptance checks:

```text
- Zoho Admin Console reports MX verified.
- Public MX lookup returns only the intended Zoho receivers for juantzun.dev.
- No lower-priority-number competing MX remains.
- An external mailbox can deliver to admin@juantzun.dev.
```

## Stage 5 — Configure Root SPF

There must be one SPF TXT record for `juantzun.dev`.

Zoho commonly documents a value similar to:

```text
v=spf1 include:zohomail.com -all
```

The exact value displayed for the organization and all legitimate root-domain senders
must be reviewed before publishing. The example is not a substitute for the current
Zoho Admin Console value.

Rules:

```text
- If no root SPF exists and Zoho is the only sender for @juantzun.dev, publish the
  exact Zoho value.
- If a root SPF already exists, merge legitimate mechanisms into one record rather
  than adding a second v=spf1 TXT record.
- Resend sends from mail.trp-booking.juantzun.dev, so its SPF remains on that separate
  hostname and is not copied into the root SPF unless a separate approved sender
  actually uses @juantzun.dev.
- Verify the final record in Zoho and through a public SPF lookup.
```

Evidence:

```text
Root SPF before change: ____________________
Root SPF after change: ____________________
Zoho SPF status: ____________________
Public SPF lookup: ____________________
```

## Stage 6 — Configure DKIM

Generate a unique Zoho DKIM public key for `juantzun.dev`.

Recommended selector:

```text
trptest2026
```

Recommended key length:

```text
2048 bits
```

Zoho Admin Console path:

```text
Domains
-> juantzun.dev
-> Email Configuration
-> DKIM
-> Add selector
```

DNS record shape:

```text
Type: TXT
Name: trptest2026._domainkey
Content: exact public DKIM value generated by Zoho
TTL: Auto
```

Rules:

```text
- The published TXT value is the public key; Zoho retains the private signing key.
- Never export or record a private DKIM key.
- After DNS propagation, select Verify in Zoho.
- Make the verified selector the active/default selector for the domain.
- Send an external test and confirm DKIM=pass in the receiving mailbox headers.
```

Evidence:

```text
Selector: ____________________
Key length: ____________________
Zoho DKIM verification: ____________________
Selector enabled/default: ____________________
External header result: ____________________
```

## Stage 7 — Publish Staged DMARC

Do not publish an enforcing DMARC policy before SPF and DKIM pass.

Initial test-domain monitoring policy:

```text
v=DMARC1; p=none; pct=100; adkim=r; aspf=r
```

DNS entry:

```text
Type: TXT
Name: _dmarc
Content: approved monitoring policy
TTL: Auto
```

An aggregate-report address may be added later after deciding where XML reports will
be reviewed. It is not required for F.2 acceptance.

Rules:

```text
- Confirm no existing _dmarc record before adding one.
- Publish only one DMARC record for the root domain.
- Keep p=none during F.2 to observe alignment without rejecting mail.
- Do not move to quarantine or reject until all legitimate root-domain senders are
  inventoried and test evidence passes.
```

Evidence:

```text
DMARC before change: ____________________
DMARC after change: ____________________
Public DMARC lookup: ____________________
```

## Stage 8 — Add Spanish and English Aliases

Zoho Admin Console path:

```text
Users
-> admin@juantzun.dev
-> Mailbox Settings
-> Email Alias
-> Add
```

Create:

```text
reservas@juantzun.dev
reservations@juantzun.dev
```

Do not change either alias into the primary mailbox address.

Acceptance checks:

```text
- Email sent to reservas@ arrives in the admin@ inbox.
- Email sent to reservations@ arrives in the admin@ inbox.
- Both aliases appear in the From selector in webmail.
- Both aliases appear in the From selector in the Zoho Mail mobile application.
- Outgoing mail can be sent directly from each alias.
```

## Stage 9 — Enforce Reply From the Address That Received the Message

Zoho Mail user settings path:

```text
Settings
-> Mail
-> Compose settings
-> For replies, send using
-> Same email address to which the email was sent to
```

This setting implements the accepted human sender policy:

```text
Received at reservas@juantzun.dev
-> reply from reservas@juantzun.dev

Received at reservations@juantzun.dev
-> reply from reservations@juantzun.dev

Received at admin@juantzun.dev
-> reply from admin@juantzun.dev
```

The From field must still be visually checked before sending sensitive or guest-facing
mail, especially in the mobile application.

## Stage 10 — Configure Display Names and Signatures

Recommended display names:

```text
admin@juantzun.dev
Tu Refugio Perfecto Test

reservas@juantzun.dev
Tu Refugio Perfecto Test

reservations@juantzun.dev
Tu Refugio Perfecto Test
```

Optional per-alias signatures may be created and associated with both new messages and
replies:

```text
reservas@ -> Spanish signature
reservations@ -> English signature
admin@ -> Administrative signature
```

Do not include production telephone numbers, addresses, legal claims, or support hours
that have not been approved.

## Stage 11 — Create Folders and Incoming Filters

Create folders:

```text
Reservas ES
Reservations EN
Administración
```

Create incoming filters using the `To/Cc` condition:

```text
Filter: Reservas ES
Condition: To/Cc contains reservas@juantzun.dev
Action: Move to folder Reservas ES
Stop processing other filters: Enabled

Filter: Reservations EN
Condition: To/Cc contains reservations@juantzun.dev
Action: Move to folder Reservations EN
Stop processing other filters: Enabled

Filter: Administración
Condition: To/Cc contains admin@juantzun.dev
Action: Move to folder Administración
Stop processing other filters: Enabled
```

Test the filter order and behavior. A message addressed to more than one alias must not
be silently lost; it should land in the first intentionally matched folder or remain
searchable in All Messages.

## Stage 12 — Mobile Application and MFA

Install the official Zoho Mail application and sign in to the test organization.

Configure MFA using Zoho OneAuth or another supported authenticator method.

Rules:

```text
- Store recovery codes in a private password manager or offline secure location.
- Do not store recovery codes in the repository, notes committed to Git, screenshots,
  or TRP Booking environment variables.
- Confirm the mobile application displays all three From addresses.
- Confirm reply-from-the-received-address behavior on mobile.
- Confirm notifications do not expose sensitive message previews on a locked device
  if that is not desired.
```

IMAP is not required for the official Zoho Mail application and remains outside the
TRP Booking integration.

## Stage 13 — Controlled Functional Matrix

Use an external mailbox that is not part of the new Zoho organization.

| # | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| 1 | External -> admin@ | Arrives in Administración | `_____` |
| 2 | External -> reservas@ | Arrives in Reservas ES | `_____` |
| 3 | External -> reservations@ | Arrives in Reservations EN | `_____` |
| 4 | Reply to admin@ message | From is admin@ | `_____` |
| 5 | Reply to reservas@ message | From is reservas@ | `_____` |
| 6 | Reply to reservations@ message | From is reservations@ | `_____` |
| 7 | New message from admin@ | Recipient sees admin@ | `_____` |
| 8 | New message from reservas@ | Recipient sees reservas@ | `_____` |
| 9 | New message from reservations@ | Recipient sees reservations@ | `_____` |
| 10 | Webmail From selector | All three addresses available | `_____` |
| 11 | Mobile From selector | All three addresses available | `_____` |
| 12 | Mobile reply policy | Uses address originally received | `_____` |
| 13 | SPF header | PASS | `_____` |
| 14 | DKIM header | PASS | `_____` |
| 15 | DMARC header | PASS or monitor-aligned | `_____` |
| 16 | Wrong/unknown local part | Rejected or follows explicit catch-all policy | `_____` |
| 17 | Zoho spam classification | Test messages not incorrectly blocked | `_____` |
| 18 | Existing website | juantzun.dev web behavior unchanged | `_____` |
| 19 | Resend sending domain | Existing test transactional send still succeeds | `_____` |
| 20 | Repository boundary | No code, secret, or provider credential added | `_____` |

Do not enable a catch-all address for F.2 unless separately approved. Unknown addresses
should fail rather than silently collecting mistyped or abusive mail.

## Stage 14 — Resend Isolation Regression

F.2 must not modify the accepted automatic-email provider boundary.

Verify:

```text
- mail.trp-booking.juantzun.dev remains verified in the personal test Resend account.
- Its SPF/DKIM/return-path records remain present.
- EMAIL_FROM_ES remains under mail.trp-booking.juantzun.dev.
- EMAIL_FROM_EN remains under mail.trp-booking.juantzun.dev.
- EMAIL_DELIVERY_MODE=test still redirects actual delivery to EMAIL_TEST_RECIPIENT.
- EmailNotification persistence, retries, and reservation history remain unchanged.
```

A controlled transactional email may be sent using an already accepted local/test
flow. F.2 does not change application environment values; F.3 will align Reply-To with
the newly validated Zoho aliases.

## DNS Evidence Worksheet

Complete only with public or non-secret values.

```text
Authoritative DNS provider: ____________________
Nameservers reviewed: PASS / FAIL
Before-change inventory captured: PASS / FAIL
Cloudflare Email Routing enabled before change: YES / NO / NOT APPLICABLE
Cloudflare Email Routing disabled or intentionally migrated: PASS / NOT APPLICABLE

Zoho data center/region: ____________________
Domain verified: PASS / FAIL
MX verified in Zoho: PASS / FAIL
SPF verified in Zoho: PASS / FAIL
DKIM verified and enabled in Zoho: PASS / FAIL
DMARC published in monitoring mode: PASS / FAIL

Primary mailbox active: PASS / FAIL
Spanish alias active: PASS / FAIL
English alias active: PASS / FAIL
Webmail tests: PASS / FAIL
Mobile tests: PASS / FAIL
MFA enabled: PASS / FAIL
Reply-from-received-address policy: PASS / FAIL
Filters: PASS / FAIL
Resend isolation regression: PASS / FAIL
```

## Acceptance Gate

F.2 may be marked completed and accepted only after:

```text
1. The isolated test Zoho Mail Lite organization is active.
2. juantzun.dev ownership is verified.
3. Root MX public lookup and Zoho status are correct.
4. Exactly one valid root SPF record exists and passes.
5. Zoho DKIM is verified, enabled, and passes an external header check.
6. Initial DMARC monitoring policy is published after SPF/DKIM validation.
7. admin@juantzun.dev sends and receives.
8. reservas@juantzun.dev sends and receives through the same mailbox.
9. reservations@juantzun.dev sends and receives through the same mailbox.
10. Replies use the same address that received the message.
11. Webmail folders and filters behave as documented.
12. Zoho Mail mobile access and From selection pass.
13. MFA is enabled and recovery material is stored outside the repository.
14. The existing Resend test sending subdomain remains verified and functional.
15. No code, schema, migration, dependency, OAuth client, IMAP credential, production
    configuration, or secret was added.
16. The controlled functional matrix and DNS worksheet are recorded without mailbox
    content or private security material.
```

## Validation Commands

F.2 has no application-code change, so build or Prisma commands are not required for
provider setup. The documentation delivery must still pass:

```powershell
git diff --check
git status --short
```

After copying the documentation files, verify that only the expected Markdown files
are modified or added.

## Official References

```text
Zoho domain verification:
https://www.zoho.com/mail/help/adminconsole/domain-verification.html

Zoho MX configuration:
https://www.zoho.com/mail/help/adminconsole/configure-email-delivery.html

Zoho SPF configuration:
https://www.zoho.com/mail/help/adminconsole/spf-configuration.html

Zoho DKIM configuration:
https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html

Zoho DMARC policy:
https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html

Zoho email aliases:
https://www.zoho.com/mail/how-to/create-email-alias.html

Zoho reply From preference:
https://www.zoho.com/mail/help/compose.html

Zoho incoming filters:
https://www.zoho.com/mail/help/incoming-filters.html

Zoho mobile access:
https://www.zoho.com/mail/help/access-from-mobile.html

Zoho two-factor authentication:
https://www.zoho.com/mail/help/adminconsole/two-factor-authentication.html

Cloudflare email DNS records:
https://developers.cloudflare.com/dns/manage-dns-records/how-to/email-records/
```

## Handoff

F.2 remains in progress until the owner completes the real Zoho and DNS setup and
reports the non-secret evidence matrix. Do not start F.3 before F.2 is accepted.

The first operational action is to create or activate the separate test Zoho Mail Lite
organization, add `juantzun.dev`, and copy the generated domain-verification TXT value.
Only the record type, host/name, and public value may be shared for guided DNS review;
no password, MFA code, recovery code, or session information is needed.
