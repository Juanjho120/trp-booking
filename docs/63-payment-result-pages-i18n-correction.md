# 63 — Payment Result Pages i18n Correction

## Status

Prepared during Phase 9 sandbox testing.

## Context

The first payment result pages were added quickly to remove 404 responses after Tilopay redirects, but they contained hardcoded Spanish guest-facing copy inside TSX files.

That violates the project rule in `AGENTS.md`:

```text
User-facing public copy must be centralized in messages/es.ts and messages/en.ts.
Avoid hardcoding user-facing labels, section titles, CTA copy, and page text directly inside TSX components.
```

## Fix

The result pages now render a shared client component:

```text
features/payments/components/payment-result-page.tsx
```

The component uses:

```text
useLocale()
messages/es.ts
messages/en.ts
```

The route pages only parse query-string values and pass them to the shared component.

Updated pages:

```text
app/reservas/pago/exitoso/page.tsx
app/reservas/pago/cancelado/page.tsx
app/reservas/pago/error/page.tsx
```

## Follow-up

Before closing Phase 9 documentation, add more specific payment-result copy keys to:

```text
messages/es.ts
messages/en.ts
```

The current correction removes hardcoded Spanish copy and uses existing centralized messages, but Phase 9.7 should refine the exact wording for success, cancelled, and error states.

## Validation

```bash
npm run build
```

Manual checks:

```text
1. Set the public UI to English.
2. Visit /reservas/pago/exitoso with sample query params.
3. Confirm no Spanish copy appears.
4. Set the public UI to Spanish.
5. Confirm the same page uses Spanish centralized copy.
6. Repeat for /reservas/pago/cancelado and /reservas/pago/error.
```
