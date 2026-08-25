import assert from "node:assert/strict";

import {
  AIRBNB_ICAL_MAX_RESPONSE_BYTES,
  AirbnbIcalProviderError,
  assertAllowedAirbnbIcalUrl,
  fetchAirbnbIcalTextSecurely,
} from "@/lib/airbnb-ical/provider-security";

import { test } from "./harness";

const validUrl =
  "https://www.airbnb.com/calendar/ical/123456789.ics?s=CaseSensitiveSecret";
const validCalendar = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n";

function expectProviderCode(code: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof AirbnbIcalProviderError && error.code === code;
}

async function withFetchMock(
  mock: typeof fetch,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Airbnb URL policy accepts the approved HTTPS iCal shape without rewriting secret data", () => {
  const parsed = assertAllowedAirbnbIcalUrl(validUrl);
  assert.equal(parsed.protocol, "https:");
  assert.equal(parsed.hostname, "www.airbnb.com");
  assert.equal(parsed.pathname, "/calendar/ical/123456789.ics");
  assert.equal(parsed.search, "?s=CaseSensitiveSecret");
});

test("Airbnb URL policy rejects unsafe provider targets", () => {
  const denied = [
    "http://www.airbnb.com/calendar/ical/123.ics",
    "https://evil.example/calendar/ical/123.ics",
    "https://airbnb.com.evil.example/calendar/ical/123.ics",
    "https://127.0.0.1/calendar/ical/123.ics",
    "https://[::1]/calendar/ical/123.ics",
    "https://user:password@www.airbnb.com/calendar/ical/123.ics",
    "https://www.airbnb.com:444/calendar/ical/123.ics",
    "https://www.airbnb.com/calendar/ical/123.ics#fragment",
    "https://www.airbnb.com/calendar/ical/123.txt",
    "https://www.airbnb.com/not-calendar/123.ics",
  ];

  for (const candidate of denied) {
    assert.throws(
      () => assertAllowedAirbnbIcalUrl(candidate),
      expectProviderCode("ICAL_URL_NOT_ALLOWED"),
      candidate,
    );
  }
});

test("secure provider fetch uses manual redirects and accepts an allowed Airbnb redirect", async () => {
  let calls = 0;

  await withFetchMock(
    (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      assert.equal(init?.redirect, "manual");

      if (calls === 1) {
        return new Response(null, {
          status: 302,
          headers: {
            location:
              "https://airbnb.com/calendar/ical/redirected.ics?s=PreserveMe",
          },
        });
      }

      return new Response(validCalendar, { status: 200 });
    }) as typeof fetch,
    async () => {
      const content = await fetchAirbnbIcalTextSecurely(validUrl, {
        timeoutMs: 10_000,
      });
      assert.equal(content, validCalendar);
      assert.equal(calls, 2);
    },
  );
});

test("secure provider fetch rejects redirects outside the Airbnb boundary", async () => {
  await withFetchMock(
    (async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/calendar/ical/123.ics" },
      })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => fetchAirbnbIcalTextSecurely(validUrl, { timeoutMs: 10_000 }),
        expectProviderCode("ICAL_REDIRECT_NOT_ALLOWED"),
      );
    },
  );
});

test("secure provider fetch enforces the three-redirect maximum", async () => {
  let redirects = 0;

  await withFetchMock(
    (async () => {
      redirects += 1;
      return new Response(null, {
        status: 302,
        headers: {
          location: `https://www.airbnb.com/calendar/ical/${redirects}.ics`,
        },
      });
    }) as typeof fetch,
    async () => {
      await assert.rejects(
        () => fetchAirbnbIcalTextSecurely(validUrl, { timeoutMs: 10_000 }),
        expectProviderCode("ICAL_TOO_MANY_REDIRECTS"),
      );
      assert.equal(redirects, 4);
    },
  );
});

test("secure provider fetch rejects responses larger than 2 MiB", async () => {
  await withFetchMock(
    (async () =>
      new Response(validCalendar, {
        status: 200,
        headers: {
          "content-length": String(AIRBNB_ICAL_MAX_RESPONSE_BYTES + 1),
        },
      })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => fetchAirbnbIcalTextSecurely(validUrl, { timeoutMs: 10_000 }),
        expectProviderCode("ICAL_RESPONSE_TOO_LARGE"),
      );
    },
  );
});

test("secure provider fetch rejects a non-calendar response body", async () => {
  await withFetchMock(
    (async () => new Response("<html>not a calendar</html>", { status: 200 })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => fetchAirbnbIcalTextSecurely(validUrl, { timeoutMs: 10_000 }),
        expectProviderCode("ICAL_RESPONSE_INVALID"),
      );
    },
  );
});
