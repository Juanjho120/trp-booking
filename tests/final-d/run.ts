import "./source-contract.test";
import "./behavior.test";
import "./refund-runtime.test";
import "./email-runtime.test";

import { runFinalDTests } from "./harness";

runFinalDTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
