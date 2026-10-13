import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const ADMIN_COMPONENTS = "features/admin/components";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function expectNotIncludes(source: string, rejected: string): void {
  assert.ok(!source.includes(rejected), `Expected source to omit: ${rejected}`);
}

function blockBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end + endMarker.length);
}

const targetEditors = [
  "admin-accommodation-content-editor.tsx",
  "admin-pricing-manager.tsx",
  "admin-property-photo-manager.tsx",
  "admin-amenities-house-rules-manager.tsx",
  "admin-arrival-instructions-editor.tsx",
] as const;

test("I.6.9 admin page header exposes an inline action variant without changing the default", () => {
  const header = read(`${ADMIN_COMPONENTS}/admin-page-header.tsx`);
  const dashboard = read(`${ADMIN_COMPONENTS}/admin-dashboard-page.tsx`);

  for (const expected of [
    'type AdminPageHeaderVariant = "default" | "inlineActions"',
    'variant = "default"',
    "adminPageHeaderDefaultClassName",
    "adminPageHeaderInlineClassName",
    "adminPageHeaderTitleHelpClassName",
    "adminPageHeaderInlineTitleHelpClassName",
    "adminPageHeaderInlineRowClassName",
    "adminPageHeaderInlineActionsClassName",
    "adminPageHeaderInlineTitleClassName",
    "adminPageHeaderInlineHelpWrapperClassName",
    "adminPageHeaderInlineHelpClassName",
    "grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto]",
    "min-w-0 max-w-full",
    "flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-self-end",
    "`${adminPageHeaderTitleClassName} inline`",
    "ml-2 inline-flex align-top",
    'const adminPageHeaderInlineHelpClassName = "shrink-0"',
    "className={adminPageHeaderInlineTitleHelpClassName}",
    "className={adminPageHeaderInlineTitleClassName}",
    "className={adminPageHeaderInlineHelpWrapperClassName}",
    "className={adminPageHeaderInlineHelpClassName}",
    "md:flex-row md:items-end",
  ]) {
    expectIncludes(header, expected);
  }

  expectIncludes(dashboard, "<AdminPageHeader");
  expectNotIncludes(dashboard, 'variant="inlineActions"');
});

test("I.6.9 inline accommodation header keeps help attached to long titles responsively", () => {
  const header = read(`${ADMIN_COMPONENTS}/admin-page-header.tsx`);
  const inlineTitleHelpDefinition = blockBetween(
    header,
    "const adminPageHeaderInlineTitleHelpClassName =",
    ";",
  );
  const inlineTitleDefinition = blockBetween(
    header,
    "const adminPageHeaderInlineTitleClassName =",
    ";",
  );
  const inlineHelpWrapperDefinition = blockBetween(
    header,
    "const adminPageHeaderInlineHelpWrapperClassName =",
    ";",
  );
  const inlineRowDefinition = blockBetween(
    header,
    "const adminPageHeaderInlineRowClassName =",
    ";",
  );
  const inlineActionsDefinition = blockBetween(
    header,
    "const adminPageHeaderInlineActionsClassName =",
    ";",
  );
  const responsiveSamples = [
    { locale: "es", title: "Precios", width: 320 },
    {
      locale: "es",
      title: "Administrar precios · Apartamento Blanco y Negro",
      width: 320,
    },
    {
      locale: "es",
      title: "Administrar precios · Apartamento Blanco y Negro",
      width: 375,
    },
    {
      locale: "en",
      title: "Pricing",
      width: 768,
    },
    {
      locale: "en",
      title: "Manage pricing · Black and White Apartment",
      width: 768,
    },
    {
      locale: "en",
      title: "Manage pricing · Black and White Apartment",
      width: 1280,
    },
  ] as const;

  for (const sample of responsiveSamples) {
    const label = `${sample.locale} ${sample.width}px ${sample.title}`;

    expectNotIncludes(inlineTitleHelpDefinition, "flex-1");
    expectNotIncludes(inlineTitleHelpDefinition, "justify-between");
    expectNotIncludes(inlineTitleHelpDefinition, "ml-auto");
    expectNotIncludes(inlineTitleDefinition, "flex-1");
    expectNotIncludes(inlineTitleDefinition, "w-full");
    expectNotIncludes(inlineTitleDefinition, "justify-between");
    expectNotIncludes(inlineTitleDefinition, "ml-auto");
    assert.ok(
      inlineTitleDefinition.includes("inline"),
      `Expected the title to remain inline so help follows visible text for ${label}`,
    );
    assert.ok(
      inlineHelpWrapperDefinition.includes("ml-2 inline-flex align-top"),
      `Expected a fixed small inline gap before the help icon for ${label}`,
    );
    assert.ok(
      inlineRowDefinition.includes("grid min-w-0 grid-cols-1"),
      `Expected single-column narrow layout for ${label}`,
    );
    assert.ok(
      inlineRowDefinition.includes("sm:grid-cols-[minmax(0,1fr)_auto]"),
      `Expected independent title/actions columns when space allows for ${label}`,
    );
    assert.ok(
      inlineActionsDefinition.includes("flex-wrap"),
      `Expected actions to wrap below or between buttons without overflow for ${label}`,
    );
    assert.ok(
      inlineActionsDefinition.includes("sm:justify-self-end"),
      `Expected actions to align right independently from title/help for ${label}`,
    );
  }

  const inlineBranch = blockBetween(
    header,
    "<header className={adminPageHeaderInlineClassName}>",
    "</header>",
  );
  const titleIndex = inlineBranch.indexOf(
    "<h1 className={adminPageHeaderInlineTitleClassName}>{title}</h1>",
  );
  const helpWrapperIndex = inlineBranch.indexOf(
    "<span className={adminPageHeaderInlineHelpWrapperClassName}>",
  );

  expectNotIncludes(inlineBranch, "adminPageHeaderTitleHelpClassName");
  expectNotIncludes(inlineBranch, "flex-wrap items-start gap-2");
  assert.notEqual(titleIndex, -1, "Expected inline branch to render the title");
  assert.notEqual(helpWrapperIndex, -1, "Expected inline branch to wrap the help control");
  assert.ok(
    helpWrapperIndex > titleIndex,
    "Expected help control to render immediately after the inline title",
  );
});

test("I.6.9 target accommodation detail editors use the inline header and drop only redundant header badges", () => {
  for (const file of targetEditors) {
    const source = read(`${ADMIN_COMPONENTS}/${file}`);

    expectIncludes(source, "<AdminPageHeader");
    expectIncludes(source, 'variant="inlineActions"');
    expectNotIncludes(source, "badge={copy.badge}");
  }

  const content = read(`${ADMIN_COMPONENTS}/admin-accommodation-content-editor.tsx`);
  const pricing = read(`${ADMIN_COMPONENTS}/admin-pricing-manager.tsx`);
  const photos = read(`${ADMIN_COMPONENTS}/admin-property-photo-manager.tsx`);
  const amenities = read(`${ADMIN_COMPONENTS}/admin-amenities-house-rules-manager.tsx`);
  const arrival = read(`${ADMIN_COMPONENTS}/admin-arrival-instructions-editor.tsx`);

  for (const source of [content, pricing, photos, amenities, arrival]) {
    expectIncludes(source, 'href="/admin/accommodations"');
    expectIncludes(source, "<ArrowLeft aria-hidden=\"true\" />");
    expectIncludes(source, "{copy.actions.backToAccommodations}");
  }

  expectIncludes(photos, "href={`/admin/accommodations/${settings.property.id}`}");
  expectIncludes(photos, "{copy.actions.backToContent}");
  expectIncludes(amenities, 'href="/admin/catalogs"');
  expectIncludes(amenities, "<Library aria-hidden=\"true\" />");
});

test("I.6.9 removed content/photo info blocks while preserving operational controls and warnings", () => {
  const content = read(`${ADMIN_COMPONENTS}/admin-accommodation-content-editor.tsx`);
  const photos = read(`${ADMIN_COMPONENTS}/admin-property-photo-manager.tsx`);
  const amenities = read(`${ADMIN_COMPONENTS}/admin-amenities-house-rules-manager.tsx`);
  const arrival = read(`${ADMIN_COMPONENTS}/admin-arrival-instructions-editor.tsx`);

  expectNotIncludes(content, "copy.notes.immutableFields");
  expectNotIncludes(photos, "copy.notes.softDelete");

  for (const expected of [
    "overviewCopy.statuses[property.status]",
    "copy.notes.requiredLanguages",
    "copy.notes.publicImpact",
    "copy.notes.capacityRange",
    "copy.notes.timeFormat",
    "disabled={isSaving || !isDirty}",
  ]) {
    expectIncludes(content, expected);
  }

  for (const expected of [
    "{copy.labels.currentCount}: {settings.photos.length} /",
    "copy.notes.formats",
    "copy.notes.altText",
    "copy.notes.order",
    "copy.deleteDialog.description",
    "copy.actions.confirmDelete",
  ]) {
    expectIncludes(photos, expected);
  }

  expectIncludes(amenities, "statusCopy[settings.property.status]");
  expectIncludes(amenities, "copy.notes.minimumRequired");
  expectIncludes(arrival, "copy.notes.securityDescription");
});

test("I.6.9 pricing tabs add a dedicated preview tab without duplicating preview logic", () => {
  const pricing = read(`${ADMIN_COMPONENTS}/admin-pricing-manager.tsx`);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");
  const overviewContent = blockBetween(
    pricing,
    '<TabsContent className="mt-6 space-y-6" value="overview">',
    "</TabsContent>",
  );
  const previewContent = blockBetween(
    pricing,
    '<TabsContent className="mt-6" value="preview">',
    "</TabsContent>",
  );

  expectIncludes(es, 'preview: "Vista previa"');
  expectIncludes(en, 'preview: "Preview"');
  expectIncludes(pricing, '<div className="-mx-1 overflow-x-auto px-1 pb-2">');
  expectIncludes(
    pricing,
    'className="inline-flex h-auto min-w-max justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5"',
  );
  for (const value of ["overview", "seasonal", "los", "preview"]) {
    expectIncludes(pricing, `value="${value}"`);
  }

  assert.equal((pricing.match(/<TabsTrigger className="min-h-10 shrink-0"/g) ?? []).length, 4);
  assert.equal((pricing.match(/<PricingPreviewCard/g) ?? []).length, 1);
  expectNotIncludes(overviewContent, "<PricingPreviewCard");
  expectIncludes(previewContent, "<PricingPreviewCard");
  expectIncludes(previewContent, "range={previewRange}");
  expectIncludes(previewContent, "preview={preview}");
  expectIncludes(previewContent, "onRangeChange={updatePreviewRange}");
  expectIncludes(previewContent, "onPreview={() => void runPreview()}");
  expectIncludes(pricing, "const [previewCheckIn, setPreviewCheckIn] = useState(\"\");");
  expectIncludes(pricing, "const [previewCheckOut, setPreviewCheckOut] = useState(\"\");");
  expectIncludes(pricing, "setPreview(null);");
});

test("I.6.9 pricing back action includes ArrowLeft and keeps calculation endpoints untouched", () => {
  const pricing = read(`${ADMIN_COMPONENTS}/admin-pricing-manager.tsx`);

  expectIncludes(pricing, "ArrowLeft,");
  expectIncludes(pricing, "<ArrowLeft aria-hidden=\"true\" />");
  expectIncludes(pricing, 'fetch("/api/admin/pricing"');
  expectIncludes(pricing, 'fetch("/api/admin/pricing/preview"');
  expectIncludes(pricing, "action: \"save-los\"");
  expectIncludes(pricing, 'const action = editingRule ? "update-seasonal" : "create-seasonal";');
  expectIncludes(pricing, "action: \"delete-seasonal\"");
});

test("I.6.9 public availability tabs keep the accepted subtle visual variant", () => {
  const publicAvailability = read("features/availability/components/public-availability-page.tsx");

  expectIncludes(publicAvailability, "TabsTrigger");
  expectIncludes(publicAvailability, 'variant="subtle"');
  expectIncludes(publicAvailability, "w-max max-w-full justify-start");
});
