import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const adminRouteFiles = [
  "app/admin/layout.tsx",
  "app/admin/page.tsx",
  "app/admin/reservations/page.tsx",
  "app/admin/reservations/[reservationId]/page.tsx",
  "app/admin/calendar/page.tsx",
  "app/admin/calendar/integrations/page.tsx",
  "app/admin/payments/page.tsx",
  "app/admin/payments/[paymentId]/page.tsx",
  "app/admin/reviews/page.tsx",
  "app/admin/notifications/page.tsx",
  "app/admin/accommodations/page.tsx",
  "app/admin/accommodations/[propertyId]/page.tsx",
  "app/admin/accommodations/[propertyId]/amenities-rules/page.tsx",
  "app/admin/accommodations/[propertyId]/arrival-instructions/page.tsx",
  "app/admin/accommodations/[propertyId]/photos/page.tsx",
  "app/admin/accommodations/[propertyId]/pricing/page.tsx",
  "app/admin/location/page.tsx",
  "app/admin/catalogs/page.tsx",
  "app/admin/cron-jobs/page.tsx",
] as const;

const expectedAdminRouteImports: Readonly<Record<string, readonly string[]>> = {
  "app/admin/layout.tsx": [
    'from "@/features/admin/components/admin-shell"',
  ],
  "app/admin/page.tsx": [
    'from "@/features/admin/components/admin-dashboard-page"',
    'from "@/lib/admin/dashboard"',
  ],
  "app/admin/reservations/page.tsx": [
    'from "@/features/admin/components/admin-reservations-page"',
    'from "@/lib/admin/reservations"',
  ],
  "app/admin/reservations/[reservationId]/page.tsx": [
    'from "@/features/admin/components/admin-reservation-detail-page"',
    'from "@/lib/admin/reservation-detail"',
    'from "@/lib/admin/payment-submission-attempts"',
  ],
  "app/admin/calendar/page.tsx": [
    'from "@/features/admin/components/admin-property-calendar"',
    'from "@/lib/admin/accommodations"',
    'from "@/lib/admin/property-calendar"',
  ],
  "app/admin/calendar/integrations/page.tsx": [
    'from "@/features/admin/components/admin-calendar-integrations-page"',
    'from "@/lib/admin/external-calendar-integrations"',
  ],
  "app/admin/payments/page.tsx": [
    'from "@/features/admin/components/admin-payments-page"',
    'from "@/lib/admin/payments"',
  ],
  "app/admin/payments/[paymentId]/page.tsx": [
    'from "@/features/admin/components/admin-payment-detail-page"',
    'from "@/features/admin/components/admin-payment-submission-attempt-history"',
    'from "@/lib/admin/payment-detail"',
    'from "@/lib/admin/payment-submission-attempts"',
  ],
  "app/admin/reviews/page.tsx": [
    'from "@/features/admin/components/admin-reviews-page"',
    'from "@/lib/admin/reviews"',
  ],
  "app/admin/notifications/page.tsx": [
    'from "@/features/admin/components/admin-notifications-page"',
    'from "@/lib/admin/session"',
    'from "@/lib/admin-notifications"',
  ],
  "app/admin/accommodations/page.tsx": [
    'from "@/features/admin/components/admin-accommodation-management"',
    'from "@/lib/admin/accommodation-content"',
    'from "@/lib/admin/preparation-buffer-management"',
  ],
  "app/admin/accommodations/[propertyId]/page.tsx": [
    'from "@/features/admin/components/admin-accommodation-content-editor"',
    'from "@/lib/admin/accommodation-content"',
  ],
  "app/admin/accommodations/[propertyId]/amenities-rules/page.tsx": [
    'from "@/features/admin/components/admin-amenities-house-rules-manager"',
    'from "@/lib/admin/amenities-house-rules"',
  ],
  "app/admin/accommodations/[propertyId]/arrival-instructions/page.tsx": [
    'from "@/features/admin/components/admin-arrival-instructions-editor"',
    'from "@/lib/admin/arrival-instructions"',
  ],
  "app/admin/accommodations/[propertyId]/photos/page.tsx": [
    'from "@/features/admin/components/admin-property-photo-manager"',
    'from "@/lib/admin/property-photos"',
  ],
  "app/admin/accommodations/[propertyId]/pricing/page.tsx": [
    'from "@/features/admin/components/admin-pricing-manager"',
    'from "@/lib/admin/pricing"',
  ],
  "app/admin/location/page.tsx": [
    'from "@/features/admin/components/admin-public-location-page"',
    'from "@/lib/admin/public-location"',
  ],
  "app/admin/catalogs/page.tsx": [
    'from "@/features/admin/components/admin-catalog-manager"',
    'from "@/lib/admin/catalogs"',
  ],
  "app/admin/cron-jobs/page.tsx": [
    'from "@/features/admin/components/admin-cron-jobs-page"',
    'from "@/lib/admin/cron-jobs"',
  ],
};

test("G.4 keeps the protected admin layout as a server-side ADMIN_ROLE boundary", () => {
  const layout = readSource("app/admin/layout.tsx");
  const middleware = readSource("middleware.ts");
  const sessionActor = readSource("lib/admin/session.ts");

  assert.doesNotMatch(layout, /^"use client";/);
  assert.match(layout, /import \{ auth \} from "@\/auth"/);
  assert.match(layout, /import \{ ADMIN_ROLE \} from "@\/lib\/auth\/admin-access"/);
  assert.match(layout, /const session = await auth\(\)/);
  assert.match(layout, /if \(!adminUser \|\| adminUser\.role !== ADMIN_ROLE\) \{\s*redirect\("\/"\);\s*\}/s);
  assert.match(layout, /from "@\/features\/admin\/components\/admin-shell"/);
  assert.match(middleware, /request\.auth\?\.user\?\.role === ADMIN_ROLE/);
  assert.match(middleware, /matcher: \["\/admin\/:path\*"\]/);
  assert.match(sessionActor, /user\.role !== ADMIN_ROLE/);
});

test("G.4 admin route entry points avoid the broad client and server barrels", () => {
  for (const relativePath of adminRouteFiles) {
    const source = readSource(relativePath);

    assert.doesNotMatch(source, /from "@\/features\/admin"/);
    assert.doesNotMatch(source, /from "@\/lib\/admin"/);

    for (const expectedImport of expectedAdminRouteImports[relativePath] ?? []) {
      assert.match(source, new RegExp(expectedImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("G.4 keeps AdminShell client-side while preventing it from importing route page components", () => {
  const shell = readSource("features/admin/components/admin-shell.tsx");

  assert.match(shell, /^"use client";/);
  assert.match(shell, /usePathname\(\)/);
  assert.match(shell, /signOut\(/);
  assert.doesNotMatch(
    shell,
    /admin-dashboard-page|admin-reservations-page|admin-payments-page|admin-reviews-page|admin-property-calendar|admin-catalog-manager/,
  );
});

test("G.4 does not cache protected admin operational data or loosen mutation protections", () => {
  const adminSources = [
    "lib/admin/dashboard.ts",
    "lib/admin/reservations.ts",
    "lib/admin/property-calendar.ts",
    "app/api/admin/notifications/[notificationId]/read/route.ts",
    "app/api/admin/push/subscriptions/route.ts",
    "app/api/admin/push/test/route.ts",
  ].map(readSource).join("\n");

  assert.doesNotMatch(adminSources, /unstable_cache|public-cache|revalidateTag/);
  assert.match(adminSources, /getAdminSessionActor\(\)/);
  assert.match(adminSources, /isValidAdminMutationOrigin\(request\)/);
});

test("G.4 preserves dashboard parallel reads and reservation pagination clamping", () => {
  const dashboard = readSource("lib/admin/dashboard.ts");
  const reservations = readSource("lib/admin/reservations.ts");

  assert.match(dashboard, /await Promise\.all\(\[/);
  assert.match(dashboard, /prisma\.reservation\.count/);
  assert.match(dashboard, /prisma\.payment\.count/);
  assert.match(dashboard, /prisma\.calendarBlock\.count/);
  assert.match(dashboard, /take: 5/);
  assert.match(reservations, /const totalPages = Math\.max\(1, Math\.ceil\(totalItems \/ PAGE_SIZE\)\)/);
  assert.match(reservations, /const safePage = Math\.min\(page, totalPages\)/);
  assert.match(reservations, /skip: \(safePage - 1\) \* PAGE_SIZE/);
  assert.match(reservations, /take: PAGE_SIZE/);
});

test("G.4 preserves calendar semantics and later-subphase boundaries", () => {
  const calendar = readSource("lib/admin/property-calendar.ts");
  const publicRoutes = [
    "app/alojamientos/page.tsx",
    "app/alojamientos/[slug]/page.tsx",
    "app/disponibilidad/page.tsx",
    "features/reservations/components/reservation-request-form.tsx",
  ].map(readSource).join("\n");

  assert.match(calendar, /const CALENDAR_GRID_DAYS = 42/);
  assert.match(calendar, /getAvailabilityBlockingRecords/);
  assert.match(calendar, /sourcePriority/);
  assert.match(calendar, /PREPARATION_BUFFER_OVERRIDE/);
  assert.doesNotMatch(publicRoutes, /@\/features\/admin|@\/lib\/admin/);
  assert.match(readSource("vercel.json"), /^\{\s*"crons": \[\]\s*\}\s*$/);
});