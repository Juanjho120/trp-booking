import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { enMessages, esMessages } from "@/messages";

import { test } from "./harness";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStrings(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => flattenStrings(item));
  }

  return [];
}

function assertNoStaleCopy(source: string, locale: "es" | "en"): void {
  const stalePatterns: readonly RegExp[] = [
    /Pr[óo]ximamente/i,
    /Online booking coming soon/i,
    /coming soon/i,
    /upcoming phases/i,
    /pr[óo]ximas fases/i,
    /next phase/i,
    /siguiente fase/i,
    /next subphase/i,
    /siguiente subfase/i,
    /\bPhase\s+\d+(?:\.\d+)*\b/i,
    /\bFase\s+\d+(?:\.\d+)*\b/i,
    /Phase 8\.3/i,
    /Phase 11\.4/i,
    /Subfase 8\.4/i,
    /booking phase/i,
    /fase de booking/i,
    /booking est[eé] activo/i,
    /booking is active/i,
    /11\.5\.5 refund integration/i,
    /reembolso de 11\.5\.5/i,
    /future iCal feeds/i,
    /futuros feeds iCal/i,
    /this subphase will not delete/i,
    /esta subfase/i,
  ];

  for (const pattern of stalePatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${locale} messages still include stale future-phase copy: ${pattern}`,
    );
  }
}

test("I.2 removes the obsolete public Home CTA component", () => {
  assert.equal(
    existsSync(
      path.join(
        ROOT,
        "features/marketing/components/homepage-cta-section.tsx",
      ),
    ),
    false,
  );

  const homePage = read("features/marketing/components/home-page.tsx");

  assert.doesNotMatch(homePage, /HomepageCtaSection/);
  assert.doesNotMatch(homePage, /homepage-cta-section/);
});

test("I.2 removes stale public and admin copy keys from bilingual messages", () => {
  const esHome = esMessages.home as Record<string, unknown>;
  const enHome = enMessages.home as Record<string, unknown>;
  const esDetail = esMessages.properties.detail as Record<string, unknown>;
  const enDetail = enMessages.properties.detail as Record<string, unknown>;
  const esRequest = esMessages.reservations.request as Record<string, unknown>;
  const enRequest = enMessages.reservations.request as Record<string, unknown>;
  const esPendingHold = esMessages.reservations.pendingHold as Record<
    string,
    unknown
  >;
  const enPendingHold = enMessages.reservations.pendingHold as Record<
    string,
    unknown
  >;
  const esPreparationNotes = esMessages.admin.accommodations.preparation
    .notes as Record<string, unknown>;
  const enPreparationNotes = enMessages.admin.accommodations.preparation
    .notes as Record<string, unknown>;

  assert.equal(Object.hasOwn(esHome, "cta"), false);
  assert.equal(Object.hasOwn(enHome, "cta"), false);
  assert.equal(Object.hasOwn(esDetail, "reserveComingSoon"), false);
  assert.equal(Object.hasOwn(enDetail, "reserveComingSoon"), false);
  assert.equal(Object.hasOwn(esRequest, "createHoldDisabled"), false);
  assert.equal(Object.hasOwn(enRequest, "createHoldDisabled"), false);
  assert.equal(Object.hasOwn(esRequest, "phaseBoundaryNote"), false);
  assert.equal(Object.hasOwn(enRequest, "phaseBoundaryNote"), false);
  assert.equal(Object.hasOwn(esPendingHold, "phaseBoundaryNote"), false);
  assert.equal(Object.hasOwn(enPendingHold, "phaseBoundaryNote"), false);
  assert.equal(Object.hasOwn(esPreparationNotes, "settingsImpact"), false);
  assert.equal(Object.hasOwn(enPreparationNotes, "settingsImpact"), false);
});

test("I.2 keeps current direct-booking copy and removes stale roadmap language", () => {
  const esText = flattenStrings(esMessages).join("\n");
  const enText = flattenStrings(enMessages).join("\n");

  assertNoStaleCopy(esText, "es");
  assertNoStaleCopy(enText, "en");

  assert.match(esText, /Pr[óo]ximas llegadas/);
  assert.match(enText, /Upcoming arrivals/);
  assert.match(esText, /Pr[óo]ximo intento/);
  assert.match(enText, /Next attempt/);
  assert.match(
    esText,
    /Consulta disponibilidad, reserva directamente y completa pagos seguros con Tilopay\./,
  );
  assert.match(
    enText,
    /Check availability, book directly, and complete secure payments with Tilopay\./,
  );
  assert.match(
    esText,
    /Tu reservaci[oó]n qued[oó] apartada temporalmente mientras completas el pago\./,
  );
  assert.match(
    enText,
    /Your reservation is temporarily held while you complete payment\./,
  );
});

test("I.2 removes the admin accommodations settings-impact notice", () => {
  const settingsComponent = read(
    "features/admin/components/admin-accommodation-settings.tsx",
  );

  assert.match(settingsComponent, /copy\.notes\.allowedRange/);
  assert.doesNotMatch(settingsComponent, /settingsImpact/);
});
