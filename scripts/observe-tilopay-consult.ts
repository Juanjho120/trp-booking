import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import {
  formatEnvValidationError,
  getTilopayEnv,
} from "../lib/env/server";
import {
  classifyTilopayConsultCandidate,
  observeTilopayConsultTransaction,
  TilopayApiClientError,
} from "../lib/payments/tilopay-api-client";

function loadEnvFile(fileName: string): void {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  const envFileContent = readFileSync(envPath, "utf8");

  for (const rawLine of envFileContent.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function option(name: string): string | undefined {
  const prefix = `--${name}=`;

  return process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function maskOrderNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main(): Promise<void> {
  const orderNumber = option("order")?.trim();

  if (!orderNumber) {
    throw new Error("order is required.");
  }

  const env = getTilopayEnv();

  if (env.TILOPAY_ENVIRONMENT !== "sandbox") {
    throw new TilopayApiClientError("TILOPAY_CONSULT_SANDBOX_ONLY");
  }

  const observation = await observeTilopayConsultTransaction(orderNumber);

  console.log(
    JSON.stringify(
      {
        warning:
          "Sandbox consult observation only. Candidate values are bounded and must be compared with the Tilopay portal before accepting a reconciliation contract.",
        generatedAt: new Date().toISOString(),
        input: {
          orderNumber: maskOrderNumber(orderNumber),
        },
        observation: {
          ...observation,
          candidates: observation.candidates.map((candidate) => ({
            ...candidate,
            orderNumber: maskOrderNumber(candidate.orderNumber),
            resultClassification:
              classifyTilopayConsultCandidate(candidate),
          })),
        },
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const output =
    error instanceof TilopayApiClientError
      ? {
          code: error.code,
          requestMayHaveReachedProvider:
            error.requestMayHaveReachedProvider,
        }
      : error instanceof z.ZodError
        ? {
            code: "TILOPAY_OBSERVATION_ENV_INVALID",
            requestMayHaveReachedProvider: false,
            details: formatEnvValidationError(error),
          }
        : {
            code: "TILOPAY_CONSULT_OBSERVATION_UNEXPECTED_ERROR",
            requestMayHaveReachedProvider: false,
            errorName:
              error instanceof Error ? error.name : "UnknownError",
          };

  console.error(JSON.stringify({ error: output }, null, 2));
  process.exitCode = 1;
});
