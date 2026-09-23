import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  D360ProviderError,
  sendD360OnboardingProviderProbe,
} from "@/lib/360dialog/provider";

function loadLocalDotEnv(): void {
  const envPath = resolve(process.cwd(), ".env");

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

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadLocalDotEnv();

  const result = await sendD360OnboardingProviderProbe();

  console.info("360dialog onboarding provider probe sent.");
  console.info(`Provider message id: ${result.providerMessageId}`);
  console.info(`Provider status: ${result.providerStatus ?? "unknown"}`);
}

main().catch((error: unknown) => {
  if (error instanceof D360ProviderError) {
    console.error(`360dialog onboarding provider probe failed: ${error.code}`);
    process.exitCode = 1;
    return;
  }

  console.error("360dialog onboarding provider probe failed unexpectedly.");
  process.exitCode = 1;
});
