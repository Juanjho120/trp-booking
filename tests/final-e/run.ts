import "./review-invitation-crypto.test";
import "./review-invitation-time-eligibility.test";
import "./review-invitation-token-lifecycle.test";
import "./review-invitations-ensure.test";
import "./review-invitation-scheduling-email.test";

import { runFinalETests } from "./harness";

runFinalETests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
