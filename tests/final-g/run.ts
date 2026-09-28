import "./public-cache-corrections.test";

import { runFinalGTests } from "./harness";

runFinalGTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
