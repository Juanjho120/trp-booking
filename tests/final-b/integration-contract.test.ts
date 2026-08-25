import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";

import { adminAccommodationIds } from "@/lib/admin/accommodations";
import { getAdminExternalCalendarIntegrationsPage } from "@/lib/admin/external-calendar-integrations";
import {
  resolveAirbnbIcalImportUrlDatabaseFirst,
  resolveAirbnbImportSecretSource,
  resolveLegacyAirbnbIcalImportUrl,
} from "@/lib/external-calendars/airbnb-import-secret";

import { test } from "./harness";

test("DB-backed inbound configuration remains the only configured secret source", () => {
  const calendar = {
    id: "calendar-db",
    propertyId: "black-white-apartment",
    importUrlEncrypted: "v1:encrypted-placeholder",
  } as const;

  const retiredLegacyEnv = {
    TRP_ENVIRONMENT: "test",
    AIRBNB_ICAL_IMPORT_URLS_JSON: JSON.stringify({
      "calendar-db":
        "https://www.airbnb.com/calendar/ical/retired.ics?t=retired-secret",
    }),
  };

  assert.equal(
    resolveAirbnbImportSecretSource(calendar, retiredLegacyEnv),
    "DATABASE_ENCRYPTED",
  );
});

test("retired legacy inbound configuration cannot configure Local or Test", () => {
  const calendar = {
    id: "calendar-retired-legacy",
    propertyId: "perfect-retreat-bungalow",
    importUrlEncrypted: null,
  } as const;

  for (const trpEnvironment of ["local", "test"] as const) {
    const env = {
      TRP_ENVIRONMENT: trpEnvironment,
      AIRBNB_ICAL_IMPORT_URLS_JSON: JSON.stringify({
        [calendar.id]:
          "https://www.airbnb.com/calendar/ical/retired.ics?t=retired-secret",
      }),
    };

    assert.equal(resolveAirbnbImportSecretSource(calendar, env), "NONE");
    assert.equal(
      resolveLegacyAirbnbIcalImportUrl(calendar.id, env),
      null,
    );
    assert.equal(
      resolveAirbnbIcalImportUrlDatabaseFirst(calendar, env),
      null,
    );
  }
});

test("retired legacy inbound configuration cannot configure Production", () => {
  const calendar = {
    id: "calendar-production",
    propertyId: "complete-retreat",
    importUrlEncrypted: null,
  } as const;

  const env = {
    TRP_ENVIRONMENT: "production",
    AIRBNB_ICAL_IMPORT_URLS_JSON: JSON.stringify({
      [calendar.id]:
        "https://www.airbnb.com/calendar/ical/retired.ics?t=retired-secret",
    }),
  };

  assert.equal(resolveLegacyAirbnbIcalImportUrl(calendar.id, env), null);
  assert.equal(resolveAirbnbImportSecretSource(calendar, env), "NONE");
  assert.equal(resolveAirbnbIcalImportUrlDatabaseFirst(calendar, env), null);
});

test("legacy compatibility resolver fails closed in every TRP environment", () => {
  for (const trpEnvironment of ["local", "test", "production"] as const) {
    assert.equal(
      resolveLegacyAirbnbIcalImportUrl("calendar-any", {
        TRP_ENVIRONMENT: trpEnvironment,
        AIRBNB_ICAL_IMPORT_URLS_JSON:
          '{"calendar-any":"https://example.invalid/private.ics"}',
      }),
      null,
    );
  }
});

test("admin integration DTO contains only secret-safe state and evidence", async () => {
  const now = new Date("2026-08-25T18:00:00.000Z");
  const secretUrlCiphertext = "v1:DO_NOT_EXPOSE_IMPORT_CIPHERTEXT";
  const tokenHash = "DO_NOT_EXPOSE_TOKEN_HASH";
  const tokenCiphertext = "v1:DO_NOT_EXPOSE_TOKEN_CIPHERTEXT";
  const calendarId = "calendar-safe-dto";

  const properties = adminAccommodationIds.map((id) => ({
    id,
    nameEs: id,
    nameEn: id,
  }));
  const calendar = {
    id: calendarId,
    propertyId: adminAccommodationIds[0],
    provider: "AIRBNB",
    direction: "BIDIRECTIONAL",
    name: "Airbnb",
    importUrlEncrypted: secretUrlCiphertext,
    exportTokenHash: tokenHash,
    exportTokenEncrypted: tokenCiphertext,
    exportTokenLastRotatedAt: now,
    isImportEnabled: true,
    isExportEnabled: true,
    lastExportGeneratedAt: now,
    lastFailureCode: null,
    lastFailureMessage: null,
    status: "ACTIVE",
    updatedAt: now,
    deletedAt: null,
  };
  const successLog = {
    status: "SUCCESS",
    triggeredBy: "ADMIN",
    startedAt: now,
    finishedAt: now,
    eventsImported: 1,
    eventsUpdated: 0,
    eventsRemoved: 0,
    eventsSkipped: 0,
    blocksCreated: 1,
    blocksUpdated: 0,
    errorCode: null,
    errorMessage: null,
  };

  const prismaClient = {
    property: {
      findMany: async () => properties,
    },
    externalCalendar: {
      findMany: async () => [calendar],
    },
    externalCalendarSyncLog: {
      findFirst: async (args: { where?: { externalCalendarId?: string } }) =>
        args.where?.externalCalendarId === calendarId ? successLog : null,
    },
  } as unknown as PrismaClient;

  const pageData = await getAdminExternalCalendarIntegrationsPage({
    prismaClient,
    env: { TRP_ENVIRONMENT: "test" },
  });
  const serialized = JSON.stringify(pageData);
  const first = pageData.integrations[0];

  assert.ok(first);
  assert.equal(first.importSecretSource, "DATABASE_ENCRYPTED");
  assert.equal(first.inboundStatus, "HEALTHY");
  assert.equal(first.outboundStatus, "READY");
  assert.equal(first.exportCopyAvailable, true);

  for (const forbiddenKey of [
    "importUrlEncrypted",
    "exportTokenHash",
    "exportTokenEncrypted",
    "rawToken",
    "outboundUrl",
  ]) {
    assert.equal(forbiddenKey in first, false, forbiddenKey);
  }

  for (const forbiddenValue of [
    secretUrlCiphertext,
    tokenHash,
    tokenCiphertext,
  ]) {
    assert.equal(serialized.includes(forbiddenValue), false, forbiddenValue);
  }
});
