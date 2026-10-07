# 217 - Final-I.6.3: Additional Charges Email Delivery Layout Polish

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6.3 - Additional Charges Email Delivery Layout Polish
Status: Completed and accepted on 2026-10-07
Registration date: 2026-10-07
Registration base: b72da7912fcf17021aa0076108f5198b1d773378
Registration base commit: docs(final-i): close Final-I.6.2
Final-I.6.2 status: Completed and accepted on 2026-10-07
Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9
Final-I.6.2 implementation and acceptance record: docs/216-final-i-6-2-admin-ux-navigation-accordions-pagination-polish.md
Accepted Final-I.6.3 feature head: 235bd1f5a8a7d48161146c485c979d5f57a6530d
Owner formal acceptance: PASS on 2026-10-07
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 status: Not started / integrated Final-I closure
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6.3 is a bounded Admin UI layout polish on top of the accepted Final-I.6.2 closure. It is completed and accepted on 2026-10-07 at accepted feature head `235bd1f5a8a7d48161146c485c979d5f57a6530d`. It does not reopen Final-I.6.2, does not replace accepted Final-I.6.2 head `d936983edd22607919148f871e3ba339ab4a4ed9`, and does not begin Final-I.7, Final-I.8, Final-I.9, or Phase 13.

## 2026-10-07 — Final-I.6.3 Completed And Accepted

```text
Owner Hosted validation: PASS
Owner formal acceptance: PASS on 2026-10-07

Accepted Final-I.6.3 feature head:
235bd1f5a8a7d48161146c485c979d5f57a6530d

Documentation closure commit:
the commit containing this documentation-only closure section; it records acceptance only and does not replace the accepted feature head
```

Accepted Hosted validation confirmed:

```text
- desktop uses previously wasted horizontal space
- vertical growth is reduced
- intermediate widths adapt cleanly
- mobile remains readable
- no horizontal overflow
```

## Scope

Final-I.6.3 applies only to the email-delivery metadata cards rendered inside:

```text
Admin -> Reservations -> Additional Charges -> Payment Requests -> Email delivery
```

The previous card used a narrow two-column metadata block beside the optional resend action, leaving unused horizontal space on desktop. The accepted polish keeps the same data and behavior while improving scanability:

```text
header:
- notification status badge
- notification origin badge
- optional Resend action

full-width metadata grid below
```

The resend action remains outside the metrics grid.

Accepted responsive design:

```text
mobile:
1 column

small/tablet:
2 columns

desktop:
3 columns

wide desktop:
4 columns
```

Canonical implementation:

```text
grid-cols-1
sm:grid-cols-2
lg:grid-cols-3
xl:grid-cols-4
```

## Preserved Behavior

Final-I.6.3 preserves:

```text
- Existing email notification delivery and retry processing.
- Existing resend eligibility and resend action behavior.
- Existing resend modal/action wiring.
- Existing Payment Requests tab behavior.
- Existing Additional Charges charge/payment-request selection behavior.
- Existing payment, refund, lifecycle, and financial arithmetic behavior.
- Existing AdminNotification and EmailNotification semantics.
- Existing FEL and INFILE boundaries.
```

Accepted email-delivery fields remain visible:

```text
- Recipient
- Locale
- Attempts
- Email created at
- Requested at
- Last attempt at
- Sent at
- Next attempt at
- Safe code
```

Fields with unavailable values remain supported. No information contract was removed.

Accepted resend behavior:

```text
- Resend remains conditional on existing notification.canResend.
- Resend remains visually associated with the notification card header.
- Resend remains outside the metadata grid.
- Resend remains functionally unchanged.
```

Final-I.6.3 adds no schema, migration, dependency, environment variable, scheduler, cron, Vercel, public-site, guest-facing, provider, payment/refund, email-delivery, FEL, or INFILE change.

## Implementation Summary

```text
- `features/admin/components/admin-additional-charges-section.tsx`
  - Moves the optional resend button into the email notification card header.
  - Moves email-delivery metrics into a full-width responsive grid.
  - Uses `sm:grid-cols-2`, `lg:grid-cols-3`, and `xl:grid-cols-4` for desktop space usage.
  - Keeps all existing metric fields visible.
  - Adds a `min-w-0` guard to the shared detail metric cell to keep long values contained.

- `tests/final-i/i63-additional-charge-email-delivery-layout.test.ts`
  - Verifies the full-width responsive grid.
  - Verifies the resend action remains outside the metrics grid.
  - Verifies the existing email-delivery fields and resend behavior hooks remain present.
```

## Validation Ledger

```text
Final-I.6.3 implementation validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; first outside-sandbox run reached 98/99 and exposed an overly rigid test assertion, which was corrected before the final outside-sandbox rerun passed, 99/99
- npm run final-h:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 20/20
- npm run lint - PASS
- npm run build - initial sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS; Next slow filesystem warning and non-fatal Prisma database reachability warnings during static generation only
- git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6.3 documentation acceptance closure validation:
- npm run final-i:validate - initial sandbox attempt failed before tests with uv_os_get_passwd ENOMEM; rerun outside the sandbox PASS, 99/99
- npm run final-h:validate - run outside the sandbox after the Final-I tsx sandbox ENOMEM blocker; PASS, 20/20
- npm run lint - PASS
- npm run build - initial sandbox attempt failed fetching Google Fonts; rerun outside the sandbox PASS; Next slow filesystem warning only
- git diff --check - PASS; Windows CRLF normalization warnings only
```

## Current State

```text
Final-I.6.3 - Completed and accepted on 2026-10-07 at accepted feature head 235bd1f5a8a7d48161146c485c979d5f57a6530d
Final-I.7 - Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 - Not started / reserved for FEL delivery email/PDF/XML/history UX
Final-I.9 - Not started / integrated Final-I closure
Phase 13 - Blocked / Not started until Final-I closes
```
