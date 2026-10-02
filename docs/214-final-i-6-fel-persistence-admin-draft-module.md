# 214 - Final-I.6: FEL Persistence + Admin Draft Module

## Record

```text
Project: TRP Booking
Track: Final-I - Operational Polish, Notification UX & FEL Invoicing
Subphase: Final-I.6 - FEL persistence + Admin draft/selection/preview module
Final-I.6 status: Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Owner Hosted validation: PASS
Owner formal acceptance: PASS on 2026-10-02
Implementation base: 46664f6022871cd20089aba0de3cea1a4d7a2af7
Final-I.5 accepted head: fde3ae06427af1f8905e6f7589263c199f918553
Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 status: Not started
Final-I.9 status: Not started
Phase 13 status: Blocked / Not started until Final-I closes
```

Final-I.6 materializes the accepted Final-I.5 provider-independent FEL architecture. It adds persistence, draft-source ownership, the Admin `/admin/fel` draft module, protected Admin APIs, frozen Fiscal Receiver field ordering, documented future NIT/CUI receiver-validation requirements, and fiscal presentation/workflow corrections requested during Hosted owner validation. It does not add external receiver-validation runtime, INFILE transport, credentials, certification, DTE cancellation, Credit Note issuing workflow, PDF/XML retrieval, provider retry/status lookup, FEL scheduler, environment variables, cron registration, Production resources, or Phase 13 work.

Final-I.6 owner Hosted validation passed and owner formal acceptance was explicit on 2026-10-02. The accepted Final-I.6 feature head is `80469abda146d0d50516ab598a514a9ccea2db6d`; this later documentation-only closure commit does not replace that accepted feature head.

## Owner Acceptance / Closure

```text
Final-I.6 status: Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Owner Hosted validation: PASS
Owner formal acceptance: PASS on 2026-10-02
Final-I.7: Blocked pending official INFILE technical documentation + Test credentials
Final-I.8: Not started
Final-I.9: Not started
Phase 13: Blocked / Not started until Final-I closes
```

The accepted Final-I.6 contract is provider-independent FEL persistence and Admin draft management. It includes canonical commercial source ownership through `FelCommercialSourceAllocation`, immutable allocation amount/currency snapshots, server-authoritative preview, explicit CREATE/EDIT workflow, same-draft save-changes, post-save EDIT context preservation, local `Nueva factura` / `New invoice` reset, discard/source release, receiver email/country suggestion behavior, localized Reservation dates and night/nights presentation, design-system Select controls for identifier/email/country selectors, and deterministic no-native-select regression coverage.

Final-I.6 does not include INFILE provider transport, NIT/CUI validation runtime, certification, cancellation, Credit Notes, PDF/XML retrieval, scheduler work, Production resources, Final-I.7, or Phase 13.

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

`FelLineItem` stores deterministic fiscal presentation lines. I.6 creates one lodging line per reservation, one extra line per `GuestPaymentRequestItem` in individual mode, or one invoice-wide grouped line for all eligible extras in grouped mode. In individual mode, fiscal lines are persisted in reservation blocks using deterministic reservation ordering (`checkInDate`, `checkOutDate`, `reservationId`) and deterministic extra ordering (`GuestPaymentRequestItem.createdAt`, `id`).

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
saveAdminFelDraftChanges
discardAdminFelDraft
runAdminFelTransactionWithRetry
```

Mutations use `Prisma.TransactionIsolationLevel.Serializable` with explicit bounded wait/timeout settings and bounded retry for Prisma `P2034`, following the accepted Admin financial transaction pattern. Source-allocation unique conflicts are translated to `ADMIN_FEL_SOURCE_ALREADY_ALLOCATED` without leaking Prisma details.

Draft creation transactionally resolves the Admin actor, normalizes receiver input, re-reads selected Reservations, re-checks eligibility, claims source allocations, persists snapshots/lines/provenance, validates arithmetic, and records `FEL_DRAFT_CREATED` in `AdminAuditLog`.

Draft save-changes verifies the document is still `DRAFT`, releases the current provisional draft components/allocations inside the same serializable transaction, re-reads the Admin-selected current commercial sources, rebuilds snapshots/lines/provenance through `buildFelDraftComposition(...)`, updates receiver fields, `commercialCurrency`, `total`, and `groupExtras`, validates arithmetic, and records `FEL_DRAFT_UPDATED`. A failed save-changes operation rolls back without leaving the original saved draft partially modified.

Draft discard only applies to `DRAFT`, deletes/releases the draft graph by relational cascade, and records `FEL_DRAFT_DISCARDED`.

`previewAdminFelDraft` is a server-authoritative, provider-independent read operation. It normalizes the same inputs as draft creation, optionally verifies an `editingDocumentId` is still `DRAFT`, reuses the same eligibility and `buildFelDraftComposition(...)` domain logic, and performs no writes. Existing source allocations remain unavailable for new drafts; only allocations owned by the same explicitly edited draft may be treated as available for preview/save-changes. Allocations owned by another document still return `ADMIN_FEL_SOURCE_ALREADY_ALLOCATED`.

Final-I.6 Hosted-feedback correction deliberately removes premature NIT-only lookup runtime. I.6 freezes only the Fiscal Receiver field order and the future provider-neutral NIT/CUI receiver-validation contract. No external receiver-validation endpoint, receiver-lookup API route, or lookup adapter is active in I.6.

Final-I.7 must introduce authoritative INFILE-backed receiver validation for both `NIT` and `CUI` once official documentation and Test credentials exist. React components must not call INFILE directly; the future boundary remains `TRP fiscal receiver domain -> Receiver identity lookup adapter -> INFILE implementation`, with credentials server-only.

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

For editing an existing `DRAFT`, the same-draft preview/save-changes path may include Reservations and `GuestPaymentRequestItem` extras already allocated to that same `FelDocument`. This does not make allocated sources globally eligible: sources allocated to any other document remain blocked.

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
```

The Admin route is force-dynamic, protected by the existing Admin layout, and marked noindex/nofollow. The Admin shell includes the new `Facturación` / `Invoicing` navigation item after Payments.

The UI provides two tabs:

```text
Nueva factura / New invoice
Borradores e historial / Drafts and history
```

The module supports eligible reservation selection, one/multiple reservation drafts, fiscal receiver input, manual receiver-name entry, individual/grouped extras, preview, save draft, explicit open/edit, single save-changes editing, local new-invoice reset, and discard. It does not expose NIT lookup, CUI lookup, certification, INFILE, cancellation, Credit Note, XML, or PDF actions.

The editable preview is now server-authoritative through `POST /api/admin/fel/preview`. Client-side arithmetic is not the fiscal source of truth. The UI distinguishes the saved draft snapshot from "Vista previa desde datos comerciales actuales" / "Preview from current commercial data", marks previews stale when reservation selection, receiver input, grouping mode, or edited document context changes, and disables save draft / save changes until a fresh server preview exists for the current inputs.

Fiscal receiver field order is `Tipo de identificación` / `Identifier type`, `Identificación` / `Identifier`, `Nombre del receptor` / `Receiver name`, `Correo` / `Email`, `País` / `Country`, and `Dirección` / `Address`. In I.6, the receiver name remains manually editable for every identifier type. There is no active NIT/CUI lookup control in the UI.

That field order is frozen for Final-I.6 and future I.7 implementation: `Identifier type -> Identifier -> Receiver name -> Email -> Country -> Address` / `Tipo de identificación -> Identificación -> Nombre del receptor -> Correo -> País -> Dirección`. It is intentional because provider validation for NIT/CUI resolves the receiver name from the identifier before the Admin reaches the name field.

Final-I.7 receiver validation carry-forward:

```text
NIT:
Admin enters NIT
-> normalize NIT
-> validate through INFILE receiver lookup
-> provider returns registered receiver identity
-> receiverIdentifier = normalized NIT
-> receiverName = official provider-returned name

CUI:
Admin enters CUI
-> normalize/validate provider input
-> validate through INFILE receiver lookup
-> provider returns registered receiver identity
-> receiverIdentifier = validated CUI
-> receiverName = official provider-returned name
```

Prefer read-only receiver name while the validated NIT/CUI remains unchanged. Changing identifier type, identifier, or validated receiver name must invalidate lookup state and any server-authoritative preview. Provider-neutral lookup states are `IDLE`, `VALIDATING`, `VALID`, `NOT_FOUND`, and `UNAVAILABLE`; provider result families are `FOUND`, `NOT_FOUND`, and `UNAVAILABLE`. Local syntax checks may reject clearly malformed input, but local format validation is not authoritative existence validation.

Future invalid and unavailable UX copy:

```text
ES NIT invalid: El NIT ingresado no existe o no está registrado.
EN NIT invalid: The entered NIT does not exist or is not registered.
ES CUI invalid: El CUI ingresado no existe o no está registrado.
EN CUI invalid: The entered CUI does not exist or is not registered.
ES NIT unavailable: No se pudo consultar el NIT en este momento.
EN NIT unavailable: The NIT could not be checked at this time.
ES CUI unavailable: No se pudo consultar el CUI en este momento.
EN CUI unavailable: The CUI could not be checked at this time.
```

Provider unavailability must not be shown as an invalid identifier. For validated NIT/CUI, `receiverName` comes from the authoritative provider lookup, not from the Reservation guest name. `CONSUMIDOR_FINAL` does not run NIT/CUI lookup and must not be treated as a fake NIT. `PASSPORT_FOREIGN` and `OTHER` remain manually supplied unless official provider documentation defines another mechanism.

SAT-domain carry-forward: `IDReceptor` can represent NIT or CUI; when CUI is used, `TipoEspecial = CUI`. This is a future provider/XML mapping concern and does not add SAT XML generation in I.6.

When provider integration is active in Final-I.7, certification readiness must require successful authoritative receiver validation for `NIT` and `CUI`. Draft persistence may remain more permissive if operational recovery requires it, but an unvalidated identifier string is not enough for certification readiness.

Fiscal line presentation was hardened during Hosted feedback: lodging line descriptions now persist the accommodation name, individual extras persist `<category label> (<description>)` using canonical Spanish fiscal labels, blank/redundant extra descriptions collapse to the category label, selected reservations keep the same strong border used on hover, document type display uses localized `Factura de Pequeño Contribuyente (FPEQ)` / `Small Taxpayer Invoice (FPEQ)`, and currency/amount render in separate aligned columns in preview and saved snapshots.

A later Hosted-feedback correction simplifies the Admin workflow into explicit CREATE and EDIT modes. `/admin/fel` now starts with `selectedDocument == null` and `editingDocumentId == null`; draft history never selects the latest draft implicitly. EDIT starts only after the Admin clicks open/edit on a history row. CREATE mode shows preview and save draft only, while EDIT mode shows preview, save changes, discard draft, and new invoice as appropriate. The old user-facing receiver-update and rebuild distinction is removed; source ownership remains enforced by `FelCommercialSourceAllocation`, and the UI avoids accidentally invoking new-draft creation while editing an existing draft.

The post-save Hosted-continuity correction keeps the newly created draft open as the explicit EDIT context. After `Guardar borrador` / `Save draft` succeeds, the returned `AdminFelDocumentDetail` is accepted as the current snapshot, receiver email/country modes become manual snapshot values, the saved Reservation fallback keeps allocated sources visible after `router.refresh()`, `Guardar borrador` disappears, and `Guardar cambios`, `Descartar borrador`, `Nueva factura`, and `Snapshot guardado` remain available. This is intentional edit entry caused by successful creation, not implicit history selection on page load.

`Nueva factura` / `New invoice` is a local reset action only. It clears the selected document, editing id, selected Reservations, receiver input, grouping mode, preview/signature, transient feedback, and returns to the new-invoice tab without mutating or deleting any existing draft.

Eligible Reservation cards now format date-only values as `dd/MM/yyyy` without timezone conversion and localize singular/plural nights. Receiver email and country values from selected Reservations are suggestions only, not fiscal identity: email suggestions dedupe trimmed values case-insensitively; country suggestions are inferred first from the Reservation phone using `libphonenumber-js`, then from a valid stored Reservation country fallback, and displayed with `Intl.DisplayNames`. Manual Admin receiver email/country entries are not overwritten by later Reservation-selection changes, and opening an existing draft keeps its persisted receiver snapshot authoritative. The receiver snapshot stores the Admin-selected/displayed receiver country string under the existing `receiverCountry` contract; no SAT/provider country mapping is introduced in I.6.

Hosted owner validation of the latest Final-I.6 draft flow passed functionally, including new draft creation, explicit post-save EDIT context, Reservation/receiver/snapshot retention, save-changes, new-invoice reset, history reopen, discard, and source release. Owner review then identified a visual/design-system violation: the Fiscal Receiver identifier type selector, multiple-email suggestion selector, and multiple-country suggestion selector used native browser `<select>` controls. The Admin FEL component now uses the existing shadcn/Radix Select implementation from `components/ui/select.tsx` for those three flows while preserving localized option labels, identifier-type state, email AUTO/MANUAL behavior, country AUTO/MANUAL behavior, `Other` sentinels, suggestion derivation, and manual input safeguards.

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
future receiver-identity lookup credentials
future raw receiver-identity lookup requests
future raw receiver-identity lookup responses
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
individual fiscal line ordering in reservation blocks
lodging descriptions with accommodation snapshot
additional-charge fiscal category descriptions
invoice-wide grouped extras with multiple allocations
Fiscal Receiver field order and future NIT/CUI validation contract
multi-reservation draft arithmetic
currency mismatch rejection
sensitive data exclusions
Admin route/nav/UI/API structure
Admin FEL design-system Select enforcement with no native select controls
no provider certification controls
no FEL cron/scheduler registration
documentation status continuity
```

Final-I.6 hardening adds the explicit DB-backed validation gate:

```text
npm run final-i:db:validate
```

That suite runs only when `TRP_ENVIRONMENT=test`, uses uniquely namespaced fixtures and targeted cleanup, and executes real Prisma/PostgreSQL service calls for draft creation, grouped and individual extras, persisted individual line ordering, grouped invoice-wide line regression, duplicate Reservation source conflicts, duplicate GuestPaymentRequestItem source conflicts, the PostgreSQL XOR CHECK, save-changes identity preservation, failed save-changes rollback, discard source release, non-DRAFT edit rejection, and same-draft preview/save ownership.

## I.7 Carry-Forward

Before Final-I.7 creates any `FelCreditAllocation`, the provider-integration implementation must strengthen the guarantee that `originalLineItemId` belongs to `originalDocumentId`, preferably with a composite database relationship analogous to `FelCommercialSourceAllocation -> FelLineItem(id, felDocumentId)`. Future credit allocation must not be able to cite an unrelated original document/line pair. This is an I.7 prerequisite and does not require a new I.6 migration.

## Validation Ledger

```text
npm run final-i:validate - PASS, 57/57 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-f:validate - PASS, 125/125
npm run final-h:validate - PASS, 20/20
npm run env:validate - PASS after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run db:validate - PASS; Prisma package.json#prisma deprecation warning only
npm run db:generate - PASS; Prisma package.json#prisma deprecation warning only
npm run db:migrate:status - PASS, 30 migrations, database schema is up to date after rerun outside the sandbox because the sandbox run returned Schema engine error
npm run lint - PASS
npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
npm audit --omit=dev - PASS, 0 vulnerabilities after rerun outside the sandbox because the sandbox audit endpoint/cache request failed
git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 post-save context preservation correction:
npm run final-i:validate - PASS, 57/57 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-h:validate - PASS, 20/20 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run lint - PASS
npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 Admin FEL design-system Select correction:
npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-i:db:validate - PASS, 13/13 with TRP_ENVIRONMENT=test after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run final-h:validate - PASS, 20/20 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
npm run lint - PASS
npm run build - PASS after rerun outside the sandbox because the sandbox run could not fetch Google Fonts; Next slow filesystem warning only
git diff --check - PASS; Windows CRLF normalization warnings only
Final-I.6 documentation acceptance closure validation:
- Accepted Final-I.6 feature head - 80469abda146d0d50516ab598a514a9ccea2db6d
- Owner Hosted validation - PASS
- Owner formal acceptance - PASS on 2026-10-02
- npm run final-i:validate - PASS, 58/58 after rerun outside the sandbox because the sandbox-only tsx startup failed with uv_os_get_passwd ENOMEM
- git diff --check - PASS; Windows CRLF normalization warnings only
```

The DB-backed gate now explicitly proves both canonical source uniqueness constraints: Reservation source uniqueness and GuestPaymentRequestItem source uniqueness.

## Current State

```text
Final-I.6 — Completed and accepted on 2026-10-02
Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d
Owner Hosted validation: PASS
Owner formal acceptance: PASS on 2026-10-02
NIT/CUI receiver validation runtime remains deferred to Final-I.7 pending authoritative INFILE documentation and Test credentials.
Final-I.7 — Blocked pending official INFILE technical documentation + Test credentials
Final-I.8 — Not started
Final-I.9 — Not started
Phase 13 — Blocked / Not started until Final-I closes
```
