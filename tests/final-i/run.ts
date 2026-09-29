import "./i1-zoho-internal-sender-suppression.test";

import { runFinalITests } from "./harness";

runFinalITests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
