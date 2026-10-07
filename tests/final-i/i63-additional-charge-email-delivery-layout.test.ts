import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const COMPONENT_PATH =
  "features/admin/components/admin-additional-charges-section.tsx";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function expectNotIncludes(source: string, rejected: string): void {
  assert.ok(!source.includes(rejected), `Expected source to omit: ${rejected}`);
}

test("I.6.3 email delivery metadata uses a full-width responsive grid", () => {
  const component = read(COMPONENT_PATH);
  const gridClass =
    "grid grid-cols-1 gap-2 text-muted-foreground sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  expectIncludes(component, `<div className="${gridClass}">`);
  expectNotIncludes(
    component,
    '<div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">',
  );
  expectIncludes(component, '<div className="flex flex-col gap-3">');
  expectIncludes(
    component,
    '<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">',
  );
  expectIncludes(
    component,
    '<div className="min-w-0 rounded-xl border border-border/60 bg-background px-3 py-2">',
  );
});

test("I.6.3 email resend action remains outside the metrics grid", () => {
  const component = read(COMPONENT_PATH);
  const canResendIndex = component.indexOf("notification.canResend");
  const buttonIndex = component.indexOf("<Button", canResendIndex);
  const buttonEndIndex = component.indexOf("</Button>", buttonIndex);
  const gridIndex = component.indexOf(
    '<div className="grid grid-cols-1 gap-2 text-muted-foreground sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">',
  );

  assert.notEqual(canResendIndex, -1, "Missing conditional resend action");
  assert.notEqual(buttonIndex, -1, "Missing resend button");
  assert.notEqual(buttonEndIndex, -1, "Missing resend button closing tag");
  assert.notEqual(gridIndex, -1, "Missing responsive metrics grid");
  assert.ok(
    buttonEndIndex < gridIndex,
    "Resend action must stay in the card header, before the metrics grid",
  );

  const gridBlock = component.slice(
    gridIndex,
    component.indexOf("</div>", gridIndex),
  );
  expectNotIncludes(gridBlock, "openEmailResend(");
  expectNotIncludes(gridBlock, "copy.actions.resendEmail");
});

test("I.6.3 email delivery polish keeps existing notification fields and behavior hooks", () => {
  const component = read(COMPONENT_PATH);

  for (const expected of [
    "notificationStatusLabel(",
    "notification.status",
    "notificationOriginLabel(",
    "notification.origin",
    "copy.labels.recipient",
    "notification.recipient",
    "copy.labels.locale",
    "notificationLocaleLabel(",
    "copy.labels.attempts",
    "notification.attemptCount",
    "copy.labels.emailCreatedAt",
    "notification.createdAt",
    "copy.labels.requestedAt",
    "notification.requestedAt",
    "copy.labels.lastAttemptAt",
    "notification.lastAttemptAt",
    "copy.labels.sentAt",
    "notification.sentAt",
    "copy.labels.nextAttemptAt",
    "notification.nextAttemptAt",
    "copy.labels.errorCode",
    "notification.errorCode ??",
    "openEmailResend(",
  ]) {
    expectIncludes(component, expected);
  }
});
