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

function accordionTriggerBlocks(source: string): string[] {
  return source.match(/<AccordionTrigger[\s\S]*?<\/AccordionTrigger>/g) ?? [];
}

test("I.6.1 D additional charges UI uses localized nested tabs", () => {
  const component = read(COMPONENT_PATH);
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  expectIncludes(component, "} from \"@/components/ui/tabs\";");
  expectIncludes(component, "const [activeTab, setActiveTab] = useState<AdditionalChargeTab>(");
  expectIncludes(component, "value={activeTab}");
  expectIncludes(component, "setActiveTab(\"charges\")");
  expectIncludes(component, "<div className=\"-mx-1 overflow-x-auto px-1 pb-2\">");
  expectIncludes(
    component,
    "<TabsList className=\"inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0\">",
  );
  assert.doesNotMatch(
    component,
    /<TabsList className="w-full justify-start overflow-x-auto sm:w-auto">/,
  );
  expectIncludes(component, "<TabsTrigger className=\"min-h-10 shrink-0\" value=\"charges\">");
  expectIncludes(component, "<TabsTrigger className=\"min-h-10 shrink-0\" value=\"requests\">");
  expectIncludes(component, "<TabsContent className=\"mt-0 space-y-4\" value=\"charges\">");
  expectIncludes(component, "<TabsContent className=\"mt-0 space-y-4\" value=\"requests\">");
  expectIncludes(es, "tabs: {");
  expectIncludes(es, "charges: \"Cargos\"");
  expectIncludes(es, "requests: \"Solicitudes de pago\"");
  expectIncludes(en, "tabs: {");
  expectIncludes(en, "charges: \"Charges\"");
  expectIncludes(en, "requests: \"Payment requests\"");
});

test("I.6.1 D charge and payment-request lists are single collapsible accordions", () => {
  const component = read(COMPONENT_PATH);

  expectIncludes(component, "value={openChargeId}");
  expectIncludes(component, "value={openPaymentRequestId}");
  expectIncludes(component, "setOpenChargeId(value || \"\")");
  expectIncludes(component, "setOpenPaymentRequestId(value || \"\")");
  expectIncludes(component, "management.charges.map((charge) => {");
  expectIncludes(component, "value={charge.id}");
  expectIncludes(component, "management.paymentRequests.map((request) => (");
  expectIncludes(component, "value={request.id}");
  expectIncludes(component, "<AccordionContent className=\"border-t border-border/70 px-4 pt-4\">");
  expectIncludes(component, "<AccordionContent className=\"border-t border-border/70 px-4 pt-4 sm:px-5\">");
});

test("I.6.1 D charge accordion trigger stretches beside the selector", () => {
  const component = read(COMPONENT_PATH);

  expectIncludes(
    component,
    "className=\"grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 p-4\"",
  );
  expectIncludes(
    component,
    "<AccordionTrigger className=\"min-w-0 w-full rounded-xl px-3 py-2\">",
  );
  assert.ok(
    component.indexOf("grid-cols-[auto_minmax(0,1fr)]") <
      component.indexOf("<AccordionTrigger className=\"min-w-0 w-full"),
  );
});

test("I.6.1 D keeps interactive actions outside accordion triggers", () => {
  const component = read(COMPONENT_PATH);
  const [chargeTrigger, requestTrigger] = accordionTriggerBlocks(component);

  assert.equal(accordionTriggerBlocks(component).length, 2);
  assert.ok(chargeTrigger);
  assert.ok(requestTrigger);

  for (const trigger of [chargeTrigger, requestTrigger]) {
    assert.doesNotMatch(trigger, /<Button\b/);
  }

  assert.doesNotMatch(
    chargeTrigger,
    /copy\.actions\.(?:selectCharge|editCharge|cancelCharge|refundCharge)/,
  );
  assert.doesNotMatch(
    requestTrigger,
    /copy\.actions\.(?:copyRequestLink|cancelRequest|resendEmail)/,
  );

  assert.ok(
    component.indexOf("aria-pressed={chargeSelected}") <
      component.indexOf("<AccordionTrigger"),
  );
  assert.ok(
    component.indexOf("openEditCharge(charge)") >
      component.indexOf("</AccordionTrigger>"),
  );
  assert.ok(
    component.indexOf("void copyPaymentRequestLink(request)") >
      component.lastIndexOf("</AccordionTrigger>"),
  );
});

test("I.6.1 D preserves nested refund history accordion without native disclosure UI", () => {
  const component = read(COMPONENT_PATH);

  expectIncludes(component, "copy.labels.refundHistory");
  expectIncludes(component, "charge.refundAllocations.map(");
  expectIncludes(component, "AdminRefundOperationCard");
  expectIncludes(component, "<Accordion\n                                      className=\"grid gap-2\"");
  assert.doesNotMatch(
    component,
    /<details\b|<summary\b|<select\b|<option\b/,
  );
});
