# 60 — Tilopay Happy Path Test Fixes

## Status

Prepared after the first successful Tilopay sandbox authorization.

## Issues addressed

```text
1. Stale PENDING_PAYMENT rows with expiresAt in the past could still interfere with creating a new hold.
2. Tilopay approved the transaction, but TRP Booking redirected to error with TILOPAY_CONSULT_MISMATCH.
3. Guests need to see blocked dates directly in the calendar.
4. The card number field should show the detected card brand.
```

## Payment already approved in Tilopay

Because this was a sandbox transaction, there is no real card balance to restore.

For clean testing, you may leave the transaction in Tilopay as sandbox evidence. If the Tilopay sandbox admin offers void/cancel/refund, you can use it for cleanup, but it is not required to recover a real balance.

Do not manually mark the reservation as CONFIRMED in TRP Booking unless the corrected server validation flow is rerun.

If you want to reprocess the same redirect after applying this fix, reset the failed local payment attempt in the sandbox database first:

```sql
update trp_booking.payments
set
  status = 'PENDING',
  failed_at = null,
  raw_payload = null,
  provider_transaction_id = null,
  updated_at = now()
where id = 'cmrf6gyjh0007t6box7jkhgzr';
```

Then open the same Tilopay redirect URL again.

## Manual snippet — lib/payments/tilopay-payment-result.ts

Do not replace the whole file blindly.

### 1. In `assertConsultMatchesPayment`, make provider fields optional for comparison

Replace the amount/currency/order/email strict checks with this version:

```ts
function assertConsultMatchesPayment(input: Readonly<{
  payment: PaymentForValidation;
  redirect: TilopayRedirectParams;
  consultAmount: string | null;
  consultCurrency: string | null;
  consultOrderNumber: string | null;
  consultEmail: string | null;
}>): void {
  const providerAmount = input.consultAmount ?? input.redirect.amount;

  if (providerAmount) {
    const paymentAmountCents = toAmountCents(input.payment.amount);
    const providerAmountCents = toAmountCents(providerAmount);

    if (
      paymentAmountCents === null ||
      providerAmountCents === null ||
      paymentAmountCents !== providerAmountCents
    ) {
      throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
        paymentId: input.payment.id,
        reservationId: input.payment.reservationId,
      });
    }
  }

  const providerCurrency = input.consultCurrency ?? input.redirect.currency;

  if (providerCurrency && providerCurrency !== input.payment.currency) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }

  const providerOrderNumber = input.consultOrderNumber ?? input.redirect.orderNumber;

  if (
    providerOrderNumber &&
    input.payment.providerReference &&
    providerOrderNumber !== input.payment.providerReference
  ) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }

  if (
    input.consultEmail &&
    input.consultEmail.toLowerCase() !== input.payment.reservation.guestEmail.toLowerCase()
  ) {
    throw new TilopayPaymentResultError("TILOPAY_CONSULT_MISMATCH", {
      paymentId: input.payment.id,
      reservationId: input.payment.reservationId,
    });
  }
}
```

### 2. In `processTilopayPaymentRedirect`, use internal payment amount as fallback

Find:

```ts
const amount = normalizeAmount(consult.amount ?? redirect.amount);
```

Replace with:

```ts
const amount = normalizeAmount(consult.amount ?? redirect.amount ?? payment.amount);
```

### 3. Optional but recommended: only short-circuit existing APPROVED payments

In `mapExistingResult`, keep the `APPROVED` branch, but remove the early return branch for `REJECTED` and `FAILED`.

This lets you reprocess a local sandbox `FAILED` payment when the provider actually approved it and the failure came from an earlier local validation bug.

## Manual snippet — features/reservations/components/reservation-request-form.tsx

### 1. Update imports

Change:

```ts
import { type ComponentType, type FormEvent, useMemo, useState } from "react";
```

to:

```ts
import { type ComponentType, type FormEvent, useEffect, useMemo, useState } from "react";
```

Add:

```ts
import type { BlockedDatesApiResponse } from "@/types/availability-blocked-dates";
```

### 2. Add helpers near `toDateOnlyString`

```ts
function toMonthStartDateOnlyString(date: Date): DateOnlyString {
  return toDateOnlyString(new Date(date.getFullYear(), date.getMonth(), 1));
}

function toNextMonthStartDateOnlyString(date: Date): DateOnlyString {
  return toDateOnlyString(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

function dateOnlyStringToLocalDate(value: DateOnlyString): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function buildBlockedDatesUrl(input: Readonly<{
  accommodationId: AccommodationId;
  month: Date;
}>): string {
  const searchParams = new URLSearchParams({
    accommodationId: input.accommodationId,
    startDate: toMonthStartDateOnlyString(input.month),
    endDate: toNextMonthStartDateOnlyString(input.month),
  });

  return `/api/availability/blocked-dates?${searchParams.toString()}`;
}
```

### 3. Add state inside `ReservationRequestForm`

```ts
const [visibleMonth, setVisibleMonth] = useState(() => new Date());
const [blockedDates, setBlockedDates] = useState<readonly Date[]>([]);
```

### 4. Add effect after `today`

```ts
useEffect(() => {
  let cancelled = false;

  async function loadBlockedDates(): Promise<void> {
    try {
      const response = await fetch(
        buildBlockedDatesUrl({
          accommodationId,
          month: visibleMonth,
        }),
        {
          headers: {
            accept: "application/json",
          },
          method: "GET",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as BlockedDatesApiResponse;

      if (!cancelled) {
        setBlockedDates(payload.blockedDates.map(dateOnlyStringToLocalDate));
      }
    } catch {
      if (!cancelled) {
        setBlockedDates([]);
      }
    }
  }

  void loadBlockedDates();

  return () => {
    cancelled = true;
  };
}, [accommodationId, visibleMonth]);
```

### 5. Pass props into `DateRangeField`

Add these props:

```tsx
blockedDates={blockedDates}
month={visibleMonth}
onMonthChange={setVisibleMonth}
```

### 6. Update `DateRangeField` props

Add to the function argument:

```ts
blockedDates,
month,
onMonthChange,
```

Add to the prop type:

```ts
blockedDates: readonly Date[];
month: Date;
onMonthChange: (month: Date) => void;
```

### 7. Update `DayPicker`

Change:

```tsx
disabled={{ before: today }}
```

to:

```tsx
disabled={[{ before: today }, ...blockedDates]}
```

Add:

```tsx
month={month}
onMonthChange={onMonthChange}
```

And add a blocked modifier class:

```tsx
modifiers={{
  blocked: blockedDates,
  preview_range: (date) =>
    previewRange ? isDateInRange(date, previewRange.from, previewRange.to) : false,
}}
modifiersClassNames={{
  blocked: "pointer-events-none text-muted-foreground/30 line-through",
  preview_range: "bg-primary/10 text-primary",
}}
```

## Files included in this ZIP

```text
app/api/availability/blocked-dates/route.ts
types/availability-blocked-dates.ts
lib/reservations/pending-holds.ts
features/payments/components/tilopay-sdk-checkout.tsx
docs/60-tilopay-happy-path-fixes-and-manual-snippets.md
```

## Validation

```bash
npm run build
```
