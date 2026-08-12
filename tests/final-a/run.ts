import "./financial-summary-and-policy.test";
import "./refund-allocation-and-negative-lifecycle.test";
import "./admin-and-email.test";
import "./source-contract.test";

import { runFinalATests } from "./harness";

runFinalATests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
