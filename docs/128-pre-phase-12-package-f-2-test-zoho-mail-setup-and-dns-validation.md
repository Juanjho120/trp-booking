# 128 — Pre-Phase-12 Package F.2 Test Zoho Mail Setup and DNS Validation

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.2 Test Zoho Mail setup and DNS validation
Status: Completed and accepted
Start date: 2026-08-06
Acceptance date: 2026-08-07
Base head: f9a18cc555ca8eb28fd7f450d746e98e4e66622b
Operational-validation repository head: 912cf1f79850517d19f73fa7f531c0492a7b429c
Strategy record: docs/127-pre-phase-12-package-f-zoho-guest-correspondence-strategy.md
Closure record: docs/129-pre-phase-12-package-f-2-acceptance-closure.md
Previous subpackage: F.1 Strategy, provider boundary, and environment contract
Next subpackage: F.3 Transactional Reply-To alignment
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

## Accepted Operational Result

F.2 was completed through the real Zoho onboarding and validated on 2026-08-07.

```text
Authoritative DNS provider: Cloudflare
Hosted test domain: juantzun.dev
Primary mailbox: admin@juantzun.dev
Spanish alias: reservas@juantzun.dev
English alias: reservations@juantzun.dev
Zoho root MX: Verified
Root SPF: Verified; one root SPF record
DKIM selector: zmail
DKIM state: Verified, Enabled, Default
External DKIM result: PASS
DMARC policy: Monitoring (p=none), relaxed SPF/DKIM alignment, sp=none
DMARC aggregate address: dmarc@juantzun.dev
DMARC forensic address: dmarc-forensic@juantzun.dev
Reply-from-received-address behavior: Enabled and validated
Web From selector: admin@, reservas@, reservations@ available
Mobile From/reply behavior: PASS
MFA: Enabled
DMARC folders/filters: PASS
External SPF result: PASS
External DMARC result: PASS
Production Zoho/DNS change: None
TRP application/schema/dependency change: None
Zoho OAuth/IMAP credential: None
Resend sending-subdomain DNS change: None
```

Zoho's initial onboarding generated the `zmail` DKIM selector automatically and did
not expose selector-name or key-length selection during that flow. F.2 accepts the
provider-generated selector because it is verified, enabled/default, and produced an
external `DKIM=PASS`. A future selector rotation may use 2048-bit RSA as an optional
hardening task; it is not a blocker for the accepted test setup. The full DKIM public
key is intentionally not duplicated in repository documentation.

The initial runbook proposed language/admin folders for human mail. The accepted
operational configuration keeps human conversations in the normal shared mailbox so
Zoho threading/search remain authoritative and auto-files only DMARC telemetry into
`DMARC Reports` and `DMARC Forensic`. This is the accepted F.2 folder/filter behavior.

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
Zoho data center/region label: Not separately recorded; exact onboarding DNS values used
Organization created/activated date: 2026-08-07
Plan confirmed: Zoho Mail Lite
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
Verification status: PASS
Verification date: 2026-08-07
Temporary TXT: retained in DNS; token not duplicated in repository documentation
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
| `10` | `mx.zoho.com` | `Verified` | `External delivery PASS` |
| `20` | `mx2.zoho.com` | `Verified` | `External delivery PASS` |
| `50` | `mx3.zoho.com` | `Verified` | `External delivery PASS` |

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
Root SPF before change: none at juantzun.dev
Root SPF after change: one Zoho-authorizing root SPF record
Zoho SPF status: PASS
External header result: SPF=PASS
```

## Stage 6 — Configure DKIM

The initial runbook preferred a manually generated 2048-bit selector when the provider
UI allowed it. During the real Zoho onboarding, the provider automatically generated:

```text
Selector: zmail
Host shape: zmail._domainkey
```

The onboarding did not expose selector-name or key-length controls. The accepted F.2
rule is therefore provider-observed rather than speculative:

```text
- Publish the exact public DKIM TXT value generated by Zoho.
- Never export or record a private DKIM key.
- Verify the selector in Zoho.
- Confirm it is Enabled and Default.
- Send an external test and confirm DKIM=PASS in the receiving mailbox headers.
- Do not duplicate the full public key in closure documentation when status and
  selector evidence are sufficient.
```

Accepted evidence:

```text
Selector: zmail
Generation: Zoho onboarding default; no manual selector/key-length choice was offered
Zoho DKIM verification: PASS
Selector enabled/default: PASS
External header result: DKIM=PASS
Repository key material: full DKIM public value not duplicated; private key never exposed
```

A later 2048-bit selector rotation may be evaluated as optional hardening from the full
Admin Console. It is not an F.2 blocker because the provider-generated selector passed
real external authentication.

## Stage 7 — Publish Staged DMARC

DMARC was published only after SPF and DKIM validated. Zoho's onboarding required
both aggregate and forensic report destinations, so dedicated aliases were created:

```text
Aggregate / RUA: dmarc@juantzun.dev
Forensic / RUF: dmarc-forensic@juantzun.dev
Policy: p=none
Subdomain policy: sp=none
DKIM alignment: relaxed
SPF alignment: relaxed
Percentage: 100
```

DNS entry:

```text
Type: TXT
Name: _dmarc
Content: Zoho-generated monitoring policy using the values above
TTL: Auto
```

Rules:

```text
- Confirm no existing _dmarc record before adding one.
- Publish only one DMARC record for the root domain.
- Keep p=none during F.2 to observe alignment without rejecting mail.
- Do not move to quarantine or reject until all legitimate root-domain senders are
  inventoried and test evidence passes.
```

Accepted evidence:

```text
DMARC before change: No root _dmarc record
Policy after change: p=none; sp=none; adkim=r; aspf=r; pct=100
Aggregate reports: dmarc@juantzun.dev
Forensic reports: dmarc-forensic@juantzun.dev
Zoho verification: PASS
External header result: DMARC=PASS
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

The accepted F.2 configuration keeps human guest correspondence in Zoho's normal
mailbox/threading flow and creates dedicated folders only for DMARC telemetry.

Create folders:

```text
DMARC Reports
DMARC Forensic
```

Create incoming filters:

```text
Filter: DMARC Aggregate Reports
Condition: To/Cc contains dmarc@juantzun.dev
Action: Move to folder DMARC Reports
Stop processing other filters: Enabled

Filter: DMARC Forensic Reports
Condition: To/Cc contains dmarc-forensic@juantzun.dev
Action: Move to folder DMARC Forensic
Stop processing other filters: Enabled
```

Acceptance result:

```text
DMARC Reports folder/filter: PASS
DMARC Forensic folder/filter: PASS
Human guest mail remains searchable/threaded in the normal Zoho mailbox: PASS
```

No automatic language/admin folder split is required by the accepted F.2 setup. The
public recipient aliases and same-address reply policy provide the required identity
separation without moving human messages away from Zoho's normal conversation view.

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

The owner completed the real external/web/mobile checks on 2026-08-07. No mailbox
body, guest content, OTP, recovery code, or private credential is retained here.

| # | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| 1 | External -> admin@ | Arrives in Zoho mailbox | `PASS` |
| 2 | External -> reservas@ | Arrives in same Zoho mailbox | `PASS` |
| 3 | External -> reservations@ | Arrives in same Zoho mailbox | `PASS` |
| 4 | Reply to admin@ message | From is admin@ | `PASS` |
| 5 | Reply to reservas@ message | From is reservas@ | `PASS` |
| 6 | Reply to reservations@ message | From is reservations@ | `PASS` |
| 7 | New message from admin@ | Recipient sees admin@ | `PASS` |
| 8 | New message from reservas@ | Recipient sees reservas@ | `PASS` |
| 9 | New message from reservations@ | Recipient sees reservations@ | `PASS` |
| 10 | Webmail From selector | All three public addresses available | `PASS` |
| 11 | Mobile From selector | All three public addresses available | `PASS` |
| 12 | Mobile reply policy | Uses address originally received | `PASS` |
| 13 | SPF header | PASS | `PASS` |
| 14 | DKIM header | PASS | `PASS` |
| 15 | DMARC header | PASS while policy remains p=none | `PASS` |
| 16 | DMARC aggregate filter | Routes to DMARC Reports | `PASS` |
| 17 | DMARC forensic filter | Routes to DMARC Forensic | `PASS` |
| 18 | MFA | Enabled; recovery material kept outside repository | `PASS` |
| 19 | Resend DNS isolation | Existing technical subdomain records not modified | `PASS` |
| 20 | Repository boundary | No code, secret, provider credential, or production config added | `PASS` |

A catch-all was not enabled. DMARC remains in monitoring mode (`p=none`).

## Stage 14 — Resend Isolation Regression

F.2 must not modify the accepted automatic-email provider boundary.

Verify the F.2 isolation boundary without claiming a runtime send that did not occur:

```text
- Existing SPF/DKIM/MX/return-path records for the technical Resend hostnames remain
  present and were not edited during the Zoho root-domain setup.
- Repository EMAIL_FROM_ES remains under mail.trp-booking.juantzun.dev.
- Repository EMAIL_FROM_EN remains under mail.trp-booking.juantzun.dev.
- Repository Reply-To values are intentionally unchanged until F.3.
- EmailNotification persistence, retries, and reservation history code is unchanged.
- F.3 owns the next real Resend delivery-and-reply regression because F.3 changes
  Reply-To.
```

Accepted F.2 isolation result:

```text
- Existing MX/return-path records under mail.trp-booking.juantzun.dev and
  send.mail.trp-booking.juantzun.dev were intentionally retained.
- Root-domain Zoho MX records were added only at juantzun.dev.
- No Resend sending-subdomain DNS record was deleted or replaced.
- No TRP Booking environment value or email-provider code changed in F.2.
```

F.2 does not claim a new Resend runtime send after the Zoho setup because there was no
application change to exercise. F.3 will change the local/test Reply-To values and
therefore owns the controlled transactional send-and-reply regression proving that
Resend still sends from `mail.trp-booking.juantzun.dev` while replies arrive in Zoho.

## DNS Evidence Worksheet

Only public or non-secret operational evidence is retained. The domain-verification
token and full DKIM public key are intentionally not duplicated here.

```text
Authoritative DNS provider: Cloudflare
Nameservers reviewed: PASS
Before-change root MX inventory: PASS — no @ / juantzun.dev MX existed
Existing technical MX inventory: PASS — mail.trp-booking.juantzun.dev and
  send.mail.trp-booking.juantzun.dev records identified and retained
Cloudflare Email Routing at root before change: NO

Zoho data center/region label: Not separately recorded; exact onboarding values used
Domain verified: PASS
Root MX verified in Zoho: PASS
Root SPF verified in Zoho: PASS
DKIM selector: zmail
DKIM verified/enabled/default: PASS
External DKIM header: PASS
DMARC monitoring policy published and verified: PASS
External SPF header: PASS
External DMARC header: PASS

Primary mailbox active: PASS
Spanish alias active: PASS
English alias active: PASS
Webmail tests: PASS
Mobile tests: PASS
MFA enabled: PASS
Reply-from-received-address policy: PASS
DMARC Reports folder/filter: PASS
DMARC Forensic folder/filter: PASS
Resend DNS/config isolation: PASS
```

## Acceptance Gate

F.2 is completed and accepted after the following final gate passed:

```text
1. Isolated test Zoho Mail Lite organization active — PASS
2. juantzun.dev ownership verified — PASS
3. Root MX values accepted and verified by Zoho — PASS
4. Exactly one valid root SPF record; external SPF check — PASS
5. Zoho zmail DKIM verified, enabled/default; external DKIM check — PASS
6. DMARC monitoring policy published after SPF/DKIM; external DMARC check — PASS
7. admin@juantzun.dev sends and receives — PASS
8. reservas@juantzun.dev sends and receives through the same mailbox — PASS
9. reservations@juantzun.dev sends and receives through the same mailbox — PASS
10. Replies use the same address that received the message — PASS
11. DMARC Reports and DMARC Forensic folders/filters behave as documented — PASS
12. Zoho Mail mobile access, From selection, and reply behavior — PASS
13. MFA enabled; recovery material kept outside repository — PASS
14. Existing Resend technical DNS/config boundary retained without modification — PASS
15. No code, schema, migration, dependency, OAuth client, IMAP credential, production
    configuration, or secret added — PASS
16. Controlled evidence recorded without mailbox content or private security material — PASS
```

The next controlled Resend runtime send belongs to F.3 because F.3 changes Reply-To;
it is not represented as an F.2 test that did not occur.

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

## Handoff to F.3

F.2 is completed and accepted on 2026-08-07. The isolated `juantzun.dev` Zoho mailbox
and authentication boundary are ready for application-side Reply-To alignment.

F.3 is the next package. Its starting contract is:

```text
Local/test automatic From ES: reservas@mail.trp-booking.juantzun.dev — preserve
Local/test automatic From EN: reservations@mail.trp-booking.juantzun.dev — preserve
Local/test Reply-To ES: change to reservas@juantzun.dev
Local/test Reply-To EN: change to reservations@juantzun.dev
Production Reply-To ES/EN: preserve future turefugioperfecto.com values
Automatic provider: Resend — preserve
Human correspondence provider: Zoho Mail Lite — preserve
Inbound synchronization/mailbox persistence: forbidden
```

F.3 must execute a real automatic transactional send in local/test after the Reply-To
change and confirm that replying to the received Resend message lands at the matching
Zoho alias with the accepted same-address human reply behavior.
