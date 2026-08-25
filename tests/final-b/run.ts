import "./crypto-and-token.test";
import "./provider-security.test";
import "./integration-contract.test";
import "./messages.test";
import "./source-contract.test";

import { runFinalBTests } from "./harness";

runFinalBTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
