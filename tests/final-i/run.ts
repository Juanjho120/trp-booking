import "./i1-zoho-internal-sender-suppression.test";
import "./i2-legacy-copy-cleanup.test";
import "./i3-admin-notification-center-ux.test";
import "./i4-guest-email-visible-url-cleanup.test";
import "./i5-fel-domain-contract.test";
import "./i6-fel-persistence-admin-draft.test";

import { runFinalITests } from "./harness";

runFinalITests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
