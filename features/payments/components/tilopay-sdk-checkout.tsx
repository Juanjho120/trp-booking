"use client";

import { CreditCard, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n";
import type {
  CreateTilopaySdkSessionApiResponse,
  TilopaySdkPaymentMethod,
  TilopaySdkSession,
} from "@/types/tilopay-sdk-session";

type TilopaySdkCheckoutProps = Readonly<{
  reservationId: string;
}>;

type CheckoutStatus =
  | "idle"
  | "loading"
  | "initializing"
  | "ready"
  | "processing"
  | "processed"
  | "error";

type TilopayInitResponse = Readonly<{
  message?: string;
  methods?: TilopaySdkPaymentMethod[];
  cards?: readonly unknown[];
}>;

type TilopayStartPaymentResponse = Readonly<{
  message?: string;
}>;

type TilopayGlobal = Readonly<{
  Init: (config: TilopaySdkSession["initConfig"]) => Promise<TilopayInitResponse>;
  startPayment: () => Promise<TilopayStartPaymentResponse>;
  getCardType: () => Promise<Readonly<{ message?: string }> | string>;
}>;

declare global {
  interface Window {
    Tilopay?: TilopayGlobal;
  }
}

function isTilopaySdkSessionSuccessResponse(
  payload: CreateTilopaySdkSessionApiResponse,
): payload is { tilopaySdkSession: TilopaySdkSession } {
  return "tilopaySdkSession" in payload;
}

function isSuccessMessage(value: string | undefined): boolean {
  return typeof value === "string" && value.toLowerCase() === "success";
}

function getSupportedCardMethods(
  methods: readonly TilopaySdkPaymentMethod[] | undefined,
): readonly TilopaySdkPaymentMethod[] {
  if (!methods) {
    return [];
  }

  const cardMethods = methods.filter((method) => method.type.toLowerCase() === "card");
  const standardCardMethods = cardMethods.filter(
    (method) => !/(tasa|sinpe|yappy|tafi)/i.test(method.name),
  );

  return standardCardMethods.length > 0 ? standardCardMethods : cardMethods;
}

function getPaymentMethodLabel(
  method: TilopaySdkPaymentMethod,
  locale: "es" | "en",
): string {
  if (method.type.toLowerCase() !== "card") {
    return method.name;
  }

  return locale === "en" ? "Credit / Debit Card" : "Tarjeta de crédito / débito";
}

function loadTilopaySdkScript(src: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.Tilopay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-tilopay-sdk-v2="true"]',
    );
    const script = existingScript ?? document.createElement("script");

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("TILOPAY_SDK_SCRIPT_LOAD_ERROR")), {
      once: true,
    });

    if (!existingScript) {
      script.async = true;
      script.dataset.tilopaySdkV2 = "true";
      script.src = `${src}?v=${Date.now()}`;
      document.body.appendChild(script);
    }
  });
}

export function TilopaySdkCheckout({ reservationId }: TilopaySdkCheckoutProps) {
  const { locale, messages } = useLocale();
  const copy = messages.payments.tilopaySdk;
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [session, setSession] = useState<TilopaySdkSession | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<readonly TilopaySdkPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handlePreparePayment(): Promise<void> {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/payments/tilopay/sdk-session", {
        body: JSON.stringify({
          reservationId,
          locale,
        }),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as CreateTilopaySdkSessionApiResponse;

      if (!response.ok || !isTilopaySdkSessionSuccessResponse(payload)) {
        const message = "error" in payload ? payload.error.message : copy.sessionError;
        throw new Error(message);
      }

      setSession(payload.tilopaySdkSession);
      setPaymentMethods([]);
      setSelectedPaymentMethod("");
      setStatus("initializing");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : copy.sessionError);
    }
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function initializeTilopaySdk(): Promise<void> {
      setStatus("initializing");
      setErrorMessage(null);

      try {
        await loadTilopaySdkScript(activeSession.sdkScriptUrl);

        if (!window.Tilopay) {
          throw new Error("TILOPAY_SDK_UNAVAILABLE");
        }

        const initResponse = await window.Tilopay.Init(activeSession.initConfig);

        if (!isSuccessMessage(initResponse.message)) {
          throw new Error("TILOPAY_SDK_INIT_ERROR");
        }

        const supportedMethods = getSupportedCardMethods(initResponse.methods);

        if (supportedMethods.length === 0) {
          throw new Error("TILOPAY_SDK_NO_SUPPORTED_METHODS");
        }

        if (!cancelled) {
          setPaymentMethods(supportedMethods);
          setSelectedPaymentMethod(supportedMethods[0].id);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(copy.sdkError);
        }
      }
    }

    void initializeTilopaySdk();

    return () => {
      cancelled = true;
    };
  }, [copy.sdkError, session]);

  async function handleStartPayment(): Promise<void> {
    if (!window.Tilopay) {
      setStatus("error");
      setErrorMessage(copy.sdkError);
      return;
    }

    setStatus("processing");
    setErrorMessage(null);

    try {
      const payment = await window.Tilopay.startPayment();

      if (payment.message && !isSuccessMessage(payment.message)) {
        throw new Error("TILOPAY_SDK_PAYMENT_ERROR");
      }

      setStatus("processed");
    } catch {
      setStatus("ready");
      setErrorMessage(copy.paymentError);
    }
  }

  const isPreparing = status === "loading" || status === "initializing";
  const isReady = status === "ready" || status === "processing" || status === "processed";

  return (
    <section className="space-y-4 rounded-3xl border border-primary/20 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{copy.title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      {!session ? (
        <Button
          className="w-full rounded-full"
          disabled={isPreparing}
          onClick={handlePreparePayment}
          type="button"
        >
          {isPreparing ? copy.preparingPayment : copy.preparePayment}
        </Button>
      ) : null}

      {session ? (
        <div className="payFormTilopay space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm leading-6">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CreditCard aria-hidden="true" className="size-4 text-primary" />
              {copy.cardSectionTitle}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.secureFieldsNote}</p>
          </div>

          <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
            <span>{copy.paymentMethod}</span>
            <select
              className="h-11 w-full min-w-0 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="tlpy_payment_method"
              name="tlpy_payment_method"
              onChange={(event) => setSelectedPaymentMethod(event.target.value)}
              value={selectedPaymentMethod}
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {getPaymentMethodLabel(method, locale)}
                </option>
              ))}
            </select>
          </label>

          <select
            aria-hidden="true"
            className="hidden"
            defaultValue=""
            id="tlpy_saved_cards"
            name="tlpy_saved_cards"
            tabIndex={-1}
          >
            <option value="" />
          </select>

          <div className="space-y-4" id="tlpy_card_payment_div">
            <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
              <span>{copy.cardNumber}</span>
              <input
                autoComplete="off"
                autoCorrect="off"
                className="h-11 w-full min-w-0 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="tlpy_cc_number"
                inputMode="numeric"
                name="tlpy_cc_number"
                spellCheck={false}
                type="text"
              />
            </label>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                <span>{copy.cardExpiration}</span>
                <input
                  autoComplete="off"
                  autoCorrect="off"
                  className="h-11 w-full min-w-0 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="tlpy_cc_expiration_date"
                  inputMode="numeric"
                  name="tlpy_cc_expiration_date"
                  placeholder="MM/YY"
                  spellCheck={false}
                  type="text"
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                <span>{copy.cardCvv}</span>
                <input
                  autoComplete="off"
                  autoCorrect="off"
                  className="h-11 w-full min-w-0 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="tlpy_cvv"
                  inputMode="numeric"
                  name="tlpy_cvv"
                  spellCheck={false}
                  type="text"
                />
              </label>
            </div>
          </div>

          <div className="hidden" id="tlpy_phone_number_div">
            <input id="tlpy_phone_number" name="tlpy_phone_number" type="text" />
          </div>

          <div id="responseTilopay" />

          <Button
            className="w-full rounded-full"
            disabled={!isReady || status === "processing" || status === "processed"}
            onClick={handleStartPayment}
            type="button"
          >
            {status === "processing" ? copy.processingPayment : copy.pay}
          </Button>
        </div>
      ) : null}

      {status === "initializing" ? (
        <p className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          {copy.initializingPayment}
        </p>
      ) : null}

      {status === "processed" ? (
        <p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
          {copy.paymentSubmitted}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">{copy.providerNote}</p>
    </section>
  );
}
