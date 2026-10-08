"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  Download,
  ExternalLink,
  Inbox,
  MailOpen,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteConfig } from "@/config/site";
import { useLocale } from "@/features/i18n";
import type {
  AdminNotificationCenterData,
  AdminNotificationCenterItem,
} from "@/lib/admin";
import {
  ADMIN_NOTIFICATION_MOBILE_MEDIA_QUERY,
  shouldShowAdminNotificationConfiguration,
  type AdminNotificationsDisplayMode,
} from "@/lib/admin-notifications/center-routing";

import { AdminContextualHelp } from "./admin-contextual-help";
import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type PushConfig =
  | Readonly<{
      configured: false;
      vapidPublicKey: null;
    }>
  | Readonly<{
      configured: true;
      vapidPublicKey: string;
    }>;

type ApiErrorResponse = Readonly<{
  error: {
    code: string;
  };
}>;

type RegistrationResponse = Readonly<{
  registered: boolean;
}>;
type ReadNotificationResponse = Readonly<{
  readAt: string;
}>;

type ServiceWorkerState =
  | "checking"
  | "unsupported"
  | "registering"
  | "ready"
  | "error";
type SubscriptionState = "checking" | "subscribed" | "notSubscribed" | "error";
type ServerRegistrationState =
  | "checking"
  | "registered"
  | "notRegistered"
  | "unknown"
  | "error";
export type AdminNotificationsTab = "notifications" | "configuration";

export type AdminNotificationsDeviceState = Readonly<{
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | "unsupported";
  serviceWorkerState: ServiceWorkerState;
  subscriptionState: SubscriptionState;
  serverRegistrationState: ServerRegistrationState;
  displayMode: AdminNotificationsDisplayMode;
}>;

export function resolveAdminNotificationsDefaultTab(
  state: AdminNotificationsDeviceState,
): AdminNotificationsTab {
  return state.supported &&
    state.configured &&
    state.permission === "granted" &&
    state.serviceWorkerState === "ready" &&
    state.subscriptionState === "subscribed" &&
    state.serverRegistrationState === "registered" &&
    state.displayMode === "standalone"
    ? "notifications"
    : "configuration";
}

export function resolveAdminNotificationsActiveTab({
  selectedTab,
  deviceState,
  configurationNavigationVisible = true,
}: Readonly<{
  selectedTab: AdminNotificationsTab | null;
  deviceState: AdminNotificationsDeviceState;
  configurationNavigationVisible?: boolean;
}>): AdminNotificationsTab {
  if (!configurationNavigationVisible) {
    return "notifications";
  }

  return selectedTab ?? resolveAdminNotificationsDefaultTab(deviceState);
}

export function shouldAutoScrollAdminNotification({
  activeTab,
  displayMode,
  hasScrolledToInitialNotification,
  initialNotificationId,
  isMobileViewport,
  openNotificationId,
  targetElementAvailable,
}: Readonly<{
  activeTab: AdminNotificationsTab;
  displayMode: AdminNotificationsDisplayMode;
  hasScrolledToInitialNotification: boolean;
  initialNotificationId: string | null;
  isMobileViewport: boolean;
  openNotificationId: string;
  targetElementAvailable: boolean;
}>): boolean {
  return (
    activeTab === "notifications" &&
    initialNotificationId !== null &&
    openNotificationId === initialNotificationId &&
    targetElementAvailable &&
    !hasScrolledToInitialNotification &&
    (isMobileViewport || displayMode === "standalone")
  );
}

function hasApiError(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok || hasApiError(payload)) {
    const code = hasApiError(payload)
      ? payload.error.code
      : "ADMIN_PUSH_UNEXPECTED_ERROR";
    throw new Error(code);
  }

  return payload as T;
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return buffer;
}

function toSubscriptionPayload(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!serialized.endpoint || !p256dh || !auth) {
    throw new Error("INVALID_ADMIN_PUSH_REQUEST");
  }

  return {
    endpoint: serialized.endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function getDisplayMode(): AdminNotificationsDisplayMode {
  return window.matchMedia("(display-mode: standalone)").matches
    ? "standalone"
    : "browser";
}

function permissionValue(): NotificationPermission | "unsupported" {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function safeAdminTargetPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/admin/notifications";
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);

    if (
      parsed.origin !== window.location.origin ||
      !/^\/admin(?:\/|$)/.test(parsed.pathname)
    ) {
      return "/admin/notifications";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/admin/notifications";
  }
}

function formatNotificationTimestamp(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function copyTextWithSelection(value: string): boolean {
  const input = document.createElement("input");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.top = "0";
  input.style.left = "0";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  input.focus();
  input.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(input);
  }
}

export function AdminNotificationsPageView({
  initialNotificationId = null,
  notificationCenter,
}: Readonly<{
  initialNotificationId?: string | null;
  notificationCenter: AdminNotificationCenterData;
}>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.notificationsPage;
  const [recentNotifications, setRecentNotifications] = useState(
    notificationCenter.notifications,
  );
  const recentNotificationsRef = useRef(notificationCenter.notifications);
  const [unreadCount, setUnreadCount] = useState(
    notificationCenter.unreadCount,
  );
  const [openNotificationId, setOpenNotificationId] = useState(
    initialNotificationId ?? "",
  );
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [serviceWorkerState, setServiceWorkerState] =
    useState<ServiceWorkerState>("checking");
  const [subscriptionState, setSubscriptionState] =
    useState<SubscriptionState>("checking");
  const [serverRegistrationState, setServerRegistrationState] =
    useState<ServerRegistrationState>("unknown");
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [displayMode, setDisplayMode] = useState<AdminNotificationsDisplayMode>(
    "browser",
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [currentSubscription, setCurrentSubscription] =
    useState<PushSubscription | null>(null);
  const [busyAction, setBusyAction] = useState<
    "enable" | "disable" | "test" | null
  >(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<AdminNotificationsTab | null>(
    initialNotificationId ? "notifications" : null,
  );
  const notificationElementRefs = useRef(new Map<string, HTMLDivElement>());
  const initialNotificationScrollFrameRef = useRef<number | null>(null);
  const hasScrolledToInitialNotificationRef = useRef(false);
  const notificationPagination = notificationCenter.pagination;

  useEffect(() => {
    recentNotificationsRef.current = notificationCenter.notifications;
    setRecentNotifications(notificationCenter.notifications);
    setUnreadCount(notificationCenter.unreadCount);
    setOpenNotificationId(initialNotificationId ?? "");
    hasScrolledToInitialNotificationRef.current = false;
  }, [
    initialNotificationId,
    notificationCenter.notifications,
    notificationCenter.unreadCount,
  ]);

  const supported = serviceWorkerState !== "unsupported";
  const configured = config?.configured === true;
  const canEnable =
    supported &&
    configured &&
    permission !== "denied" &&
    busyAction === null &&
    serverRegistrationState !== "registered";
  const canDisable =
    busyAction === null && subscriptionState === "subscribed";
  const canTest =
    busyAction === null &&
    configured &&
    permission === "granted" &&
    subscriptionState === "subscribed" &&
    serverRegistrationState === "registered";

  const resolveError = useCallback(
    (code: string): string => {
      if (code in copy.errors) {
        return copy.errors[code as keyof typeof copy.errors];
      }

      return copy.errors.ADMIN_PUSH_UNEXPECTED_ERROR;
    },
    [copy],
  );

  const refreshCurrentDevice = useCallback(async () => {
    if (!isWebPushSupported()) {
      setServiceWorkerState("unsupported");
      setPermission("unsupported");
      setSubscriptionState("notSubscribed");
      setServerRegistrationState("notRegistered");
      return;
    }

    setPermission(permissionValue());
    setDisplayMode(getDisplayMode());
    setServiceWorkerState((current) =>
      current === "ready" ? "ready" : "registering",
    );

    try {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/admin/",
      });
      const registration = await navigator.serviceWorker.ready;
      setServiceWorkerState("ready");

      const subscription = await registration.pushManager.getSubscription();
      setCurrentSubscription(subscription);

      if (!subscription) {
        setSubscriptionState("notSubscribed");
        setServerRegistrationState("notRegistered");
        return;
      }

      setSubscriptionState("subscribed");
      setServerRegistrationState("checking");

      const payload = toSubscriptionPayload(subscription);
      const status = await requestJson<RegistrationResponse>(
        "/api/admin/push/subscriptions/status",
        {
          method: "POST",
          body: JSON.stringify({ endpoint: payload.endpoint }),
        },
      );

      setServerRegistrationState(
        status.registered ? "registered" : "notRegistered",
      );
    } catch (error) {
      setServiceWorkerState("error");
      setSubscriptionState("error");
      setServerRegistrationState("error");
      setErrorMessage(
        resolveError(
          error instanceof Error
            ? error.message
            : "ADMIN_PUSH_UNEXPECTED_ERROR",
        ),
      );
    }
  }, [resolveError]);

  useEffect(() => {
    let active = true;

    async function loadConfig(): Promise<void> {
      try {
        const payload = await requestJson<PushConfig>("/api/admin/push/config");
        if (active) {
          setConfig(payload);
        }
      } catch (error) {
        if (active) {
          setConfig({ configured: false, vapidPublicKey: null });
          setErrorMessage(
            resolveError(
              error instanceof Error
                ? error.message
                : "ADMIN_PUSH_UNEXPECTED_ERROR",
            ),
          );
        }
      }
    }

    void loadConfig();
    void refreshCurrentDevice();

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const viewportQuery = window.matchMedia(ADMIN_NOTIFICATION_MOBILE_MEDIA_QUERY);
    const onDisplayModeChange = () => setDisplayMode(getDisplayMode());
    const onViewportChange = () => setIsMobileViewport(viewportQuery.matches);

    onViewportChange();
    displayModeQuery.addEventListener("change", onDisplayModeChange);
    viewportQuery.addEventListener("change", onViewportChange);

    return () => {
      active = false;
      displayModeQuery.removeEventListener("change", onDisplayModeChange);
      viewportQuery.removeEventListener("change", onViewportChange);
    };
  }, [refreshCurrentDevice, resolveError]);

  async function enableNotifications(): Promise<void> {
    setBusyAction("enable");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!isWebPushSupported() || !config?.configured) {
        throw new Error("ADMIN_PUSH_UNAVAILABLE");
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("ADMIN_PUSH_PERMISSION_DENIED");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(config.vapidPublicKey),
        });
      }

      await requestJson<RegistrationResponse>("/api/admin/push/subscriptions", {
        method: "POST",
        body: JSON.stringify(toSubscriptionPayload(subscription)),
      });

      setSuccessMessage(copy.feedback.enabled);
      await refreshCurrentDevice();
    } catch (error) {
      setErrorMessage(
        resolveError(
          error instanceof Error
            ? error.message
            : "ADMIN_PUSH_UNEXPECTED_ERROR",
        ),
      );
      await refreshCurrentDevice();
    } finally {
      setBusyAction(null);
    }
  }

  async function disableNotifications(): Promise<void> {
    setBusyAction("disable");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        currentSubscription ?? (await registration.pushManager.getSubscription());

      if (!subscription) {
        await refreshCurrentDevice();
        return;
      }

      const payload = toSubscriptionPayload(subscription);
      await requestJson<RegistrationResponse>("/api/admin/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: payload.endpoint }),
      });

      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) {
        setErrorMessage(copy.errors.ADMIN_PUSH_BROWSER_UNSUBSCRIBE_FAILED);
      } else {
        setSuccessMessage(copy.feedback.disabled);
      }

      await refreshCurrentDevice();
    } catch (error) {
      setErrorMessage(
        resolveError(
          error instanceof Error
            ? error.message
            : "ADMIN_PUSH_UNEXPECTED_ERROR",
        ),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function sendTestNotification(): Promise<void> {
    setBusyAction("test");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!currentSubscription) {
        throw new Error("ADMIN_PUSH_SUBSCRIPTION_NOT_FOUND");
      }

      const payload = toSubscriptionPayload(currentSubscription);
      await requestJson<{ sent: true }>("/api/admin/push/test", {
        method: "POST",
        body: JSON.stringify({
          endpoint: payload.endpoint,
          locale,
        }),
      });

      setSuccessMessage(copy.feedback.testSent);
      await refreshCurrentDevice();
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "ADMIN_PUSH_UNEXPECTED_ERROR";

      if (code === "ADMIN_PUSH_SUBSCRIPTION_EXPIRED") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription =
            currentSubscription ??
            (await registration.pushManager.getSubscription());
          const unsubscribed = subscription
            ? await subscription.unsubscribe()
            : true;

          setErrorMessage(
            unsubscribed
              ? resolveError(code)
              : copy.errors.ADMIN_PUSH_BROWSER_UNSUBSCRIBE_FAILED,
          );
        } catch {
          setErrorMessage(copy.errors.ADMIN_PUSH_BROWSER_UNSUBSCRIBE_FAILED);
        }

        await refreshCurrentDevice();
        return;
      }

      setErrorMessage(resolveError(code));
      await refreshCurrentDevice();
    } finally {
      setBusyAction(null);
    }
  }

  function applyNotificationReadState(
    notificationId: string,
    readAt: string,
  ): void {
    let markedUnreadItem = false;
    const nextNotifications = recentNotificationsRef.current.map((item) => {
      if (item.id !== notificationId || item.readAt) {
        return item;
      }

      markedUnreadItem = true;
      return {
        ...item,
        readAt,
      };
    });

    if (!markedUnreadItem) {
      return;
    }

    recentNotificationsRef.current = nextNotifications;
    setRecentNotifications(nextNotifications);
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markNotificationRead(
    notification: AdminNotificationCenterItem,
  ): Promise<void> {
    if (notification.readAt) {
      return;
    }

    setBusyNotificationId(notification.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await requestJson<ReadNotificationResponse>(
        `/api/admin/notifications/${encodeURIComponent(
          notification.id,
        )}/read`,
        { method: "PATCH" },
      );

      applyNotificationReadState(notification.id, result.readAt);
      setSuccessMessage(copy.feedback.markedRead);
    } catch (error) {
      setErrorMessage(
        resolveError(
          error instanceof Error
            ? error.message
            : "ADMIN_PUSH_UNEXPECTED_ERROR",
        ),
      );
    } finally {
      setBusyNotificationId(null);
    }
  }

  async function markNotificationReadForOpen(
    notification: AdminNotificationCenterItem,
  ): Promise<void> {
    if (notification.readAt) {
      return;
    }

    try {
      const result = await requestJson<ReadNotificationResponse>(
        `/api/admin/notifications/${encodeURIComponent(
          notification.id,
        )}/read`,
        { method: "PATCH" },
      );

      applyNotificationReadState(notification.id, result.readAt);
    } catch {
      // Opening the bounded Admin target remains available even if the read flag update fails.
    }
  }

  async function openAdminNotificationTarget(
    notification: AdminNotificationCenterItem,
  ): Promise<void> {
    const targetPath = safeAdminTargetPath(notification.targetPath);

    await markNotificationReadForOpen(notification);
    router.push(targetPath);
  }

  async function openZohoMailForNotification(
    notification: AdminNotificationCenterItem,
  ): Promise<void> {
    if (!notification.zohoEmail) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    window.open(
      siteConfig.correspondence.zohoMailWebUrl,
      "_blank",
      "noopener,noreferrer",
    );

    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(notification.zohoEmail.fromAddress);
        copied = true;
      } catch {
        copied = copyTextWithSelection(notification.zohoEmail.fromAddress);
      }
    } else {
      copied = copyTextWithSelection(notification.zohoEmail.fromAddress);
    }

    if (copied) {
      setSuccessMessage(copy.feedback.zohoEmailCopied);
    } else {
      setErrorMessage(copy.errors.ADMIN_NOTIFICATION_ZOHO_COPY_FAILED);
    }
  }

  const statusItems = useMemo(
    () => [
      {
        label: copy.status.browserSupport,
        value: supported ? copy.values.supported : copy.values.unsupported,
        ok: supported,
      },
      {
        label: copy.status.serverConfig,
        value: configured ? copy.values.configured : copy.values.unavailable,
        ok: configured,
      },
      {
        label: copy.status.permission,
        value: copy.permissionValues[permission],
        ok: permission === "granted",
      },
      {
        label: copy.status.serviceWorker,
        value: copy.serviceWorkerValues[serviceWorkerState],
        ok: serviceWorkerState === "ready",
      },
      {
        label: copy.status.browserSubscription,
        value: copy.subscriptionValues[subscriptionState],
        ok: subscriptionState === "subscribed",
      },
      {
        label: copy.status.serverRegistration,
        value: copy.serverRegistrationValues[serverRegistrationState],
        ok: serverRegistrationState === "registered",
      },
      {
        label: copy.status.displayMode,
        value: copy.displayModeValues[displayMode],
        ok: displayMode === "standalone",
      },
    ],
    [
      configured,
      copy,
      displayMode,
      permission,
      serverRegistrationState,
      serviceWorkerState,
      subscriptionState,
      supported,
    ],
  );
  const showConfigurationNavigation = shouldShowAdminNotificationConfiguration({
    isMobileViewport,
    displayMode,
  });
  const deviceState: AdminNotificationsDeviceState = {
    supported,
    configured,
    permission,
    serviceWorkerState,
    subscriptionState,
    serverRegistrationState,
    displayMode,
  };
  const activeTab = resolveAdminNotificationsActiveTab({
    selectedTab,
    deviceState,
    configurationNavigationVisible: showConfigurationNavigation,
  });

  const registerNotificationElement = useCallback(
    (notificationId: string, element: HTMLDivElement | null) => {
      if (element) {
        notificationElementRefs.current.set(notificationId, element);
        return;
      }

      notificationElementRefs.current.delete(notificationId);
    },
    [],
  );

  useEffect(() => {
    if (!initialNotificationId) {
      return;
    }

    const targetElement =
      notificationElementRefs.current.get(initialNotificationId) ?? null;

    if (
      !shouldAutoScrollAdminNotification({
        activeTab,
        displayMode,
        hasScrolledToInitialNotification:
          hasScrolledToInitialNotificationRef.current,
        initialNotificationId,
        isMobileViewport,
        openNotificationId,
        targetElementAvailable: targetElement !== null,
      })
    ) {
      return;
    }

    const targetNotificationId = initialNotificationId;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scrollFrame = window.requestAnimationFrame(() => {
      const layoutFrame = window.requestAnimationFrame(() => {
        initialNotificationScrollFrameRef.current = null;
        const currentTarget =
          notificationElementRefs.current.get(targetNotificationId);

        if (!currentTarget) {
          return;
        }

        currentTarget.scrollIntoView({
          block: "start",
          behavior: reducedMotion ? "auto" : "smooth",
        });
        hasScrolledToInitialNotificationRef.current = true;
      });

      initialNotificationScrollFrameRef.current = layoutFrame;
    });

    initialNotificationScrollFrameRef.current = scrollFrame;

    return () => {
      if (initialNotificationScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(initialNotificationScrollFrameRef.current);
        initialNotificationScrollFrameRef.current = null;
      }
    };
  }, [
    activeTab,
    displayMode,
    initialNotificationId,
    isMobileViewport,
    openNotificationId,
  ]);

  const showNotificationPagination =
    notificationPagination.totalItems > notificationPagination.pageSize;
  const firstVisibleNotification =
    (notificationPagination.page - 1) * notificationPagination.pageSize + 1;
  const lastVisibleNotification = Math.min(
    notificationPagination.page * notificationPagination.pageSize,
    notificationPagination.totalItems,
  );
  const visibleNotificationRange = `${firstVisibleNotification}-${lastVisibleNotification}`;

  function navigateNotificationPage(nextPage: number): void {
    const page = Math.min(
      Math.max(1, nextPage),
      notificationPagination.totalPages,
    );
    const targetPath =
      page === 1 ? "/admin/notifications" : `/admin/notifications?page=${page}`;

    router.push(targetPath);
  }

  const notificationsPanel = (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="grid gap-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {copy.history.title}
            </h2>
            <AdminContextualHelp content={copy.history.description} />
          </div>
          <Badge variant={unreadCount > 0 ? "secondary" : "outline"}>
            {copy.history.unreadCount.replace("{count}", String(unreadCount))}
          </Badge>
        </div>

        {recentNotifications.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            <Inbox aria-hidden="true" className="size-4 shrink-0" />
            <span>{copy.history.empty}</span>
          </div>
        ) : (
          <Accordion
            className="grid gap-3"
            collapsible
            onValueChange={(value) => {
              setOpenNotificationId(value || "");
            }}
            type="single"
            value={openNotificationId}
          >
            {recentNotifications.map((notification) => {
              const read = notification.readAt !== null;

              return (
                <AccordionItem
                  className="scroll-mt-20 rounded-lg border border-border/70 bg-background"
                  key={notification.id}
                  ref={(element) =>
                    registerNotificationElement(notification.id, element)
                  }
                  value={notification.id}
                >
                  <AccordionTrigger className="rounded-lg px-4 py-3 data-[state=open]:rounded-b-none">
                    <span className="grid min-w-0 gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant={read ? "outline" : "secondary"}>
                          {read ? copy.history.read : copy.history.unread}
                        </Badge>
                        <time className="text-xs text-muted-foreground">
                          {formatNotificationTimestamp(
                            notification.createdAt,
                            locale,
                          )}
                        </time>
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="grid gap-3 px-4 pb-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {notification.body}
                    </p>

                    {notification.zohoEmail ? (
                      <dl className="grid gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-2">
                        <div className="min-w-0">
                          <dt className="font-medium text-muted-foreground">
                            {copy.history.zohoEmail.from}
                          </dt>
                          <dd className="mt-1 break-all text-foreground">
                            {notification.zohoEmail.fromAddress}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-medium text-muted-foreground">
                            {copy.history.zohoEmail.to}
                          </dt>
                          <dd className="mt-1 break-all text-foreground">
                            {notification.zohoEmail.toAddress}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-medium text-muted-foreground">
                            {copy.history.zohoEmail.subject}
                          </dt>
                          <dd className="mt-1 break-words text-foreground">
                            {notification.zohoEmail.subject ||
                              copy.history.zohoEmail.emptySubject}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-medium text-muted-foreground">
                            {copy.history.zohoEmail.receivedAt}
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {formatNotificationTimestamp(
                              notification.zohoEmail.receivedAt,
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="min-w-0 sm:col-span-2">
                          <dt className="font-medium text-muted-foreground">
                            {copy.history.zohoEmail.reservationMatch}
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {notification.zohoEmail.reservationMatched
                              ? copy.history.zohoEmail.matched
                              : copy.history.zohoEmail.unmatched}
                          </dd>
                        </div>
                      </dl>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => void openAdminNotificationTarget(notification)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ExternalLink aria-hidden="true" />
                        {copy.actions.open}
                      </Button>
                      {notification.zohoEmail ? (
                        <Button
                          onClick={() =>
                            void openZohoMailForNotification(notification)
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <MailOpen aria-hidden="true" />
                          {copy.actions.openZohoMail}
                        </Button>
                      ) : null}
                      {!read ? (
                        <Button
                          disabled={busyNotificationId === notification.id}
                          onClick={() => void markNotificationRead(notification)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <CheckCheck aria-hidden="true" />
                          {busyNotificationId === notification.id
                            ? copy.actions.working
                            : copy.actions.markRead}
                        </Button>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {showNotificationPagination ? (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {copy.pagination.results}: {visibleNotificationRange} {copy.pagination.of}{" "}
              {notificationPagination.totalItems}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <Button
                disabled={notificationPagination.page <= 1}
                onClick={() => navigateNotificationPage(notificationPagination.page - 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                {copy.pagination.previous}
              </Button>
              <span className="text-sm text-muted-foreground">
                {copy.pagination.page} {notificationPagination.page}{" "}
                {copy.pagination.of} {notificationPagination.totalPages}
              </span>
              <Button
                disabled={notificationPagination.page >= notificationPagination.totalPages}
                onClick={() => navigateNotificationPage(notificationPagination.page + 1)}
                size="sm"
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
  );

  const configurationPanel = (
    <section className="grid gap-4" aria-label={copy.status.ariaLabel}>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-3 p-5">
          <div className="flex items-center gap-2">
            <Download aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              {copy.install.title}
            </h2>
          </div>
          {displayMode === "standalone" ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.install.installed}
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.install.instructions}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-5 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {copy.device.title}
            </h2>
            <AdminContextualHelp content={copy.device.description} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canEnable}
              onClick={() => void enableNotifications()}
              type="button"
            >
              <Bell aria-hidden="true" />
              {busyAction === "enable" ? copy.actions.working : copy.actions.enable}
            </Button>
            <Button
              disabled={!canDisable}
              onClick={() => void disableNotifications()}
              type="button"
              variant="outline"
            >
              <BellOff aria-hidden="true" />
              {busyAction === "disable"
                ? copy.actions.working
                : copy.actions.disable}
            </Button>
            <Button
              disabled={!canTest}
              onClick={() => void sendTestNotification()}
              type="button"
              variant="secondary"
            >
              <Send aria-hidden="true" />
              {busyAction === "test" ? copy.actions.working : copy.actions.test}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {statusItems.map((item) => (
          <div
            className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
            key={item.label}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {item.label}
              </p>
              <Badge variant={item.ok ? "secondary" : "outline"}>
                {item.ok ? copy.values.ok : copy.values.needsAttention}
              </Badge>
            </div>
            <p className="text-base font-semibold text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      {showConfigurationNavigation ? (
        <Tabs
          className="mt-6"
          onValueChange={(value) => {
            if (value === "notifications" || value === "configuration") {
              setSelectedTab(value);
            }
          }}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-fit">
            <TabsTrigger className="min-h-10" value="notifications">
              {copy.tabs.notifications}
            </TabsTrigger>
            <TabsTrigger className="min-h-10" value="configuration">
              {copy.tabs.configuration}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value="notifications">
            {notificationsPanel}
          </TabsContent>

          <TabsContent className="mt-6" value="configuration">
            {configurationPanel}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">{notificationsPanel}</div>
      )}

      <AdminSnackbar
        closeLabel={copy.actions.dismiss}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <AdminSnackbar
        closeLabel={copy.actions.dismiss}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </>
  );
}
