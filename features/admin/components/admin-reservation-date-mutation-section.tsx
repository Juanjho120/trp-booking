"use client";

import {
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import type {
  AdminDateMutationChannel,
  AdminDateMutationErrorCode,
  AdminDateMutationRequestSummary,
  AdminDateMutationRequestType,
} from "@/types/admin-reservation-date-mutation";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";
import type { Locale } from "@/types/locale";

import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const activeDateMutationStatuses = new Set([
  "PENDING_REVIEW",
  "APPROVED",
  "AWAITING_ADJUSTMENT_PAYMENT",
]);
const activeCancellationStatuses = new Set(["PENDING_REVIEW", "APPROVED"]);

type DateMutationDraft = Readonly<{
  requestType: AdminDateMutationRequestType;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
  channel: AdminDateMutationChannel;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  requestNote: string;
}>;

type CreateDateMutationApiResponse = Readonly<{
  dateMutationRequest?: AdminDateMutationRequestSummary;
  error?: Readonly<{
    code?: AdminDateMutationErrorCode;
  }>;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function toInitialDraft(
  reservation: AdminReservationDetailData,
): DateMutationDraft {
  return {
    requestType: "DATE_CHANGE",
    requestedCheckInDate: reservation.checkInDate,
    requestedCheckOutDate: reservation.checkOutDate,
    channel: "EMAIL",
    requesterName: reservation.guestName,
    requesterEmail: reservation.guestEmail,
    requesterPhone: reservation.guestPhone ?? "",
    requestNote: "",
  };
}

export function AdminReservationDateMutationSection({
  reservation,
}: Readonly<{
  reservation: AdminReservationDetailData;
}>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.dateMutation;
  const intlLocale = getIntlLocale(locale);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRequestId, setCreateRequestId] = useState("");
  const [draft, setDraft] = useState<DateMutationDraft>(() =>
    toInitialDraft(reservation),
  );
  const [busy, setBusy] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const activeDateMutation = useMemo(
    () =>
      reservation.dateMutationRequests.find(
        (request) =>
          activeDateMutationStatuses.has(request.status) &&
          !request.reviewExpired,
      ) ?? null,
    [reservation.dateMutationRequests],
  );
  const activeCancellation = useMemo(
    () =>
      reservation.cancellationRequests.find((request) =>
        activeCancellationStatuses.has(request.status),
      ) ?? null,
    [reservation.cancellationRequests],
  );
  const canCreateRequest =
    reservation.status === "CONFIRMED" &&
    activeDateMutation === null &&
    activeCancellation === null;

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatMoney(value: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(value));
  }

  function formatSignedMoney(value: string, currency: string): string {
    const numericValue = Number(value);
    const formatted = formatMoney(Math.abs(numericValue).toFixed(2), currency);

    if (numericValue > 0) {
      return `+${formatted}`;
    }

    if (numericValue < 0) {
      return `-${formatted}`;
    }

    return formatted;
  }

  function requestTypeLabel(value: string): string {
    return copy.requestTypes[value as keyof typeof copy.requestTypes] ?? value;
  }

  function statusLabel(value: string): string {
    return copy.statuses[value as keyof typeof copy.statuses] ?? value;
  }

  function channelLabel(value: string): string {
    return copy.channels[value as keyof typeof copy.channels] ?? value;
  }

  function pricingModeLabel(value: string): string {
    return copy.pricingModes[value as keyof typeof copy.pricingModes] ?? value;
  }

  function errorMessage(
    code: AdminDateMutationErrorCode | undefined,
  ): string {
    return code
      ? (copy.errors[code] ??
          copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR)
      : copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR;
  }

  function openCreateRequest(): void {
    clearFeedback();
    setDraft(toInitialDraft(reservation));
    setCreateRequestId(crypto.randomUUID());
    setCreateOpen(true);
  }

  function changeRequestType(value: string): void {
    const requestType = value as AdminDateMutationRequestType;

    setDraft((current) => ({
      ...current,
      requestType,
      requestedCheckInDate:
        requestType === "STAY_EXTENSION"
          ? reservation.checkInDate
          : current.requestedCheckInDate,
    }));
  }

  async function createDateMutationRequest(): Promise<void> {
    if (
      busy ||
      !draft.requesterName.trim() ||
      !draft.requestNote.trim() ||
      !dateOnlyPattern.test(draft.requestedCheckInDate) ||
      !dateOnlyPattern.test(draft.requestedCheckOutDate)
    ) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_DATE_MUTATION_REQUEST);
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      const response = await fetch(
        `/api/admin/reservations/${encodeURIComponent(
          reservation.id,
        )}/date-mutation-requests`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            requestType: draft.requestType,
            requestedCheckInDate: draft.requestedCheckInDate,
            requestedCheckOutDate: draft.requestedCheckOutDate,
            channel: draft.channel,
            requesterName: draft.requesterName,
            requesterEmail: draft.requesterEmail.trim() || null,
            requesterPhone: draft.requesterPhone.trim() || null,
            requestNote: draft.requestNote,
            expectedReservationUpdatedAt: reservation.updatedAt,
            requestId: createRequestId,
          }),
        },
      );
      const payload = (await response.json()) as CreateDateMutationApiResponse;

      if (!response.ok || !payload.dateMutationRequest) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setCreateOpen(false);
      setSuccessFeedback(copy.success.requestCreated);
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarClock aria-hidden="true" className="size-4" />
              {copy.badge}
            </div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          {canCreateRequest ? (
            <Button onClick={openCreateRequest} type="button">
              <Plus aria-hidden="true" />
              {copy.actions.createRequest}
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            <p>{copy.notes.serverQuote}</p>
            <p className="mt-2">{copy.notes.availability}</p>
            <p className="mt-2">{copy.notes.noMutation}</p>
          </div>

          {reservation.status !== "CONFIRMED" ? (
            <StateNotice icon={<Ban aria-hidden="true" className="size-4" />}>
              {copy.states.reservationNotEligible}
            </StateNotice>
          ) : null}

          {activeCancellation ? (
            <StateNotice icon={<Clock3 aria-hidden="true" className="size-4" />}>
              {copy.states.activeCancellation}
            </StateNotice>
          ) : null}

          {activeDateMutation ? (
            <StateNotice icon={<Clock3 aria-hidden="true" className="size-4" />}>
              {copy.states.activeRequest}
            </StateNotice>
          ) : null}

          {reservation.dateMutationRequests.length > 0 ? (
            <div className="grid gap-4">
              {reservation.dateMutationRequests.map((request) => (
                <DateMutationRequestCard
                  channelLabel={channelLabel(request.channel)}
                  copy={copy}
                  formatDate={formatDate}
                  formatDateTime={formatDateTime}
                  formatMoney={formatMoney}
                  formatSignedMoney={formatSignedMoney}
                  key={request.id}
                  pricingModeLabel={pricingModeLabel(request.pricingMode)}
                  request={request}
                  requestTypeLabel={requestTypeLabel(request.requestType)}
                  statusLabel={statusLabel(request.status)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          )}
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busy) {
            setCreateOpen(false);
          }
        }}
        open={createOpen}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.createDialog.title}</SheetTitle>
            <SheetDescription>{copy.createDialog.description}</SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <FormField label={copy.labels.requestType}>
              <Select
                disabled={busy}
                onValueChange={changeRequestType}
                value={draft.requestType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATE_CHANGE">
                    {copy.requestTypes.DATE_CHANGE}
                  </SelectItem>
                  <SelectItem value="STAY_EXTENSION">
                    {copy.requestTypes.STAY_EXTENSION}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                description={
                  draft.requestType === "STAY_EXTENSION"
                    ? copy.help.extensionCheckIn
                    : copy.help.dateFormat
                }
                label={copy.labels.requestedCheckInDate}
              >
                <input
                  className={inputClassName}
                  disabled={busy || draft.requestType === "STAY_EXTENSION"}
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requestedCheckInDate: event.target.value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  type="text"
                  value={draft.requestedCheckInDate}
                />
              </FormField>

              <FormField
                description={copy.help.dateFormat}
                label={copy.labels.requestedCheckOutDate}
              >
                <input
                  className={inputClassName}
                  disabled={busy}
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requestedCheckOutDate: event.target.value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  type="text"
                  value={draft.requestedCheckOutDate}
                />
              </FormField>
            </div>

            <FormField label={copy.labels.channel}>
              <Select
                disabled={busy}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    channel: value as AdminDateMutationChannel,
                  }))
                }
                value={draft.channel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">{copy.channels.EMAIL}</SelectItem>
                  <SelectItem value="PHONE">{copy.channels.PHONE}</SelectItem>
                  <SelectItem value="WHATSAPP">
                    {copy.channels.WHATSAPP}
                  </SelectItem>
                  <SelectItem value="OTHER">{copy.channels.OTHER}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={copy.labels.requesterName}>
              <input
                className={inputClassName}
                disabled={busy}
                maxLength={160}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requesterName: event.target.value,
                  }))
                }
                type="text"
                value={draft.requesterName}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={copy.labels.requesterEmail}>
                <input
                  className={inputClassName}
                  disabled={busy}
                  maxLength={254}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requesterEmail: event.target.value,
                    }))
                  }
                  type="email"
                  value={draft.requesterEmail}
                />
              </FormField>

              <FormField label={copy.labels.requesterPhone}>
                <input
                  className={inputClassName}
                  disabled={busy}
                  maxLength={40}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requesterPhone: event.target.value,
                    }))
                  }
                  type="tel"
                  value={draft.requesterPhone}
                />
              </FormField>
            </div>

            <FormField label={copy.labels.requestReason}>
              <textarea
                className={textareaClassName}
                disabled={busy}
                maxLength={2_000}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requestNote: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.requestReason}
                value={draft.requestNote}
              />
            </FormField>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              <p>{copy.createDialog.quoteNote}</p>
              <p className="mt-2">{copy.createDialog.pendingNote}</p>
            </div>
          </div>

          <SheetFooter>
            <Button
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busy}
              onClick={createDateMutationRequest}
              type="button"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <CalendarClock aria-hidden="true" />
              )}
              {busy ? copy.actions.creating : copy.actions.confirmCreate}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function StateNotice({
  children,
  icon,
}: Readonly<{
  children: ReactNode;
  icon: ReactNode;
}>) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function DateMutationRequestCard({
  channelLabel,
  copy,
  formatDate,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
  pricingModeLabel,
  request,
  requestTypeLabel,
  statusLabel,
}: Readonly<{
  channelLabel: string;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["dateMutation"];
  formatDate: (value: string) => string;
  formatDateTime: (value: string) => string;
  formatMoney: (value: string, currency: string) => string;
  formatSignedMoney: (value: string, currency: string) => string;
  pricingModeLabel: string;
  request: AdminDateMutationRequestSummary;
  requestTypeLabel: string;
  statusLabel: string;
}>) {
  const currency = request.original.pricing.currency;

  return (
    <div className="rounded-2xl border border-border bg-muted/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{requestTypeLabel}</Badge>
            <Badge variant="secondary">{statusLabel}</Badge>
            {request.reviewExpired && request.status === "PENDING_REVIEW" ? (
              <Badge variant="outline">{copy.statuses.EXPIRED}</Badge>
            ) : null}
          </div>
          <p className="mt-3 break-all text-sm font-medium">{request.id}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {channelLabel} · {formatDateTime(request.requestedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {copy.labels.financialDifference}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatSignedMoney(request.financialDifference, currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <StaySnapshot
          copy={copy}
          formatDate={formatDate}
          formatMoney={formatMoney}
          label={copy.labels.originalStay}
          stay={request.original}
        />
        <div className="hidden items-center justify-center text-muted-foreground lg:flex">
          <ArrowRight aria-hidden="true" />
        </div>
        <StaySnapshot
          copy={copy}
          formatDate={formatDate}
          formatMoney={formatMoney}
          label={copy.labels.requestedStay}
          stay={request.requested}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailValue label={copy.labels.pricingMode} value={pricingModeLabel} />
        <DetailValue
          label={copy.labels.availability}
          value={copy.availability.available}
        />
        <DetailValue
          label={copy.labels.reviewExpiresAt}
          value={formatDateTime(request.reviewExpiresAt)}
        />
        <DetailValue
          label={copy.labels.createdBy}
          value={
            request.createdByAdmin.name ?? request.createdByAdmin.email
          }
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">{copy.availability.validated}</p>
          <p className="mt-1 text-muted-foreground">
            {formatDateTime(request.availability.validatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <DetailValue
          label={copy.labels.requesterContact}
          value={
            request.requesterEmail ??
            request.requesterPhone ??
            copy.labels.unavailable
          }
        />
        <DetailValue
          label={copy.labels.requestReason}
          value={request.requestNote ?? copy.labels.unavailable}
        />
      </div>
    </div>
  );
}

function StaySnapshot({
  copy,
  formatDate,
  formatMoney,
  label,
  stay,
}: Readonly<{
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["dateMutation"];
  formatDate: (value: string) => string;
  formatMoney: (value: string, currency: string) => string;
  label: string;
  stay: AdminDateMutationRequestSummary["original"];
}>) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="text-sm font-semibold">{label}</p>
      <dl className="mt-3 grid gap-3 text-sm">
        <MoneyOrTextRow
          label={copy.labels.checkInDate}
          value={formatDate(stay.checkInDate)}
        />
        <MoneyOrTextRow
          label={copy.labels.checkOutDate}
          value={formatDate(stay.checkOutDate)}
        />
        <MoneyOrTextRow
          label={copy.labels.total}
          value={formatMoney(stay.pricing.total, stay.pricing.currency)}
        />
      </dl>
    </div>
  );
}

function FormField({
  children,
  description,
  label,
}: Readonly<{
  children: ReactNode;
  description?: string;
  label: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {description ? (
        <span className="text-xs font-normal leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </label>
  );
}

function DetailValue({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function MoneyOrTextRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
