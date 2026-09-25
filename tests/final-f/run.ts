import "./r4-whatsapp-decommission-public-contact.test";
import "./r5-admin-pwa-web-push-foundation.test";
import "./f6-admin-operational-web-push.test";

import { runFinalFTests } from "./harness";

runFinalFTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
