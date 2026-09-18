import "./review-invitation-crypto.test";

import { runFinalETests } from "./harness";

runFinalETests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
