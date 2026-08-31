"use client";

import {
  Check,
  CreditCard,
  PencilLine,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  ADDITIONAL_CHARGE_CATEGORIES,
  type AdditionalChargeCategory,
} from "@/types/additional-charge";
import type {
  AdminAdditionalChargeErrorCode,
  AdminAdditionalChargeManagement,
  AdminAdditionalChargeSummary,
  AdminGuestPaymentRequestSummary,
} from "@/types/admin-additional-charge";

import { AdminSnackbar } from "./admin-snackbar";

type ChargeFormState = Readonly<{
  category: AdditionalChargeCategory;
  description: string;
  internalNote: string;
  amount: string;
}>;

type ManagementResponse =
  | Readonly<{ management: AdminAdditionalChargeManagement }>
  | Readonly<{ error: { code: AdminAdditionalChargeErrorCode | string } }>;

type MutationResponse =
  | Readonly<{
      charge?: AdminAdditionalChargeSummary;
      paymentRequest?: AdminGuestPaymentRequestSummary;
    }>
  | Readonly<{ error: { code: AdminAdditionalChargeErrorCode | string } }>;

const emptyChargeForm: ChargeFormState = {
  category: "OTHER",
  description: "",
  internalNote: "",
  amount: "",
};

function isManagementResponse(
  response: ManagementResponse,
): response is { management: AdminAdditionalChargeManagement } {
  return "management" in response;
}

function isErrorResponse(
  response: ManagementResponse | MutationResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

export function AdminAdditionalChargesSection({
  reservationId,
}: Readonly<{ reservationId: string }>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.additionalCharges;
  const [management, setManagement] =
    useState<AdminAdditionalChargeManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chargeSheetOpen, setChargeSheetOpen] = useState(false);
  const [editingCharge, setEditingCharge] =
    useState<AdminAdditionalChargeSummary | null>(null);
  const [chargeForm, setChargeForm] =
    useState<ChargeFormState>(emptyChargeForm);
  const [cancelChargeTarget, setCancelChargeTarget] =
    useState<AdminAdditionalChargeSummary | null>(null);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [requestClientRequestId, setRequestClientRequestId] =
    useState<string | null>(null);
  const [cancelRequestTarget, setCancelRequestTarget] =
    useState<AdminGuestPaymentRequestSummary | null>(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState<readonly string[]>(
    [],
  );
  const intlLocale = locale === "en" ? "en-US" : "es-GT";

  const resolveError = useCallback(
    (code: string): string => {
      if (code in copy.errors) {
        return copy.errors[code as keyof typeof copy.errors];
      }

      return copy.errors.ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR;
    },
    [copy.errors],
  );

  const loadManagement = useCallback(
    async (showLoading = false): Promise<boolean> => {
      if (!reservationId) {
        return false;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/admin/reservations/${encodeURIComponent(
            reservationId,
          )}/additional-charges`,
          {
            headers: { accept: "application/json" },
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as ManagementResponse;

        if (!response.ok || !isManagementResponse(payload)) {
          const code = isErrorResponse(payload)
            ? payload.error.code
            : "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR";
          setErrorMessage(resolveError(code));
          return false;
        }

        setManagement(payload.management);
        setSelectedChargeIds((current) => {
          const eligibleIds = new Set(
            payload.management.charges
              .filter((charge) => charge.canRequest)
              .map((charge) => charge.id),
          );

          return current.filter((id) => eligibleIds.has(id));
        });
        return true;
      } catch {
        setErrorMessage(
          resolveError("ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR"),
        );
        return false;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [reservationId, resolveError],
  );

  useEffect(() => {
    void loadManagement(true);
  }, [loadManagement]);

  const selectedCharges = useMemo(() => {
    if (!management) {
      return [];
    }

    const selected = new Set(selectedChargeIds);
    return management.charges.filter(
      (charge) => charge.canRequest && selected.has(charge.id),
    );
  }, [management, selectedChargeIds]);

  const selectedTotal = useMemo(
    () =>
      selectedCharges.reduce(
        (total, charge) => total + Number(charge.amount),
        0,
      ),
    [selectedCharges],
  );

  function formatMoney(amount: string | number): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  }

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function categoryLabel(category: AdditionalChargeCategory): string {
    return copy.categories[category];
  }

  function chargeStatusLabel(status: AdminAdditionalChargeSummary["status"]) {
    return copy.chargeStatuses[status];
  }

  function requestStatusLabel(
    status: AdminGuestPaymentRequestSummary["status"],
  ) {
    return copy.requestStatuses[status];
  }

  function resetChargeForm(): void {
    setEditingCharge(null);
    setChargeForm(emptyChargeForm);
  }

  function openCreateCharge(): void {
    resetChargeForm();
    setChargeSheetOpen(true);
  }

  function openEditCharge(charge: AdminAdditionalChargeSummary): void {
    setEditingCharge(charge);
    setChargeForm({
      category: charge.category,
      description: charge.description,
      internalNote: charge.internalNote ?? "",
      amount: charge.amount,
    });
    setChargeSheetOpen(true);
  }

  async function runMutation(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body: object,
    busyValue: string,
  ): Promise<boolean> {
    setBusyKey(busyValue);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as MutationResponse;

      if (!response.ok || isErrorResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        return false;
      }

      await loadManagement();
      return true;
    } catch {
      setErrorMessage(copy.errors.ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR);
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function saveCharge(): Promise<void> {
    if (!chargeForm.description.trim() || !chargeForm.amount.trim()) {
      setErrorMessage(copy.errors.INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST);
      return;
    }

    const body = {
      category: chargeForm.category,
      description: chargeForm.description,
      internalNote: chargeForm.internalNote.trim() || null,
      amount: chargeForm.amount,
    };

    const success = editingCharge
      ? await runMutation(
          `/api/admin/additional-charges/${encodeURIComponent(
            editingCharge.id,
          )}`,
          "PATCH",
          {
            ...body,
            expectedUpdatedAt: editingCharge.updatedAt,
          },
          `charge-save-${editingCharge.id}`,
        )
      : await runMutation(
          `/api/admin/reservations/${encodeURIComponent(
            reservationId,
          )}/additional-charges`,
          "POST",
          body,
          "charge-create",
        );

    if (success) {
      setChargeSheetOpen(false);
      setSuccessMessage(
        editingCharge ? copy.success.updated : copy.success.created,
      );
      resetChargeForm();
    }
  }

  async function cancelCharge(): Promise<void> {
    if (!cancelChargeTarget) {
      return;
    }

    const target = cancelChargeTarget;
    const success = await runMutation(
      `/api/admin/additional-charges/${encodeURIComponent(target.id)}`,
      "DELETE",
      { expectedUpdatedAt: target.updatedAt },
      `charge-cancel-${target.id}`,
    );

    if (success) {
      setCancelChargeTarget(null);
      setSuccessMessage(copy.success.cancelled);
    }
  }

  function toggleChargeSelection(chargeId: string): void {
    setSelectedChargeIds((current) =>
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    );
  }

  function openPaymentRequestSheet(): void {
    setRequestClientRequestId(window.crypto.randomUUID());
    setRequestSheetOpen(true);
  }

  async function createPaymentRequest(): Promise<void> {
    if (selectedCharges.length === 0) {
      setErrorMessage(
        copy.errors.ADMIN_GUEST_PAYMENT_REQUEST_CHARGES_REQUIRED,
      );
      return;
    }

    const clientRequestId =
      requestClientRequestId ?? window.crypto.randomUUID();

    if (!requestClientRequestId) {
      setRequestClientRequestId(clientRequestId);
    }

    const success = await runMutation(
      `/api/admin/reservations/${encodeURIComponent(
        reservationId,
      )}/guest-payment-requests`,
      "POST",
      {
        clientRequestId,
        charges: selectedCharges.map((charge) => ({
          chargeId: charge.id,
          expectedUpdatedAt: charge.updatedAt,
        })),
      },
      "request-create",
    );

    if (success) {
      setRequestSheetOpen(false);
      setRequestClientRequestId(null);
      setSelectedChargeIds([]);
      setSuccessMessage(copy.success.requestCreated);
    }
  }

  async function cancelPaymentRequest(): Promise<void> {
    if (!cancelRequestTarget) {
      return;
    }

    const target = cancelRequestTarget;
    const success = await runMutation(
      `/api/admin/guest-payment-requests/${encodeURIComponent(target.id)}`,
      "DELETE",
      { expectedUpdatedAt: target.updatedAt },
      `request-cancel-${target.id}`,
    );

    if (success) {
      setCancelRequestTarget(null);
      setSuccessMessage(copy.success.requestCancelled);
    }
  }

  if (loading) {
    return (
      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.loading}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <ReceiptText aria-hidden="true" className="size-4" />
              {copy.badge}
            </div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <Button
            disabled={!management?.canCreateCharge}
            onClick={openCreateCharge}
            type="button"
          >
            <Plus aria-hidden="true" />
            {copy.actions.createCharge}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-8">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">
              {copy.notes.financialIsolationTitle}
            </p>
            <p className="mt-1">{copy.notes.financialIsolation}</p>
          </div>

          {!management?.canCreateCharge ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.states.reservationNotEligible}
            </p>
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {copy.sections.charges}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.notes.chargeBoundary}
                </p>
              </div>
              <Button
                disabled={selectedCharges.length === 0}
                onClick={openPaymentRequestSheet}
                type="button"
                variant="outline"
              >
                <CreditCard aria-hidden="true" />
                {copy.actions.createRequest}
                {selectedCharges.length > 0
                  ? ` (${selectedCharges.length})`
                  : ""}
              </Button>
            </div>

            {management && management.charges.length > 0 ? (
              <div className="grid gap-3">
                {management.charges.map((charge) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                    key={charge.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <Button
                          aria-label={`${copy.actions.selectCharge}: ${charge.description}`}
                          aria-pressed={selectedChargeIds.includes(charge.id)}
                          className="mt-0.5 size-8 shrink-0 rounded-xl p-0"
                          disabled={!charge.canRequest}
                          onClick={() => toggleChargeSelection(charge.id)}
                          type="button"
                          variant={
                            selectedChargeIds.includes(charge.id)
                              ? "default"
                              : "outline"
                          }
                        >
                          <Check aria-hidden="true" className="size-4" />
                        </Button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {categoryLabel(charge.category)}
                            </p>
                            <Badge variant="outline">
                              {chargeStatusLabel(charge.status)}
                            </Badge>
                            {charge.activePaymentRequestId ? (
                              <Badge variant="secondary">
                                {copy.states.activeRequest}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 break-words text-sm leading-6 text-foreground">
                            {charge.description}
                          </p>
                          {charge.internalNote ? (
                            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {copy.labels.internalNote}:
                              </span>
                              {charge.internalNote}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {copy.labels.createdAt}: {formatDateTime(charge.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                        <p className="text-xl font-semibold tabular-nums">
                          {formatMoney(charge.amount)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {charge.canEdit ? (
                            <Button
                              onClick={() => openEditCharge(charge)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <PencilLine aria-hidden="true" />
                              {copy.actions.editCharge}
                            </Button>
                          ) : null}
                          {charge.canCancel ? (
                            <Button
                              onClick={() => setCancelChargeTarget(charge)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 aria-hidden="true" />
                              {copy.actions.cancelCharge}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {copy.empty.charges}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                {copy.sections.requests}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.notes.requestBoundary}
              </p>
            </div>

            {management && management.paymentRequests.length > 0 ? (
              <div className="grid gap-3">
                {management.paymentRequests.map((request) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all text-sm font-semibold">
                            {copy.labels.request} {request.id}
                          </p>
                          <Badge variant="outline">
                            {requestStatusLabel(request.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {copy.labels.expiresAt}:{" "}
                          {formatDateTime(request.expiresAt)}
                        </p>
                        <div className="mt-4 grid gap-2">
                          {request.items.map((item) => (
                            <div
                              className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                              key={item.id}
                            >
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {categoryLabel(item.category)}
                                </p>
                                <p className="break-words text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold tabular-nums">
                                {formatMoney(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {copy.labels.total}
                          </p>
                          <p className="text-xl font-semibold tabular-nums">
                            {formatMoney(request.totalAmount)}
                          </p>
                        </div>
                        {request.canCancel ? (
                          <Button
                            onClick={() => setCancelRequestTarget(request)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 aria-hidden="true" />
                            {copy.actions.cancelRequest}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {copy.empty.requests}
              </p>
            )}
          </section>
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("charge-save")) {
            setChargeSheetOpen(false);
            resetChargeForm();
          }
        }}
        open={chargeSheetOpen}
      >
        <SheetContent
          className="overflow-y-auto"
          closeLabel={copy.actions.close}
        >
          <SheetHeader>
            <SheetTitle>
              {editingCharge
                ? copy.editDialog.title
                : copy.createDialog.title}
            </SheetTitle>
            <SheetDescription>
              {editingCharge
                ? copy.editDialog.description
                : copy.createDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 px-6 py-2 pb-6">
            <ChargeSelect
              label={copy.labels.category}
              onChange={(category) =>
                setChargeForm((current) => ({ ...current, category }))
              }
              options={ADDITIONAL_CHARGE_CATEGORIES}
              renderOption={categoryLabel}
              value={chargeForm.category}
            />
            <ChargeTextArea
              label={copy.labels.description}
              maxLength={1_000}
              onChange={(description) =>
                setChargeForm((current) => ({ ...current, description }))
              }
              placeholder={copy.placeholders.description}
              value={chargeForm.description}
            />
            <ChargeTextArea
              label={copy.labels.internalNote}
              maxLength={2_000}
              onChange={(internalNote) =>
                setChargeForm((current) => ({ ...current, internalNote }))
              }
              placeholder={copy.placeholders.internalNote}
              value={chargeForm.internalNote}
            />
            <ChargeInput
              inputMode="decimal"
              label={copy.labels.amount}
              min="0.01"
              onChange={(amount) =>
                setChargeForm((current) => ({ ...current, amount }))
              }
              placeholder={copy.placeholders.amount}
              step="0.01"
              type="number"
              value={chargeForm.amount}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {editingCharge
                ? copy.editDialog.boundary
                : copy.createDialog.boundary}
            </p>
          </div>
          <SheetFooter>
            <Button
              disabled={busyKey !== null}
              onClick={() => {
                setChargeSheetOpen(false);
                resetChargeForm();
              }}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null}
              onClick={() => void saveCharge()}
              type="button"
            >
              {busyKey?.startsWith("charge-save") ||
              busyKey === "charge-create"
                ? copy.actions.saving
                : copy.actions.saveCharge}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("charge-cancel-")) {
            setCancelChargeTarget(null);
          }
        }}
        open={cancelChargeTarget !== null}
      >
        <SheetContent closeLabel={copy.actions.close}>
          <SheetHeader>
            <SheetTitle>{copy.cancelChargeDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.cancelChargeDialog.description}
            </SheetDescription>
          </SheetHeader>
          {cancelChargeTarget ? (
            <div className="mx-6 mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="font-medium">
                {categoryLabel(cancelChargeTarget.category)} ·{" "}
                {formatMoney(cancelChargeTarget.amount)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {cancelChargeTarget.description}
              </p>
            </div>
          ) : null}
          <SheetFooter className="mt-6">
            <Button
              disabled={busyKey !== null}
              onClick={() => setCancelChargeTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null}
              onClick={() => void cancelCharge()}
              type="button"
            >
              {copy.actions.confirmCancelCharge}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (busyKey !== "request-create") {
            setRequestSheetOpen(open);
            if (!open) {
              setRequestClientRequestId(null);
            }
          }
        }}
        open={requestSheetOpen}
      >
        <SheetContent
          className="overflow-y-auto"
          closeLabel={copy.actions.close}
        >
          <SheetHeader>
            <SheetTitle>{copy.createRequestDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.createRequestDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-6 py-4">
            {selectedCharges.map((charge) => (
              <div
                className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm"
                key={charge.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {categoryLabel(charge.category)}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {charge.description}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(charge.amount)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium">{copy.labels.total}</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(selectedTotal)}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {copy.createRequestDialog.boundary}
            </p>
          </div>
          <SheetFooter>
            <Button
              disabled={busyKey !== null}
              onClick={() => {
                setRequestSheetOpen(false);
                setRequestClientRequestId(null);
              }}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null || selectedCharges.length === 0}
              onClick={() => void createPaymentRequest()}
              type="button"
            >
              {busyKey === "request-create"
                ? copy.actions.creatingRequest
                : copy.actions.confirmCreateRequest}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("request-cancel-")) {
            setCancelRequestTarget(null);
          }
        }}
        open={cancelRequestTarget !== null}
      >
        <SheetContent closeLabel={copy.actions.close}>
          <SheetHeader>
            <SheetTitle>{copy.cancelRequestDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.cancelRequestDialog.description}
            </SheetDescription>
          </SheetHeader>
          {cancelRequestTarget ? (
            <div className="mx-6 mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="break-all font-medium">
                {copy.labels.request} {cancelRequestTarget.id}
              </p>
              <p className="mt-1 text-muted-foreground">
                {copy.labels.total}: {formatMoney(cancelRequestTarget.totalAmount)}
              </p>
            </div>
          ) : null}
          <SheetFooter className="mt-6">
            <Button
              disabled={busyKey !== null}
              onClick={() => setCancelRequestTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null}
              onClick={() => void cancelPaymentRequest()}
              type="button"
            >
              {copy.actions.confirmCancelRequest}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AdminSnackbar
        closeLabel={copy.actions.close}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <AdminSnackbar
        closeLabel={copy.actions.close}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </>
  );
}

function ChargeInput({
  inputMode,
  label,
  min,
  onChange,
  placeholder,
  step,
  type = "text",
  value,
}: Readonly<{
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
  type?: "number" | "text";
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        inputMode={inputMode}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function ChargeTextArea({
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: Readonly<{
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <textarea
        className="min-h-28 resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function ChargeSelect({
  label,
  onChange,
  options,
  renderOption,
  value,
}: Readonly<{
  label: string;
  onChange: (value: AdditionalChargeCategory) => void;
  options: readonly AdditionalChargeCategory[];
  renderOption: (value: AdditionalChargeCategory) => string;
  value: AdditionalChargeCategory;
}>) {
  return (
    <div className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Select
        onValueChange={(nextValue) =>
          onChange(nextValue as AdditionalChargeCategory)
        }
        value={value}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {renderOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
