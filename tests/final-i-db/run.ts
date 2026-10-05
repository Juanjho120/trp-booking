import "./i6-fel-draft-service.integration";
import "./i61-financial-operations.integration";

import { prisma } from "@/lib/db/prisma";

import { runFinalIDbTests } from "./harness";

runFinalIDbTests()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
