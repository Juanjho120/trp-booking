import {
  observeTilopayModificationSandbox,
  TilopayApiClientError,
  type TilopayObservationAuthorizationMode,
  type TilopayObservationKeyMode,
} from "../lib/payments/tilopay-api-client";

type Arguments = Readonly<{
  orderNumber?: string;
  type?: string;
  amount?: string;
  authorizationMode: TilopayObservationAuthorizationMode;
  keyMode: TilopayObservationKeyMode;
  repeat: number;
  concurrent: number;
}>;

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function positiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = option(name);

  if (!raw) return fallback;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be a whole number from 1 through ${maximum}.`);
  }

  return parsed;
}

function enumOption<T extends string>(
  name: string,
  values: readonly T[],
  fallback: T,
): T {
  const raw = option(name);

  if (!raw) return fallback;
  if (!values.includes(raw as T)) {
    throw new Error(`${name} must be one of: ${values.join(", ")}.`);
  }

  return raw as T;
}

function parseArguments(): Arguments {
  return {
    orderNumber: option("order"),
    type: option("type"),
    amount: option("amount"),
    authorizationMode: enumOption(
      "auth",
      ["valid", "invalid", "missing"] as const,
      "valid",
    ),
    keyMode: enumOption(
      "key",
      ["valid", "invalid", "missing"] as const,
      "valid",
    ),
    repeat: positiveInteger("repeat", 1, 10),
    concurrent: positiveInteger("concurrent", 1, 5),
  };
}

function maskOrderNumber(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

async function runObservation(
  args: Arguments,
  sequence: number,
  concurrentSequence: number,
) {
  try {
    const observation = await observeTilopayModificationSandbox(
      {
        orderNumber: args.orderNumber,
        type: args.type,
        amount: args.amount,
      },
      {
        authorizationMode: args.authorizationMode,
        keyMode: args.keyMode,
      },
    );

    return {
      sequence,
      concurrentSequence,
      input: {
        orderNumber: maskOrderNumber(args.orderNumber),
        type: args.type ?? null,
        amount: args.amount ?? null,
        authorizationMode: args.authorizationMode,
        keyMode: args.keyMode,
      },
      observation,
    };
  } catch (error) {
    return {
      sequence,
      concurrentSequence,
      input: {
        orderNumber: maskOrderNumber(args.orderNumber),
        type: args.type ?? null,
        amount: args.amount ?? null,
        authorizationMode: args.authorizationMode,
        keyMode: args.keyMode,
      },
      error: {
        code:
          error instanceof TilopayApiClientError
            ? error.code
            : "TILOPAY_OBSERVATION_UNEXPECTED_ERROR",
        requestMayHaveReachedProvider:
          error instanceof TilopayApiClientError
            ? error.requestMayHaveReachedProvider
            : false,
      },
    };
  }
}

async function main(): Promise<void> {
  const args = parseArguments();
  const results = [];

  for (let sequence = 1; sequence <= args.repeat; sequence += 1) {
    const batch = await Promise.all(
      Array.from({ length: args.concurrent }, (_, index) =>
        runObservation(args, sequence, index + 1),
      ),
    );
    results.push(...batch);
  }

  console.log(
    JSON.stringify(
      {
        warning:
          "Sandbox observation only. Do not infer production success from this output without documenting and accepting the provider contract.",
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  console.error(message);
  process.exitCode = 1;
});
