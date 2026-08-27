import "./admin-pricing.test";
import "./lifecycle-pricing.test";
import "./pricing-engine.test";
import "./source-contract.test";

import { runFinalCTests } from "./harness";

runFinalCTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
