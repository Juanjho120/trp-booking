"use client";

import { useEffect, useRef } from "react";

let tilopaySdkTokenWarmupPromise: Promise<void> | null = null;

export function warmTilopaySdkTokenBestEffort(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (tilopaySdkTokenWarmupPromise) {
    return;
  }

  tilopaySdkTokenWarmupPromise = fetch("/api/payments/tilopay/warmup", {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
    method: "POST",
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      tilopaySdkTokenWarmupPromise = null;
    });
}

export function useTilopaySdkTokenWarmup(enabled: boolean): void {
  const warmedRef = useRef(false);

  useEffect(() => {
    if (!enabled || warmedRef.current) {
      return;
    }

    warmedRef.current = true;
    warmTilopaySdkTokenBestEffort();
  }, [enabled]);
}
