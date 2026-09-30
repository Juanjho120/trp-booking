"use client";

import { useRouter } from "next/navigation";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import type {
  AdminFelDocumentDetail,
  AdminFelEligibleReservation,
  AdminFelErrorCode,
  AdminFelPageData,
  AdminFelReceiverIdentifierType,
} from "@/types/admin-fel";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type FelMutationResponse =
  | Readonly<{ document: AdminFelDocumentDetail }>
  | Readonly<{ discardedDocumentId: string }>
  | Readonly<{ error: { code: AdminFelErrorCode | string } }>;

type ReceiverState = Readonly<{
  receiverName: string;
  receiverIdentifierType: AdminFelReceiverIdentifierType;
  receiverIdentifier: string;
  receiverAddress: string;
  receiverEmail: string;
  receiverCountry: string;
}>;

const initialReceiverState: ReceiverState = {
  receiverName: "",
  receiverIdentifierType: "CONSUMIDOR_FINAL",
  receiverIdentifier: "",
  receiverAddress: "",
  receiverEmail: "",
  receiverCountry: "",
};

function isErrorResponse(
  response: FelMutationResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function centsFromMoney(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function moneyFromCents(value: number): string {
  return (value / 100).toFixed(2);
}

function formatMoney(amount: string, currency: string): string {
  return `${currency} ${amount}`;
}

function documentUrl(page: number): string {
  return page > 1 ? `/admin/fel?page=${page}` : "/admin/fel";
}

export function AdminFelPageView({
  data,
}: Readonly<{ data: AdminFelPageData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.felPage;
  const intlLocale = getIntlLocale(locale);
  const [selectedReservationIds, setSelectedReservationIds] = useState<string[]>(
    [],
  );
  const [receiver, setReceiver] =
    useState<ReceiverState>(initialReceiverState);
  const [groupExtras, setGroupExtras] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<AdminFelDocumentDetail | null>(data.documents[0] ?? null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedReservations = useMemo(
    () =>
      data.eligibleReservations.filter((reservation) =>
        selectedReservationIds.includes(reservation.id),
      ),
    [data.eligibleReservations, selectedReservationIds],
  );
  const selectedCurrency = selectedReservations[0]?.currency ?? null;
  const incompatibleReservationIds = useMemo(() => {
    if (!selectedCurrency) return new Set<string>();

    return new Set(
      data.eligibleReservations
        .filter((reservation) => reservation.currency !== selectedCurrency)
        .map((reservation) => reservation.id),
    );
  }, [data.eligibleReservations, selectedCurrency]);
  const previewLines = useMemo(() => {
    const lodgingLines = selectedReservations.map((reservation) => ({
      key: `lodging-${reservation.id}`,
      description: reservation.lodgingDescription,
      amount: reservation.total,
      currency: reservation.currency,
    }));

    const extras = selectedReservations.flatMap((reservation) =>
      reservation.extras.map((extra) => ({
        key: extra.guestPaymentRequestItemId,
        description: extra.description,
        amount: extra.amount,
        currency: extra.currency,
      })),
    );

    if (groupExtras && extras.length > 0 && selectedCurrency) {
      return [
        ...lodgingLines,
        {
          key: "grouped-extras",
          description: copy.preview.groupedExtrasLine,
          amount: moneyFromCents(
            extras.reduce((total, extra) => total + centsFromMoney(extra.amount), 0),
          ),
          currency: selectedCurrency,
        },
      ];
    }

    return [...lodgingLines, ...extras];
  }, [copy.preview, groupExtras, selectedCurrency, selectedReservations]);
  const previewTotal = moneyFromCents(
    previewLines.reduce((total, line) => total + centsFromMoney(line.amount), 0),
  );

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Guatemala",
    }).format(new Date(value));
  }

  function resolveError(code: string): string {
    if (code in copy.errors) {
      return copy.errors[code as keyof typeof copy.errors];
    }

    return copy.errors.ADMIN_FEL_UNEXPECTED_ERROR;
  }

  function resetMessages(): void {
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function buildPayload() {
    return {
      reservationIds: selectedReservationIds,
      groupExtras,
      ...receiver,
      receiverIdentifier:
        receiver.receiverIdentifier.trim() === ""
          ? null
          : receiver.receiverIdentifier,
      receiverAddress:
        receiver.receiverAddress.trim() === "" ? null : receiver.receiverAddress,
      receiverEmail:
        receiver.receiverEmail.trim() === "" ? null : receiver.receiverEmail,
      receiverCountry:
        receiver.receiverCountry.trim() === "" ? null : receiver.receiverCountry,
    };
  }

  function loadDocumentForEdit(document: AdminFelDocumentDetail): void {
    setSelectedDocument(document);
    setSelectedReservationIds(
      document.reservations.map((reservation) => reservation.reservationId),
    );
    setGroupExtras(document.groupExtras);
    setReceiver({
      receiverName: document.receiverName,
      receiverIdentifierType:
        document.receiverIdentifierType as AdminFelReceiverIdentifierType,
      receiverIdentifier: document.receiverIdentifier ?? "",
      receiverAddress: document.receiverAddress ?? "",
      receiverEmail: document.receiverEmail ?? "",
      receiverCountry: document.receiverCountry ?? "",
    });
  }

  async function submitMutation(
    action: string,
    request: RequestInfo | URL,
    init: RequestInit,
    successCopy: string,
  ): Promise<AdminFelDocumentDetail | null> {
    setBusyAction(action);
    resetMessages();

    try {
      const response = await fetch(request, {
        ...init,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...init.headers,
        },
      });
      const payload = (await response.json()) as FelMutationResponse;

      if (!response.ok || isErrorResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_FEL_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        router.refresh();
        return null;
      }

      setSuccessMessage(successCopy);
      router.refresh();

      if ("document" in payload) {
        setSelectedDocument(payload.document);
        return payload.document;
      }

      setSelectedDocument(null);
      return null;
    } catch {
      setErrorMessage(copy.errors.ADMIN_FEL_UNEXPECTED_ERROR);
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDraft(): Promise<void> {
    await submitMutation(
      "save",
      "/api/admin/fel/drafts",
      {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      },
      copy.feedback.saved,
    );
  }

  async function updateReceiver(): Promise<void> {
    if (!selectedDocument) return;

    await submitMutation(
      "update",
      `/api/admin/fel/drafts/${encodeURIComponent(selectedDocument.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(receiver),
      },
      copy.feedback.updated,
    );
  }

  async function rebuildDraft(): Promise<void> {
    if (!selectedDocument) return;

    await submitMutation(
      "rebuild",
      `/api/admin/fel/drafts/${encodeURIComponent(selectedDocument.id)}/rebuild`,
      {
        method: "POST",
        body: JSON.stringify({
          reservationIds: selectedReservationIds,
          groupExtras,
        }),
      },
      copy.feedback.rebuilt,
    );
  }

  async function discardDraft(): Promise<void> {
    if (!selectedDocument) return;

    await submitMutation(
      "discard",
      `/api/admin/fel/drafts/${encodeURIComponent(selectedDocument.id)}`,
      {
        method: "DELETE",
      },
      copy.feedback.discarded,
    );
  }

  function toggleReservation(reservation: AdminFelEligibleReservation): void {
    if (
      !selectedReservationIds.includes(reservation.id) &&
      incompatibleReservationIds.has(reservation.id)
    ) {
      setErrorMessage(copy.errors.ADMIN_FEL_CURRENCY_MISMATCH);
      return;
    }

    setSelectedReservationIds((current) =>
      current.includes(reservation.id)
        ? current.filter((id) => id !== reservation.id)
        : [...current, reservation.id],
    );
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <Tabs className="grid gap-6" defaultValue="new">
        <TabsList aria-label={copy.tabs.ariaLabel}>
          <TabsTrigger value="new">{copy.tabs.newInvoice}</TabsTrigger>
          <TabsTrigger value="history">{copy.tabs.history}</TabsTrigger>
        </TabsList>

        <TabsContent className="grid gap-6" value="new">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{copy.sections.reservations}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {data.eligibleReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {copy.empty.noEligibleReservations}
                  </p>
                ) : (
                  data.eligibleReservations.map((reservation) => {
                    const selected = selectedReservationIds.includes(reservation.id);
                    const incompatible =
                      !selected && incompatibleReservationIds.has(reservation.id);

                    return (
                      <button
                        className="grid gap-2 rounded-lg border border-border/70 p-4 text-left text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={incompatible}
                        key={reservation.id}
                        onClick={() => toggleReservation(reservation)}
                        type="button"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{reservation.guestName}</span>
                          <Badge variant={selected ? "default" : "secondary"}>
                            {selected
                              ? copy.labels.selected
                              : copy.labels.selectable}
                          </Badge>
                          {incompatible ? (
                            <Badge variant="destructive">
                              {copy.labels.currencyMismatch}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground">
                          {reservation.property.nameEs} · {reservation.checkInDate} -{" "}
                          {reservation.checkOutDate} · {reservation.nights}{" "}
                          {copy.labels.nights}
                        </span>
                        <span>
                          {copy.labels.stayTotal}:{" "}
                          {formatMoney(reservation.total, reservation.currency)} ·{" "}
                          {copy.labels.extras}: {reservation.eligibleExtraCount} /{" "}
                          {formatMoney(
                            reservation.eligibleExtraTotal,
                            reservation.currency,
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{copy.sections.receiver}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverName}
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverName: event.target.value,
                      }))
                    }
                    value={receiver.receiverName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverIdentifierType}
                  <select
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverIdentifierType: event.target
                          .value as AdminFelReceiverIdentifierType,
                      }))
                    }
                    value={receiver.receiverIdentifierType}
                  >
                    {Object.entries(copy.identifierTypes).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverIdentifier}
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverIdentifier: event.target.value,
                      }))
                    }
                    value={receiver.receiverIdentifier}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverEmail}
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverEmail: event.target.value,
                      }))
                    }
                    type="email"
                    value={receiver.receiverEmail}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverCountry}
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverCountry: event.target.value,
                      }))
                    }
                    value={receiver.receiverCountry}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverAddress}
                  <textarea
                    className="min-h-24 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      setReceiver((current) => ({
                        ...current,
                        receiverAddress: event.target.value,
                      }))
                    }
                    value={receiver.receiverAddress}
                  />
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border/70 p-3 text-sm font-medium">
                  <input
                    checked={groupExtras}
                    onChange={(event) => setGroupExtras(event.target.checked)}
                    type="checkbox"
                  />
                  {copy.fields.groupExtras}
                </label>
                <p className="text-sm text-muted-foreground">
                  {copy.notes.noProviderCertification}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.preview}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {previewLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {copy.empty.preview}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">{copy.labels.line}</th>
                        <th className="py-2 pr-4">{copy.labels.description}</th>
                        <th className="py-2 pr-4 text-right">{copy.labels.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {previewLines.map((line, index) => (
                        <tr key={line.key}>
                          <td className="py-2 pr-4">{index + 1}</td>
                          <td className="py-2 pr-4">{line.description}</td>
                          <td className="py-2 pr-4 text-right">
                            {formatMoney(line.amount, line.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="py-3 pr-4" colSpan={2}>
                          {copy.labels.total}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {selectedCurrency
                            ? formatMoney(previewTotal, selectedCurrency)
                            : copy.labels.unavailable}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    busyAction !== null ||
                    selectedReservationIds.length === 0 ||
                    receiver.receiverName.trim() === ""
                  }
                  onClick={() => void saveDraft()}
                  type="button"
                >
                  <FileText aria-hidden="true" />
                  {busyAction === "save" ? copy.actions.saving : copy.actions.save}
                </Button>
                {selectedDocument ? (
                  <>
                    <Button
                      disabled={busyAction !== null}
                      onClick={() => void updateReceiver()}
                      type="button"
                      variant="outline"
                    >
                      {copy.actions.updateReceiver}
                    </Button>
                    <Button
                      disabled={busyAction !== null || selectedReservationIds.length === 0}
                      onClick={() => void rebuildDraft()}
                      type="button"
                      variant="secondary"
                    >
                      <RefreshCw aria-hidden="true" />
                      {copy.actions.rebuild}
                    </Button>
                    <Button
                      disabled={busyAction !== null}
                      onClick={() => void discardDraft()}
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 aria-hidden="true" />
                      {copy.actions.discard}
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="grid gap-6" value="history">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.history}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {data.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {copy.empty.history}
                </p>
              ) : (
                data.documents.map((document) => (
                  <article
                    className="grid gap-3 rounded-lg border border-border/70 p-4"
                    key={document.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{document.receiverName}</p>
                        <p className="text-sm text-muted-foreground">
                          {document.id} · {copy.statuses[document.status]}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatMoney(document.total, document.commercialCurrency)}
                      </Badge>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                      <span>
                        {copy.labels.reservations}: {document.reservationCount}
                      </span>
                      <span>
                        {copy.labels.lines}: {document.lineCount}
                      </span>
                      <span>
                        {copy.labels.createdAt}: {formatDateTime(document.createdAt)}
                      </span>
                    </div>
                    <Button
                      className="w-fit"
                      onClick={() => loadDocumentForEdit(document)}
                      type="button"
                      variant="outline"
                    >
                      {copy.actions.openEdit}
                    </Button>
                  </article>
                ))
              )}
              {data.pagination.totalItems > data.pagination.pageSize ? (
                <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {copy.pagination.page} {data.pagination.page}{" "}
                    {copy.pagination.of} {data.pagination.totalPages}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      disabled={data.pagination.page <= 1}
                      onClick={() =>
                        router.push(documentUrl(data.pagination.page - 1))
                      }
                      type="button"
                      variant="outline"
                    >
                      {copy.pagination.previous}
                    </Button>
                    <Button
                      disabled={
                        data.pagination.page >= data.pagination.totalPages
                      }
                      onClick={() =>
                        router.push(documentUrl(data.pagination.page + 1))
                      }
                      type="button"
                      variant="outline"
                    >
                      {copy.pagination.next}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {selectedDocument ? (
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{copy.sections.savedSnapshot}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="text-muted-foreground">
                  {copy.notes.savedSnapshot}
                </p>
                {selectedDocument.lines.map((line) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/70 p-3"
                    key={`${selectedDocument.id}-${line.lineNumber}`}
                  >
                    <span>{line.description}</span>
                    <span className="font-medium">
                      {formatMoney(line.amount, line.currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </>
  );
}
