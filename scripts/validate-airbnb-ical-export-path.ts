import assert from "node:assert/strict";

import { normalizeAirbnbIcalExportPathToken } from "../lib/airbnb-ical/export-path";

const token = "abcDEF_123-xyz";

assert.equal(
  normalizeAirbnbIcalExportPathToken(token),
  token,
  "The existing extensionless diagnostic route must remain compatible.",
);

assert.equal(
  normalizeAirbnbIcalExportPathToken(`${token}.ics`),
  token,
  "The Airbnb-compatible .ics suffix must be removed before hashing.",
);

assert.equal(
  normalizeAirbnbIcalExportPathToken(`${token}.ICS`),
  token,
  "The .ics suffix check should be case-insensitive.",
);

assert.throws(
  () => normalizeAirbnbIcalExportPathToken(""),
  /token is required/i,
);

assert.throws(
  () => normalizeAirbnbIcalExportPathToken(".ics"),
  /token is required/i,
);

console.log("Airbnb iCal export path validation passed.");
