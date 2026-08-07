# 132 — Pre-Phase-12 Package F.4 Reservation-to-Zoho Navigation

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.4 — Reservation-to-Zoho navigation
Status: Completed and accepted
Implementation base: 060e8dd4f11ea8c2597cffec73a2ada1c924af3d
Accepted implementation head: 7e0432f90836c5d4200ff528832eb48e69d1e642
Acceptance date: 2026-08-07
Acceptance closure: docs/133-pre-phase-12-package-f-4-acceptance-closure.md
Previous package: F.3 — Completed and accepted
Previous closure: docs/131-pre-phase-12-package-f-3-acceptance-closure.md
Next after F.4 acceptance: F.5 — Integrated validation and documentation closure
Phase 12: Not started
```

## Objective

Reduce the operational friction between a protected TRP Booking reservation and the
human guest conversation owned by Zoho Mail without turning TRP Booking into a mailbox
client.

The administrator already knows the guest identity from the reservation. F.4 adds a
small protected handoff that copies the reservation guest email and opens Zoho Mail so
the administrator can search the existing human conversation there.

```text
TRP Booking reservation detail
        |
        | guestEmail
        v
Copy guest email + open Zoho Mail
        |
        v
Zoho Mail search/threading/reply
```

TRP Booking continues to own automatic transactional history through
`EmailNotification`. Zoho Mail continues to own human inbox/sent history, search,
threads, drafts, attachments, and replies.

## Approved Interaction

The protected reservation detail adds a separate guest-correspondence card near the
existing reservation/guest information.

The card shows:

```text
- guest email from the reservation
- a short boundary explanation
- Open correspondence in Zoho Mail action
```

Selecting the action performs two independent best-effort operations:

```text
1. Copy Reservation.guestEmail to the clipboard.
2. Navigate to the official Zoho Mail HTTPS web entry point.
```

The navigation does not depend on the clipboard result. If clipboard access is denied
or unavailable, Zoho Mail still opens and the guest email remains visible in TRP
Booking for manual copy.

Successful copy and copy failure use the existing styled `AdminSnackbar`; no native
`alert()`, `confirm()`, or `prompt()` is introduced.

## Desktop Handoff

Desktop behavior:

```text
- Zoho Mail opens through HTTPS in a new browser context/tab.
- The guest email is copied when browser clipboard access succeeds.
- The administrator pastes the guest email into Zoho Mail search.
- Zoho remains responsible for search results, conversation selection, and reply.
```

Zoho documents mailbox search by sender/recipient/contact criteria and alias-based
filtering. F.4 does not attempt to reproduce or proxy those search semantics.

Official reference:

```text
https://www.zoho.com/mail/help/searching-mail.html
```

## Mobile Handoff

F.4 uses the same normal HTTPS Zoho Mail URL on mobile. It does not construct an
undocumented custom scheme, Android `intent://` URL, or platform-specific provider URL.

The mobile contract is deliberately best-effort:

```text
- copy guest email
- navigate to Zoho Mail through HTTPS
- allow the operating system / installed app association to open the Zoho Mail app
  when supported
- otherwise fall back to the Zoho Mail mobile web experience
```

Zoho documents Universal Link support in the iOS app for Zoho Mail web links. Zoho
also documents Android app support for email permalinks. F.4 does not possess an email
permalink because it intentionally does not read the mailbox, so Android native-app
opening from the generic web entry point is not treated as an acceptance requirement.
A clean mobile-web fallback is valid.

Official references:

```text
https://help.zoho.com/portal/en-gb/community/topic/zoho-mail-ios-app-update-rtl-languages-support-and-access-emails-using-permalink-and-universal-link-image-upload-resolution
https://help.zoho.com/portal/en-gb/community/topic/zoho-mail-android-app-update-view-emails-shared-via-permalink-on-the-app
```

## Public Configuration

The normal Zoho Mail web entry point is centralized in typed site configuration:

```ts
siteConfig.correspondence.zohoMailWebUrl = "https://mail.zoho.com/"
```

This value is public navigation metadata, not a credential. F.4 therefore introduces
no Zoho secret or OAuth environment variable.

The configuration can be revised later if the production Zoho organization requires
a different documented data-center entry point. Production Zoho operational setup is
not authorized by F.4.

## Localization

All visible F.4 copy is centralized under:

```text
messages/es.ts -> admin.reservationsPage.correspondence
messages/en.ts -> admin.reservationsPage.correspondence
```

Desktop uses the longer action label while narrow/mobile layouts use a shorter label.
Both labels execute the same handoff.

## Files Changed

```text
config/site.ts
features/admin/components/admin-reservation-detail-page.tsx
messages/es.ts
messages/en.ts
docs/132-pre-phase-12-package-f-4-reservation-to-zoho-navigation.md
```

No route, API endpoint, Prisma schema, migration, dependency, Resend provider,
`EmailNotification` contract, payment flow, reservation transition, or lifecycle
transition is changed.

## Explicit Non-Goals

F.4 does not add:

```text
- Zoho OAuth
- Zoho Mail REST API calls
- accountId, messageId, threadId, or permalink persistence
- mailbox synchronization
- inbound email ingestion
- message bodies, headers, or attachments in TRP Booking
- EmailThread / EmailMessage / EmailAttachment models
- inbox/sent views in TRP Booking
- human reply composer in TRP Booking
- human sending through Resend
- mailto handoff
- HTML scraping
- undocumented Zoho internal URLs
- custom app URL schemes or Android intent URLs
```

If the manual search handoff later proves insufficient, a future explicitly approved
improvement may evaluate read-only Zoho OAuth search. That is outside F.4.

## Technical Validation

Run after applying the implementation bundle:

```text
npm run env:validate
npm run lint
npm run build
git diff --check
```

No new dependency or database command is required.

## Functional Acceptance Matrix

| # | Check | Expected |
| --- | --- | --- |
| 1 | Protected reservation detail | Existing reservation detail still loads normally |
| 2 | Correspondence card | Separate card appears near guest/reservation information |
| 3 | Guest identity | Card shows the exact persisted reservation guest email |
| 4 | Desktop action ES | Spanish label and helper copy render correctly |
| 5 | Desktop action EN | English label and helper copy render correctly |
| 6 | Desktop clipboard | Action copies guest email when clipboard access is available |
| 7 | Desktop navigation | Zoho Mail opens through the configured HTTPS URL |
| 8 | Zoho search | Pasting the copied email can be used to search the guest correspondence |
| 9 | Copy feedback | Successful copy uses the existing success snackbar |
| 10 | Copy fallback | If copy is blocked, Zoho still opens and a localized error snackbar is shown |
| 11 | Mobile responsive UI | Card and action remain usable without horizontal overflow |
| 12 | Mobile clipboard | Guest email copy works where browser permissions allow it |
| 13 | iOS handoff | Installed Zoho app may open through supported HTTPS association; otherwise web fallback remains usable |
| 14 | Android handoff | Native app opening is best-effort; Zoho mobile web fallback remains usable |
| 15 | No undocumented schemes | Navigation uses only the configured HTTPS Zoho URL |
| 16 | Transactional history | Existing `EmailNotification` tab/history/resend behavior is unchanged |
| 17 | Domain state | Reservation, Payment, Refund, lifecycle requests, holds, and dates remain unchanged |
| 18 | Security boundary | No mailbox content, OAuth secret, message ID, thread ID, or provider response is stored |
| 19 | Production isolation | No production Zoho organization or credentials are configured |
| 20 | Technical validation | env validation, lint, build, and diff check pass |

## Acceptance Gate

F.4 can be closed when the owner confirms the functional matrix is successful on the
available desktop and mobile test devices and no regression is observed in the
existing reservation detail or transactional-email controls.

Native-app opening is not guaranteed by TRP Booking. The acceptance requirement is a
safe HTTPS handoff: use the native Zoho Mail app when the operating system recognizes
the association and otherwise retain a working Zoho web fallback.

The owner reported the complete 20-check functional and technical acceptance matrix passing successfully after commit `7e0432f90836c5d4200ff528832eb48e69d1e642`. F.4 is therefore completed and accepted. The official closure evidence is recorded in `docs/133-pre-phase-12-package-f-4-acceptance-closure.md`.

The official trackers now continue with:

```text
F.5 — Integrated validation and documentation closure
```
