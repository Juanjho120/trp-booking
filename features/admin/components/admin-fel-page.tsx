"use client";

import { useRouter } from "next/navigation";
import { FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import {
  formatAdminFelDateRangeForCard,
  formatAdminFelNightsForCard,
} from "@/lib/admin/fel-display";
import {
  buildReceiverCountrySuggestions,
  buildReceiverEmailSuggestions,
} from "@/lib/admin/fel-receiver-suggestions";
import { cn } from "@/lib/utils";
import type {
  AdminFelDocumentDetail,
  AdminFelDraftPreview,
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

type FelPreviewResponse =
  | Readonly<{ preview: AdminFelDraftPreview }>
  | Readonly<{ error: { code: AdminFelErrorCode | string } }>;

type ReceiverState = Readonly<{
  receiverName: string;
  receiverIdentifierType: AdminFelReceiverIdentifierType;
  receiverIdentifier: string;
  receiverAddress: string;
  receiverEmail: string;
  receiverCountry: string;
}>;

type SuggestionMode = "AUTO" | "MANUAL";

const initialReceiverState: ReceiverState = {
  receiverName: "",
  receiverIdentifierType: "CONSUMIDOR_FINAL",
  receiverIdentifier: "",
  receiverAddress: "",
  receiverEmail: "",
  receiverCountry: "",
};

type ReservationChoice = Readonly<{
  id: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestCountry: string | null;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  total: string;
  currency: string;
  eligibleExtraCount: number;
  eligibleExtraTotal: string;
}>;

const OTHER_EMAIL_VALUE = "__other_email__";
const OTHER_COUNTRY_VALUE = "__other_country__";

function isErrorResponse(
  response: FelMutationResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function isPreviewErrorResponse(
  response: FelPreviewResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function formatMoney(amount: string, currency: string): string {
  return `${currency} ${amount}`;
}

function AmountFields({
  amount,
  currency,
}: Readonly<{ amount: string; currency: string }>) {
  return (
    <span className="grid grid-cols-[3rem_minmax(5rem,1fr)] items-baseline gap-2 text-right tabular-nums">
      <span className="text-muted-foreground">{currency}</span>
      <span className="font-medium">{amount}</span>
    </span>
  );
}

function normalizeReceiverForPayload(receiver: ReceiverState) {
  return {
    receiverName: receiver.receiverName,
    receiverIdentifierType: receiver.receiverIdentifierType,
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

function buildPayloadFromState(
  reservationIds: readonly string[],
  receiver: ReceiverState,
  groupExtras: boolean,
) {
  return {
    reservationIds,
    groupExtras,
    ...normalizeReceiverForPayload(receiver),
  };
}

function buildPreviewPayloadFromState(
  reservationIds: readonly string[],
  receiver: ReceiverState,
  groupExtras: boolean,
  editingDocumentId: string | null,
) {
  return {
    ...buildPayloadFromState(reservationIds, receiver, groupExtras),
    editingDocumentId,
  };
}

function buildPreviewSignature(
  reservationIds: readonly string[],
  receiver: ReceiverState,
  groupExtras: boolean,
  editingDocumentId: string | null,
): string {
  return JSON.stringify(
    buildPreviewPayloadFromState(
      reservationIds,
      receiver,
      groupExtras,
      editingDocumentId,
    ),
  );
}

function receiverStateFromDocument(document: AdminFelDocumentDetail): ReceiverState {
  return {
    receiverName: document.receiverName,
    receiverIdentifierType:
      document.receiverIdentifierType as AdminFelReceiverIdentifierType,
    receiverIdentifier: document.receiverIdentifier ?? "",
    receiverAddress: document.receiverAddress ?? "",
    receiverEmail: document.receiverEmail ?? "",
    receiverCountry: document.receiverCountry ?? "",
  };
}

function previewFromDocument(
  document: AdminFelDocumentDetail,
): AdminFelDraftPreview {
  return {
    documentType: document.documentType,
    status: "DRAFT",
    commercialCurrency: document.commercialCurrency,
    receiver: {
      receiverName: document.receiverName,
      receiverIdentifierType:
        document.receiverIdentifierType as AdminFelReceiverIdentifierType,
      receiverIdentifier: document.receiverIdentifier,
      receiverAddress: document.receiverAddress,
      receiverEmail: document.receiverEmail,
      receiverCountry: document.receiverCountry,
    },
    groupExtras: document.groupExtras,
    reservationIds: document.reservations.map(
      (reservation) => reservation.reservationId,
    ),
    lines: document.lines,
    total: document.total,
  };
}

function nightsBetween(checkInDate: string, checkOutDate: string): number {
  const checkIn = Date.parse(`${checkInDate}T00:00:00.000Z`);
  const checkOut = Date.parse(`${checkOutDate}T00:00:00.000Z`);

  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut)) {
    return 0;
  }

  return Math.max(0, Math.round((checkOut - checkIn) / 86_400_000));
}

function documentUrl(page: number): string {
  return page > 1 ? `/admin/fel?page=${page}` : "/admin/fel";
}

function documentTypeLabel(
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["felPage"],
  documentType: string,
): string {
  return (
    copy.documentTypes[documentType as keyof typeof copy.documentTypes] ??
    documentType
  );
}

export function AdminFelPageView({
  data,
}: Readonly<{ data: AdminFelPageData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.felPage;
  const intlLocale = getIntlLocale(locale);
  const [activeTab, setActiveTab] = useState("new");
  const [selectedReservationIds, setSelectedReservationIds] = useState<string[]>(
    [],
  );
  const [receiver, setReceiver] =
    useState<ReceiverState>(initialReceiverState);
  const [receiverEmailMode, setReceiverEmailMode] =
    useState<SuggestionMode>("AUTO");
  const [receiverCountryMode, setReceiverCountryMode] =
    useState<SuggestionMode>("AUTO");
  const [groupExtras, setGroupExtras] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [draftPreview, setDraftPreview] =
    useState<AdminFelDraftPreview | null>(null);
  const [draftPreviewSignature, setDraftPreviewSignature] = useState<
    string | null
  >(null);
  const [selectedDocument, setSelectedDocument] =
    useState<AdminFelDocumentDetail | null>(null);
  const [draftJustSaved, setDraftJustSaved] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reservationChoices = useMemo<ReservationChoice[]>(() => {
    const choices = data.eligibleReservations.map((reservation) => ({
      id: reservation.id,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      guestPhone: reservation.guestPhone,
      guestCountry: reservation.guestCountry,
      propertyName: reservation.property.nameEs,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      nights: reservation.nights,
      total: reservation.total,
      currency: reservation.currency,
      eligibleExtraCount: reservation.eligibleExtraCount,
      eligibleExtraTotal: reservation.eligibleExtraTotal,
    }));
    const seenIds = new Set(choices.map((reservation) => reservation.id));

    if (selectedDocument && editingDocumentId === selectedDocument.id) {
      for (const reservation of selectedDocument.reservations) {
        if (seenIds.has(reservation.reservationId)) {
          continue;
        }

        seenIds.add(reservation.reservationId);
        choices.push({
          id: reservation.reservationId,
          guestName: copy.labels.savedDraftSource,
          guestEmail: null,
          guestPhone: null,
          guestCountry: null,
          propertyName: reservation.propertyName,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          nights: nightsBetween(reservation.checkInDate, reservation.checkOutDate),
          total: reservation.total,
          currency: reservation.currency,
          eligibleExtraCount: 0,
          eligibleExtraTotal: "0.00",
        });
      }
    }

    return choices;
  }, [
    copy.labels.savedDraftSource,
    data.eligibleReservations,
    editingDocumentId,
    selectedDocument,
  ]);
  const isEditingDraft =
    selectedDocument !== null &&
    editingDocumentId !== null &&
    selectedDocument.id === editingDocumentId;
  const selectedReservationChoices = useMemo(
    () =>
      selectedReservationIds
        .map((id) =>
          reservationChoices.find((reservation) => reservation.id === id),
        )
        .filter((reservation): reservation is ReservationChoice =>
          Boolean(reservation),
        ),
    [reservationChoices, selectedReservationIds],
  );
  const emailSuggestions = useMemo(
    () => buildReceiverEmailSuggestions(selectedReservationChoices),
    [selectedReservationChoices],
  );
  const countrySuggestions = useMemo(
    () => buildReceiverCountrySuggestions(selectedReservationChoices, intlLocale),
    [intlLocale, selectedReservationChoices],
  );
  const selectedCurrency =
    reservationChoices.find((reservation) =>
      selectedReservationIds.includes(reservation.id),
    )?.currency ?? null;
  const incompatibleReservationIds = useMemo(() => {
    if (!selectedCurrency) return new Set<string>();

    return new Set(
      reservationChoices
        .filter((reservation) => reservation.currency !== selectedCurrency)
        .map((reservation) => reservation.id),
    );
  }, [reservationChoices, selectedCurrency]);
  const currentPreviewSignature = useMemo(
    () =>
      buildPreviewSignature(
        selectedReservationIds,
        receiver,
        groupExtras,
        editingDocumentId,
      ),
    [editingDocumentId, groupExtras, receiver, selectedReservationIds],
  );
  const previewIsFresh =
    draftPreview !== null && draftPreviewSignature === currentPreviewSignature;
  const previewIsStale =
    draftPreview !== null && draftPreviewSignature !== currentPreviewSignature;

  useEffect(() => {
    if (receiverEmailMode !== "AUTO") {
      return;
    }

    const nextEmail = emailSuggestions[0] ?? "";

    setReceiver((current) =>
      current.receiverEmail === nextEmail
        ? current
        : { ...current, receiverEmail: nextEmail },
    );
  }, [emailSuggestions, receiverEmailMode]);

  useEffect(() => {
    if (receiverCountryMode !== "AUTO") {
      return;
    }

    const nextCountry = countrySuggestions[0]?.label ?? "";

    setReceiver((current) =>
      current.receiverCountry === nextCountry
        ? current
        : { ...current, receiverCountry: nextCountry },
    );
  }, [countrySuggestions, receiverCountryMode]);

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

  function resetToNewInvoice(): void {
    setSelectedDocument(null);
    setEditingDocumentId(null);
    setSelectedReservationIds([]);
    setReceiver(initialReceiverState);
    setReceiverEmailMode("AUTO");
    setReceiverCountryMode("AUTO");
    setGroupExtras(false);
    setDraftPreview(null);
    setDraftPreviewSignature(null);
    setDraftJustSaved(false);
    resetMessages();
    setActiveTab("new");
  }

  function changeReceiverIdentifierType(
    receiverIdentifierType: AdminFelReceiverIdentifierType,
  ): void {
    setReceiver((current) => ({
      ...current,
      receiverIdentifierType,
    }));
  }

  function changeReceiverIdentifier(receiverIdentifier: string): void {
    setReceiver((current) => ({
      ...current,
      receiverIdentifier,
    }));
  }

  function changeReceiverEmail(receiverEmail: string): void {
    setReceiverEmailMode("MANUAL");
    setReceiver((current) => ({
      ...current,
      receiverEmail,
    }));
  }

  function chooseReceiverEmailSuggestion(value: string): void {
    if (value === OTHER_EMAIL_VALUE) {
      setReceiverEmailMode("MANUAL");
      setReceiver((current) => ({
        ...current,
        receiverEmail: emailSuggestions.includes(current.receiverEmail)
          ? ""
          : current.receiverEmail,
      }));
      return;
    }

    setReceiverEmailMode("AUTO");
    setReceiver((current) => ({
      ...current,
      receiverEmail: value,
    }));
  }

  function changeReceiverCountry(receiverCountry: string): void {
    setReceiverCountryMode("MANUAL");
    setReceiver((current) => ({
      ...current,
      receiverCountry,
    }));
  }

  function chooseReceiverCountrySuggestion(value: string): void {
    if (value === OTHER_COUNTRY_VALUE) {
      setReceiverCountryMode("MANUAL");
      setReceiver((current) => ({
        ...current,
        receiverCountry: countrySuggestions.some(
          (suggestion) => suggestion.label === current.receiverCountry,
        )
          ? ""
          : current.receiverCountry,
      }));
      return;
    }

    const suggestion = countrySuggestions.find(
      (candidate) => candidate.code === value,
    );

    if (!suggestion) {
      return;
    }

    setReceiverCountryMode("AUTO");
    setReceiver((current) => ({
      ...current,
      receiverCountry: suggestion.label,
    }));
  }

  function buildPayload() {
    return buildPayloadFromState(selectedReservationIds, receiver, groupExtras);
  }

  function loadDocumentForEdit(document: AdminFelDocumentDetail): void {
    const reservationIds = document.reservations.map(
      (reservation) => reservation.reservationId,
    );
    const nextReceiver = receiverStateFromDocument(document);

    setSelectedDocument(document);
    setEditingDocumentId(document.id);
    setDraftJustSaved(false);
    setActiveTab("new");
    setSelectedReservationIds(reservationIds);
    setGroupExtras(document.groupExtras);
    setReceiver(nextReceiver);
    setReceiverEmailMode("MANUAL");
    setReceiverCountryMode("MANUAL");
    void refreshPreviewForState(
      reservationIds,
      nextReceiver,
      document.groupExtras,
      document.id,
    );
  }

  function acceptDocumentSnapshot(document: AdminFelDocumentDetail): void {
    const reservationIds = document.reservations.map(
      (reservation) => reservation.reservationId,
    );
    const nextReceiver = receiverStateFromDocument(document);

    setSelectedDocument(document);
    setEditingDocumentId(document.id);
    setDraftJustSaved(false);
    setSelectedReservationIds(reservationIds);
    setGroupExtras(document.groupExtras);
    setReceiver(nextReceiver);
    setReceiverEmailMode("MANUAL");
    setReceiverCountryMode("MANUAL");
    setDraftPreview(previewFromDocument(document));
    setDraftPreviewSignature(
      buildPreviewSignature(
        reservationIds,
        nextReceiver,
        document.groupExtras,
        document.id,
      ),
    );
  }

  async function refreshPreviewForState(
    reservationIds = selectedReservationIds,
    nextReceiver = receiver,
    nextGroupExtras = groupExtras,
    nextEditingDocumentId = editingDocumentId,
  ): Promise<void> {
    setBusyAction("preview");
    resetMessages();

    const body = buildPreviewPayloadFromState(
      reservationIds,
      nextReceiver,
      nextGroupExtras,
      nextEditingDocumentId,
    );
    const signature = buildPreviewSignature(
      reservationIds,
      nextReceiver,
      nextGroupExtras,
      nextEditingDocumentId,
    );

    try {
      const response = await fetch("/api/admin/fel/preview", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as FelPreviewResponse;

      if (!("preview" in payload)) {
        const code = isPreviewErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_FEL_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        router.refresh();
        return;
      }

      if (!response.ok) {
        setErrorMessage(resolveError("ADMIN_FEL_UNEXPECTED_ERROR"));
        router.refresh();
        return;
      }

      setDraftPreview(payload.preview);
      setDraftPreviewSignature(signature);
      setSuccessMessage(copy.feedback.previewRefreshed);
    } catch {
      setErrorMessage(copy.errors.ADMIN_FEL_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function submitMutation(
    action: string,
    request: RequestInfo | URL,
    init: RequestInit,
    successCopy: string,
  ): Promise<
    AdminFelDocumentDetail | Readonly<{ discardedDocumentId: string }> | null
  > {
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
        return payload.document;
      }

      if ("discardedDocumentId" in payload) {
        return { discardedDocumentId: payload.discardedDocumentId };
      }

      return null;
    } catch {
      setErrorMessage(copy.errors.ADMIN_FEL_UNEXPECTED_ERROR);
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDraft(): Promise<void> {
    const document = await submitMutation(
      "save",
      "/api/admin/fel/drafts",
      {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      },
      copy.feedback.saved,
    );

    if (document && "id" in document) {
      setSelectedDocument(null);
      setEditingDocumentId(null);
      setDraftJustSaved(true);
    }
  }

  async function saveDraftChanges(): Promise<void> {
    if (!isEditingDraft || !selectedDocument) return;

    const document = await submitMutation(
      "save-changes",
      `/api/admin/fel/drafts/${encodeURIComponent(selectedDocument.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(buildPayload()),
      },
      copy.feedback.changesSaved,
    );

    if (document && "id" in document) {
      acceptDocumentSnapshot(document);
    }
  }

  async function discardDraft(): Promise<void> {
    if (!isEditingDraft || !selectedDocument) return;

    const result = await submitMutation(
      "discard",
      `/api/admin/fel/drafts/${encodeURIComponent(selectedDocument.id)}`,
      {
        method: "DELETE",
      },
      copy.feedback.discarded,
    );

    if (result && "discardedDocumentId" in result) {
      resetToNewInvoice();
      setSuccessMessage(copy.feedback.discarded);
      router.refresh();
    }
  }

  function toggleReservation(reservation: ReservationChoice): void {
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

      <Tabs className="grid gap-6" onValueChange={setActiveTab} value={activeTab}>
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
                {reservationChoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {copy.empty.noEligibleReservations}
                  </p>
                ) : (
                  reservationChoices.map((reservation) => {
                    const selected = selectedReservationIds.includes(reservation.id);
                    const incompatible =
                      !selected && incompatibleReservationIds.has(reservation.id);

                    return (
                      <button
                        className={cn(
                          "grid gap-2 rounded-lg border border-border/70 p-4 text-left text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50",
                          selected && "border-primary",
                        )}
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
                          {reservation.propertyName} ·{" "}
                          {formatAdminFelDateRangeForCard(
                            reservation.checkInDate,
                            reservation.checkOutDate,
                          )}{" "}
                          ·{" "}
                          {formatAdminFelNightsForCard(reservation.nights, {
                            singular: copy.labels.nightSingular,
                            plural: copy.labels.nightPlural,
                          })}
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
                  {copy.fields.receiverIdentifierType}
                  <select
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      changeReceiverIdentifierType(
                        event.target.value as AdminFelReceiverIdentifierType,
                      )
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
                <div className="grid gap-2 text-sm font-medium">
                  <label htmlFor="fel-receiver-identifier">
                    {copy.fields.receiverIdentifier}
                  </label>
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    id="fel-receiver-identifier"
                    onChange={(event) =>
                      changeReceiverIdentifier(event.target.value)
                    }
                    value={receiver.receiverIdentifier}
                  />
                </div>
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
                  {copy.fields.receiverEmail}
                  {emailSuggestions.length > 1 ? (
                    <select
                      aria-label={copy.fields.receiverEmailSuggestion}
                      className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                      onChange={(event) =>
                        chooseReceiverEmailSuggestion(event.target.value)
                      }
                      value={
                        emailSuggestions.includes(receiver.receiverEmail)
                          ? receiver.receiverEmail
                          : OTHER_EMAIL_VALUE
                      }
                    >
                      {emailSuggestions.map((email) => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                      <option value={OTHER_EMAIL_VALUE}>
                        {copy.labels.otherEmail}
                      </option>
                    </select>
                  ) : null}
                  {emailSuggestions.length <= 1 ||
                  receiverEmailMode === "MANUAL" ? (
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) => changeReceiverEmail(event.target.value)}
                    type="email"
                    value={receiver.receiverEmail}
                  />
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  {copy.fields.receiverCountry}
                  {countrySuggestions.length > 1 ? (
                    <select
                      aria-label={copy.fields.receiverCountrySuggestion}
                      className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                      onChange={(event) =>
                        chooseReceiverCountrySuggestion(event.target.value)
                      }
                      value={
                        countrySuggestions.find(
                          (suggestion) =>
                            suggestion.label === receiver.receiverCountry,
                        )?.code ?? OTHER_COUNTRY_VALUE
                      }
                    >
                      {countrySuggestions.map((suggestion) => (
                        <option key={suggestion.code} value={suggestion.code}>
                          {suggestion.label}
                        </option>
                      ))}
                      <option value={OTHER_COUNTRY_VALUE}>
                        {copy.labels.otherCountry}
                      </option>
                    </select>
                  ) : null}
                  {countrySuggestions.length <= 1 ||
                  receiverCountryMode === "MANUAL" ? (
                  <input
                    className="min-h-11 rounded-lg border border-input bg-background px-3 py-2"
                    onChange={(event) =>
                      changeReceiverCountry(event.target.value)
                    }
                    value={receiver.receiverCountry}
                  />
                  ) : null}
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
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={
                    busyAction !== null ||
                    selectedReservationIds.length === 0 ||
                    receiver.receiverName.trim() === ""
                  }
                  onClick={() => void refreshPreviewForState()}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw aria-hidden="true" />
                  {busyAction === "preview"
                    ? copy.actions.loadingPreview
                    : copy.actions.refreshPreview}
                </Button>
                {previewIsFresh ? (
                  <Badge variant="secondary">{copy.labels.previewFresh}</Badge>
                ) : null}
                {previewIsStale ? (
                  <Badge variant="destructive">{copy.labels.previewStale}</Badge>
                ) : null}
              </div>
              {previewIsStale ? (
                <p className="text-sm text-muted-foreground">
                  {copy.notes.previewStale}
                </p>
              ) : null}
              {draftPreview === null ? (
                <p className="text-sm text-muted-foreground">
                  {copy.empty.preview}
                </p>
              ) : (
                <>
                  <div className="grid gap-1 rounded-lg border border-border/70 p-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <span>
                      {copy.labels.documentType}:{" "}
                      {documentTypeLabel(copy, draftPreview.documentType)}
                    </span>
                    <span>
                      {copy.labels.status}: {copy.statuses[draftPreview.status]}
                    </span>
                    <span>
                      {copy.labels.currency}: {draftPreview.commercialCurrency}
                    </span>
                    <span>
                      {copy.labels.receiver}: {draftPreview.receiver.receiverName}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[42rem] text-left text-sm">
                      <thead className="text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">{copy.labels.line}</th>
                          <th className="py-2 pr-4">{copy.labels.description}</th>
                          <th className="py-2 pr-4 text-right">
                            {copy.labels.currency}
                          </th>
                          <th className="py-2 pr-4 text-right">
                            {copy.labels.amount}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {draftPreview.lines.map((line) => (
                          <tr key={`${line.kind}-${line.lineNumber}`}>
                            <td className="py-2 pr-4">{line.lineNumber}</td>
                            <td className="py-2 pr-4">{line.description}</td>
                            <td className="py-2 pr-4 text-right text-muted-foreground">
                              {line.currency}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {line.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="py-3 pr-4" colSpan={2}>
                            {copy.labels.total}
                          </td>
                          <td className="py-3 pr-4 text-right text-muted-foreground">
                            {draftPreview.commercialCurrency}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {draftPreview.total}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                {!isEditingDraft && !draftJustSaved ? (
                  <Button
                    disabled={
                      busyAction !== null ||
                      selectedReservationIds.length === 0 ||
                      receiver.receiverName.trim() === "" ||
                      !previewIsFresh
                    }
                    onClick={() => void saveDraft()}
                    type="button"
                  >
                    <FileText aria-hidden="true" />
                    {busyAction === "save"
                      ? copy.actions.saving
                      : copy.actions.save}
                  </Button>
                ) : null}
                {isEditingDraft ? (
                  <>
                    <Button
                      disabled={
                        busyAction !== null ||
                        selectedReservationIds.length === 0 ||
                        receiver.receiverName.trim() === "" ||
                        !previewIsFresh
                      }
                      onClick={() => void saveDraftChanges()}
                      type="button"
                      variant="secondary"
                    >
                      <FileText aria-hidden="true" />
                      {busyAction === "save-changes"
                        ? copy.actions.savingChanges
                        : copy.actions.saveChanges}
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
                {draftJustSaved || isEditingDraft ? (
                  <Button
                    disabled={busyAction !== null}
                    onClick={resetToNewInvoice}
                    type="button"
                    variant="outline"
                  >
                    <Plus aria-hidden="true" />
                    {copy.actions.newInvoice}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {selectedDocument && editingDocumentId === selectedDocument.id ? (
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
                    className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    key={`${selectedDocument.id}-editor-${line.lineNumber}`}
                  >
                    <span className="min-w-0">{line.description}</span>
                    <AmountFields amount={line.amount} currency={line.currency} />
                  </div>
                ))}
                <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 font-semibold sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span>{copy.labels.total}</span>
                  <AmountFields
                    amount={selectedDocument.total}
                    currency={selectedDocument.commercialCurrency}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
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
                      <Badge
                        className="grid grid-cols-[3rem_auto] gap-2 tabular-nums"
                        variant="secondary"
                      >
                        <span>{document.commercialCurrency}</span>
                        <span>{document.total}</span>
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
