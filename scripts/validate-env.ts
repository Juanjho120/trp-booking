import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  formatEnvValidationError,
  validateServerEnv,
} from "../lib/env/server";

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

loadLocalDotEnv();

try {
  validateServerEnv();

  console.info("Environment variables are valid.");
} catch (error) {
  console.error("Environment variable validation failed.");
  console.error(formatEnvValidationError(error));
  process.exit(1);
}
