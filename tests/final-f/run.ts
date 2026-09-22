import "./twilio-provider-foundation.test";
import "./whatsapp-inbound-inbox.test";
import "./whatsapp-outbound-status.test";
import "./whatsapp-persistence-foundation.test";

import { runFinalFTests } from "./harness";

runFinalFTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
