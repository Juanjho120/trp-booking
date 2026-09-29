import "./track-state-and-scripts.test";
import "./cron-and-environment-boundaries.test";
import "./final-f-architecture-boundaries.test";
import "./final-g-runtime-boundaries.test";
import "./security-and-production-readiness.test";

import { runFinalHTests } from "./harness";

runFinalHTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
