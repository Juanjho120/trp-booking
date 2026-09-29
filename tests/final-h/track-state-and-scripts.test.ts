import assert from "node:assert/strict";

import { test } from "./harness";
import {
  assertFileContains,
  assertFileExists,
  parseJsonFile,
  readRepoFile,
} from "./test-utils";

type PackageJson = Readonly<{
  scripts: Readonly<Record<string, string>>;
}>;

const permanentFinalScripts = [
  "final-a:validate",
  "final-b:validate",
  "final-c:validate",
  "final-d:validate",
  "final-e:validate",
  "final-f:validate",
  "final-g:validate",
  "final-h:validate",
  "final-i:validate",
] as const;

const activeTrackers = [
  "AGENTS.md",
  "README.md",
  "docs/10-phases.md",
  "docs/11-progress-log.md",
  "docs/160-post-phase-12-pre-phase-13-final-improvement-track.md",
  "docs/212-final-i-operational-polish-notification-ux-and-fel-invoicing-roadmap.md",
] as const;

test("all permanent Final-A through Final-I validation scripts are registered", () => {
  const packageJson = parseJsonFile<PackageJson>("package.json");

  for (const scriptName of permanentFinalScripts) {
    assert.ok(packageJson.scripts[scriptName], `${scriptName} should exist`);
  }

  assert.equal(
    packageJson.scripts["final-h:validate"],
    "tsx --tsconfig tests/final-h/tsconfig.json tests/final-h/run.ts",
  );
  assert.equal(
    packageJson.scripts["final-i:validate"],
    "tsx --tsconfig tests/final-i/tsconfig.json tests/final-i/run.ts",
  );
});

test("Final-H record exists and preserves the accepted Final-G package head", () => {
  assertFileExists(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Final-H implementation/evidence base: 3c1b3e24e0a835928615e015840e708a310a182a",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Final-G accepted package head: be8445a2c73a710e451da608fd9e669f8f412ab3",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Final-H status: Completed and accepted on 2026-09-29",
  );
});

test("active trackers show Final-H accepted, Final-I active, and Phase 13 blocked", () => {
  for (const relativePath of activeTrackers) {
    const content = readRepoFile(relativePath);

    assert.ok(
      content.includes(
        "Final-H — Completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90",
      ) ||
        content.includes(
          "Final-H status: Completed and accepted on 2026-09-29",
        ) ||
        content.includes(
          "Historical accepted Final-H head: 6922cf27e31e63fde071c0d0a810b141e44b9f90",
        ),
      `${relativePath} should show Final-H accepted`,
    );
    assert.ok(
      content.includes("Final-I") &&
        content.includes("Operational Polish, Notification UX & FEL Invoicing"),
      `${relativePath} should register Final-I`,
    );
    assert.ok(
      content.includes("Phase 13") &&
        content.includes("Blocked / Not started until Final-I closes"),
      `${relativePath} should keep Phase 13 blocked and not started`,
    );
  }
});

test("Final-H documentation records owner acceptance without starting Phase 13", () => {
  const content = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  assert.ok(
    content.includes(
      "Accepted Final-H head: 6922cf27e31e63fde071c0d0a810b141e44b9f90",
    ) &&
      content.includes(
        "Accepted complete-track head: 6922cf27e31e63fde071c0d0a810b141e44b9f90",
      ),
    "Final-H and complete-track accepted heads should remain the owner-accepted head",
  );
  assert.ok(
    content.includes("Final-H approved.") &&
      content.includes(
        "Complete Post-Phase-12 / Pre-Phase-13 Final Improvement Track approved.",
      ),
    "Owner acceptance should be recorded for Final-H and the complete track",
  );
  assert.ok(
    content.includes("Phase 13 is eligible to be planned only when explicitly requested") &&
      content.includes("Phase 13 remains") &&
      content.includes("Next / Not started"),
    "Historical Final-H record should preserve the original Phase 13 next/not-started closure state",
  );
});
