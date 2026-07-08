"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { esMessages } from "@/messages";
import type { AccommodationId } from "@/types/accommodation";
import type { ReservationQuote } from "@/types/reservation-quote";

type ReservationRequestFormProps = Readonly<{
  accommodationId: AccommodationId;
  maxGuests: number;
}>;

type QuoteApiSuccessResponse = Readonly<{
  quote: ReservationQuote;
}>;

type QuoteApiErrorResponse = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
  }>;
}>;

type QuoteApiResponse = QuoteApiSuccessResponse | QuoteApiErrorResponse;

type RequestStatus = "idle" | "loading" | "success" | "error";

const messages = esMessages.reservations.request;

function isQuoteSuccessResponse(response: QuoteApiResponse): response is QuoteApiSuccessResponse {
  return "quote" in response;
}

function buildQuoteUrl(input: Readonly<{
  accommodationId: AccommodationId;
  checkInDate: string;
  checkOutDate: string;
  guestCount: string;
}>): string {
  const searchParams = new URLSearchParams({
    accommodationId: input.accommodationId,
    checkInDate: input.checkInDate.trim(),
    checkOutDate: input.checkOutDate.trim(),
    guestCount: input.guestCount.trim(),
    locale: "es",
  });

  return `/api/reservations/quote?${searchParams.toString()}`;
}

export function ReservationRequestForm({
  accommodationId,
  maxGuests,
}: ReservationRequestFormProps) {
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [arrivalTimeEstimate, setArrivalTimeEstimate] = useState("");
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setQuote(null);

    try {
      const response = await fetch(
        buildQuoteUrl({
          accommodationId,
          checkInDate,
          checkOutDate,
          guestCount,
        }),
        {
          headers: {
            accept: "application/json",
          },
          method: "GET",
        },
      );
      const payload = (await response.json()) as QuoteApiResponse;

      if (!response.ok || !isQuoteSuccessResponse(payload)) {
        const message = "error" in payload ? payload.error.message : messages.genericQuoteError;
        throw new Error(message);
      }

      setQuote(payload.quote);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : messages.genericQuoteError);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleQuoteRequest}>
      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <p className="text-sm font-medium text-foreground">{messages.title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{messages.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          autoComplete="off"
          label={messages.fields.checkInDate}
          onChange={setCheckInDate}
          placeholder={messages.placeholders.date}
          value={checkInDate}
        />
        <Field
          autoComplete="off"
          label={messages.fields.checkOutDate}
          onChange={setCheckOutDate}
          placeholder={messages.placeholders.date}
          value={checkOutDate}
        />
        <Field
          inputMode="numeric"
          label={messages.fields.guestCount}
          maxLength={2}
          onChange={setGuestCount}
          placeholder="1"
          value={guestCount}
        />
        <div className="rounded-2xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          {messages.maxGuestsNote.replace("{maxGuests}", String(maxGuests))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          autoComplete="name"
          label={messages.fields.guestName}
          onChange={setGuestName}
          placeholder={messages.placeholders.guestName}
          value={guestName}
        />
        <Field
          autoComplete="email"
          inputMode="email"
          label={messages.fields.guestEmail}
          onChange={setGuestEmail}
          placeholder={messages.placeholders.guestEmail}
          value={guestEmail}
        />
        <Field
          autoComplete="tel"
          inputMode="tel"
          label={messages.fields.guestPhone}
          onChange={setGuestPhone}
          placeholder={messages.placeholders.guestPhone}
          value={guestPhone}
        />
        <Field
          autoComplete="country-name"
          label={messages.fields.guestCountry}
          onChange={setGuestCountry}
          placeholder={messages.placeholders.guestCountry}
          value={guestCountry}
        />
      </div>

      <Field
        label={messages.fields.arrivalTimeEstimate}
        onChange={setArrivalTimeEstimate}
        placeholder={messages.placeholders.arrivalTimeEstimate}
        value={arrivalTimeEstimate}
      />

      <Button className="w-full rounded-full" disabled={status === "loading"} type="submit">
        {status === "loading" ? messages.loadingQuote : messages.calculateQuote}
      </Button>

      {errorMessage ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {quote ? <QuoteSummary quote={quote} /> : null}

      <Button className="w-full rounded-full" disabled type="button" variant="secondary">
        {messages.createHoldDisabled}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">{messages.phaseBoundaryNote}</p>
    </form>
  );
}

type FieldProps = Readonly<{
  autoComplete?: string;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}>;

function Field({
  autoComplete,
  inputMode,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        className="h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function QuoteSummary({ quote }: Readonly<{ quote: ReservationQuote }>) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
      <p className="font-medium text-foreground">{messages.quoteTitle}</p>
      <dl className="mt-3 grid gap-2 text-muted-foreground">
        <QuoteRow label={messages.quoteRows.nights} value={String(quote.nights)} />
        <QuoteRow label={messages.quoteRows.nightlyRate} value={`$${quote.nightlyRate.amount}`} />
        <QuoteRow label={messages.quoteRows.subtotal} value={`$${quote.subtotal.amount}`} />
        <QuoteRow label={messages.quoteRows.cleaningFee} value={`$${quote.cleaningFee.amount}`} />
        <QuoteRow label={messages.quoteRows.taxes} value={`$${quote.taxes.amount}`} />
        <QuoteRow label={messages.quoteRows.discounts} value={`$${quote.discounts.amount}`} />
        <QuoteRow emphasize label={messages.quoteRows.total} value={`$${quote.total.amount} ${quote.currency}`} />
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{messages.nonBindingQuoteNote}</p>
    </div>
  );
}

function QuoteRow({
  emphasize = false,
  label,
  value,
}: Readonly<{
  emphasize?: boolean;
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className={emphasize ? "text-base font-semibold text-foreground" : "font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
