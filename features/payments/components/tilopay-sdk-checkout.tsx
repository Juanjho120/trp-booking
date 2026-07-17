"use client";

import { CreditCard, ShieldCheck } from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/features/i18n";
import type {
  CreateTilopaySdkSessionApiResponse,
  TilopaySdkPaymentMethod,
  TilopaySdkSession,
} from "@/types/tilopay-sdk-session";
import type {
  TilopayPaymentPreflight,
  TilopayPaymentPreflightApiResponse,
  TilopayPaymentPreflightApiSuccessResponse,
} from "@/types/tilopay-payment-preflight";
import type {
  TilopayRetryPaymentFieldIssue,
  TilopayRetryPaymentIssue,
} from "@/types/tilopay-retry-payment";
import type {
  TilopaySdkClientEventRequest,
  TilopaySdkClientEventType,
} from "@/types/tilopay-sdk-client-event";

type TilopaySdkCheckoutProps = Readonly<{
  reservationId: string;
  initialIssue?: TilopayRetryPaymentIssue | null;
  onPaymentFormReady?: () => void;
}>;

type CheckoutStatus =
  | "idle"
  | "loading"
  | "initializing"
  | "ready"
  | "processing"
  | "processed"
  | "error";

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "diners" | "unknown" | null;

type TilopayInitResponse = Readonly<{
  message?: string;
  methods?: TilopaySdkPaymentMethod[];
  cards?: readonly unknown[];
}>;

type TilopayStartPaymentResponse = Readonly<{
  message?: string;
}>;

type TilopayCardTypeResponse = Readonly<{
  message?: string;
  type?: string;
  brand?: string;
}>;

type TilopayGlobal = Readonly<{
  Init: (config: TilopaySdkSession["initConfig"]) => Promise<TilopayInitResponse>;
  startPayment: () => Promise<TilopayStartPaymentResponse>;
  getCardType: () => Promise<TilopayCardTypeResponse | string>;
}>;

declare global {
  interface Window {
    Tilopay?: TilopayGlobal;
  }
}

const CARD_NUMBER_INVALID_SDK_MESSAGE = "please enter a valid card number";
const CARD_INPUT_BASE_CLASS_NAME =
  "h-11 w-full min-w-0 rounded-2xl border bg-background px-4 text-sm text-foreground shadow-sm outline-none transition invalid:border-destructive invalid:ring-2 invalid:ring-destructive/20 focus:border-primary focus:ring-2 focus:ring-primary/20";
const DEFAULT_FIELD_BORDER_CLASS_NAME = "border-border/70";
const FLAGGED_FIELD_CLASS_NAME = "border-destructive ring-2 ring-destructive/20";

function isTilopaySdkSessionSuccessResponse(
  payload: CreateTilopaySdkSessionApiResponse,
): payload is { tilopaySdkSession: TilopaySdkSession } {
  return "tilopaySdkSession" in payload;
}

function isTilopayPaymentPreflightSuccessResponse(
  payload: TilopayPaymentPreflightApiResponse,
): payload is TilopayPaymentPreflightApiSuccessResponse {
  return "tilopayPaymentPreflight" in payload;
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
  cardMethodLabel: string,
): string {
  if (method.type.toLowerCase() !== "card") {
    return method.name;
  }

  return cardMethodLabel;
}

function normalizeCardBrand(value: string | undefined): CardBrand {
  const normalizedValue = (value ?? "").toLowerCase();

  if (normalizedValue.includes("visa")) {
    return "visa";
  }

  if (normalizedValue.includes("master")) {
    return "mastercard";
  }

  if (normalizedValue.includes("american") || normalizedValue.includes("amex")) {
    return "amex";
  }

  if (normalizedValue.includes("discover")) {
    return "discover";
  }

  if (normalizedValue.includes("diners")) {
    return "diners";
  }

  return normalizedValue ? "unknown" : null;
}

function CardBrandLogo({ cardBrand }: Readonly<{ cardBrand: CardBrand }>) {
  if (!cardBrand) {
    return <CreditCard aria-hidden="true" className="size-4 text-muted-foreground/70" />;
  }

  if (cardBrand === "visa") {
    return (
      <span className="rounded-md border border-border/70 bg-white px-2 py-1 text-[0.65rem] font-black italic leading-none tracking-tight text-blue-700">
        VISA
      </span>
    );
  }

  if (cardBrand === "mastercard") {
    return (
      <span className="relative inline-flex h-5 w-8 items-center justify-center">
        <span className="absolute left-1 h-4 w-4 rounded-full bg-red-500 opacity-90" />
        <span className="absolute right-1 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
      </span>
    );
  }

  if (cardBrand === "amex") {
    return (
      <span className="rounded-md bg-blue-600 px-2 py-1 text-[0.6rem] font-black leading-none text-white">
        AMEX
      </span>
    );
  }

  if (cardBrand === "discover") {
    return (
      <span className="rounded-md border border-orange-300 bg-white px-2 py-1 text-[0.55rem] font-black leading-none text-orange-600">
        DISC
      </span>
    );
  }

  if (cardBrand === "diners") {
    return (
      <span className="rounded-md border border-blue-300 bg-white px-2 py-1 text-[0.55rem] font-black leading-none text-blue-600">
        DC
      </span>
    );
  }

  return <CreditCard aria-hidden="true" className="size-4 text-muted-foreground/70" />;
}

function getCvvPattern(cardBrand: CardBrand): string {
  return cardBrand === "amex" ? "\\d{4}" : "\\d{3}";
}

function getFieldIssueForPaymentIssue(
  issue: TilopayRetryPaymentIssue | null | undefined,
): TilopayRetryPaymentFieldIssue {
  if (issue === "invalid_card_number") {
    return "card_details";
  }

  if (issue === "invalid_cvv") {
    return "cvv";
  }

  return null;
}

function getInputClassName(inputClassName: string, flagged: boolean): string {
  const borderClassName = flagged ? FLAGGED_FIELD_CLASS_NAME : DEFAULT_FIELD_BORDER_CLASS_NAME;

  return `${inputClassName} ${borderClassName}`;
}

function getSdkRetryPaymentIssue(message: string | undefined): TilopayRetryPaymentIssue | null {
  if (message?.trim().toLowerCase() === CARD_NUMBER_INVALID_SDK_MESSAGE) {
    return "invalid_card_number";
  }

  return null;
}

function getPaymentRetryErrorMessage(
  retryErrors: Readonly<Record<TilopayRetryPaymentIssue, string>>,
  issue: TilopayRetryPaymentIssue,
): string {
  return retryErrors[issue];
}

function validateTilopayFields(): boolean {
  const invalidField = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    ".payFormTilopay input:invalid, .payFormTilopay select:invalid",
  );

  if (!invalidField) {
    return true;
  }

  invalidField.focus();

  return false;
}

function getCardTypeRawValue(response: TilopayCardTypeResponse | string): string | undefined {
  if (typeof response === "string") {
    return response;
  }

  return response.brand ?? response.type ?? response.message;
}


function getSdkMessage(value: unknown): string | null {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return typeof record.message === "string" ? record.message : null;
  }

  return null;
}

function toSdkPayload(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return {
      message: typeof record.message === "string" ? record.message : undefined,
    };
  }

  if (typeof value === "string") {
    return {
      message: value,
    };
  }

  return null;
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

export function TilopaySdkCheckout({
  reservationId,
  initialIssue = null,
  onPaymentFormReady,
}: TilopaySdkCheckoutProps) {
  const { locale, messages } = useLocale();
  const copy = messages.payments.tilopaySdk;
  const retryErrors = messages.payments.retry.errors;
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [session, setSession] = useState<TilopaySdkSession | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<readonly TilopaySdkPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cardBrand, setCardBrand] = useState<CardBrand>(null);
  const [paymentIssue, setPaymentIssue] = useState<TilopayRetryPaymentIssue | null>(initialIssue);
  const [fieldIssue, setFieldIssue] = useState<TilopayRetryPaymentFieldIssue>(
    getFieldIssueForPaymentIssue(initialIssue),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialIssue ? getPaymentRetryErrorMessage(retryErrors, initialIssue) : null,
  );
  const paymentFormReadyNotifiedRef = useRef(false);
  const paymentMethodSelectRef = useRef<HTMLSelectElement>(null);

  useLayoutEffect(() => {
    if (status !== "ready" || !session || paymentFormReadyNotifiedRef.current) {
      return;
    }

    paymentFormReadyNotifiedRef.current = true;
    onPaymentFormReady?.();
  }, [onPaymentFormReady, session, status]);

  useEffect(() => {
    if (!paymentIssue) {
      return;
    }

    setErrorMessage(getPaymentRetryErrorMessage(retryErrors, paymentIssue));
  }, [paymentIssue, retryErrors]);

  function getSelectedPaymentMethod(): TilopaySdkPaymentMethod | null {
    return paymentMethods.find((method) => method.id === selectedPaymentMethod) ?? null;
  }

  function handlePaymentMethodChange(value: string): void {
    setSelectedPaymentMethod(value);

    const technicalSelect = paymentMethodSelectRef.current;

    if (!technicalSelect) {
      return;
    }

    technicalSelect.value = value;
    technicalSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function handleTechnicalPaymentMethodChange(value: string): void {
    const isSupportedPaymentMethod = paymentMethods.some(
      (method) => method.id === value,
    );

    if (!isSupportedPaymentMethod) {
      return;
    }

    setSelectedPaymentMethod(value);
  }

  function applyPaymentIssue(issue: TilopayRetryPaymentIssue): void {
    setPaymentIssue(issue);
    setFieldIssue(getFieldIssueForPaymentIssue(issue));
    setErrorMessage(getPaymentRetryErrorMessage(retryErrors, issue));
  }

  function clearPaymentFieldIssue(changedField: Exclude<TilopayRetryPaymentFieldIssue, null>): void {
    if (fieldIssue !== changedField) {
      return;
    }

    setPaymentIssue(null);
    setFieldIssue(null);
    setErrorMessage(null);
  }

  async function handlePreparePayment(): Promise<void> {
    setStatus("loading");
    paymentFormReadyNotifiedRef.current = false;
    setCardBrand(null);

    if (!paymentIssue) {
      setErrorMessage(null);
    }

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

  async function handleCardNumberInput(): Promise<void> {
    clearPaymentFieldIssue("card_details");

    if (!window.Tilopay) {
      setCardBrand(null);
      return;
    }

    try {
      const cardType = await window.Tilopay.getCardType();
      setCardBrand(normalizeCardBrand(getCardTypeRawValue(cardType)));
    } catch {
      setCardBrand(null);
    }
  }

  async function validatePaymentPreflight(
    activeSession: TilopaySdkSession,
  ): Promise<TilopayPaymentPreflight> {
    const response = await fetch("/api/payments/tilopay/preflight", {
      body: JSON.stringify({
        reservationId: activeSession.reservationId,
        paymentId: activeSession.paymentId,
        locale,
      }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json()) as TilopayPaymentPreflightApiResponse;

    if (!response.ok || !isTilopayPaymentPreflightSuccessResponse(payload)) {
      const message = "error" in payload ? payload.error.message : copy.sessionError;
      throw new Error(message);
    }

    return payload.tilopayPaymentPreflight;
  }

  async function recordSdkClientEvent(input: Readonly<{
    eventType: TilopaySdkClientEventType;
    preflight: TilopayPaymentPreflight;
    sdkMessage?: string | null;
    sdkPayload?: unknown;
  }>): Promise<void> {
    if (!session) {
      return;
    }

    const selectedMethod = getSelectedPaymentMethod();
    const request: TilopaySdkClientEventRequest = {
      paymentId: session.paymentId,
      reservationId: session.reservationId,
      eventType: input.eventType,
      environment: session.environment,
      locale,
      paymentMethodId: selectedMethod?.id ?? null,
      paymentMethodName: selectedMethod?.name ?? null,
      paymentMethodType: selectedMethod?.type ?? null,
      detectedCardBrand: cardBrand,
      sdkMessage: input.sdkMessage ?? null,
      sdkPayload: toSdkPayload(input.sdkPayload),
      preflightStatus: input.preflight.status,
      preflightExpiresAt: input.preflight.expiresAt,
    };

    try {
      await fetch("/api/payments/tilopay/sdk-client-events", {
        body: JSON.stringify(request),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });
    } catch {
      // Client telemetry must never block or change the guest-facing payment flow.
    }
  }

  async function handleStartPayment(): Promise<void> {
    if (!window.Tilopay) {
      setStatus("error");
      setErrorMessage(copy.sdkError);
      return;
    }

    if (!session) {
      setStatus("error");
      setErrorMessage(copy.sessionError);
      return;
    }

    if (!validateTilopayFields()) {
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    setStatus("processing");
    setErrorMessage(null);

    let preflight: TilopayPaymentPreflight;

    try {
      preflight = await validatePaymentPreflight(session);
    } catch (error) {
      setStatus("ready");
      setErrorMessage(error instanceof Error ? error.message : copy.paymentError);
      return;
    }

    try {
      const payment = await window.Tilopay.startPayment();

      if (payment.message && !isSuccessMessage(payment.message)) {
        const retryIssue = getSdkRetryPaymentIssue(payment.message);

        await recordSdkClientEvent({
          eventType: "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS",
          preflight,
          sdkMessage: payment.message,
          sdkPayload: payment,
        });

        if (retryIssue) {
          applyPaymentIssue(retryIssue);
        } else {
          setErrorMessage(copy.paymentError);
        }

        setStatus("ready");
        return;
      }

      setStatus("processed");
    } catch (error) {
      const sdkMessage = getSdkMessage(error);
      const retryIssue = getSdkRetryPaymentIssue(sdkMessage ?? undefined);

      await recordSdkClientEvent({
        eventType: "TILOPAY_SDK_START_PAYMENT_FAILED",
        preflight,
        sdkMessage,
        sdkPayload: error,
      });

      if (retryIssue) {
        applyPaymentIssue(retryIssue);
      } else {
        setErrorMessage(copy.paymentError);
      }

      setStatus("ready");
    }
  }

  const isPreparing = status === "loading" || status === "initializing";
  const isReady = status === "ready" || status === "processing" || status === "processed";
  const cardDetailsFlagged = fieldIssue === "card_details";
  const cvvFlagged = fieldIssue === "cvv";

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

          <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
            <span id="tilopay-payment-method-label">{copy.paymentMethod}</span>
            <Select
              disabled={
                paymentMethods.length === 0 ||
                status === "processing" ||
                status === "processed"
              }
              onValueChange={handlePaymentMethodChange}
              value={selectedPaymentMethod}
            >
              <SelectTrigger aria-labelledby="tilopay-payment-method-label">
                <SelectValue placeholder={copy.paymentMethodCard} />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {getPaymentMethodLabel(method, copy.paymentMethodCard)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <select
            aria-hidden="true"
            className="hidden"
            id="tlpy_payment_method"
            name="tlpy_payment_method"
            onChange={(event) =>
              handleTechnicalPaymentMethodChange(event.target.value)
            }
            ref={paymentMethodSelectRef}
            tabIndex={-1}
            value={selectedPaymentMethod}
          >
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {getPaymentMethodLabel(method, copy.paymentMethodCard)}
              </option>
            ))}
          </select>

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
              <span className="relative block min-w-0">
                <input
                  aria-invalid={cardDetailsFlagged}
                  autoComplete="off"
                  autoCorrect="off"
                  className={getInputClassName(`${CARD_INPUT_BASE_CLASS_NAME} pr-20`, cardDetailsFlagged)}
                  id="tlpy_cc_number"
                  inputMode="numeric"
                  name="tlpy_cc_number"
                  onInput={() => {
                    void handleCardNumberInput();
                  }}
                  required
                  spellCheck={false}
                  type="text"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <CardBrandLogo cardBrand={cardBrand} />
                </span>
              </span>
            </label>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                <span>{copy.cardExpiration}</span>
                <input
                  aria-invalid={cardDetailsFlagged}
                  autoComplete="off"
                  autoCorrect="off"
                  className={getInputClassName(CARD_INPUT_BASE_CLASS_NAME, cardDetailsFlagged)}
                  id="tlpy_cc_expiration_date"
                  inputMode="numeric"
                  name="tlpy_cc_expiration_date"
                  onInput={() => clearPaymentFieldIssue("card_details")}
                  placeholder="MM/YY"
                  required
                  spellCheck={false}
                  type="text"
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                <span>{copy.cardCvv}</span>
                <input
                  aria-invalid={cvvFlagged}
                  autoComplete="off"
                  autoCorrect="off"
                  className={getInputClassName(CARD_INPUT_BASE_CLASS_NAME, cvvFlagged)}
                  id="tlpy_cvv"
                  inputMode="numeric"
                  name="tlpy_cvv"
                  onInput={() => clearPaymentFieldIssue("cvv")}
                  pattern={getCvvPattern(cardBrand)}
                  required
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
