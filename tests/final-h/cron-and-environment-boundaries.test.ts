import assert from "node:assert/strict";

import { listCronJobDefinitions } from "@/lib/cron/registry";

import { test } from "./harness";
import {
  assertFileContains,
  parseJsonFile,
  readRepoFile,
} from "./test-utils";

type VercelConfig = Readonly<{
  crons?: readonly unknown[];
}>;

const expectedFinalHCarryForwardCronJobs = [
  ["SYNC_AIRBNB_CALENDARS", "sync-airbnb-calendars", "*/30 * * * *"],
  [
    "EXPIRE_PENDING_RESERVATION_HOLDS",
    "expire-pending-reservation-holds",
    "*/5 * * * *",
  ],
  ["PROCESS_EMAIL_NOTIFICATIONS", "process-email-notifications", "*/5 * * * *"],
  [
    "SCHEDULE_ARRIVAL_INSTRUCTIONS",
    "schedule-arrival-instructions",
    "*/30 * * * *",
  ],
  [
    "SCHEDULE_REVIEW_INVITATIONS",
    "schedule-review-invitations",
    "*/30 * * * *",
  ],
  [
    "PROCESS_ADMIN_PUSH_NOTIFICATIONS",
    "process-admin-push-notifications",
    "*/5 * * * *",
  ],
] as const;

const expectedCronJobs = [
  ...expectedFinalHCarryForwardCronJobs.slice(0, 2),
  [
    "EXPIRE_GUEST_PAYMENT_REQUESTS",
    "expire-guest-payment-requests",
    "*/5 * * * *",
  ],
  ...expectedFinalHCarryForwardCronJobs.slice(2),
] as const;

test("the current cron registry contains accepted jobs plus the Final-I.6.1 GPR expiration job", () => {
  const definitions = listCronJobDefinitions();

  assert.equal(definitions.length, expectedCronJobs.length);

  for (const [key, slug, schedule] of expectedCronJobs) {
    const definition = definitions.find((item) => item.key === key);

    assert.ok(definition, `${key} should be registered`);
    assert.equal(definition.slug, slug);
    assert.equal(definition.schedule, schedule);
    assert.equal(typeof definition.execute, "function");
  }
});

test("Test deployment scheduler remains disabled in vercel.json", () => {
  const vercelConfig = parseJsonFile<VercelConfig>("vercel.json");

  assert.deepEqual(vercelConfig, { crons: [] });
});

test("Final-H cron registry documents review invitations and admin push recovery as Production crons", () => {
  const document = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  for (const [, slug, schedule] of expectedFinalHCarryForwardCronJobs) {
    assert.ok(document.includes(slug), `docs/211 should document ${slug}`);
    assert.ok(document.includes(schedule), `docs/211 should document ${schedule}`);
  }

  assert.ok(
    document.includes("schedule-review-invitations") &&
      document.includes("process-admin-push-notifications"),
    "Final-H must carry forward Final-E and Final-F scheduler additions",
  );
});

test("environment isolation remains Local/Test-only before Phase 13", () => {
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Production: not provisioned / not active",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Test scheduler remains disabled",
  );
});
