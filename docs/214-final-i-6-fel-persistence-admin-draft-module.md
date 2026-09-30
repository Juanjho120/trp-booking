# 214 - Final-I.6: FEL Persistence + Admin Draft Module

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6 - FEL persistence + Admin draft/selection/preview module
Status: Implementation completed; Hosted owner validation + acceptance pending
Implementation base: 46664f6022871cd20089aba0de3cea1a4d7a2af7
Final-I.5 accepted head: fde3ae06427af1f8905e6f7589263c199f918553
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started
Final-I.9 status: Not started
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6 materializes the accepted Final-I.5 provider-independent FEL architecture. It adds persistence, draft-source ownership, the Admin `/admin/fel` draft module, and protected Admin APIs. It does not add INFILE transport, credentials, certification, DTE cancellation, Credit Note issuing workflow, PDF/XML retrieval, provider retry/status lookup, FEL scheduler, environment variables, cron registration, Production resources, or Phase 13 work.

## Accepted Invariants Preserved

```text
PAYMENT != FISCAL LINE

Reservation / GuestPaymentRequestItem
            ↓
FelCommercialSourceAllocation.amountSnapshot
            ↓
       FelLineItem.amount
            ↓
       FelDocument.total
```

`FelLineSource` is provenance/evidence only. It has no authoritative `sourceAmount` or `sourceCurrency` fields and is never summed to compute fiscal totals. Payment rows remain settlement evidence and do not create additional fiscal value beyond the canonical commercial source allocation.

## Persistence

Final-I.6 adds provider-independent Prisma enums:

```text
FelDocumentType
FelDocumentStatus
FelLineKind
FelLineSourceType
FelLineSourceRole
```

Final-I.6 adds provider-independent Prisma models:

```text
FelDocument
FelDocumentReservation
FelLineItem
FelLineSource
FelCommercialSourceAllocation
FelProviderAttempt
FelCreditAllocation
```

`FelDocument` stores the fiscal receiver independently from the booking guest. Certification result fields (`certificationUuid`, `series`, `number`, `certifiedAt`, `cancelledAt`) remain nullable future-result fields and are not populated by I.6.

`FelDocumentReservation` stores one immutable reservation snapshot per selected Reservation. It preserves property, dates, guest count, pricing components, total, currency, pricing snapshot, and the reservation update timestamp.

`FelLineItem` stores deterministic fiscal presentation lines. I.6 creates one lodging line per reservation, one extra line per `GuestPaymentRequestItem` in individual mode, or one invoice-wide grouped line for all eligible extras in grouped mode.

`FelLineSource` stores bounded provenance/evidence snapshots only:

```text
RESERVATION -> AMOUNT_SOURCE
GUEST_PAYMENT_REQUEST_ITEM -> AMOUNT_SOURCE
PAYMENT -> SETTLEMENT_EVIDENCE
RESERVATION_LIFECYCLE_REQUEST -> LIFECYCLE_EVIDENCE
```

`FelCommercialSourceAllocation` owns the canonical commercial source consumption and amount snapshot. It has nullable unique source columns for `reservationId` and `guestPaymentRequestItemId`, plus a composite relation to ensure `allocation.felDocumentId == allocation.line.felDocumentId`.

`FelProviderAttempt` is only a provider-neutral future foundation. I.6 does not create attempt rows during draft operations.

`FelCreditAllocation` is only relational groundwork for future Credit Notes. I.6 does not create Credit Notes or credit allocations.

## Migration

Final-I.6 creates exactly one migration:

```text
prisma/migrations/20260930182358_final_i_6_fel_draft_persistence/migration.sql
```

After this migration the repository has 30 migrations.

The migration includes the required PostgreSQL XOR check:

```sql
CONSTRAINT "fel_commercial_source_allocations_exactly_one_source_check" CHECK (
    ("reservation_id" IS NOT NULL) <> ("guest_payment_request_item_id" IS NOT NULL)
)
```

This makes the source shape database-enforced rather than application-only.

## Admin Service

Final-I.6 adds `lib/admin/fel.ts` with provider-independent operations:

```text
getAdminFelPage
getAdminFelDraft
previewAdminFelDraft
createAdminFelDraft
rebuildAdminFelDraft
updateAdminFelDraftReceiver
discardAdminFelDraft
runAdminFelTransactionWithRetry
```

Mutations use `Prisma.TransactionIsolationLevel.Serializable` with explicit bounded wait/timeout settings and bounded retry for Prisma `P2034`, following the accepted Admin financial transaction pattern. Source-allocation unique conflicts are translated to `ADMIN_FEL_SOURCE_ALREADY_ALLOCATED` without leaking Prisma details.

Draft creation transactionally resolves the Admin actor, normalizes receiver input, re-reads selected Reservations, re-checks eligibility, claims source allocations, persists snapshots/lines/provenance, validates arithmetic, and records `FEL_DRAFT_CREATED` in `AdminAuditLog`.

Draft rebuild verifies the document is still `DRAFT`, releases provisional allocations inside the same serializable transaction, re-reads current commercial sources, rebuilds snapshots/lines/provenance, recalculates totals from allocations, and records `FEL_DRAFT_REBUILT`. A failed rebuild rolls back without leaving the draft partially modified.

Draft discard only applies to `DRAFT`, deletes/releases the draft graph by relational cascade, and records `FEL_DRAFT_DISCARDED`.

`previewAdminFelDraft` is a server-authoritative, provider-independent read operation. It normalizes the same inputs as draft creation, optionally verifies an `editingDocumentId` is still `DRAFT`, reuses the same eligibility and `buildFelDraftComposition(...)` domain logic, and performs no writes. Existing source allocations remain unavailable for new drafts; only allocations owned by the same edited draft may be treated as available for preview/rebuild. Allocations owned by another document still return `ADMIN_FEL_SOURCE_ALREADY_ALLOCATED`.

## Eligibility

A reservation is eligible for a new normal invoice draft only when all of the following hold:

```text
status == CONFIRMED
confirmedAt != null
checkout has already occurred using America/Guatemala and Property.checkOutTime
checkOutTime is valid
no unresolved lifecycle mutation
no unresolved fiscal reconciliation/refund blocker
no existing FelCommercialSourceAllocation for the Reservation
currency is present and compatible with the draft
```

I.6 deliberately excludes `PENDING_PAYMENT`, `EXPIRED`, `BLOCKED`, `CANCELLED`, `REFUNDED`, and `PARTIALLY_REFUNDED`. It treats lifecycle statuses `PENDING_REVIEW`, `APPROVED`, and `AWAITING_ADJUSTMENT_PAYMENT` as unresolved; terminal/historical statuses remain evidence only. Refund statuses `PENDING`, `PROCESSING`, `APPROVED`, and `MANUAL` are active fiscal reconciliation blockers; `FAILED` is not.

For editing an existing `DRAFT`, the same-draft preview/rebuild path may include Reservations and `GuestPaymentRequestItem` extras already allocated to that same `FelDocument`. This does not make allocated sources globally eligible: sources allocated to any other document remain blocked.

Additional-charge sources are eligible only through `GuestPaymentRequestItem` snapshots when:

```text
GuestPaymentRequest.status == PAID
associated Payment.purpose == ADDITIONAL_CHARGE
associated Payment.status == APPROVED
AdditionalCharge.status == PAID
no committed refund allocation/reconciliation blocker
no existing FelCommercialSourceAllocation for the GuestPaymentRequestItem
```

Mutable `AdditionalCharge.amount` and `AdditionalCharge.description` are not used as canonical fiscal line amounts/descriptions when the immutable GPRI snapshot exists.

## Admin UI And API

Final-I.6 adds:

```text
/admin/fel
POST   /api/admin/fel/preview
POST   /api/admin/fel/drafts
PATCH  /api/admin/fel/drafts/[documentId]
DELETE /api/admin/fel/drafts/[documentId]
POST   /api/admin/fel/drafts/[documentId]/rebuild
```

The Admin route is force-dynamic, protected by the existing Admin layout, and marked noindex/nofollow. The Admin shell includes the new `Facturación` / `Invoicing` navigation item after Payments.

The UI provides two tabs:

```text
Nueva factura / New invoice
Borradores e historial / Drafts and history
```

The module supports eligible reservation selection, one/multiple reservation drafts, fiscal receiver input, individual/grouped extras, preview, save draft, open/edit, rebuild from current commercial data, and discard. It does not expose certification, INFILE, cancellation, Credit Note, XML, or PDF actions.

The editable preview is now server-authoritative through `POST /api/admin/fel/preview`. Client-side arithmetic is not the fiscal source of truth. The UI distinguishes the saved draft snapshot from "Vista previa desde datos comerciales actuales" / "Preview from current commercial data", marks previews stale when reservation selection, receiver input, grouping mode, or edited document context changes, and disables save/rebuild until a fresh server preview exists for the current inputs.

Visible copy is centralized in `messages/es.ts` and `messages/en.ts`.

## Sensitive Data Boundary

FEL persistence and Admin UI do not copy or expose:

```text
GuestPaymentRequest.accessTokenHash
GuestPaymentRequest.accessTokenEncrypted
raw payment/provider payloads
card data
PushSubscription endpoints/keys
VAPID private key material
provider credentials
```

Source snapshots remain bounded to commercial and audit metadata required for draft reproduction.

## Tests

Final-I.6 adds `tests/final-i/i6-fel-persistence-admin-draft.test.ts` and registers it in `tests/final-i/run.ts`.

Coverage includes:

```text
schema/model/migration presence
allocation uniqueness and line/document composite consistency
XOR CHECK constraint
confirmed checkout eligibility with America/Guatemala checkout time
invalid/missing checkout time
unconfirmed / not eligible reservations
unresolved lifecycle blockers using actual enum statuses
refund/fiscal reconciliation blockers
existing source allocation blocker
Payment evidence not double-counted as fiscal value
individual extras from GPRI snapshots
invoice-wide grouped extras with multiple allocations
multi-reservation draft arithmetic
currency mismatch rejection
sensitive data exclusions
Admin route/nav/UI/API structure
no provider certification controls
no FEL cron/scheduler registration
documentation status continuity
```

Final-I.6 hardening adds the explicit DB-backed validation gate:

```text
npm run final-i:db:validate
```

That suite runs only when `TRP_ENVIRONMENT=test`, uses uniquely namespaced fixtures and targeted cleanup, and executes real Prisma/PostgreSQL service calls for draft creation, grouped and individual extras, duplicate Reservation source conflicts, duplicate GuestPaymentRequestItem source conflicts, the PostgreSQL XOR CHECK, failed rebuild rollback, discard source release, non-DRAFT edit rejection, and same-draft preview ownership.

## I.7 Carry-Forward

Before Final-I.7 creates any `FelCreditAllocation`, the provider-integration implementation must strengthen the guarantee that `originalLineItemId` belongs to `originalDocumentId`, preferably with a composite database relationship analogous to `FelCommercialSourceAllocation -> FelLineItem(id, felDocumentId)`. Future credit allocation must not be able to cite an unrelated original document/line pair. This is an I.7 prerequisite and does not require a new I.6 migration.

## Validation Ledger

```text
npm run final-i:validate - PASS, 48/48; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
npm run final-i:db:validate - PASS, 10/10 with TRP_ENVIRONMENT=test; direct local-environment run failed closed because TRP_ENVIRONMENT was local
npm run final-f:validate - PASS, 125/125
npm run final-h:validate - PASS, 20/20
npm run env:validate - PASS; initial sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM before the escalated rerun passed
npm run db:format - PASS; Prisma package.json#prisma deprecation warning only
npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
npm run db:migrate:status - PASS, 30 migrations, database schema is up to date; initial sandbox run returned Schema engine error before the escalated rerun passed
npm run lint - PASS
npm run build - PASS; initial sandbox run failed to fetch Google Fonts for next/font before the escalated rerun passed; Next slow filesystem warning only
npm audit --omit=dev - PASS, 0 vulnerabilities; initial sandbox run could not reach the audit endpoint/cache before the escalated rerun passed
git diff --check - PASS
```

The DB-backed gate now explicitly proves both canonical source uniqueness constraints: Reservation source uniqueness and GuestPaymentRequestItem source uniqueness.

## Current State

```text
Final-I.6 — Implementation completed; Hosted owner validation + acceptance pending
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started
Final-I.9 — Not started
Phase 13 — Blocked / Not started until Final-I closes
```
