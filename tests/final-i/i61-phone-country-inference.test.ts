import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { GET as getPhoneCountry } from "@/app/api/geo/phone-country/route";
import { normalizeSupportedCountryCode } from "@/lib/geo/countries";

import { test } from "./harness";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

async function requestPhoneCountry(
  headers: Record<string, string> = {},
): Promise<Readonly<{ response: Response; payload: Record<string, unknown> }>> {
  const response = await getPhoneCountry(
    new Request("https://trp-booking.juantzun.dev/api/geo/phone-country", {
      headers,
      method: "GET",
    }),
  );
  const payload = (await response.json()) as Record<string, unknown>;

  return { response, payload };
}

test("I.6.1 normalizes supported phone-country codes from the shared catalog", () => {
  assert.equal(normalizeSupportedCountryCode("US"), "US");
  assert.equal(normalizeSupportedCountryCode("us"), "US");
  assert.equal(normalizeSupportedCountryCode(" gt "), "GT");
  assert.equal(normalizeSupportedCountryCode(""), null);
  assert.equal(normalizeSupportedCountryCode(undefined), null);
  assert.equal(normalizeSupportedCountryCode(null), null);
  assert.equal(normalizeSupportedCountryCode("ZZ"), null);
  assert.equal(normalizeSupportedCountryCode("GTM"), null);
  assert.equal(normalizeSupportedCountryCode("1!"), null);
});

test("I.6.1 phone-country endpoint exposes only the bounded country result", async () => {
  const valid = await requestPhoneCountry({
    "x-vercel-ip-country": "us",
    "x-forwarded-for": "203.0.113.10",
    "x-vercel-ip-city": "Guatemala City",
    "x-vercel-ip-latitude": "14.6349",
    "x-vercel-ip-longitude": "-90.5069",
    authorization: "Bearer should-not-matter",
  });
  const missing = await requestPhoneCountry();
  const invalid = await requestPhoneCountry({
    "x-vercel-ip-country": "ZZ",
  });

  assert.equal(valid.response.status, 200);
  assert.equal(valid.response.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(valid.payload, { country: "US" });
  assert.deepEqual(Object.keys(valid.payload), ["country"]);
  assert.equal(JSON.stringify(valid.payload).includes("203.0.113.10"), false);
  assert.equal(JSON.stringify(valid.payload).includes("Guatemala City"), false);
  assert.deepEqual(missing.payload, { country: null });
  assert.deepEqual(invalid.payload, { country: null });

  const route = read("app/api/geo/phone-country/route.ts");

  assert.match(route, /headers\.get\("x-vercel-ip-country"\)/);
  assert.match(route, /normalizeSupportedCountryCode/);
  assert.doesNotMatch(route, /x-forwarded-for|x-vercel-ip-city|latitude|longitude|postal|region/i);
  assert.doesNotMatch(route, /getAdminSession|auth\(|session|prisma|database/i);
});

test("I.6.1 keeps the public property page cacheable and free of request headers", () => {
  const page = read("app/alojamientos/[slug]/page.tsx");

  assert.match(page, /export const revalidate = 300;/);
  assert.doesNotMatch(page, /headers\(/);
  assert.doesNotMatch(page, /next\/headers/);
  assert.doesNotMatch(page, /x-vercel-ip-country|\/api\/geo\/phone-country/);
});

test("I.6.1 reservation form infers after mount while preserving GT fallback and manual selection", () => {
  const component = read(
    "features/reservations/components/reservation-request-form.tsx",
  );

  assert.match(component, /const defaultCountry: Country = "GT";/);
  assert.match(component, /useState<Country>\(defaultCountry\)/);
  assert.match(component, /fetch\("\/api\/geo\/phone-country"/);
  assert.match(component, /cache:\s*"no-store"/);
  assert.match(component, /countrySelectionSourceRef\.current === "MANUAL"/);
  assert.match(component, /countrySelectionSourceRef\.current = "INFERRED"/);
  assert.match(component, /countrySelectionSourceRef\.current = "MANUAL"/);
  assert.match(component, /setGuestCountry\(inferredCountry\)/);
  assert.doesNotMatch(component, /navigator\.geolocation/);

  assert.match(component, /guestCountry: input\.guestCountry\.iso2/);
  assert.match(component, /countryDialCode: input\.guestCountry\.dialCode/);
  assert.match(component, /guestPhoneLocal: input\.guestPhoneLocal\.trim\(\)/);
  assert.doesNotMatch(
    component,
    /(?:inferredCountry|geoCountry|ipCountry|locationCountry)\s*:/,
  );
});
