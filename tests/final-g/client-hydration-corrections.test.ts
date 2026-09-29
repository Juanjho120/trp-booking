import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readExistingSources(relativePaths: readonly string[]): string {
  return relativePaths
    .filter((relativePath) => existsSync(path.join(ROOT, relativePath)))
    .map(readSource)
    .join("\n");
}

function assertInOrder(source: string, first: string, second: string): void {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert.notEqual(firstIndex, -1, `Missing source marker: ${first}`);
  assert.notEqual(secondIndex, -1, `Missing source marker: ${second}`);
  assert.equal(
    firstIndex < secondIndex,
    true,
    `Expected "${first}" to appear before "${second}".`,
  );
}

function countMatches(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

test("G.3 preserves the accepted client-side ES/EN locale contract", () => {
  const localeHook = readSource("features/i18n/use-locale.tsx");

  assert.match(localeHook, /^"use client";/);
  assert.match(localeHook, /LOCALE_STORAGE_KEY = "trp-booking\.locale"/);
  assert.match(localeHook, /LOCALE_CHANGE_EVENT = "trp-booking:locale-change"/);
  assert.match(localeHook, /window\.localStorage\.getItem\(LOCALE_STORAGE_KEY\)/);
  assert.match(localeHook, /window\.localStorage\.setItem\(LOCALE_STORAGE_KEY, nextLocale\)/);
  assert.match(localeHook, /window\.dispatchEvent\(new Event\(LOCALE_CHANGE_EVENT\)\)/);
  assert.match(localeHook, /window\.addEventListener\("storage", handleLocaleChange\)/);
  assert.match(readSource("types/locale.ts"), /defaultLocale: Locale = "es"/);
});

test("G.3 does not introduce locale cookies, middleware locale routing or ES/EN route trees", () => {
  const routingSources = readExistingSources([
    "middleware.ts",
    "next.config.ts",
    "app/layout.tsx",
  ]);

  assert.equal(existsSync(path.join(ROOT, "app", "es")), false);
  assert.equal(existsSync(path.join(ROOT, "app", "en")), false);
  assert.doesNotMatch(routingSources, /cookies\(\)|localeDetection|i18n:/);
  assert.doesNotMatch(readSource("middleware.ts"), /locale|trp-booking\.locale|\/es|\/en/);
});

test("G.3 keeps public property screens as client pages instead of a wholesale server conversion", () => {
  const listing = readSource("features/properties/components/accommodations-page.tsx");
  const detail = readSource("features/properties/components/property-detail-page.tsx");

  assert.match(listing, /^"use client";/);
  assert.match(detail, /^"use client";/);
  assert.match(listing, /useLocale\(\)/);
  assert.match(detail, /useLocale\(\)/);
  assert.match(detail, /<ReservationRequestForm/);
});

test("G.3 decouples the accommodation listing route from the detail booking/payment graph", () => {
  const route = readSource("app/alojamientos/page.tsx");
  const listing = readSource("features/properties/components/accommodations-page.tsx");

  assert.match(
    route,
    /@\/features\/properties\/components\/accommodations-page/,
  );
  assert.doesNotMatch(route, /@\/features\/properties";/);
  assert.doesNotMatch(
    listing,
    /ReservationRequestForm|features\/reservations|features\/payments|Tilopay|react-day-picker|react-phone-number-input/,
  );
});

test("G.3 keeps the detail route explicit and preserves the booking form entry point", () => {
  const route = readSource("app/alojamientos/[slug]/page.tsx");
  const detail = readSource("features/properties/components/property-detail-page.tsx");

  assert.match(
    route,
    /@\/features\/properties\/components\/property-detail-page/,
  );
  assert.doesNotMatch(route, /@\/features\/properties";/);
  assert.match(detail, /<ReservationRequestForm\s+accommodationId=\{accommodation\.id\}/);
  assert.doesNotMatch(detail, /load booking form|cargar formulario/i);
});

test("G.3 defers Tilopay checkout code until the pending-hold branch while keeping it reachable", () => {
  const form = readSource("features/reservations/components/reservation-request-form.tsx");

  assert.doesNotMatch(form, /import\s+\{\s*TilopaySdkCheckout\s*\}/);
  assert.match(
    form,
    /import\(\s*"@\/features\/payments\/components\/tilopay-sdk-checkout"\s*\)/,
  );
  assert.match(form, /function loadTilopayCheckoutComponent/);
  assert.match(form, /const preloadPaymentCheckout = useCallback/);
  assertInOrder(
    form,
    "preloadPaymentCheckout();",
    'const response = await fetch("/api/reservations/pending-hold"',
  );
  assert.match(form, /PaymentCheckoutComponent \? \(/);
  assert.match(form, /reservationId=\{pendingHold\.reservationId\}/);
  assert.match(form, /scrollPaymentFormIntoViewportCenter\(paymentSectionRef\.current\)/);
  assert.match(form, /DeferredPaymentCheckoutFallback/);
  assert.match(form, /messages\.payments\.tilopaySdk\.initializingPayment/);
});

test("G.3 preserves the Tilopay SDK session, preflight, telemetry and start-payment lifecycle", () => {
  const checkout = readSource("features/payments/components/tilopay-sdk-checkout.tsx");

  assert.match(checkout, /loadTilopaySdkScript/);
  assert.match(checkout, /https:\/\/app\.tilopay\.com\/sdk\/v2\/sdk_tpay\.min\.js/);
  assert.doesNotMatch(checkout, /Date\.now\(\)/);
  assert.doesNotMatch(checkout, /\?v=/);
  assert.match(checkout, /let tilopaySdkScriptLoadPromise: Promise<void> \| null = null/);
  assert.match(checkout, /if \(tilopaySdkScriptLoadPromise\) \{/);
  assert.match(checkout, /tilopaySdkScriptLoadPromise = null/);
  assert.match(checkout, /ensureTilopaySdkResourceHints/);
  assert.match(checkout, /rel = "preconnect"/);
  assert.match(checkout, /rel = "preload"/);
  assert.match(checkout, /\/api\/payments\/tilopay\/sdk-session/);
  assert.match(checkout, /\/api\/payments\/tilopay\/preflight/);
  assert.match(checkout, /\/api\/payments\/tilopay\/sdk-client-events/);
  assert.match(checkout, /window\.Tilopay\.Init/);
  assert.match(checkout, /window\.Tilopay\.startPayment/);
  assert.match(checkout, /onPaymentFormReady\?\.\(\)/);
});

test("G.3 hardens the public availability page with the shared shell, tabs and centralized copy", () => {
  const route = readSource("app/disponibilidad/page.tsx");
  const page = readSource(
    "features/availability/components/public-availability-page.tsx",
  );
  const calendar = readSource(
    "features/availability/components/public-availability-calendar.tsx",
  );
  const esMessages = readSource("messages/es.ts");
  const enMessages = readSource("messages/en.ts");
  const index = readSource("features/availability/index.ts");

  assert.match(route, /getPublicAccommodations\(\)/);
  assert.match(page, /<SiteHeader \/>/);
  assert.match(page, /<SiteFooter \/>/);
  assert.match(page, /<Tabs/);
  assert.match(page, /<TabsList/);
  assert.match(page, /<TabsTrigger/);
  assert.match(page, /<TabsContent/);
  assert.equal(countMatches(page, /<PublicAvailabilityCalendar/g), 1);
  assert.match(page, /activeAccommodationId/);
  assert.match(page, /href=\{`\/alojamientos\/\$\{activeAccommodation\.slug\[locale\]\}`\}/);
  assert.match(esMessages, /\{ label: "Disponibilidad", href: "\/disponibilidad" \}/);
  assert.match(enMessages, /\{ label: "Availability", href: "\/disponibilidad" \}/);
  assert.match(esMessages, /availability: \{/);
  assert.match(enMessages, /availability: \{/);
  assert.match(esMessages, /Ver alojamiento y reservar/);
  assert.match(enMessages, /View accommodation and book/);
  assert.doesNotMatch(page, /publicAvailabilityCopy|Próximamente|coming soon|not enabled|no están habilitados/i);
  assert.doesNotMatch(calendar, /checkoutDisabledNotice|calendarTitle/);
  assert.doesNotMatch(index, /copy/);
  assert.equal(existsSync(path.join(ROOT, "features/availability/copy.ts")), false);
});

test("G.3 keeps Tilopay preload side-effect-free and parallelizes only after payable-state preparation", () => {
  const checkout = readSource("features/payments/components/tilopay-sdk-checkout.tsx");
  const session = readSource("lib/payments/tilopay-sdk-session.ts");
  const preloadIndex = checkout.indexOf("function ensureTilopaySdkResourceHints");
  const initIndex = checkout.indexOf("window.Tilopay.Init");
  const sessionEndpointIndex = checkout.indexOf('"/api/payments/tilopay/sdk-session"');

  assert.ok(preloadIndex >= 0);
  assert.ok(initIndex > preloadIndex);
  assert.ok(sessionEndpointIndex > preloadIndex);
  assert.doesNotMatch(
    checkout.slice(preloadIndex, checkout.indexOf("function loadTilopaySdkScript")),
    /Tilopay\.Init|fetch\("/,
  );
  assert.match(session, /Promise\.all\(\[\s*ensurePaymentProviderReference/s);
  assert.match(
    session,
    /async function createGuestPaymentRequestTilopaySdkSession[\s\S]*prepared = await prepareGuestPaymentRequestPayment[\s\S]*Promise\.all\(\[/,
  );
  assert.match(
    session,
    /export async function createTilopaySdkSession[\s\S]*paymentAttempt = await createPaymentAttemptForPendingReservation\(input\)[\s\S]*Promise\.all\(\[/,
  );
});

test("G.3 inventory keeps every runtime Tilopay checkout consumer on the shared component", () => {
  const consumers = readExistingSources([
    "features/reservations/components/reservation-request-form.tsx",
    "features/payments/components/payment-retry-page.tsx",
    "features/payments/components/additional-charge-payment-page.tsx",
    "features/payments/components/lifecycle-adjustment-payment-page.tsx",
  ]);

  assert.match(consumers, /features\/payments\/components\/tilopay-sdk-checkout/);
  assert.match(consumers, /PaymentCheckoutComponent/);
  assert.match(consumers, /<TilopaySdkCheckout/);
  assert.doesNotMatch(consumers, /sdk_tpay\.min\.js\?v=/);
});

test("G.3 keeps the booking form immediately visible and avoids blanket client-only dynamic escapes", () => {
  const publicSources = readExistingSources([
    "features/properties/components/property-detail-page.tsx",
    "features/properties/components/accommodations-page.tsx",
    "features/reservations/components/reservation-request-form.tsx",
    "features/availability/components/public-availability-calendar.tsx",
  ]);

  assert.doesNotMatch(publicSources, /Load booking form|Cargar formulario/i);
  assert.doesNotMatch(publicSources, /next\/dynamic|ssr:\s*false/);
});

test("G.3 preserves the live 60-day availability API while reserving calendar geometry during loading", () => {
  const calendar = readSource(
    "features/availability/components/public-availability-calendar.tsx",
  );

  assert.match(calendar, /DEFAULT_VISIBLE_DAYS = 60/);
  assert.match(calendar, /function AvailabilityCalendarSkeleton/);
  assert.match(calendar, /role="status"/);
  assert.match(calendar, /aria-hidden="true"/);
  assert.match(calendar, /grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4/);
  assert.match(calendar, /min-h-20/);
  assert.match(calendar, /\/api\/availability\?/);
  assert.match(calendar, /AbortController/);
  assert.match(calendar, /copy\.retry/);
});

test("G.3 replaces per-day availability date formatter construction with one stable formatter", () => {
  const calendar = readSource(
    "features/availability/components/public-availability-calendar.tsx",
  );

  assert.equal(countMatches(calendar, /new Intl\.DateTimeFormat\("es-GT"/g), 1);
  assertInOrder(
    calendar,
    'const calendarDateFormatter = new Intl.DateTimeFormat("es-GT"',
    "function formatCalendarDate",
  );
  assert.match(calendar, /calendarDateFormatter\.format\(parsedDate\)/);
});

test("G.3 documents the evidence-based DayPicker and country-flag decision", () => {
  const form = readSource("features/reservations/components/reservation-request-form.tsx");
  const record = readSource(
    "docs/208-final-g-3-client-hydration-and-image-path-corrections.md",
  );

  assert.match(form, /import \{ DayPicker, type DateRange \} from "react-day-picker"/);
  assert.match(form, /from "react-phone-number-input\/flags"/);
  assert.doesNotMatch(form, /import\(\s*"react-day-picker"/);
  assert.match(record, /DayPicker and country flags remain static/);
});

test("G.3 keeps the accepted Next Image Cloudinary path unless stronger evidence appears", () => {
  const nextConfig = readSource("next.config.ts");
  const record = readSource(
    "docs/208-final-g-3-client-hydration-and-image-path-corrections.md",
  );

  assert.match(nextConfig, /remotePatterns/);
  assert.match(nextConfig, /hostname: "res\.cloudinary\.com"/);
  assert.doesNotMatch(nextConfig, /loaderFile|cloudinaryLoader|images:\s*{\s*loader/);
  assert.match(record, /No image loader architecture change/);
});

test("G.3 record preserves admin/crons boundaries while tracking later accepted work", () => {
  const record = readSource(
    "docs/208-final-g-3-client-hydration-and-image-path-corrections.md",
  );

  assert.match(record, /Admin runtime behavior: unchanged/);
  assert.match(record, /Final-G\.4: Completed and accepted on 2026-09-28/);
  assert.match(record, /Final-G\.5: Implementation\/evidence completed; owner acceptance pending/);
  assert.match(record, /Phase 13: Not started/);
  assert.match(readSource("vercel.json"), /"crons": \[\]/);
});
