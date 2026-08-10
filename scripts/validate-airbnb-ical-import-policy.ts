import assert from "node:assert/strict";

import {
  classifyAirbnbIcalEvent,
  shouldCreateAirbnbPreparationBuffers,
} from "../lib/airbnb-ical/event-policy";

assert.equal(
  classifyAirbnbIcalEvent({ summary: "Reserved" }),
  "RESERVATION",
);
assert.equal(
  classifyAirbnbIcalEvent({ summary: " reserved " }),
  "RESERVATION",
);
assert.equal(
  shouldCreateAirbnbPreparationBuffers({ summary: "Reserved" }),
  true,
);

for (const summary of [
  "Airbnb (Not available)",
  "Not available",
  "Blocked",
  "",
  undefined,
]) {
  assert.equal(classifyAirbnbIcalEvent({ summary }), "UNAVAILABLE");
  assert.equal(shouldCreateAirbnbPreparationBuffers({ summary }), false);
}

console.log("Airbnb iCal import policy validation passed.");
