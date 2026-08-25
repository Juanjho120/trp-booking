import assert from "node:assert/strict";

import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";

import { test } from "./harness";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("Final-B ES/EN admin integration messages have exact key parity", () => {
  const esKeys = collectKeys(esMessages.admin.calendarIntegrations).sort();
  const enKeys = collectKeys(enMessages.admin.calendarIntegrations).sort();

  assert.deepEqual(enKeys, esKeys);
  assert.ok(esKeys.length > 0);
});
