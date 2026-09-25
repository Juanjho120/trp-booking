"use client";

import {
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  Send,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/features/i18n";

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

function getDisplayMode(): "browser" | "standalone" {
  return window.matchMedia("(display-mode: standalone)").matches
    ? "standalone"
    : "browser";
}

function permissionValue(): NotificationPermission | "unsupported" {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export function AdminNotificationsPageView() {
  const { locale, messages } = useLocale();
  const copy = messages.admin.notificationsPage;
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
  const [displayMode, setDisplayMode] = useState<"browser" | "standalone">(
    "browser",
  );
  const [currentSubscription, setCurrentSubscription] =
    useState<PushSubscription | null>(null);
  const [busyAction, setBusyAction] = useState<
    "enable" | "disable" | "test" | null
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const onDisplayModeChange = () => setDisplayMode(getDisplayMode());
    displayModeQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      active = false;
      displayModeQuery.removeEventListener("change", onDisplayModeChange);
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

      setErrorMessage(
        resolveError(code),
      );
      await refreshCurrentDevice();
    } finally {
      setBusyAction(null);
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

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid gap-4" aria-label={copy.status.ariaLabel}>
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

          <Card className="border-border/70 bg-card shadow-sm">
            <CardContent className="grid gap-5 p-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {copy.device.title}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {copy.device.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canEnable}
                  onClick={() => void enableNotifications()}
                  type="button"
                >
                  <Bell aria-hidden="true" />
                  {busyAction === "enable"
                    ? copy.actions.working
                    : copy.actions.enable}
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
                  {busyAction === "test"
                    ? copy.actions.working
                    : copy.actions.test}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Download aria-hidden="true" className="size-4 text-primary" />
              <h2 className="font-semibold">{copy.install.title}</h2>
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
          </div>

          <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              <h2 className="font-semibold">{copy.scope.title}</h2>
            </div>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
                <span>{copy.scope.deviceOnly}</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
                <span>{copy.scope.noHistory}</span>
              </li>
              <li className="flex gap-2">
                <XCircle aria-hidden="true" className="mt-1 size-4 shrink-0" />
                <span>{copy.scope.noOffline}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone aria-hidden="true" className="size-4 text-primary" />
              <h2 className="font-semibold">{copy.android.title}</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.android.description}
            </p>
          </div>
        </aside>
      </div>

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
