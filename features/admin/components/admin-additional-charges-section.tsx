"use client";

import {
  Check,
  Copy,
  CreditCard,
  Mail,
  PencilLine,
  Plus,
  ReceiptText,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Accordion } from "@/components/ui/accordion";
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
  AdminGuestPaymentRequestEmailNotificationSummary,
  AdminGuestPaymentRequestSummary,
} from "@/types/admin-additional-charge";
import type { AdminEmailNotificationResendResult } from "@/types/admin-email-notification-resend";
import type {
  AdminRefundConsultResult,
  AdminRefundAuthorizationResult,
  AdminRefundErrorCode,
  AdminRefundExecutionResult,
  AdminRefundProcessingMode,
  AdminRefundReconciliationResult,
  AdminRefundSummary,
} from "@/types/admin-refund";

import { AdminSnackbar } from "./admin-snackbar";
import {
  AdminRefundExecutionSheet,
  AdminRefundOperationCard,
  AdminRefundReconciliationSheet,
  hasConclusiveRefundConsultEvidence,
  initialRefundReconciliationDraft,
  refundConsultOutcome,
  type AdminRefundOperationalPayment,
  type AdminRefundReconciliationDraft,
} from "./admin-refund-operational-controls";

type ChargeFormState = Readonly<{
  category: AdditionalChargeCategory;
  description: string;
  internalNote: string;
  amount: string;
}>;

type RefundFormState = Readonly<{
  amount: string;
  reason: string;
  processingMode: AdminRefundProcessingMode;
}>;

type ManagementResponse =
  | Readonly<{ management: AdminAdditionalChargeManagement }>
  | Readonly<{ error: { code: AdminAdditionalChargeErrorCode | string } }>;

type MutationResponse =
  | Readonly<{
      charge?: AdminAdditionalChargeSummary;
      paymentRequest?: AdminGuestPaymentRequestSummary;
      result?: AdminRefundAuthorizationResult;
    }>
  | Readonly<{ error: { code: AdminAdditionalChargeErrorCode | string } }>;

type PaymentLinkResponse =
  | Readonly<{ paymentUrl: string }>
  | Readonly<{ error: { code: AdminAdditionalChargeErrorCode | string } }>;

type EmailResendResponse =
  | Readonly<{ result: AdminEmailNotificationResendResult }>
  | Readonly<{ error: { code: string } }>;

type RefundApiResponse<Result> = Readonly<{
  result?: Result;
  error?: Readonly<{ code?: AdminRefundErrorCode }>;
}>;

type EmailResendTarget = Readonly<{
  request: AdminGuestPaymentRequestSummary;
  notification: AdminGuestPaymentRequestEmailNotificationSummary;
}>;

type RefundOperationTarget = Readonly<{
  refund: AdminRefundSummary;
  payment: AdminRefundOperationalPayment;
}>;

const emptyChargeForm: ChargeFormState = {
  category: "OTHER",
  description: "",
  internalNote: "",
  amount: "",
};

const emptyRefundForm: RefundFormState = {
  amount: "",
  reason: "",
  processingMode: "TILOPAY_API",
};

function isManagementResponse(
  response: ManagementResponse,
): response is { management: AdminAdditionalChargeManagement } {
  return "management" in response;
}

function isErrorResponse(
  response:
    | ManagementResponse
    | MutationResponse
    | PaymentLinkResponse
    | EmailResendResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function isPaymentLinkResponse(
  response: PaymentLinkResponse,
): response is { paymentUrl: string } {
  return "paymentUrl" in response && typeof response.paymentUrl === "string";
}

function isEmailResendSuccessResponse(
  response: EmailResendResponse,
): response is { result: AdminEmailNotificationResendResult } {
  return "result" in response;
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
  const [resendEmailTarget, setResendEmailTarget] =
    useState<EmailResendTarget | null>(null);
  const [resendEmailRequestId, setResendEmailRequestId] = useState("");
  const [refundTarget, setRefundTarget] =
    useState<AdminAdditionalChargeSummary | null>(null);
  const [refundForm, setRefundForm] =
    useState<RefundFormState>(emptyRefundForm);
  const [refundRequestId, setRefundRequestId] = useState<string | null>(null);
  const [executionTarget, setExecutionTarget] =
    useState<RefundOperationTarget | null>(null);
  const [executionRequestId, setExecutionRequestId] = useState("");
  const [reconciliationTarget, setReconciliationTarget] =
    useState<RefundOperationTarget | null>(null);
  const [reconciliationRequestId, setReconciliationRequestId] = useState("");
  const [reconciliationDraft, setReconciliationDraft] =
    useState<AdminRefundReconciliationDraft>({
      outcome: "APPROVED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "",
      note: "",
    });
  const [selectedChargeIds, setSelectedChargeIds] = useState<readonly string[]>(
    [],
  );
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const refundCopy = messages.admin.reservationsPage.refunds;
  const isBusy = busyKey !== null;
  const reconciliationRefund = reconciliationTarget?.refund ?? null;
  const reconciliationConsultOutcome = refundConsultOutcome(reconciliationRefund);
  const reconciliationHasConclusiveConsultEvidence =
    hasConclusiveRefundConsultEvidence(reconciliationRefund);

  const resolveError = useCallback(
    (code: string): string => {
      if (code in copy.errors) {
        return copy.errors[code as keyof typeof copy.errors];
      }

      return copy.errors.ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR;
    },
    [copy],
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

  function formatRefundMoney(amount: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(amount));
  }

  function formatDateTime(value: string | null): string {
    if (!value) return copy.labels.unavailable;

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

  function notificationStatusLabel(
    status: AdminGuestPaymentRequestEmailNotificationSummary["status"],
  ): string {
    return copy.notificationStatuses[status];
  }

  function notificationOriginLabel(
    origin: AdminGuestPaymentRequestEmailNotificationSummary["origin"],
  ): string {
    return copy.notificationOrigins[origin];
  }

  function notificationLocaleLabel(
    value: AdminGuestPaymentRequestEmailNotificationSummary["locale"],
  ): string {
    return copy.notificationLocales[value];
  }

  function refundStatusLabel(status: string): string {
    return (
      refundCopy.statuses[status as keyof typeof refundCopy.statuses] ??
      copy.refundStatuses[status as keyof typeof copy.refundStatuses] ??
      status
    );
  }

  function refundModeLabel(mode: string): string {
    return (
      refundCopy.processingModes[
        mode as keyof typeof refundCopy.processingModes
      ] ??
      copy.processingModes[mode as keyof typeof copy.processingModes] ??
      mode
    );
  }

  function refundAuthorizationTypeLabel(type: string): string {
    return (
      refundCopy.authorizationTypes[
        type as keyof typeof refundCopy.authorizationTypes
      ] ?? type
    );
  }

  function refundClassificationLabel(classification: string): string {
    return (
      refundCopy.resultClassifications[
        classification as keyof typeof refundCopy.resultClassifications
      ] ?? classification
    );
  }

  function refundErrorMessage(code: AdminRefundErrorCode | undefined): string {
    return code
      ? (refundCopy.errors[code] ?? refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR)
      : refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR;
  }

  function emailResendSuccessMessage(
    result: AdminEmailNotificationResendResult,
  ): string {
    if (result.outcome === "sent") return copy.success.emailSent;
    if (result.outcome === "failed") return copy.success.emailFailed;
    if (result.outcome === "already-processed") {
      return copy.success.emailAlreadyProcessed;
    }
    return copy.success.emailQueued;
  }

  function refundSummaryFromAllocation(
    allocation: AdminAdditionalChargeSummary["refundAllocations"][number],
  ): AdminRefundSummary {
    return {
      id: allocation.refundId,
      paymentId: allocation.paymentId,
      lifecycleRequestId: null,
      refundOperationKey: allocation.refundOperationKey,
      requestedByAdmin: allocation.requestedByAdmin,
      clientRequestId: allocation.clientRequestId,
      authorizationType: allocation.authorizationType,
      amount: allocation.refundAmount,
      currency: allocation.currency,
      reason: allocation.reason,
      status: allocation.status,
      processingMode: allocation.processingMode,
      providerRefundId: allocation.providerRefundId,
      processingStartedAt: allocation.processingStartedAt,
      approvedAt: allocation.approvedAt,
      failedAt: allocation.failedAt,
      failureCode: allocation.failureCode,
      diagnostics: allocation.diagnostics,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
    };
  }

  function paymentForCharge(
    charge: AdminAdditionalChargeSummary,
  ): AdminRefundOperationalPayment | null {
    if (!charge.paymentId || !charge.paymentUpdatedAt) {
      return null;
    }

    return {
      id: charge.paymentId,
      providerReference: charge.providerReference,
      updatedAt: charge.paymentUpdatedAt,
    };
  }

  function resetChargeForm(): void {
    setEditingCharge(null);
    setChargeForm(emptyChargeForm);
  }

  function resetRefundForm(): void {
    setRefundTarget(null);
    setRefundForm(emptyRefundForm);
    setRefundRequestId(null);
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

  function openRefundSheet(charge: AdminAdditionalChargeSummary): void {
    if (!charge.canRefund || !charge.paymentId || !charge.paymentUpdatedAt) {
      setErrorMessage(copy.errors.ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE);
      return;
    }

    setRefundTarget(charge);
    setRefundRequestId(window.crypto.randomUUID());
    setRefundForm({
      amount: charge.remainingRefundableAmount,
      reason: "",
      processingMode: charge.providerReference
        ? "TILOPAY_API"
        : "TILOPAY_PORTAL_FALLBACK",
    });
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

  async function authorizeAdditionalChargeRefund(): Promise<void> {
    if (
      !refundTarget ||
      !refundTarget.paymentId ||
      !refundTarget.paymentUpdatedAt ||
      !refundForm.reason.trim() ||
      Number(refundForm.amount) <= 0 ||
      Number(refundForm.amount) >
        Number(refundTarget.remainingRefundableAmount)
    ) {
      setErrorMessage(copy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    const clientRequestId = refundRequestId ?? window.crypto.randomUUID();

    if (!refundRequestId) {
      setRefundRequestId(clientRequestId);
    }

    const success = await runMutation(
      `/api/admin/reservations/${encodeURIComponent(
        reservationId,
      )}/additional-charges/refunds`,
      "POST",
      {
        paymentId: refundTarget.paymentId,
        amount: refundForm.amount,
        reason: refundForm.reason,
        processingMode: refundForm.processingMode,
        requestId: clientRequestId,
        expectedPaymentUpdatedAt: refundTarget.paymentUpdatedAt,
        allocations: [
          {
            additionalChargeId: refundTarget.id,
            amount: refundForm.amount,
            expectedChargeUpdatedAt: refundTarget.updatedAt,
          },
        ],
      },
      `refund-authorize-${refundTarget.id}`,
    );

    if (success) {
      resetRefundForm();
      setSuccessMessage(copy.success.refundAuthorized);
    }
  }

  function openExecution(
    refund: AdminRefundSummary,
    payment: AdminRefundOperationalPayment | null,
  ): void {
    if (!payment) {
      setErrorMessage(refundCopy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setExecutionRequestId(window.crypto.randomUUID());
    setExecutionTarget({ refund, payment });
  }

  function openReconciliation(
    refund: AdminRefundSummary,
    payment: AdminRefundOperationalPayment | null,
  ): void {
    if (!payment) {
      setErrorMessage(refundCopy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setReconciliationRequestId(window.crypto.randomUUID());
    setReconciliationDraft(initialRefundReconciliationDraft(refund));
    setReconciliationTarget({ refund, payment });
  }

  async function executeRefund(): Promise<void> {
    if (!executionTarget || isBusy) return;

    setBusyKey(`execute:${executionTarget.refund.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(
          executionTarget.refund.id,
        )}/execute`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: executionRequestId,
            expectedRefundUpdatedAt: executionTarget.refund.updatedAt,
            expectedPaymentUpdatedAt: executionTarget.payment.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundExecutionResult>;

      if (!response.ok || !payload.result) {
        setErrorMessage(refundErrorMessage(payload.error?.code));
        return;
      }

      setExecutionTarget(null);

      const classification =
        payload.result.refund.diagnostics?.resultClassification;

      if (payload.result.refund.status === "FAILED") {
        setErrorMessage(
          classification === "PROVIDER_REJECTED"
            ? refundCopy.success.providerRejected
            : refundCopy.success.executionFailedSafely,
        );
      } else {
        setSuccessMessage(
          classification === "PROVIDER_ACCEPTED_PENDING_CONFIRMATION"
            ? refundCopy.success.providerAcceptedPending
            : refundCopy.success.providerUncertain,
        );
      }

      await loadManagement();
    } catch {
      setErrorMessage(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function consultRefund(refund: AdminRefundSummary): Promise<void> {
    if (isBusy) return;

    setBusyKey(`consult:${refund.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(refund.id)}/consult`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: window.crypto.randomUUID(),
            expectedRefundUpdatedAt: refund.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundConsultResult>;

      if (!response.ok || !payload.result) {
        setErrorMessage(refundErrorMessage(payload.error?.code));
        return;
      }

      const classification =
        payload.result.refund.diagnostics?.resultClassification;

      setSuccessMessage(
        classification === "PROVIDER_ACCEPTED"
          ? refundCopy.success.consultedAccepted
          : classification === "PROVIDER_REJECTED"
            ? refundCopy.success.consultedRejected
            : refundCopy.success.consultedInconclusive,
      );
      await loadManagement();
    } catch {
      setErrorMessage(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function reconcileRefund(): Promise<void> {
    if (
      !reconciliationTarget ||
      isBusy ||
      !reconciliationDraft.note.trim()
    ) {
      setErrorMessage(refundCopy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    if (
      reconciliationDraft.outcome === "APPROVED" &&
      !reconciliationDraft.providerRefundId.trim()
    ) {
      setErrorMessage(refundCopy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    setBusyKey(`reconcile:${reconciliationTarget.refund.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(
          reconciliationTarget.refund.id,
        )}/reconcile`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...reconciliationDraft,
            providerRefundId:
              reconciliationDraft.providerRefundId.trim() || null,
            requestId: reconciliationRequestId,
            expectedRefundUpdatedAt: reconciliationTarget.refund.updatedAt,
            expectedPaymentUpdatedAt: reconciliationTarget.payment.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundReconciliationResult>;

      if (!response.ok || !payload.result) {
        setErrorMessage(refundErrorMessage(payload.error?.code));
        return;
      }

      setReconciliationTarget(null);
      setSuccessMessage(
        payload.result.refund.status === "APPROVED"
          ? refundCopy.success.reconciledApproved
          : refundCopy.success.reconciledFailed,
      );
      await loadManagement();
    } catch {
      setErrorMessage(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
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

  async function copyPaymentRequestLink(
    request: AdminGuestPaymentRequestSummary,
  ): Promise<void> {
    setBusyKey(`request-copy-${request.id}`);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/guest-payment-requests/${encodeURIComponent(
          request.id,
        )}/payment-link`,
        {
          headers: {
            accept: "application/json",
          },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => ({
        error: {
          code: "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR",
        },
      }))) as PaymentLinkResponse;

      if (!response.ok || !isPaymentLinkResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        return;
      }

      await navigator.clipboard.writeText(payload.paymentUrl);
      setSuccessMessage(copy.success.requestLinkCopied);
    } catch {
      setErrorMessage(copy.errors.clipboardFailed);
    } finally {
      setBusyKey(null);
    }
  }

  function openEmailResend(
    request: AdminGuestPaymentRequestSummary,
    notification: AdminGuestPaymentRequestEmailNotificationSummary,
  ): void {
    setResendEmailTarget({ request, notification });
    setResendEmailRequestId(window.crypto.randomUUID());
  }

  async function resendPaymentRequestEmail(): Promise<void> {
    if (!resendEmailTarget || !resendEmailRequestId) {
      return;
    }

    const { request, notification } = resendEmailTarget;
    setBusyKey(`email-resend-${notification.id}`);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/email-notifications/${encodeURIComponent(
          notification.id,
        )}/resend`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId: request.reservationId,
            expectedUpdatedAt: notification.updatedAt,
            requestId: resendEmailRequestId,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({
        error: {
          code: "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
        },
      }))) as EmailResendResponse;

      if (!response.ok || !isEmailResendSuccessResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        return;
      }

      setResendEmailTarget(null);
      setResendEmailRequestId("");
      setSuccessMessage(emailResendSuccessMessage(payload.result));
      await loadManagement();
    } catch {
      setErrorMessage(copy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
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
                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                            <DetailMetric
                              label={copy.labels.capturedAmount}
                              value={formatMoney(charge.capturedAmount)}
                            />
                            <DetailMetric
                              label={copy.labels.refundedAmount}
                              value={formatMoney(charge.refundedAmount)}
                            />
                            <DetailMetric
                              label={copy.labels.remainingRefundableAmount}
                              value={formatMoney(charge.remainingRefundableAmount)}
                            />
                          </div>
                          {charge.refundAllocations.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              <p className="text-xs font-medium text-foreground">
                                {copy.labels.refundHistory}
                              </p>
                              <Accordion
                                className="grid gap-2"
                                collapsible
                                type="single"
                              >
                                {charge.refundAllocations.map((allocation) => {
                                  const refund =
                                    refundSummaryFromAllocation(allocation);
                                  const payment = paymentForCharge(charge);

                                  return (
                                    <AdminRefundOperationCard
                                      apiExecutionEnabled={
                                        management.refundApiExecutionEnabled
                                      }
                                      authorizationTypeLabel={refundAuthorizationTypeLabel(
                                        refund.authorizationType,
                                      )}
                                      busyAction={busyKey}
                                      classificationLabel={refundClassificationLabel}
                                      copy={refundCopy}
                                      extraDetails={[
                                        {
                                          label: copy.labels.allocatedAmount,
                                          value: formatMoney(
                                            allocation.allocatedAmount,
                                          ),
                                        },
                                      ]}
                                      formatDateTime={formatDateTime}
                                      formatMoney={formatRefundMoney}
                                      key={allocation.id}
                                      modeLabel={refundModeLabel(
                                        refund.processingMode,
                                      )}
                                      onConsult={() =>
                                        void consultRefund(refund)
                                      }
                                      onExecute={() =>
                                        openExecution(refund, payment)
                                      }
                                      onReconcile={() =>
                                        openReconciliation(refund, payment)
                                      }
                                      payment={payment}
                                      refund={refund}
                                      statusLabel={refundStatusLabel(
                                        refund.status,
                                      )}
                                    />
                                  );
                                })}
                              </Accordion>
                            </div>
                          ) : null}
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
                          {charge.canRefund ? (
                            <Button
                              onClick={() => openRefundSheet(charge)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <RotateCcw aria-hidden="true" />
                              {copy.actions.refundCharge}
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
                        <div className="mt-4 grid gap-2">
                          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                            <Mail aria-hidden="true" className="size-3.5" />
                            {copy.labels.notificationDelivery}
                          </p>
                          {request.emailNotifications.length > 0 ? (
                            request.emailNotifications.map((notification) => (
                              <div
                                className="rounded-xl border border-border/60 bg-background p-3 text-xs"
                                key={notification.id}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">
                                        {notificationStatusLabel(
                                          notification.status,
                                        )}
                                      </Badge>
                                      <Badge variant="secondary">
                                        {notificationOriginLabel(
                                          notification.origin,
                                        )}
                                      </Badge>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
                                      <DetailMetric
                                        label={copy.labels.recipient}
                                        value={notification.recipient}
                                      />
                                      <DetailMetric
                                        label={copy.labels.locale}
                                        value={notificationLocaleLabel(
                                          notification.locale,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.attempts}
                                        value={String(notification.attemptCount)}
                                      />
                                      <DetailMetric
                                        label={copy.labels.emailCreatedAt}
                                        value={formatDateTime(
                                          notification.createdAt,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.requestedAt}
                                        value={formatDateTime(
                                          notification.requestedAt,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.lastAttemptAt}
                                        value={formatDateTime(
                                          notification.lastAttemptAt,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.nextAttemptAt}
                                        value={formatDateTime(
                                          notification.nextAttemptAt,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.sentAt}
                                        value={formatDateTime(
                                          notification.sentAt,
                                        )}
                                      />
                                      <DetailMetric
                                        label={copy.labels.errorCode}
                                        value={
                                          notification.errorCode ??
                                          copy.labels.unavailable
                                        }
                                      />
                                    </div>
                                  </div>
                                  {notification.canResend ? (
                                    <Button
                                      disabled={busyKey !== null}
                                      onClick={() =>
                                        openEmailResend(request, notification)
                                      }
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                    >
                                      <Send aria-hidden="true" />
                                      {busyKey ===
                                      `email-resend-${notification.id}`
                                        ? copy.actions.resendingEmail
                                        : copy.actions.resendEmail}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                              {copy.empty.notifications}
                            </p>
                          )}
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
                        <div className="flex flex-wrap justify-end gap-2">
                          {request.canCopyLink ? (
                            <Button
                              disabled={busyKey !== null}
                              onClick={() => void copyPaymentRequestLink(request)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Copy aria-hidden="true" />
                              {busyKey === `request-copy-${request.id}`
                                ? copy.actions.copyingRequestLink
                                : copy.actions.copyRequestLink}
                            </Button>
                          ) : null}
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

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("email-resend-")) {
            setResendEmailTarget(null);
            setResendEmailRequestId("");
          }
        }}
        open={resendEmailTarget !== null}
      >
        <SheetContent closeLabel={copy.actions.close}>
          <SheetHeader>
            <SheetTitle>{copy.resendEmailDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.resendEmailDialog.description}
            </SheetDescription>
          </SheetHeader>
          {resendEmailTarget ? (
            <div className="mx-6 mt-4 grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="break-all font-medium">
                {copy.labels.request} {resendEmailTarget.request.id}
              </p>
              <DetailMetric
                label={copy.labels.recipient}
                value={resendEmailTarget.notification.recipient}
              />
              <DetailMetric
                label={copy.labels.notificationStatus}
                value={notificationStatusLabel(
                  resendEmailTarget.notification.status,
                )}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.resendEmailDialog.boundary}
              </p>
            </div>
          ) : null}
          <SheetFooter className="mt-6">
            <Button
              disabled={busyKey !== null}
              onClick={() => {
                setResendEmailTarget(null);
                setResendEmailRequestId("");
              }}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null || !resendEmailTarget}
              onClick={() => void resendPaymentRequestEmail()}
              type="button"
            >
              {busyKey?.startsWith("email-resend-")
                ? copy.actions.resendingEmail
                : copy.actions.confirmResendEmail}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("refund-authorize-")) {
            resetRefundForm();
          }
        }}
        open={refundTarget !== null}
      >
        <SheetContent
          className="overflow-y-auto"
          closeLabel={copy.actions.close}
        >
          <SheetHeader>
            <SheetTitle>{copy.refundDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.refundDialog.description}
            </SheetDescription>
          </SheetHeader>
          {refundTarget ? (
            <div className="grid gap-5 px-6 py-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                <p className="font-medium">
                  {categoryLabel(refundTarget.category)} ·{" "}
                  {formatMoney(refundTarget.amount)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {refundTarget.description}
                </p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <DetailMetric
                    label={copy.labels.capturedAmount}
                    value={formatMoney(refundTarget.capturedAmount)}
                  />
                  <DetailMetric
                    label={copy.labels.refundedAmount}
                    value={formatMoney(refundTarget.refundedAmount)}
                  />
                  <DetailMetric
                    label={copy.labels.remainingRefundableAmount}
                    value={formatMoney(refundTarget.remainingRefundableAmount)}
                  />
                </div>
              </div>
              <ChargeInput
                inputMode="decimal"
                label={copy.labels.amount}
                max={refundTarget.remainingRefundableAmount}
                min="0.01"
                onChange={(amount) =>
                  setRefundForm((current) => ({ ...current, amount }))
                }
                placeholder={copy.placeholders.amount}
                step="0.01"
                type="number"
                value={refundForm.amount}
              />
              <ChargeTextArea
                label={copy.labels.reason}
                maxLength={2_000}
                onChange={(reason) =>
                  setRefundForm((current) => ({ ...current, reason }))
                }
                placeholder={copy.placeholders.refundReason}
                value={refundForm.reason}
              />
              <div className="grid gap-2 text-sm font-medium text-foreground">
                <span>{copy.labels.processingMode}</span>
                <Select
                  onValueChange={(processingMode) =>
                    setRefundForm((current) => ({
                      ...current,
                      processingMode:
                        processingMode as AdminRefundProcessingMode,
                    }))
                  }
                  value={refundForm.processingMode}
                >
                  <SelectTrigger aria-label={copy.labels.processingMode}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TILOPAY_API">
                      {copy.processingModes.TILOPAY_API}
                    </SelectItem>
                    <SelectItem value="TILOPAY_PORTAL_FALLBACK">
                      {copy.processingModes.TILOPAY_PORTAL_FALLBACK}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.refundDialog.boundary}
              </p>
            </div>
          ) : null}
          <SheetFooter>
            <Button
              disabled={busyKey !== null}
              onClick={resetRefundForm}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={busyKey !== null || !refundTarget}
              onClick={() => void authorizeAdditionalChargeRefund()}
              type="button"
            >
              {busyKey?.startsWith("refund-authorize-")
                ? copy.actions.authorizingRefund
                : copy.actions.confirmAuthorizeRefund}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AdminRefundExecutionSheet
        busyAction={busyKey}
        closeLabel={copy.actions.close}
        copy={refundCopy}
        formatMoney={formatRefundMoney}
        isBusy={isBusy}
        onClose={() => setExecutionTarget(null)}
        onConfirm={() => void executeRefund()}
        refund={executionTarget?.refund ?? null}
      />

      <AdminRefundReconciliationSheet
        busyAction={busyKey}
        closeLabel={copy.actions.close}
        consultOutcome={reconciliationConsultOutcome}
        copy={refundCopy}
        draft={reconciliationDraft}
        hasConclusiveConsultEvidence={
          reconciliationHasConclusiveConsultEvidence
        }
        isBusy={isBusy}
        modeLabel={refundModeLabel}
        onClose={() => setReconciliationTarget(null)}
        onConfirm={() => void reconcileRefund()}
        refund={reconciliationTarget?.refund ?? null}
        setDraft={(update) => setReconciliationDraft(update)}
      />

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
  max,
  min,
  onChange,
  placeholder,
  step,
  type = "text",
  value,
}: Readonly<{
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  max?: string;
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
        max={max}
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

function DetailMetric({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
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
