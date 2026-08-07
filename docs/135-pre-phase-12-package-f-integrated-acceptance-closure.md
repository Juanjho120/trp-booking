# 135 — Pre-Phase-12 Package F Integrated Acceptance Closure

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Status: Completed and accepted
Acceptance date: 2026-08-07
Validated repository head: a188ae304df6b377ed4ad9099c9f7d83c2365262
Accepted feature head: 7e0432f90836c5d4200ff528832eb48e69d1e642
F.5 record: docs/134-pre-phase-12-package-f-5-integrated-validation-and-documentation-closure.md
Phase 12: Not started; Pre-Phase-12 gate satisfied and explicit activation pending
Planned stable Test domain: trp-booking.juantzun.dev
Stable Vercel Test deployment: not created as of acceptance
```

## Acceptance Decision

Package F is completed and accepted.

F.1 through F.5 established and validated one bounded correspondence architecture:

```text
Automatic transactional email
TRP Booking -> Resend -> guest/admin
                         |
                         +-> Reply-To -> Zoho Mail

Human correspondence
Guest <-> Zoho Mail aliases

Application-owned history
Reservation -> EmailNotification

Operator navigation
Reservation detail -> guest email copy + HTTPS Zoho Mail handoff
```

TRP Booking does not become a mailbox client, shared inbox, CRM, help desk, or PMS.

## Accepted Subpackages

| Subpackage | Result |
| --- | --- |
| F.1 Strategy, provider boundary, environment contract | Completed and accepted |
| F.2 Test Zoho Mail setup and DNS validation | Completed and accepted |
| F.3 Transactional Reply-To and environment-aware routing | Completed and accepted |
| F.4 Reservation-to-Zoho desktop/mobile handoff | Completed and accepted |
| F.5 Integrated validation and documentation closure | Completed and accepted; 24/24 integrated checks reported PASS |

## Final Provider Boundary

### Resend

Resend owns only automatic application-generated transactional delivery, including the existing durable notification, idempotency, retry, manual-resend, and safe-diagnostic contracts.

### Zoho Mail

Zoho Mail owns human guest correspondence, aliases, inbox/sent folders, search, threading, drafts, attachments, spam filtering, mobile access, and human replies.

The accepted local/test human identities remain:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Production identities remain planned under `turefugioperfecto.com` and are not activated by Package F.

### TRP Booking persistence

`EmailNotification` remains the application-owned transactional history. Package F adds no `EmailThread`, `EmailMessage`, inbound mailbox event, human-message body, attachment persistence, OAuth token storage, or mailbox password.

## Final Routing Contract

```text
LOCAL
Guest physical delivery -> EMAIL_TEST_RECIPIENT
Admin physical delivery -> intended juantzun.dev admin recipient
Subject prefix -> [LOCAL]
Persisted recipient -> intended recipient

TEST runtime contract
Guest physical delivery -> intended reservation guest recipient
Admin physical delivery -> intended juantzun.dev admin recipient
EMAIL_TEST_RECIPIENT -> empty
Subject prefix -> [TEST]

PRODUCTION contract
Guest/admin physical delivery -> intended production recipients
EMAIL_TEST_RECIPIENT -> empty
Subject prefix -> none
```

Reply-To remains routed to the approved Zoho aliases by locale.

## F.5 Integrated Acceptance

The owner reported the F.5 technical gate and all 24 integrated checks successful on 2026-08-07 at repository head `a188ae304df6b377ed4ad9099c9f7d83c2365262`.

Accepted evidence includes:

```text
- email contract validation
- environment validation
- Prisma validation
- lint
- build
- diff hygiene
- representative Test-mode booking/payment/confirmation behavior
- guest/admin transactional routing
- intended-recipient persistence
- ES/EN Reply-To and human same-alias round trips
- SPF/DKIM/DMARC representative evidence
- local guest/admin isolation
- reservation-to-Zoho desktop handoff
- mobile handoff with app-or-web fallback
- reservation/payment/refund/lifecycle state isolation
- transactional history preservation
- secrets/provider boundary
- production isolation
- documentation consistency
```

No corrective feature implementation was required for F.5.

## Deployment-State Correction

The repository previously described `trp-booking.juantzun.dev` as though it were an existing stable Vercel Test deployment. That was incorrect.

The accepted state is:

```text
trp-booking.juantzun.dev -> planned stable Test domain
Vercel Test deployment -> not created yet
Vercel deployment acceptance -> not part of Package F
Production deployment -> not activated by Package F
```

Package F acceptance therefore must not be cited as proof that TRP Booking has been deployed or validated on Vercel.

This correction does not invalidate F.2–F.5 provider/application evidence. It separates the already validated environment **contract** from the still-pending environment **deployment**.

## Pre-Phase-12 Gate Result

The approved gate is now satisfied:

```text
Package A -> Completed and accepted
Package B -> Completed and accepted
Package C -> Completed and accepted
Package E -> Completed and accepted
Package F -> Completed and accepted

Package D -> Deferred; outside the current gate pending financial-policy decisions
```

The Pre-Phase-12 Improvement Track is completed and accepted.

## Phase 12 Handoff

Phase 12 — Production Readiness remains `Not started`. Package F completion does not activate it automatically.

The next decision is whether to explicitly activate Phase 12. When activated, Production Readiness must start from the real infrastructure state rather than from documented target URLs.

The first major Phase 12 objective should be the first actual Test deployment:

```text
1. Create/connect the Vercel project for TRP Booking.
2. Deploy a controlled Test environment with TRP_ENVIRONMENT=test.
3. Attach and validate the planned trp-booking.juantzun.dev domain.
4. Configure Test-only environment variables and secrets without introducing production credentials.
5. Connect the intended Test database/provider dependencies.
6. Validate callbacks, cron jobs, email delivery, admin authentication, Cloudinary assets, iCal behavior, and mobile/public flows from the deployed origin.
7. Only after Test deployment acceptance, prepare the isolated production provider/domain/database cutover.
```

Production credentials, production Zoho, production Resend, production Tilopay, production DNS, and live guest traffic remain outside Package F and require explicit Phase 12 controls.

## Final Decision

```text
Package F: COMPLETED AND ACCEPTED
Pre-Phase-12 gate: SATISFIED
Pre-Phase-12 Improvement Track: COMPLETED AND ACCEPTED
Phase 12: NOT STARTED — EXPLICIT ACTIVATION PENDING
Stable Test Vercel deployment: NOT YET CREATED
```
