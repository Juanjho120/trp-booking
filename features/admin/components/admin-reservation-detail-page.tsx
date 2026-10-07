"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  ExternalLink,
  History,
  Loader2,
  Mail,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import {
  getAdminReservationEmailNotificationTypeLabel,
  groupAdminReservationEmailNotifications,
} from "@/features/admin/email-notification-display";
import { useLocale } from "@/features/i18n";
import type {
  AdminReservationDetailFocus,
  AdminReservationDetailTab,
} from "@/lib/admin/reservation-detail-focus";
import type {
  AdminEmailNotificationResendErrorCode,
  AdminEmailNotificationResendResult,
} from "@/types/admin-email-notification-resend";
import type { AdminPaymentSubmissionAttemptHistory as AdminPaymentSubmissionAttemptHistoryData } from "@/types/admin-payment-submission-attempt";
import type {
  AdminReservationDetailEmailNotification,
  AdminReservationPricingBreakdown,
} from "@/types/admin-reservation-detail";
import type {
  AdminReservationChangesTab,
  AdminReservationDetailServerTab,
  AdminReservationDetailShell,
  AdminReservationDetailTabPayload,
  AdminReservationEmailsTab,
  AdminReservationFinancialTab,
  AdminReservationHistoryTab,
  AdminReservationLifecycleTab,
  AdminReservationOverviewTab,
  AdminReservationRefundsTab,
} from "@/types/admin-reservation-detail-tabs";
import type { Locale } from "@/types/locale";

import { AdminAdditionalChargesSection } from "./admin-additional-charges-section";
import { AdminPageHeader } from "./admin-page-header";
import { AdminPaymentSubmissionAttemptHistory } from "./admin-payment-submission-attempt-history";
import {
  AdminRecordPagination,
  useAdminRecordPagination,
} from "./admin-record-pagination";
import { AdminReservationCancellationSection } from "./admin-reservation-cancellation-section";
import { AdminReservationDateMutationSection } from "./admin-reservation-date-mutation-section";
import { AdminReservationLifecycleAdjustmentRefundSection } from "./admin-reservation-lifecycle-adjustment-refund-section";
import { AdminReservationOperationalHistorySection } from "./admin-reservation-operational-history-section";
import { AdminReservationRefundSection } from "./admin-reservation-refund-section";
import { AdminSnackbar } from "./admin-snackbar";

type FinancialNestedTab = "summary" | "attempts";
type ClientDataKey = AdminReservationDetailServerTab | "additionalCharges";
type CacheStatus = "idle" | "loading" | "ready" | "refreshing" | "error";

type CacheEntry<T> = Readonly<{
  data: T | null;
  error: string | null;
  stale: boolean;
  status: CacheStatus;
}>;

type ManualResendTarget = Readonly<{
  notification: AdminReservationDetailEmailNotification;
  requestId: string;
}>;

type ManualResendApiResponse = Readonly<{
  result?: AdminEmailNotificationResendResult;
  error?: Readonly<{
    code?: AdminEmailNotificationResendErrorCode;
  }>;
}>;

const manuallyResendableTypes = new Set([
  "RESERVATION_CONFIRMED",
  "ADMIN_NEW_RESERVATION",
]);
const manuallyResendableStatuses = new Set(["PENDING", "FAILED", "SENT"]);
const effectiveRefundStatuses = new Set(["APPROVED", "MANUAL"]);
const adminReservationDetailTabs = new Set<AdminReservationDetailTab>([
  "reservation",
  "financial",
  "emails",
  "lifecycle",
  "additionalCharges",
  "refunds",
  "changes",
  "history",
]);

function emptyCache<T>(): CacheEntry<T> {
  return {
    data: null,
    error: null,
    stale: false,
    status: "idle",
  };
}

function isAdminReservationDetailTab(
  value: string,
): value is AdminReservationDetailTab {
  return adminReservationDetailTabs.has(value as AdminReservationDetailTab);
}

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function canManuallyResend(
  notification: AdminReservationDetailEmailNotification,
  reservationStatus: string,
): boolean {
  return (
    reservationStatus === "CONFIRMED" &&
    manuallyResendableTypes.has(notification.type) &&
    manuallyResendableStatuses.has(notification.status) &&
    (notification.status === "SENT" || !notification.hasManualResends)
  );
}

export function AdminReservationDetailPage({
  initialActiveTab,
  initialFocus = null,
  reservationShell,
}: Readonly<{
  initialActiveTab: AdminReservationDetailTab;
  initialFocus?: AdminReservationDetailFocus | null;
  reservationShell: AdminReservationDetailShell;
}>) {
  const { locale, messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const detailCopy = reservationCopy.detailTabs;
  const paymentCopy = messages.admin.paymentsPage;
  const reservationStatuses = messages.admin.statuses.reservation;
  const paymentStatuses = messages.admin.statuses.payment;
  const emailNotificationStatuses = messages.admin.statuses.emailNotification;
  const notificationCopy = reservationCopy.notifications;
  const correspondenceCopy = reservationCopy.correspondence;
  const intlLocale = getIntlLocale(locale);
  const [activeReservationTab, setActiveReservationTab] =
    useState<AdminReservationDetailTab>(initialActiveTab);
  const [activeFinancialTab, setActiveFinancialTab] =
    useState<FinancialNestedTab>("summary");
  const [visitedTabs, setVisitedTabs] = useState<
    ReadonlySet<AdminReservationDetailTab>
  >(() => new Set([initialActiveTab]));
  const [reservationCache, setReservationCache] = useState<
    CacheEntry<AdminReservationOverviewTab>
  >(emptyCache);
  const [financialCache, setFinancialCache] = useState<
    CacheEntry<AdminReservationFinancialTab>
  >(emptyCache);
  const [attemptsCache, setAttemptsCache] = useState<
    CacheEntry<AdminPaymentSubmissionAttemptHistoryData>
  >(emptyCache);
  const [emailsCache, setEmailsCache] =
    useState<CacheEntry<AdminReservationEmailsTab>>(emptyCache);
  const [lifecycleCache, setLifecycleCache] =
    useState<CacheEntry<AdminReservationLifecycleTab>>(emptyCache);
  const [refundsCache, setRefundsCache] =
    useState<CacheEntry<AdminReservationRefundsTab>>(emptyCache);
  const [changesCache, setChangesCache] =
    useState<CacheEntry<AdminReservationChangesTab>>(emptyCache);
  const [historyCache, setHistoryCache] =
    useState<CacheEntry<AdminReservationHistoryTab>>(emptyCache);
  const [additionalChargesReloadVersion, setAdditionalChargesReloadVersion] =
    useState(0);
  const [manualResendTarget, setManualResendTarget] =
    useState<ManualResendTarget | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const isBusy = busyNotificationId !== null;

  const setCacheForTab = useCallback(
    (payload: AdminReservationDetailTabPayload): void => {
      switch (payload.tab) {
        case "reservation":
          setReservationCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "financial":
          setFinancialCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "payment-attempts":
          setAttemptsCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "emails":
          setEmailsCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "lifecycle":
          setLifecycleCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "refunds":
          setRefundsCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "changes":
          setChangesCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
          return;
        case "history":
          setHistoryCache({
            data: payload.data,
            error: null,
            stale: false,
            status: "ready",
          });
      }
    },
    [],
  );

  const updateCacheStatus = useCallback(
    (tab: AdminReservationDetailServerTab, status: CacheStatus): void => {
      const update = <T,>(entry: CacheEntry<T>): CacheEntry<T> => ({
        ...entry,
        error: null,
        status,
      });

      switch (tab) {
        case "reservation":
          setReservationCache(update);
          return;
        case "financial":
          setFinancialCache(update);
          return;
        case "payment-attempts":
          setAttemptsCache(update);
          return;
        case "emails":
          setEmailsCache(update);
          return;
        case "lifecycle":
          setLifecycleCache(update);
          return;
        case "refunds":
          setRefundsCache(update);
          return;
        case "changes":
          setChangesCache(update);
          return;
        case "history":
          setHistoryCache(update);
      }
    },
    [],
  );

  const updateCacheError = useCallback(
    (tab: AdminReservationDetailServerTab, message: string): void => {
      const update = <T,>(entry: CacheEntry<T>): CacheEntry<T> => ({
        ...entry,
        error: message,
        status: "error",
      });

      switch (tab) {
        case "reservation":
          setReservationCache(update);
          return;
        case "financial":
          setFinancialCache(update);
          return;
        case "payment-attempts":
          setAttemptsCache(update);
          return;
        case "emails":
          setEmailsCache(update);
          return;
        case "lifecycle":
          setLifecycleCache(update);
          return;
        case "refunds":
          setRefundsCache(update);
          return;
        case "changes":
          setChangesCache(update);
          return;
        case "history":
          setHistoryCache(update);
      }
    },
    [],
  );

  const markTabsStale = useCallback((tabs: readonly ClientDataKey[]): void => {
    const update = <T,>(entry: CacheEntry<T>): CacheEntry<T> => ({
      ...entry,
      stale: entry.data !== null || entry.status === "ready",
    });

    for (const tab of tabs) {
      switch (tab) {
        case "reservation":
          setReservationCache(update);
          break;
        case "financial":
          setFinancialCache(update);
          break;
        case "payment-attempts":
          setAttemptsCache(update);
          break;
        case "emails":
          setEmailsCache(update);
          break;
        case "lifecycle":
          setLifecycleCache(update);
          break;
        case "refunds":
          setRefundsCache(update);
          break;
        case "changes":
          setChangesCache(update);
          break;
        case "history":
          setHistoryCache(update);
          break;
        case "additionalCharges":
          break;
      }
    }
  }, []);

  const getCacheForTab = useCallback(
    (tab: AdminReservationDetailServerTab): CacheEntry<unknown> => {
      switch (tab) {
        case "reservation":
          return reservationCache;
        case "financial":
          return financialCache;
        case "payment-attempts":
          return attemptsCache;
        case "emails":
          return emailsCache;
        case "lifecycle":
          return lifecycleCache;
        case "refunds":
          return refundsCache;
        case "changes":
          return changesCache;
        case "history":
          return historyCache;
      }
    },
    [
      attemptsCache,
      changesCache,
      emailsCache,
      financialCache,
      historyCache,
      lifecycleCache,
      refundsCache,
      reservationCache,
    ],
  );

  const loadServerTab = useCallback(
    async (
      tab: AdminReservationDetailServerTab,
      options: Readonly<{ force?: boolean }> = {},
    ): Promise<void> => {
      const current = getCacheForTab(tab);

      if (
        !options.force &&
        (current.status === "loading" ||
          current.status === "refreshing" ||
          (current.status === "ready" && !current.stale))
      ) {
        return;
      }

      updateCacheStatus(tab, current.data ? "refreshing" : "loading");

      try {
        const response = await fetch(
          `/api/admin/reservations/${encodeURIComponent(
            reservationShell.id,
          )}/tabs/${encodeURIComponent(tab)}`,
          {
            cache: "no-store",
            headers: {
              accept: "application/json",
            },
          },
        );
        const payload = (await response.json()) as
          | AdminReservationDetailTabPayload
          | Readonly<{ error?: { code?: string } }>;

        if (!response.ok || !("data" in payload)) {
          updateCacheError(tab, detailCopy.loadFailed);
          return;
        }

        setCacheForTab(payload);
      } catch {
        updateCacheError(tab, detailCopy.loadFailed);
      }
    },
    [
      detailCopy.loadFailed,
      getCacheForTab,
      reservationShell.id,
      setCacheForTab,
      updateCacheError,
      updateCacheStatus,
    ],
  );

  useEffect(() => {
    setVisitedTabs((current) => {
      if (current.has(activeReservationTab)) {
        return current;
      }

      return new Set([...current, activeReservationTab]);
    });
  }, [activeReservationTab]);

  useEffect(() => {
    if (activeReservationTab === "additionalCharges") {
      return;
    }

    const tab =
      activeReservationTab === "reservation"
        ? "reservation"
        : activeReservationTab;

    void loadServerTab(tab);
  }, [activeReservationTab, loadServerTab]);

  useEffect(() => {
    if (activeReservationTab === "financial") {
      void loadServerTab(
        activeFinancialTab === "attempts" ? "payment-attempts" : "financial",
      );
    }
  }, [activeFinancialTab, activeReservationTab, loadServerTab]);

  useEffect(() => {
    if (!initialFocus) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    url.searchParams.delete("focusId");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;

    window.history.replaceState(window.history.state, "", nextUrl);
  }, [initialFocus]);

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return reservationCopy.labels.unavailable;
    }

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

  function reservationStatusLabel(status: string): string {
    return (
      reservationStatuses[status as keyof typeof reservationStatuses] ?? status
    );
  }

  function paymentStatusLabel(status: string): string {
    return paymentStatuses[status as keyof typeof paymentStatuses] ?? status;
  }

  function emailNotificationStatusLabel(status: string): string {
    return (
      emailNotificationStatuses[
        status as keyof typeof emailNotificationStatuses
      ] ?? status
    );
  }

  function emailNotificationTypeLabel(type: string): string {
    return getAdminReservationEmailNotificationTypeLabel(
      notificationCopy.types,
      type,
    );
  }

  function emailNotificationLocaleLabel(value: string): string {
    return (
      notificationCopy.locales[value as keyof typeof notificationCopy.locales] ??
      value
    );
  }

  function emailNotificationOriginLabel(value: string): string {
    return (
      notificationCopy.origins[value as keyof typeof notificationCopy.origins] ??
      value
    );
  }

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function copyTextWithSelection(value: string): boolean {
    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.inset = "0 auto auto 0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function copyGuestEmailForZoho(guestEmail: string): Promise<void> {
    clearFeedback();

    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(guestEmail);
        copied = true;
      } catch {
        copied = copyTextWithSelection(guestEmail);
      }
    } else {
      copied = copyTextWithSelection(guestEmail);
    }

    if (copied) {
      setSuccessFeedback(correspondenceCopy.success.copied);
    } else {
      setErrorFeedback(correspondenceCopy.errors.copyFailed);
    }
  }

  function openManualResend(
    notification: AdminReservationDetailEmailNotification,
  ): void {
    clearFeedback();
    setManualResendTarget({
      notification,
      requestId: crypto.randomUUID(),
    });
  }

  function manualResendErrorMessage(
    code: AdminEmailNotificationResendErrorCode | undefined,
  ): string {
    return code
      ? notificationCopy.errors[code] ??
          notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR
      : notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR;
  }

  function manualResendSuccessMessage(
    result: AdminEmailNotificationResendResult,
  ): string {
    if (result.outcome === "sent") {
      return notificationCopy.success.sent;
    }

    if (result.outcome === "already-processed") {
      return notificationCopy.success.alreadyProcessed;
    }

    if (result.outcome === "failed") {
      return result.retryScheduled
        ? notificationCopy.success.failedRetryScheduled
        : notificationCopy.success.failedTerminal;
    }

    return notificationCopy.success.queued;
  }

  async function confirmManualResend(): Promise<void> {
    const emailData = emailsCache.data;

    if (!manualResendTarget || isBusy || !emailData) {
      return;
    }

    clearFeedback();
    setBusyNotificationId(manualResendTarget.notification.id);

    try {
      const response = await fetch(
        `/api/admin/email-notifications/${encodeURIComponent(
          manualResendTarget.notification.id,
        )}/resend`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId: reservationShell.id,
            expectedUpdatedAt: manualResendTarget.notification.updatedAt,
            requestId: manualResendTarget.requestId,
          }),
        },
      );
      const payload = (await response.json()) as ManualResendApiResponse;

      if (!response.ok || !payload.result) {
        setErrorFeedback(manualResendErrorMessage(payload.error?.code));
        return;
      }

      const feedback = manualResendSuccessMessage(payload.result);

      if (payload.result.outcome === "failed") {
        setErrorFeedback(feedback);
      } else {
        setSuccessFeedback(feedback);
      }

      setManualResendTarget(null);
      markTabsStale(["history"]);
      await loadServerTab("emails", { force: true });
    } catch {
      setErrorFeedback(
        notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR,
      );
    } finally {
      setBusyNotificationId(null);
    }
  }

  function reloadActiveUnit(): void {
    if (activeReservationTab === "additionalCharges") {
      setAdditionalChargesReloadVersion((value) => value + 1);
      return;
    }

    if (activeReservationTab === "financial") {
      void loadServerTab(
        activeFinancialTab === "attempts" ? "payment-attempts" : "financial",
        { force: true },
      );
      return;
    }

    const tab =
      activeReservationTab === "reservation"
        ? "reservation"
        : activeReservationTab;
    void loadServerTab(tab, { force: true });
  }

  function handleLifecycleChanged(): void {
    markTabsStale(["reservation", "changes", "refunds", "financial", "history"]);
    void loadServerTab("lifecycle", { force: true });
  }

  function handleChangesChanged(): void {
    markTabsStale(["reservation", "financial", "refunds", "history"]);
    void loadServerTab("changes", { force: true });
  }

  function handleRefundsChanged(): void {
    markTabsStale(["financial", "history"]);
    void loadServerTab("refunds", { force: true });
  }

  function handleAdditionalChargesChanged(): void {
    markTabsStale(["financial", "refunds", "history"]);
  }

  function renderLoadingPanel(message: string) {
    return (
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {message}
        </CardContent>
      </Card>
    );
  }

  function renderErrorPanel(onReload: () => void) {
    return (
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-4 p-6 text-sm text-muted-foreground">
          <p>{detailCopy.loadFailed}</p>
          <Button className="w-fit" onClick={onReload} type="button" variant="outline">
            <RefreshCcw aria-hidden="true" />
            {detailCopy.reload}
          </Button>
        </CardContent>
      </Card>
    );
  }

  function renderEmailNotification(
    notification: AdminReservationDetailEmailNotification,
    reservationStatus: string,
  ) {
    return (
      <EmailNotificationCard
        actionLabel={
          notification.status === "SENT"
            ? notificationCopy.actions.sendAgain
            : notificationCopy.actions.retryNow
        }
        busy={busyNotificationId === notification.id}
        canResend={canManuallyResend(notification, reservationStatus)}
        formatDateTime={formatDateTime}
        key={notification.id}
        labels={notificationCopy.labels}
        localeLabel={emailNotificationLocaleLabel(notification.locale)}
        notification={notification}
        onRequestResend={() => openManualResend(notification)}
        originLabel={emailNotificationOriginLabel(notification.origin)}
        sendingLabel={notificationCopy.actions.sending}
        statusLabel={emailNotificationStatusLabel(notification.status)}
        typeLabel={emailNotificationTypeLabel(notification.type)}
        unavailableLabel={reservationCopy.labels.unavailable}
      />
    );
  }

  const shellBadge = reservationStatusLabel(reservationShell.status);
  const resendTargetWasSent =
    manualResendTarget?.notification.status === "SENT";

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/reservations">
              <ArrowLeft aria-hidden="true" />
              {reservationCopy.title}
            </Link>
          </Button>
        }
        badge={shellBadge}
        description={reservationCopy.description}
        title={`${reservationCopy.title} · ${reservationShell.id}`}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Tabs
        className="mt-6"
        onValueChange={(value) => {
          if (isAdminReservationDetailTab(value)) {
            setActiveReservationTab(value);
          }
        }}
        value={activeReservationTab}
      >
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <TabsList
            aria-label={reservationCopy.title}
            className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5"
          >
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="reservation">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.labels.reservation}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="financial">
              <CreditCard aria-hidden="true" className="size-4 shrink-0" />
              {paymentCopy.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="emails">
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {notificationCopy.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="lifecycle">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.cancellation.badge}
            </TabsTrigger>
            <TabsTrigger
              className="min-h-10 shrink-0 gap-2"
              value="additionalCharges"
            >
              <ReceiptText aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.additionalCharges.badge}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="refunds">
              <RefreshCcw aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.refunds.badge}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="changes">
              <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.dateMutation.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="history">
              <History aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.operationalHistory.badge}
            </TabsTrigger>
          </TabsList>
        </div>

        {visitedTabs.has("reservation") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="reservation"
          >
            <PanelToolbar
              busy={reservationCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            <ReservationOverviewPanel
              cache={reservationCache}
              copy={{
                loading: detailCopy.loading.reservation,
              }}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              formatMoney={formatMoney}
              onCopyGuestEmail={copyGuestEmailForZoho}
              renderError={() => renderErrorPanel(() => void loadServerTab("reservation", { force: true }))}
            />
          </TabsContent>
        ) : null}

        {visitedTabs.has("financial") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="financial"
          >
            <PanelToolbar
              busy={
                activeFinancialTab === "attempts"
                  ? attemptsCache.status === "refreshing"
                  : financialCache.status === "refreshing"
              }
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            <FinancialPanel
              activeTab={activeFinancialTab}
              attemptsCache={attemptsCache}
              financialCache={financialCache}
              formatDateTime={formatDateTime}
              formatMoney={formatMoney}
              onTabChange={setActiveFinancialTab}
              paymentStatusLabel={paymentStatusLabel}
              renderAttemptsError={() =>
                renderErrorPanel(() =>
                  void loadServerTab("payment-attempts", { force: true }),
                )
              }
              renderFinancialError={() =>
                renderErrorPanel(() =>
                  void loadServerTab("financial", { force: true }),
                )
              }
              renderLoadingPanel={renderLoadingPanel}
            />
          </TabsContent>
        ) : null}

        {visitedTabs.has("emails") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="emails"
          >
            <PanelToolbar
              busy={emailsCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            <EmailsPanel
              cache={emailsCache}
              renderEmailNotification={renderEmailNotification}
              renderError={() => renderErrorPanel(() => void loadServerTab("emails", { force: true }))}
              renderLoadingPanel={renderLoadingPanel}
            />
          </TabsContent>
        ) : null}

        {visitedTabs.has("lifecycle") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="lifecycle"
          >
            <PanelToolbar
              busy={lifecycleCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            {lifecycleCache.data ? (
              <div className="-mt-6">
                <AdminReservationCancellationSection
                  onDataChanged={handleLifecycleChanged}
                  reservation={lifecycleCache.data}
                />
              </div>
            ) : lifecycleCache.status === "error" ? (
              renderErrorPanel(() => void loadServerTab("lifecycle", { force: true }))
            ) : (
              renderLoadingPanel(detailCopy.loading.lifecycle)
            )}
          </TabsContent>
        ) : null}

        {visitedTabs.has("additionalCharges") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="additionalCharges"
          >
            <PanelToolbar
              busy={false}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            <AdminAdditionalChargesSection
              initialFocus={initialFocus}
              onDataChanged={handleAdditionalChargesChanged}
              reloadVersion={additionalChargesReloadVersion}
              reservationId={reservationShell.id}
            />
          </TabsContent>
        ) : null}

        {visitedTabs.has("refunds") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="refunds"
          >
            <PanelToolbar
              busy={refundsCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            {refundsCache.data ? (
              <RefundsPanel
                focusedRefundId={
                  initialFocus?.kind === "refund" ? initialFocus.focusId : null
                }
                onDataChanged={handleRefundsChanged}
                reservation={refundsCache.data}
              />
            ) : refundsCache.status === "error" ? (
              renderErrorPanel(() => void loadServerTab("refunds", { force: true }))
            ) : (
              renderLoadingPanel(detailCopy.loading.refunds)
            )}
          </TabsContent>
        ) : null}

        {visitedTabs.has("changes") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="changes"
          >
            <PanelToolbar
              busy={changesCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            {changesCache.data ? (
              <div className="-mt-6">
                <AdminReservationDateMutationSection
                  focusedLifecycleRequestId={
                    initialFocus?.kind === "lifecycleAdjustment"
                      ? initialFocus.focusId
                      : null
                  }
                  onDataChanged={handleChangesChanged}
                  reservation={changesCache.data}
                />
              </div>
            ) : changesCache.status === "error" ? (
              renderErrorPanel(() => void loadServerTab("changes", { force: true }))
            ) : (
              renderLoadingPanel(detailCopy.loading.changes)
            )}
          </TabsContent>
        ) : null}

        {visitedTabs.has("history") ? (
          <TabsContent
            className="mt-4 data-[state=inactive]:hidden sm:mt-6"
            forceMount
            value="history"
          >
            <PanelToolbar
              busy={historyCache.status === "refreshing"}
              label={detailCopy.reload}
              onReload={reloadActiveUnit}
            />
            {historyCache.data ? (
              <div className="-mt-6">
                <AdminReservationOperationalHistorySection
                  reservation={historyCache.data}
                />
              </div>
            ) : historyCache.status === "error" ? (
              renderErrorPanel(() => void loadServerTab("history", { force: true }))
            ) : (
              renderLoadingPanel(detailCopy.loading.history)
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setManualResendTarget(null);
          }
        }}
        open={manualResendTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {resendTargetWasSent
                ? notificationCopy.dialog.sendAgainTitle
                : notificationCopy.dialog.retryTitle}
            </SheetTitle>
            <SheetDescription>
              {resendTargetWasSent
                ? notificationCopy.dialog.sendAgainDescription
                : notificationCopy.dialog.retryDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 overflow-y-auto px-6 py-2 text-sm leading-6">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {notificationCopy.dialog.recipientLabel}
              </p>
              <p className="mt-1 break-all font-medium">
                {manualResendTarget?.notification.recipient}
              </p>
            </div>
            <p className="text-muted-foreground">
              {notificationCopy.dialog.historyNote}
            </p>
            <p className="text-muted-foreground">
              {notificationCopy.dialog.automaticSuppressionNote}
            </p>
            {resendTargetWasSent ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-foreground">
                {notificationCopy.dialog.duplicateWarning}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setManualResendTarget(null)}
              type="button"
              variant="outline"
            >
              {notificationCopy.actions.cancel}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void confirmManualResend()}
              type="button"
              variant={resendTargetWasSent ? "destructive" : "default"}
            >
              {isBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : resendTargetWasSent ? (
                <Send aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {isBusy
                ? notificationCopy.actions.sending
                : resendTargetWasSent
                  ? notificationCopy.actions.sendAgain
                  : notificationCopy.actions.retryNow}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PanelToolbar({
  busy,
  label,
  onReload,
}: Readonly<{
  busy: boolean;
  label: string;
  onReload: () => void;
}>) {
  return (
    <div className="mb-3 flex justify-end">
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-busy={busy}
              aria-label={label}
              disabled={busy}
              onClick={onReload}
              size="icon"
              type="button"
              variant="outline"
            >
              <RefreshCcw
                aria-hidden="true"
                className={busy ? "animate-spin" : undefined}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ReservationOverviewPanel({
  cache,
  copy,
  formatDate,
  formatDateTime,
  formatMoney,
  onCopyGuestEmail,
  renderError,
}: Readonly<{
  cache: CacheEntry<AdminReservationOverviewTab>;
  copy: Readonly<{ loading: string }>;
  formatDate: (value: string) => string;
  formatDateTime: (value: string | null) => string;
  formatMoney: (value: string, currency: string) => string;
  onCopyGuestEmail: (value: string) => Promise<void>;
  renderError: () => ReactNode;
}>) {
  const { locale, messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const paymentCopy = messages.admin.paymentsPage;
  const requestCopy = messages.reservations.request;
  const pendingCopy = messages.reservations.pendingHold;
  const correspondenceCopy = reservationCopy.correspondence;
  const reservation = cache.data;

  if (!reservation) {
    return cache.status === "error" ? (
      renderError()
    ) : (
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {copy.loading}
        </CardContent>
      </Card>
    );
  }

  const propertyName =
    locale === "en" ? reservation.property.nameEn : reservation.property.nameEs;

  return (
    <>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{reservation.guestName}</CardTitle>
          <CardDescription>{propertyName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <DetailValue
            label={reservationCopy.labels.reservation}
            value={reservation.id}
          />
          <DetailValue
            label={requestCopy.fields.checkInDate}
            value={formatDate(reservation.checkInDate)}
          />
          <DetailValue
            label={requestCopy.fields.checkOutDate}
            value={formatDate(reservation.checkOutDate)}
          />
          <DetailValue
            label={requestCopy.fields.guestEmail}
            value={reservation.guestEmail}
          />
          <DetailValue
            label={requestCopy.fields.guestPhone}
            value={reservation.guestPhone ?? reservationCopy.labels.unavailable}
          />
          <DetailValue
            label={requestCopy.fields.guestCountry}
            value={
              reservation.guestCountry ?? reservationCopy.labels.unavailable
            }
          />
          <DetailValue
            label={reservationCopy.labels.guests}
            value={String(reservation.guestCount)}
          />
          <DetailValue
            label={requestCopy.fields.arrivalTimeEstimate}
            value={
              reservation.arrivalTimeEstimate ??
              reservationCopy.labels.unavailable
            }
          />
          <DetailValue
            label={paymentCopy.labels.createdAt}
            value={formatDateTime(reservation.createdAt)}
          />
          {reservation.expiresAt ? (
            <DetailValue
              label={pendingCopy.expiresAt}
              value={formatDateTime(reservation.expiresAt)}
            />
          ) : null}
        </CardContent>
      </Card>

      <ReservationPricingBreakdownCard
        breakdown={reservation.pricingBreakdown}
        formatDate={formatDate}
        formatMoney={formatMoney}
      />

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{correspondenceCopy.title}</CardTitle>
          <CardDescription>{correspondenceCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {requestCopy.fields.guestEmail}
            </p>
            <p className="mt-1 break-all text-sm font-medium">
              {reservation.guestEmail}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {correspondenceCopy.helper}
            </p>
          </div>

          <Button asChild className="w-full shrink-0 sm:w-auto">
            <a
              href={siteConfig.correspondence.zohoMailWebUrl}
              onClick={() => void onCopyGuestEmail(reservation.guestEmail)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Mail aria-hidden="true" />
              <span className="hidden sm:inline">
                {correspondenceCopy.actions.openDesktop}
              </span>
              <span className="sm:hidden">
                {correspondenceCopy.actions.openMobile}
              </span>
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function FinancialPanel({
  activeTab,
  attemptsCache,
  financialCache,
  formatDateTime,
  formatMoney,
  onTabChange,
  paymentStatusLabel,
  renderAttemptsError,
  renderFinancialError,
  renderLoadingPanel,
}: Readonly<{
  activeTab: FinancialNestedTab;
  attemptsCache: CacheEntry<AdminPaymentSubmissionAttemptHistoryData>;
  financialCache: CacheEntry<AdminReservationFinancialTab>;
  formatDateTime: (value: string | null) => string;
  formatMoney: (value: string, currency: string) => string;
  onTabChange: (value: FinancialNestedTab) => void;
  paymentStatusLabel: (value: string) => string;
  renderAttemptsError: () => ReactNode;
  renderFinancialError: () => ReactNode;
  renderLoadingPanel: (message: string) => ReactNode;
}>) {
  const { messages } = useLocale();
  const detailCopy = messages.admin.reservationsPage.detailTabs;
  const financial = financialCache.data;
  const attempts = attemptsCache.data;

  return (
    <Tabs
      onValueChange={(value) => {
        if (value === "summary" || value === "attempts") {
          onTabChange(value);
        }
      }}
      value={activeTab}
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <TabsList
          aria-label={messages.admin.paymentsPage.title}
          className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0"
        >
          <TabsTrigger className="min-h-10 shrink-0" value="summary">
            {detailCopy.financial.summary}
          </TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0" value="attempts">
            {detailCopy.financial.attempts}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        className="mt-4 data-[state=inactive]:hidden"
        forceMount
        value="summary"
      >
        {!financial ? (
          financialCache.status === "error" ? (
            renderFinancialError()
          ) : (
            renderLoadingPanel(detailCopy.loading.financial)
          )
        ) : (
          <FinancialSummaryContent
            financial={financial}
            formatDateTime={formatDateTime}
            formatMoney={formatMoney}
            paymentStatusLabel={paymentStatusLabel}
          />
        )}
      </TabsContent>

      <TabsContent
        className="mt-4 data-[state=inactive]:hidden"
        forceMount
        value="attempts"
      >
        {!attempts ? (
          attemptsCache.status === "error" ? (
            renderAttemptsError()
          ) : (
            renderLoadingPanel(detailCopy.loading.paymentAttempts)
          )
        ) : (
          <AdminPaymentSubmissionAttemptHistory history={attempts} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function FinancialSummaryContent({
  financial,
  formatDateTime,
  formatMoney,
  paymentStatusLabel,
}: Readonly<{
  financial: AdminReservationFinancialTab;
  formatDateTime: (value: string | null) => string;
  formatMoney: (value: string, currency: string) => string;
  paymentStatusLabel: (value: string) => string;
}>) {
  const { messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const paymentCopy = messages.admin.paymentsPage;
  const requestCopy = messages.reservations.request;
  const paymentPagination = useAdminRecordPagination(financial.payments);
  const paginationLabels = {
    next: reservationCopy.actions.next,
    of: reservationCopy.labels.of,
    page: reservationCopy.labels.page,
    previous: reservationCopy.actions.previous,
    results: reservationCopy.labels.results,
  } as const;
  const paymentPurposeById = new Map(
    financial.payments.map((payment) => [payment.id, payment.purpose]),
  );
  const effectiveRefundAmount = financial.refunds
    .filter(
      (refund) =>
        refund.currency === financial.currency &&
        effectiveRefundStatuses.has(refund.status) &&
        paymentPurposeById.get(refund.paymentId) !== "ADDITIONAL_CHARGE",
    )
    .reduce((total, refund) => total + Number(refund.amount), 0);
  const netReservationTotal = Math.max(
    0,
    Number(financial.total) - effectiveRefundAmount,
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{requestCopy.quoteTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <MoneyRow
              label={requestCopy.quoteRows.subtotal}
              value={formatMoney(financial.subtotal, financial.currency)}
            />
            <MoneyRow
              label={requestCopy.quoteRows.cleaningFee}
              value={formatMoney(financial.cleaningFee, financial.currency)}
            />
            <MoneyRow
              label={requestCopy.quoteRows.taxes}
              value={formatMoney(financial.taxes, financial.currency)}
            />
            <MoneyRow
              label={requestCopy.quoteRows.discounts}
              value={formatMoney(financial.discounts, financial.currency)}
            />
            <MoneyRow
              label={reservationCopy.refunds.badge}
              value={formatMoney(
                (-effectiveRefundAmount).toFixed(2),
                financial.currency,
              )}
            />
            <MoneyRow
              emphasized
              label={requestCopy.quoteRows.total}
              value={formatMoney(
                netReservationTotal.toFixed(2),
                financial.currency,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="h-fit border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{paymentCopy.title}</CardTitle>
          <CardDescription>{paymentCopy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {financial.payments.length > 0 ? (
            <>
              <Accordion
                className="grid gap-3"
                collapsible
                key={`${paymentPagination.page}-${paymentPagination.pageSize}`}
                type="single"
              >
                {paymentPagination.pageItems.map((payment) => (
                  <AccordionItem
                    className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
                    key={payment.id}
                    value={payment.id}
                  >
                    <AccordionTrigger className="px-4 py-3 sm:px-5">
                      <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold">
                            {payment.id}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {payment.providerReference ??
                              paymentCopy.labels.unavailable}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                        <Badge
                          className="justify-self-start sm:justify-self-end"
                          variant="outline"
                        >
                          {paymentStatusLabel(payment.status)}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <DetailValue
                          label={paymentCopy.labels.order}
                          value={
                            payment.providerReference ??
                            paymentCopy.labels.unavailable
                          }
                        />
                        <DetailValue
                          label={paymentCopy.labels.createdAt}
                          value={formatDateTime(payment.createdAt)}
                        />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button asChild variant="outline">
                          <Link
                            href={`/admin/payments/${encodeURIComponent(
                              payment.id,
                            )}`}
                          >
                            {messages.common.viewDetails}
                            <ExternalLink aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <AdminRecordPagination
                labels={paginationLabels}
                onPageChange={paymentPagination.setPage}
                onPageSizeChange={paymentPagination.changePageSize}
                page={paymentPagination.page}
                pageSize={paymentPagination.pageSize}
                totalItems={paymentPagination.totalItems}
                totalPages={paymentPagination.totalPages}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {paymentCopy.empty.noPayments}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmailsPanel({
  cache,
  renderEmailNotification,
  renderError,
  renderLoadingPanel,
}: Readonly<{
  cache: CacheEntry<AdminReservationEmailsTab>;
  renderEmailNotification: (
    notification: AdminReservationDetailEmailNotification,
    reservationStatus: string,
  ) => ReactNode;
  renderError: () => ReactNode;
  renderLoadingPanel: (message: string) => ReactNode;
}>) {
  const { messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const emailData = cache.data;

  if (!emailData) {
    return cache.status === "error"
      ? renderError()
      : renderLoadingPanel(reservationCopy.detailTabs.loading.emails);
  }

  return (
    <EmailNotificationContent
      emailData={emailData}
      renderEmailNotification={renderEmailNotification}
    />
  );
}

function EmailNotificationContent({
  emailData,
  renderEmailNotification,
}: Readonly<{
  emailData: AdminReservationEmailsTab;
  renderEmailNotification: (
    notification: AdminReservationDetailEmailNotification,
    reservationStatus: string,
  ) => ReactNode;
}>) {
  const { messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const notificationCopy = reservationCopy.notifications;
  const emailNotificationGroups = useMemo(
    () => groupAdminReservationEmailNotifications(emailData.emailNotifications),
    [emailData.emailNotifications],
  );
  const guestEmailPagination = useAdminRecordPagination(
    emailNotificationGroups.guest,
  );
  const adminEmailPagination = useAdminRecordPagination(
    emailNotificationGroups.administration,
  );
  const defaultEmailGroup =
    emailNotificationGroups.guest.length > 0 ? "guest" : "administration";
  const paginationLabels = {
    next: reservationCopy.actions.next,
    of: reservationCopy.labels.of,
    page: reservationCopy.labels.page,
    previous: reservationCopy.actions.previous,
    results: reservationCopy.labels.results,
  } as const;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>{notificationCopy.title}</CardTitle>
        <CardDescription>{notificationCopy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {emailData.emailNotifications.length > 0 ? (
          <Tabs defaultValue={defaultEmailGroup}>
            <div className="-mx-1 overflow-x-auto px-1 pb-2">
              <TabsList
                aria-label={notificationCopy.title}
                className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0"
              >
                <TabsTrigger className="min-h-10 shrink-0 gap-2" value="guest">
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  {reservationCopy.labels.guests}
                  <Badge variant="secondary">
                    {emailNotificationGroups.guest.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  className="min-h-10 shrink-0 gap-2"
                  value="administration"
                >
                  <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                  {messages.footer.adminEmailLabel}
                  <Badge variant="secondary">
                    {emailNotificationGroups.administration.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              className="mt-4 data-[state=inactive]:hidden"
              forceMount
              value="guest"
            >
              {emailNotificationGroups.guest.length > 0 ? (
                <>
                  <Accordion
                    className="grid gap-3"
                    collapsible
                    key={`guest-${guestEmailPagination.page}-${guestEmailPagination.pageSize}`}
                    type="single"
                  >
                    {guestEmailPagination.pageItems.map((notification) =>
                      renderEmailNotification(notification, emailData.status),
                    )}
                  </Accordion>
                  <AdminRecordPagination
                    labels={paginationLabels}
                    onPageChange={guestEmailPagination.setPage}
                    onPageSizeChange={guestEmailPagination.changePageSize}
                    page={guestEmailPagination.page}
                    pageSize={guestEmailPagination.pageSize}
                    totalItems={guestEmailPagination.totalItems}
                    totalPages={guestEmailPagination.totalPages}
                  />
                </>
              ) : (
                <EmailGroupEmptyState label={reservationCopy.labels.results} />
              )}
            </TabsContent>

            <TabsContent
              className="mt-4 data-[state=inactive]:hidden"
              forceMount
              value="administration"
            >
              {emailNotificationGroups.administration.length > 0 ? (
                <>
                  <Accordion
                    className="grid gap-3"
                    collapsible
                    key={`administration-${adminEmailPagination.page}-${adminEmailPagination.pageSize}`}
                    type="single"
                  >
                    {adminEmailPagination.pageItems.map((notification) =>
                      renderEmailNotification(notification, emailData.status),
                    )}
                  </Accordion>
                  <AdminRecordPagination
                    labels={paginationLabels}
                    onPageChange={adminEmailPagination.setPage}
                    onPageSizeChange={adminEmailPagination.changePageSize}
                    page={adminEmailPagination.page}
                    pageSize={adminEmailPagination.pageSize}
                    totalItems={adminEmailPagination.totalItems}
                    totalPages={adminEmailPagination.totalPages}
                  />
                </>
              ) : (
                <EmailGroupEmptyState label={reservationCopy.labels.results} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">
            {notificationCopy.empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RefundsPanel({
  focusedRefundId,
  onDataChanged,
  reservation,
}: Readonly<{
  focusedRefundId: string | null;
  onDataChanged: () => void;
  reservation: AdminReservationRefundsTab;
}>) {
  const standardRefundReservation: AdminReservationRefundsTab = {
    ...reservation,
    refunds: reservation.refunds.filter(
      (refund) =>
        refund.authorizationType !== "LIFECYCLE_ADJUSTMENT" &&
        refund.authorizationType !== "ADDITIONAL_CHARGE",
    ),
  };

  return (
    <div className="-mt-6">
      <AdminReservationRefundSection
        focusedRefundId={focusedRefundId}
        onDataChanged={onDataChanged}
        reservation={standardRefundReservation}
      />
      <AdminReservationLifecycleAdjustmentRefundSection
        focusedRefundId={focusedRefundId}
        onDataChanged={onDataChanged}
        reservation={reservation}
      />
    </div>
  );
}

function EmailGroupEmptyState({ label }: Readonly<{ label: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      {label}: 0
    </div>
  );
}

function EmailNotificationCard({
  notification,
  typeLabel,
  statusLabel,
  localeLabel,
  originLabel,
  labels,
  unavailableLabel,
  formatDateTime,
  canResend,
  actionLabel,
  sendingLabel,
  busy,
  onRequestResend,
}: Readonly<{
  notification: AdminReservationDetailEmailNotification;
  typeLabel: string;
  statusLabel: string;
  localeLabel: string;
  originLabel: string;
  labels: {
    type: string;
    recipient: string;
    locale: string;
    origin: string;
    requestedBy: string;
    requestedAt: string;
    parentNotification: string;
    createdAt: string;
    status: string;
    attempts: string;
    lastAttempt: string;
    nextAttempt: string;
    scheduledFor: string;
    sentAt: string;
    providerMessageId: string;
    errorCode: string;
    errorMessage: string;
  };
  unavailableLabel: string;
  formatDateTime: (value: string | null) => string;
  canResend: boolean;
  actionLabel: string;
  sendingLabel: string;
  busy: boolean;
  onRequestResend: () => void;
}>) {
  const hasError = notification.errorCode || notification.errorMessage;
  const requestedBy = notification.requestedByAdmin
    ? notification.requestedByAdmin.name
      ? `${notification.requestedByAdmin.name} · ${notification.requestedByAdmin.email}`
      : notification.requestedByAdmin.email
    : unavailableLabel;

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
      value={notification.id}
    >
      <AccordionTrigger className="px-4 py-3 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {labels.type}
            </p>
            <p className="mt-1 break-words text-sm font-semibold">
              {typeLabel}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {labels.recipient}
            </p>
            <p className="mt-1 break-all text-sm font-medium">
              {notification.recipient}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline">{statusLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {labels.attempts}: {notification.attemptCount}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue label={labels.recipient} value={notification.recipient} />
          <DetailValue label={labels.locale} value={localeLabel} />
          <DetailValue label={labels.origin} value={originLabel} />
          <DetailValue
            label={labels.createdAt}
            value={formatDateTime(notification.createdAt)}
          />
          <DetailValue label={labels.status} value={statusLabel} />
          <DetailValue
            label={labels.attempts}
            value={String(notification.attemptCount)}
          />
          <DetailValue
            label={labels.lastAttempt}
            value={formatDateTime(notification.lastAttemptAt)}
          />
          <DetailValue
            label={labels.nextAttempt}
            value={formatDateTime(notification.nextAttemptAt)}
          />
          <DetailValue
            label={labels.scheduledFor}
            value={formatDateTime(notification.scheduledFor)}
          />
          <DetailValue
            label={labels.sentAt}
            value={formatDateTime(notification.sentAt)}
          />
          <DetailValue
            label={labels.providerMessageId}
            value={notification.providerMessageId ?? unavailableLabel}
          />
          {notification.origin === "MANUAL" ? (
            <>
              <DetailValue label={labels.requestedBy} value={requestedBy} />
              <DetailValue
                label={labels.requestedAt}
                value={formatDateTime(notification.requestedAt)}
              />
              <DetailValue
                label={labels.parentNotification}
                value={notification.parentNotificationId ?? unavailableLabel}
              />
            </>
          ) : null}
        </div>

        {hasError ? (
          <div className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2">
            <DetailValue
              label={labels.errorCode}
              value={notification.errorCode ?? unavailableLabel}
            />
            <DetailValue
              label={labels.errorMessage}
              value={notification.errorMessage ?? unavailableLabel}
            />
          </div>
        ) : null}

        {canResend ? (
          <div className="mt-4 flex justify-end border-t border-border/70 pt-4">
            <Button
              disabled={busy}
              onClick={onRequestResend}
              type="button"
              variant={notification.status === "SENT" ? "outline" : "default"}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : notification.status === "SENT" ? (
                <Send aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {busy ? sendingLabel : actionLabel}
            </Button>
          </div>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  emphasized = false,
}: Readonly<{ label: string; value: string; emphasized?: boolean }>) {
  return (
    <div
      className={
        emphasized
          ? "flex items-center justify-between gap-4 rounded-2xl bg-primary/10 p-4 font-semibold"
          : "flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4"
      }
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function ReservationPricingBreakdownCard({
  breakdown,
  formatDate,
  formatMoney,
}: Readonly<{
  breakdown: AdminReservationPricingBreakdown | null;
  formatDate: (value: string) => string;
  formatMoney: (value: string, currency: string) => string;
}>) {
  const { messages } = useLocale();
  const copy = messages.admin.reservationsPage.pricingBreakdown;

  function previousDate(value: string): string {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function sourceLabel(
    segment: NonNullable<AdminReservationPricingBreakdown>["segments"][number],
  ): string {
    if (segment.kind === "PRESERVED_LEGACY_STAY") {
      return copy.sources.PRESERVED_LEGACY_STAY;
    }

    if (segment.source === "SEASONAL") {
      return segment.seasonalRuleName
        ? `${copy.sources.SEASONAL} · ${segment.seasonalRuleName}`
        : copy.sources.SEASONAL;
    }

    if (
      segment.source === "LENGTH_OF_STAY" &&
      segment.minimumNights !== null
    ) {
      return copy.sources.LENGTH_OF_STAY.replace(
        "{minimumNights}",
        String(segment.minimumNights),
      );
    }

    return copy.sources.BASE;
  }

  return (
    <Card className="mt-6 border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {!breakdown ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.unavailable}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <span className="text-sm text-muted-foreground">
                {copy.subtotal}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(breakdown.subtotal, breakdown.currency)}
              </span>
            </div>

            <div className="grid gap-3">
              {breakdown.segments.map((segment, index) => (
                <div
                  className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={`${segment.startDate}-${segment.endDate}-${index}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {sourceLabel(segment)}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm font-medium">
                      {formatDate(segment.startDate)} —{" "}
                      {formatDate(previousDate(segment.endDate))}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {segment.nightlyRate
                        ? copy.nightsAtRate
                            .replace("{nights}", String(segment.nights))
                            .replace(
                              "{rate}",
                              formatMoney(
                                segment.nightlyRate,
                                breakdown.currency,
                              ),
                            )
                        : copy.legacyNights.replace(
                            "{nights}",
                            String(segment.nights),
                          )}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">
                      {copy.segmentSubtotal}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatMoney(segment.subtotal, breakdown.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
