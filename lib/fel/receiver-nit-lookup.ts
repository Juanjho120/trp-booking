export type ReceiverNitLookupUnavailableReason =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "TIMEOUT";

export type ReceiverNitLookupResult =
  | Readonly<{
      status: "FOUND";
      nit: string;
      name: string;
    }>
  | Readonly<{
      status: "NOT_FOUND";
      nit: string;
    }>
  | Readonly<{
      status: "UNAVAILABLE";
      reason: ReceiverNitLookupUnavailableReason;
    }>;

export type ReceiverNitLookupProvider = Readonly<{
  lookupNit(nit: string): Promise<ReceiverNitLookupResult>;
}>;

const DEFAULT_LOOKUP_TIMEOUT_MS = 8_000;

const notConfiguredProvider: ReceiverNitLookupProvider = {
  async lookupNit() {
    return {
      status: "UNAVAILABLE",
      reason: "PROVIDER_NOT_CONFIGURED",
    };
  },
};

export function normalizeReceiverNit(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function isNormalizedReceiverNitCandidate(value: string): boolean {
  return /^[0-9]+K?$/.test(value);
}

export function getReceiverNitLookupProvider(): ReceiverNitLookupProvider {
  return notConfiguredProvider;
}

function normalizeLookupResult(
  inputNit: string,
  result: ReceiverNitLookupResult,
): ReceiverNitLookupResult {
  if (result.status === "UNAVAILABLE") {
    return result;
  }

  return {
    ...result,
    nit: normalizeReceiverNit(result.nit || inputNit),
  };
}

function timeoutResult(timeoutMs: number): Promise<ReceiverNitLookupResult> {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          status: "UNAVAILABLE",
          reason: "TIMEOUT",
        }),
      timeoutMs,
    );
  });
}

export async function lookupReceiverNit(
  nit: string,
  options: Readonly<{
    provider?: ReceiverNitLookupProvider;
    timeoutMs?: number;
  }> = {},
): Promise<ReceiverNitLookupResult> {
  const normalizedNit = normalizeReceiverNit(nit);

  if (!normalizedNit || !isNormalizedReceiverNitCandidate(normalizedNit)) {
    return {
      status: "NOT_FOUND",
      nit: normalizedNit,
    };
  }

  const provider = options.provider ?? getReceiverNitLookupProvider();
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS);

  try {
    const result = await Promise.race([
      provider.lookupNit(normalizedNit),
      timeoutResult(timeoutMs),
    ]);

    return normalizeLookupResult(normalizedNit, result);
  } catch {
    return {
      status: "UNAVAILABLE",
      reason: "PROVIDER_ERROR",
    };
  }
}
