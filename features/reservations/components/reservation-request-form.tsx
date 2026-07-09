"use client";

import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { type ComponentType, type FormEvent, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import type { Country } from "react-phone-number-input";
import flagComponents from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n";
import { getCountryOption, getCountryOptions, type CountryOption } from "@/lib/geo/countries";
import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { ReservationQuote } from "@/types/reservation-quote";
import type {
  PendingReservationHold,
  PendingReservationHoldApiResponse,
} from "@/types/reservation-pending-hold";

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

type SelectOption = Readonly<{
  value: string;
  label: string;
}>;

type FlagComponentProps = Readonly<{
  title?: string;
}>;

type PendingHoldSummaryCopy = Readonly<{
  successTitle: string;
  reservationId: string;
  status: string;
  expiresAt: string;
  total: string;
  pendingPayment: string;
  paymentPendingNote: string;
}>;

const defaultCountry: Country = "GT";
const countryFlagComponents = flagComponents as Record<string, ComponentType<FlagComponentProps>>;

const dayPickerClassNames = {
  months: "grid gap-4",
  month: "space-y-4",
  caption: "flex items-center justify-between px-1 text-sm font-medium text-foreground",
  caption_label: "text-sm font-semibold",
  nav: "flex items-center gap-2",
  button_previous:
    "inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
  button_next:
    "inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
  month_grid: "w-full border-collapse space-y-1",
  weekdays: "grid grid-cols-7 text-xs text-muted-foreground",
  weekday: "flex h-8 items-center justify-center font-medium",
  week: "grid grid-cols-7",
  day: "relative flex size-10 items-center justify-center text-sm",
  day_button:
    "flex size-9 items-center justify-center rounded-full text-sm transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
  selected: "",
  range_start: "rounded-l-full bg-primary text-primary-foreground",
  range_middle: "rounded-none bg-primary/15 text-primary",
  range_end: "rounded-r-full bg-primary text-primary-foreground",
  today: "font-bold text-primary",
  outside: "text-muted-foreground/40",
  disabled: "pointer-events-none text-muted-foreground/30 line-through",
};

function isQuoteSuccessResponse(response: QuoteApiResponse): response is QuoteApiSuccessResponse {
  return "quote" in response;
}

function isPendingHoldSuccessResponse(
  response: PendingReservationHoldApiResponse,
): response is { pendingHold: PendingReservationHold } {
  return "pendingHold" in response;
}

function toDateOnlyString(date: Date): DateOnlyString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as DateOnlyString;
}

function formatShortDate(date: Date | undefined, locale: string): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function startOfDate(date: Date): number {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate.getTime();
}

function isDateInRange(date: Date, from: Date, to: Date): boolean {
  const dateTime = startOfDate(date);
  return dateTime >= startOfDate(from) && dateTime <= startOfDate(to);
}

function buildQuoteUrl(input: Readonly<{
  accommodationId: AccommodationId;
  checkInDate: string;
  checkOutDate: string;
  guestCount: string;
  locale: string;
}>): string {
  const searchParams = new URLSearchParams({
    accommodationId: input.accommodationId,
    checkInDate: input.checkInDate.trim(),
    checkOutDate: input.checkOutDate.trim(),
    guestCount: input.guestCount.trim(),
    locale: input.locale,
  });

  return `/api/reservations/quote?${searchParams.toString()}`;
}

function buildPendingHoldPayload(input: Readonly<{
  accommodationId: AccommodationId;
  checkInDate: string;
  checkOutDate: string;
  guestCount: string;
  guestName: string;
  guestEmail: string;
  guestCountry: CountryOption;
  guestPhoneLocal: string;
  arrivalTimeEstimate: string;
  locale: string;
}>): string {
  return JSON.stringify({
    accommodationId: input.accommodationId,
    checkInDate: input.checkInDate.trim(),
    checkOutDate: input.checkOutDate.trim(),
    guestCount: Number(input.guestCount),
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    guestCountry: input.guestCountry.iso2,
    countryDialCode: input.guestCountry.dialCode,
    guestPhoneLocal: input.guestPhoneLocal.trim(),
    arrivalTimeEstimate: input.arrivalTimeEstimate.trim(),
    locale: input.locale,
  });
}

function buildTimeOptions(): readonly SelectOption[] {
  const options: SelectOption[] = [];

  for (let hour = 8; hour <= 22; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) {
        continue;
      }

      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({
        value,
        label: value,
      });
    }
  }

  return options;
}

function formatExpirationDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReservationRequestForm({
  accommodationId,
  maxGuests,
}: ReservationRequestFormProps) {
  const { locale, messages } = useLocale();
  const requestMessages = messages.reservations.request;
  const uxCopy = messages.reservations.requestUx;
  const pendingHoldCopy = messages.reservations.pendingHold;
  const pendingHoldErrorMessages = messages.errors.reservation.pendingHold;
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestCount, setGuestCount] = useState("1");
  const [guestSelectorOpen, setGuestSelectorOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhoneLocal, setGuestPhoneLocal] = useState("");
  const [guestCountry, setGuestCountry] = useState<Country>(defaultCountry);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [arrivalTimeEstimate, setArrivalTimeEstimate] = useState("");
  const [arrivalTimeOpen, setArrivalTimeOpen] = useState(false);
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [pendingHold, setPendingHold] = useState<PendingReservationHold | null>(null);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [holdStatus, setHoldStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [holdErrorMessage, setHoldErrorMessage] = useState<string | null>(null);

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);
  const selectedCountry = useMemo(
    () => getCountryOption(guestCountry, locale),
    [guestCountry, locale],
  );
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const guestOptions = useMemo(
    () => Array.from({ length: maxGuests }, (_, index) => String(index + 1)),
    [maxGuests],
  );
  const checkInDate = dateRange?.from ? toDateOnlyString(dateRange.from) : "";
  const checkOutDate = dateRange?.to ? toDateOnlyString(dateRange.to) : "";
  const formattedCheckIn = formatShortDate(dateRange?.from, locale);
  const formattedCheckOut = formatShortDate(dateRange?.to, locale);
  const selectedDateRangeLabel =
    formattedCheckIn && formattedCheckOut
      ? `${formattedCheckIn} — ${formattedCheckOut}`
      : uxCopy.dateRange.buttonPlaceholder;
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  async function handleQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setHoldErrorMessage(null);
    setPendingHold(null);
    setQuote(null);

    try {
      const response = await fetch(
        buildQuoteUrl({
          accommodationId,
          checkInDate,
          checkOutDate,
          guestCount,
          locale,
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
        const message = "error" in payload ? payload.error.message : requestMessages.genericQuoteError;
        throw new Error(message);
      }

      setQuote(payload.quote);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : requestMessages.genericQuoteError);
    }
  }

  async function handlePendingHoldRequest(): Promise<void> {
    setHoldStatus("loading");
    setHoldErrorMessage(null);
    setPendingHold(null);

    try {
      const response = await fetch("/api/reservations/pending-hold", {
        body: buildPendingHoldPayload({
          accommodationId,
          checkInDate,
          checkOutDate,
          guestCount,
          guestName,
          guestEmail,
          guestCountry: selectedCountry,
          guestPhoneLocal,
          arrivalTimeEstimate,
          locale,
        }),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as PendingReservationHoldApiResponse;

      if (!response.ok || !isPendingHoldSuccessResponse(payload)) {
        const message = "error" in payload
          ? payload.error.message
          : pendingHoldErrorMessages.PENDING_HOLD_UNEXPECTED_ERROR;
        throw new Error(message);
      }

      setQuote(payload.pendingHold.quote);
      setPendingHold(payload.pendingHold);
      setHoldStatus("success");
    } catch (error) {
      setHoldStatus("error");
      setHoldErrorMessage(
        error instanceof Error ? error.message : pendingHoldErrorMessages.PENDING_HOLD_UNEXPECTED_ERROR,
      );
    }
  }

  function handleDateRangeSelect(nextDateRange: DateRange | undefined): void {
    setDateRange(nextDateRange);
    setQuote(null);
    setPendingHold(null);
    setHoldErrorMessage(null);
  }

  return (
    <form className="space-y-4" onSubmit={handleQuoteRequest}>
      <div className="space-y-2">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <DateRangeField
            clearLabel={uxCopy.dateRange.clear}
            doneLabel={uxCopy.dateRange.done}
            label={uxCopy.dateRange.label}
            onClear={() => {
              setDateRange(undefined);
              setQuote(null);
              setPendingHold(null);
              setHoldErrorMessage(null);
            }}
            onDone={() => setDatePickerOpen(false)}
            onOpenChange={setDatePickerOpen}
            onSelect={handleDateRangeSelect}
            open={datePickerOpen}
            selectedLabel={selectedDateRangeLabel}
            today={today}
            value={dateRange}
          />

          <OptionSelect
            label={uxCopy.guests.label}
            onOpenChange={setGuestSelectorOpen}
            onSelect={(value) => {
              setGuestCount(value);
              setGuestSelectorOpen(false);
              setQuote(null);
              setPendingHold(null);
              setHoldErrorMessage(null);
            }}
            open={guestSelectorOpen}
            options={guestOptions.map((value) => ({ label: value, value }))}
            placeholder={uxCopy.guests.placeholder}
            value={guestCount}
          />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{uxCopy.dateRange.helper}</p>
      </div>

      <Field
        autoComplete="name"
        label={requestMessages.fields.guestName}
        onChange={(value) => {
          setGuestName(value);
          setPendingHold(null);
          setHoldErrorMessage(null);
        }}
        placeholder={requestMessages.placeholders.guestName}
        value={guestName}
      />
      <Field
        autoComplete="email"
        inputMode="email"
        label={requestMessages.fields.guestEmail}
        onChange={(value) => {
          setGuestEmail(value);
          setPendingHold(null);
          setHoldErrorMessage(null);
        }}
        placeholder={requestMessages.placeholders.guestEmail}
        value={guestEmail}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CountrySelect
          countryOptions={countryOptions}
          label={uxCopy.country.label}
          noResultsLabel={uxCopy.country.noResults}
          onOpenChange={setCountryOpen}
          onSearchChange={setCountrySearch}
          onSelect={(country) => {
            setGuestCountry(country.iso2);
            setCountryOpen(false);
            setCountrySearch("");
            setPendingHold(null);
            setHoldErrorMessage(null);
          }}
          open={countryOpen}
          placeholder={uxCopy.country.placeholder}
          search={countrySearch}
          searchPlaceholder={uxCopy.country.search}
          value={selectedCountry}
        />

        <PhoneField
          dialCode={selectedCountry.dialCode}
          inputLabel={uxCopy.phone.localNumber}
          label={uxCopy.phone.label}
          onChange={(value) => {
            setGuestPhoneLocal(value);
            setPendingHold(null);
            setHoldErrorMessage(null);
          }}
          value={guestPhoneLocal}
        />
      </div>

      <OptionSelect
        dropDirection="up"
        label={uxCopy.arrivalTime.label}
        onOpenChange={setArrivalTimeOpen}
        onSelect={(value) => {
          setArrivalTimeEstimate(value);
          setArrivalTimeOpen(false);
          setPendingHold(null);
          setHoldErrorMessage(null);
        }}
        open={arrivalTimeOpen}
        options={timeOptions}
        placeholder={uxCopy.arrivalTime.placeholder}
        value={arrivalTimeEstimate}
      />

      <Button className="w-full rounded-full" disabled={status === "loading"} type="submit">
        {status === "loading" ? requestMessages.loadingQuote : requestMessages.calculateQuote}
      </Button>

      {errorMessage ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {quote ? <QuoteSummary quote={quote} /> : null}

      {holdErrorMessage ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
          {holdErrorMessage}
        </p>
      ) : null}

      {pendingHold ? (
        <PendingHoldSummary
          copy={pendingHoldCopy}
          locale={locale}
          pendingHold={pendingHold}
        />
      ) : null}

      <Button
        className="w-full rounded-full"
        disabled={status === "loading" || holdStatus === "loading"}
        onClick={handlePendingHoldRequest}
        type="button"
        variant="secondary"
      >
        {holdStatus === "loading" ? pendingHoldCopy.creatingHold : pendingHoldCopy.createHold}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        {pendingHoldCopy.phaseBoundaryNote}
      </p>
    </form>
  );
}

function DateRangeField({
  clearLabel,
  doneLabel,
  label,
  onClear,
  onDone,
  onOpenChange,
  onSelect,
  open,
  selectedLabel,
  today,
  value,
}: Readonly<{
  clearLabel: string;
  doneLabel: string;
  label: string;
  onClear: () => void;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: DateRange | undefined) => void;
  open: boolean;
  selectedLabel: string;
  today: Date;
  value: DateRange | undefined;
}>) {
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const previewRange = value?.from && !value.to && hoveredDate && startOfDate(hoveredDate) > startOfDate(value.from)
    ? { from: value.from, to: hoveredDate }
    : null;

  return (
    <div className="relative grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <button
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className={value?.from && value.to ? "text-foreground" : "text-muted-foreground"}>
          {selectedLabel}
        </span>
        <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-[80] mt-2 w-full rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-2xl sm:w-[24rem]"
          onMouseLeave={() => setHoveredDate(undefined)}
        >
          <DayPicker
            classNames={dayPickerClassNames}
            disabled={{ before: today }}
            excludeDisabled
            mode="range"
            modifiers={{
              preview_range: (date) =>
                previewRange ? isDateInRange(date, previewRange.from, previewRange.to) : false,
            }}
            modifiersClassNames={{
              preview_range: "bg-primary/10 text-primary",
            }}
            numberOfMonths={1}
            onDayMouseEnter={setHoveredDate}
            onSelect={onSelect}
            selected={value}
            weekStartsOn={1}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button className="rounded-full" onClick={onClear} type="button" variant="ghost">
              {clearLabel}
            </Button>
            <Button className="rounded-full" onClick={onDone} type="button" variant="secondary">
              {doneLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OptionSelect({
  dropDirection = "down",
  label,
  onOpenChange,
  onSelect,
  open,
  options,
  placeholder,
  value,
}: Readonly<{
  dropDirection?: "down" | "up";
  label: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  open: boolean;
  options: readonly SelectOption[];
  placeholder: string;
  value: string;
}>) {
  const selectedOption = options.find((option) => option.value === value);
  const dropdownPositionClass = dropDirection === "up" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div className="relative grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <button
        className="flex h-11 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className={selectedOption ? "text-foreground" : "text-muted-foreground"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className={`absolute left-0 z-[80] max-h-80 w-full overflow-auto rounded-2xl border border-border/70 bg-card p-2 shadow-2xl ${dropdownPositionClass}`}>
          {options.map((option) => (
            <button
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
              key={option.value}
              onClick={() => onSelect(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CountrySelect({
  countryOptions,
  label,
  noResultsLabel,
  onOpenChange,
  onSearchChange,
  onSelect,
  open,
  placeholder,
  search,
  searchPlaceholder,
  value,
}: Readonly<{
  countryOptions: readonly CountryOption[];
  label: string;
  noResultsLabel: string;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (country: CountryOption) => void;
  open: boolean;
  placeholder: string;
  search: string;
  searchPlaceholder: string;
  value: CountryOption;
}>) {
  const filteredCountries = countryOptions.filter((country) => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return true;
    }

    return `${country.name} ${country.dialCode} ${country.iso2}`.toLowerCase().includes(searchValue);
  });

  return (
    <div className="relative grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <button
        className="flex h-11 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <CountryFlag country={value} />
          <span className="truncate">{value.name}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-2xl border border-border/70 bg-card p-2 shadow-2xl">
          <label className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search aria-hidden="true" className="size-4" />
            <input
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              type="text"
              value={search}
            />
          </label>
          <div className="mt-2 max-h-72 overflow-auto pr-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
                  key={country.iso2}
                  onClick={() => onSelect(country)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CountryFlag country={country} />
                    <span className="truncate">{country.name}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">{noResultsLabel}</p>
            )}
          </div>
        </div>
      ) : null}
      <span className="sr-only">{placeholder}</span>
    </div>
  );
}

function CountryFlag({ country }: Readonly<{ country: CountryOption }>) {
  const FlagComponent = countryFlagComponents[country.iso2];

  return (
    <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[0.2rem] bg-muted shadow-sm ring-1 ring-border/70 [&_svg]:h-full [&_svg]:w-full">
      {FlagComponent ? <FlagComponent title={country.name} /> : <span className="sr-only">{country.iso2}</span>}
    </span>
  );
}

function PhoneField({
  dialCode,
  inputLabel,
  label,
  onChange,
  value,
}: Readonly<{
  dialCode: string;
  inputLabel: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <span className="flex h-11 overflow-hidden rounded-2xl border border-border/70 bg-background text-sm shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="flex items-center border-r border-border/70 bg-muted/45 px-4 font-medium text-foreground">
          {dialCode}
        </span>
        <input
          autoComplete="tel-national"
          className="min-w-0 flex-1 bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground"
          inputMode="tel"
          onChange={(event) => onChange(event.target.value)}
          placeholder={inputLabel}
          type="text"
          value={value}
        />
      </span>
    </label>
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

function PendingHoldSummary({
  copy,
  locale,
  pendingHold,
}: Readonly<{
  copy: PendingHoldSummaryCopy;
  locale: string;
  pendingHold: PendingReservationHold;
}>) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
      <p className="font-medium text-foreground">{copy.successTitle}</p>
      <dl className="mt-3 grid gap-2 text-muted-foreground">
        <QuoteRow label={copy.reservationId} value={pendingHold.reservationId} />
        <QuoteRow label={copy.status} value={copy.pendingPayment} />
        <QuoteRow label={copy.expiresAt} value={formatExpirationDateTime(pendingHold.expiresAt, locale)} />
        <QuoteRow
          emphasize
          label={copy.total}
          value={`$${pendingHold.total.amount} ${pendingHold.currency}`}
        />
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {copy.paymentPendingNote}
      </p>
    </div>
  );
}

function QuoteSummary({ quote }: Readonly<{ quote: ReservationQuote }>) {
  const { messages } = useLocale();
  const requestMessages = messages.reservations.request;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
      <p className="font-medium text-foreground">{requestMessages.quoteTitle}</p>
      <dl className="mt-3 grid gap-2 text-muted-foreground">
        <QuoteRow label={requestMessages.quoteRows.nights} value={String(quote.nights)} />
        <QuoteRow label={requestMessages.quoteRows.nightlyRate} value={`$${quote.nightlyRate.amount}`} />
        <QuoteRow label={requestMessages.quoteRows.subtotal} value={`$${quote.subtotal.amount}`} />
        <QuoteRow label={requestMessages.quoteRows.cleaningFee} value={`$${quote.cleaningFee.amount}`} />
        <QuoteRow label={requestMessages.quoteRows.taxes} value={`$${quote.taxes.amount}`} />
        <QuoteRow label={requestMessages.quoteRows.discounts} value={`$${quote.discounts.amount}`} />
        <QuoteRow emphasize label={requestMessages.quoteRows.total} value={`$${quote.total.amount} ${quote.currency}`} />
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {requestMessages.nonBindingQuoteNote}
      </p>
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
