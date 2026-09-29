import assert from "node:assert/strict";

import { test } from "./harness";
import {
  assertNoRegexMatch,
  assertPathDoesNotContainRouteFile,
  parseJsonFile,
  readRepoFile,
} from "./test-utils";

type PackageJson = Readonly<{
  dependencies: Readonly<Record<string, string>>;
}>;

const activeNotificationTypes = [
  "RESERVATION_CONFIRMED",
  "RESERVATION_CANCELLED",
  "CHECK_IN_MINUS_48H",
  "CHECK_OUT_MINUS_6H",
  "REVIEW_SUBMITTED",
  "GUEST_EMAIL_RECEIVED",
] as const;

test("superseded WhatsApp backend/provider route directories contain no active route files", () => {
  for (const relativePath of [
    "app/admin/whatsapp",
    "app/api/admin/whatsapp",
    "app/api/twilio",
    "app/api/360dialog",
    "lib/twilio",
    "lib/360dialog",
  ]) {
    assertPathDoesNotContainRouteFile(relativePath);
  }
});

test("active dependencies do not reintroduce Twilio, 360dialog, Meta or Gupshup providers", () => {
  const packageJson = parseJsonFile<PackageJson>("package.json");
  const dependencyNames = Object.keys(packageJson.dependencies);

  for (const forbiddenName of ["twilio", "360dialog", "gupshup", "meta"]) {
    assert.equal(
      dependencyNames.some((name) => name.toLowerCase().includes(forbiddenName)),
      false,
      `${forbiddenName} dependency should remain absent`,
    );
  }
});

test("ADMIN-only user and the six active notification classes remain exact", () => {
  const schema = readRepoFile("prisma/schema.prisma");
  const userRole = schema.match(/enum UserRole \{([\s\S]*?)\n\}/);
  const notificationType = schema.match(
    /enum AdminNotificationType \{([\s\S]*?)\n\}/,
  );

  assert.ok(userRole, "UserRole enum should exist");
  assert.deepEqual(extractEnumValues(userRole[1]), ["ADMIN"]);

  assert.ok(notificationType, "AdminNotificationType enum should exist");
  assert.deepEqual(extractEnumValues(notificationType[1]), activeNotificationTypes);

  assertNoRegexMatch("prisma/schema.prisma", /\bSTAFF\b/);
  assertNoRegexMatch("prisma/schema.prisma", /\bGUEST_WHATSAPP_RECEIVED\b/);
});

test("current Final-F architecture keeps iOS/iPadOS deferred and guest WhatsApp outside TRP backend", () => {
  const architecture = readRepoFile(
    "docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md",
  );
  const finalH = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  assert.ok(architecture.includes("iOS/iPadOS Deferred"));
  assert.ok(architecture.includes("no /admin/whatsapp target surface"));
  assert.ok(finalH.includes("iOS/iPadOS Web Push remains Deferred"));
  assert.ok(finalH.includes("Guest WhatsApp remains outside the TRP backend"));
});

function extractEnumValues(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("@@") && !line.startsWith("//"));
}
