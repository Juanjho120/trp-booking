import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  RESERVATION_CODE_ALPHABET,
  RESERVATION_CODE_LENGTH,
  RESERVATION_CODE_MAX_GENERATION_ATTEMPTS,
  RESERVATION_CODE_PREFIX,
  generateReservationCode,
  isReservationCode,
} from "@/lib/reservations/reservation-code";

import { test } from "./harness";

const ROOT = process.cwd();
const CODE_PATTERN = /^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const ORIGINAL_MIGRATION_PATH =
  "prisma/migrations/20261009130000_final_i_6_6_human_reservation_codes/migration.sql";
const FORMAT_REFINEMENT_MIGRATION_PATH =
  "prisma/migrations/20261009143000_final_i_6_6_reservation_code_8_chars/migration.sql";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}

function expectNotIncludes(source: string, rejected: string): void {
  assert.ok(!source.includes(rejected), `Expected source to omit: ${rejected}`);
}
function sourceBetween(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);

  assert.notEqual(start, -1, `Expected source to include: ${startMarker}`);

  const end = source.indexOf(endMarker, start);

  assert.notEqual(end, -1, `Expected source to include: ${endMarker}`);

  return source.slice(start, end);
}

function listFiles(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  const entries = readdirSync(absoluteDirectory);
  const files: string[] = [];

  for (const entry of entries) {
    const absoluteEntry = path.join(absoluteDirectory, entry);
    const relativeEntry = path
      .join(relativeDirectory, entry)
      .replace(/\\/g, "/");

    if (statSync(absoluteEntry).isDirectory()) {
      files.push(...listFiles(relativeEntry));
    } else {
      files.push(relativeEntry);
    }
  }

  return files;
}

test("I.6.6 reservation code generator uses human-safe TR format", () => {
  assert.equal(RESERVATION_CODE_PREFIX, "TR");
  assert.equal(RESERVATION_CODE_LENGTH, 8);
  assert.equal(RESERVATION_CODE_ALPHABET, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  assert.equal(RESERVATION_CODE_MAX_GENERATION_ATTEMPTS, 8);

  for (let index = 0; index < 128; index += 1) {
    const code = generateReservationCode();

    assert.equal(code.length, 8);
    assert.match(code, CODE_PATTERN);
    assert.ok(!/[IO01]/.test(code.slice(2)));
    assert.equal(isReservationCode(code), true);
  }

  for (const rejected of [
    "TR8K3Q7",
    "TR8K3Q7ZA",
    "tr8K3Q7Z",
    "TR8K3Q7I",
    "TR8K3Q70",
    "reservation-technical-id",
    null,
  ]) {
    assert.equal(isReservationCode(rejected), false);
  }
});

test("I.6.6 schema and migrations enforce unique reservation codes with forward-only 8-char refinement", () => {
  const schema = read("prisma/schema.prisma");
  const originalMigration = read(ORIGINAL_MIGRATION_PATH);
  const refinementMigration = read(FORMAT_REFINEMENT_MIGRATION_PATH);

  expectIncludes(
    schema,
    'reservationCode     String            @unique @map("reservation_code") @db.VarChar(8)',
  );
  expectIncludes(originalMigration, 'ADD COLUMN "reservation_code" VARCHAR(12)');
  expectIncludes(originalMigration, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  expectIncludes(originalMigration, "floor(random() * length(alphabet))");
  expectIncludes(originalMigration, 'CHECK ("reservation_code" ~');
  expectIncludes(
    originalMigration,
    "^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$",
  );
  expectIncludes(
    originalMigration,
    'ALTER COLUMN "reservation_code" SET NOT NULL',
  );
  expectIncludes(
    originalMigration,
    'CREATE UNIQUE INDEX "reservations_reservation_code_key"',
  );
  expectIncludes(originalMigration, 'ON "reservations"("reservation_code")');
  expectIncludes(refinementMigration, "existing_reservations");
  expectIncludes(refinementMigration, 'FROM "reservations"');
  expectIncludes(refinementMigration, "reservation codes are immutable");
  expectIncludes(
    refinementMigration,
    'DROP CONSTRAINT "reservations_reservation_code_format_check"',
  );
  expectIncludes(
    refinementMigration,
    'ALTER COLUMN "reservation_code" TYPE VARCHAR(8)',
  );
  expectIncludes(refinementMigration, 'CHECK ("reservation_code" ~');
  expectIncludes(
    refinementMigration,
    "^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$",
  );
  expectNotIncludes(refinementMigration, 'SET "reservation_code"');
  expectNotIncludes(refinementMigration, "random()");

  assert.doesNotMatch(originalMigration, /md5|digest|encode|gen_random_uuid/i);
  assert.doesNotMatch(
    refinementMigration,
    /md5|digest|encode|gen_random_uuid/i,
  );
});

test("I.6.6 pending-hold creation persists and returns reservationCode with fresh-transaction collision retry", () => {
  const service = read("lib/reservations/pending-holds.ts");
  const type = read("types/reservation-pending-hold.ts");
  const form = read(
    "features/reservations/components/reservation-request-form.tsx",
  );

  const attemptBody = sourceBetween(
    service,
    "async function createPendingReservationHoldAttempt(",
    "async function createPendingReservationHoldWithTransactionRetry(",
  );
  expectIncludes(attemptBody, "reservationCode: string");

  const transactionRetryBody = sourceBetween(
    service,
    "async function createPendingReservationHoldWithTransactionRetry(",
    "export async function createPendingReservationHold(",
  );
  const exportedBody = service.slice(
    service.indexOf("export async function createPendingReservationHold("),
  );

  expectIncludes(service, "generateReservationCode");
  expectIncludes(service, "RESERVATION_CODE_MAX_GENERATION_ATTEMPTS");
  expectIncludes(service, "function isReservationCodeUniqueCollision");
  expectIncludes(service, 'error.code !== "P2002"');
  expectIncludes(
    service,
    'value === "reservationCode" || value === "reservation_code"',
  );

  assert.equal(
    (attemptBody.match(/tx\.reservation\.create/g) ?? []).length,
    1,
  );
  expectIncludes(attemptBody, "reservationCode,");
  expectNotIncludes(attemptBody, "generateReservationCode()");
  expectNotIncludes(attemptBody, "RESERVATION_CODE_MAX_GENERATION_ATTEMPTS");
  expectNotIncludes(attemptBody, "continue;");
  expectNotIncludes(attemptBody, "isReservationCodeUniqueCollision(error)");
  expectNotIncludes(service, "reservationCode: generateReservationCode()");

  assert.equal(
    (
      transactionRetryBody.match(
        /createPendingReservationHoldAttempt\(input, reservationCode\)/g,
      ) ?? []
    ).length,
    2,
  );
  expectIncludes(transactionRetryBody, "isSerializableTransactionConflict");
  expectNotIncludes(transactionRetryBody, "generateReservationCode()");
  expectNotIncludes(transactionRetryBody, "isReservationCodeUniqueCollision");

  expectIncludes(exportedBody, "generateReservationCode()");
  expectIncludes(exportedBody, "createPendingReservationHoldWithTransactionRetry(");
  expectIncludes(exportedBody, "isReservationCodeUniqueCollision(error)");
  expectIncludes(
    exportedBody,
    'throw new PendingReservationHoldError("PENDING_HOLD_CONFLICT")',
  );
  expectIncludes(service, "reservationCode: true");
  expectIncludes(service, "reservationCode: reservation.reservationCode");
  expectIncludes(type, "reservationCode: string;");
  expectIncludes(form, "reservationCode: string;");
  expectIncludes(form, "copy.reservationCode");
  expectIncludes(form, "pendingHold.reservationCode");
  expectIncludes(form, "reservationId={pendingHold.reservationId}");
});

test("I.6.6 admin reservations list searches and displays the human code while keeping id for routing", () => {
  const service = read("lib/admin/reservations.ts");
  const component = read(
    "features/admin/components/admin-reservations-page.tsx",
  );
  const type = read("types/admin-reservations.ts");
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  expectIncludes(service, "reservationCode: {");
  expectIncludes(service, "reservationCode: true");
  expectIncludes(service, "reservationCode: reservation.reservationCode");
  expectIncludes(type, "reservationCode: string;");
  expectIncludes(component, "label={copy.labels.reservationCode}");
  expectIncludes(component, "value={reservation.reservationCode}");
  expectIncludes(component, "key={reservation.id}");
  expectIncludes(component, "value={reservation.id}");
  expectIncludes(component, "reservation.id,");
  expectIncludes(es, 'reservationCode: "Código de reservación"');
  expectIncludes(en, 'reservationCode: "Reservation code"');
  expectIncludes(es, "Buscar por huésped, correo, código o ID de reserva");
  expectIncludes(en, "Search by guest, email, code, or reservation ID");
});

test("I.6.6 admin reservation detail shell carries id and displays reservationCode", () => {
  const service = read("lib/admin/reservation-detail.ts");
  const component = read(
    "features/admin/components/admin-reservation-detail-page.tsx",
  );
  const shellType = read("types/admin-reservation-detail-tabs.ts");
  const detailType = read("types/admin-reservation-detail.ts");

  expectIncludes(shellType, '"id" | "reservationCode" | "status"');
  expectIncludes(detailType, "reservationCode: string;");
  expectIncludes(service, "reservationCode: true");
  expectIncludes(service, "reservationCode: reservation.reservationCode");
  expectIncludes(component, "reservationShell.reservationCode");
  expectIncludes(component, "reservationShell.id");
  expectIncludes(component, "label={reservationCopy.labels.reservationCode}");
  expectIncludes(component, "value={reservation.reservationCode}");
});

test("I.6.6 confirmation emails show reservationCode while admin links keep the technical id", () => {
  const templateTypes = read("types/email-template.ts");
  const templateData = read("emails/template-data.ts");
  const notificationService = read(
    "lib/email/reservation-confirmation-notifications.ts",
  );
  const guestEmail = read("emails/reservation-confirmed-email.tsx");
  const adminEmail = read("emails/admin-new-reservation-email.tsx");
  const i4Test = read(
    "tests/final-i/i4-guest-email-visible-url-cleanup.test.ts",
  );

  expectIncludes(templateTypes, "reservationCode: string;");
  expectIncludes(templateData, "const reservationCodeSchema = z");
  expectIncludes(templateData, "reservationCode: reservationCodeSchema");
  expectIncludes(templateData, ".regex(/^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);");
  expectIncludes(templateData, "reservationCode: reservation.reservationCode");
  expectIncludes(templateData, "reservationId: reservation.id");
  expectIncludes(notificationService, "reservationCode: true");
  expectIncludes(
    notificationService,
    "reservationCode: reservation.reservationCode",
  );
  expectIncludes(guestEmail, "value={view.reservationCode}");
  expectIncludes(adminEmail, "value={view.reservationCode}");
  expectIncludes(adminEmail, "href={view.adminReservationUrl}");
  expectIncludes(templateData, "reservationId: reservation.id");
  expectIncludes(i4Test, "reservation(locale).reservationCode");
  expectIncludes(
    i4Test,
    "!visibleTextFromHtml(content.html).includes(reservation(locale).id)",
  );
});

test("I.6.6 public payment result and retry pages show code but keep id for provider flow", () => {
  const helper = read("lib/reservations/reservation-public-reference.ts");
  const result = read("features/payments/components/payment-result-page.tsx");
  const retry = read("features/payments/components/payment-retry-page.tsx");
  const successPage = read("app/reservas/pago/exitoso/page.tsx");
  const cancelPage = read("app/reservas/pago/cancelado/page.tsx");
  const errorPage = read("app/reservas/pago/error/page.tsx");
  const retryPage = read("app/reservas/pago/reintentar/page.tsx");

  expectIncludes(helper, "getReservationCodeById");
  expectIncludes(helper, "select: { reservationCode: true }");
  expectIncludes(result, "reservationCode: string | null;");
  expectIncludes(result, "resultMessages.labels.reservationCode");
  expectIncludes(result, "{reservationCode}");
  expectNotIncludes(result, "reservationId: string | null;");
  expectIncludes(retry, "reservationCode: string | null;");
  expectIncludes(retry, "messages.reservations.pendingHold.reservationCode");
  expectIncludes(retry, "reservationId={reservationId}");

  for (const page of [successPage, cancelPage, errorPage, retryPage]) {
    expectIncludes(page, "getReservationCodeById(reservationId)");
    expectIncludes(page, "reservationCode={reservationCode}");
  }
});

test("I.6.6 FEL visible reservation references use code while source ids stay technical", () => {
  const types = read("types/admin-fel.ts");
  const service = read("lib/admin/fel.ts");
  const component = read("features/admin/components/admin-fel-page.tsx");
  const testFixture = read(
    "tests/final-i/i6-fel-persistence-admin-draft.test.ts",
  );

  expectIncludes(types, "reservationCode: string;");
  expectIncludes(service, "reservationCode: true");
  expectIncludes(service, "reservationCode: source.reservationCode");
  expectIncludes(
    service,
    "reservationCode: reservation.reservation.reservationCode",
  );
  expectIncludes(service, "reservationIds: composition.reservations.map(");
  expectIncludes(service, "(reservation) => reservation.id,");
  expectIncludes(component, "reservationCode: reservation.reservationCode");
  expectIncludes(component, "copy.labels.reservationCode");
  expectIncludes(component, "reservation.reservationCode");
  expectIncludes(component, ".map((reservation) => reservation.id)");
  expectIncludes(testFixture, 'reservationCode: "TR8K3Q7Z"');
});

test("I.6.6 does not introduce public reservation-code routes", () => {
  const appFiles = listFiles("app");
  const publicReservationCodeRoutes = appFiles.filter((file) =>
    /\[reservationCode\]|reservation-code|reservationCode/.test(file),
  );

  assert.deepEqual(publicReservationCodeRoutes, []);
  expectIncludes(
    read("app/admin/reservations/[reservationId]/page.tsx"),
    "reservationId",
  );
  expectIncludes(
    read("app/api/admin/reservations/[reservationId]/tabs/[tab]/route.ts"),
    "reservationId",
  );
});
