import "./source-contract.test";

import { runFinalDTests } from "./harness";

runFinalDTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
