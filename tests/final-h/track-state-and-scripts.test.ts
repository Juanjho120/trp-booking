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
] as const;

const authoritativeTrackers = [
  "AGENTS.md",
  "README.md",
  "docs/10-phases.md",
  "docs/11-progress-log.md",
  "docs/160-post-phase-12-pre-phase-13-final-improvement-track.md",
  "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
] as const;

test("all permanent Final-A through Final-H validation scripts are registered", () => {
  const packageJson = parseJsonFile<PackageJson>("package.json");

  for (const scriptName of permanentFinalScripts) {
    assert.ok(packageJson.scripts[scriptName], `${scriptName} should exist`);
  }

  assert.equal(
    packageJson.scripts["final-h:validate"],
    "tsx --tsconfig tests/final-h/tsconfig.json tests/final-h/run.ts",
  );
});

test("Final-H record exists and preserves the accepted Final-G package head", () => {
  assertFileExists(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Implementation/evidence base: 3c1b3e24e0a835928615e015840e708a310a182a",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Final-G accepted package head: be8445a2c73a710e451da608fd9e669f8f412ab3",
  );
  assertFileContains(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
    "Final-H status: Integrated regression/evidence completed; owner acceptance pending",
  );
});

test("authoritative trackers show Final-H evidence pending owner acceptance and Phase 13 not started", () => {
  for (const relativePath of authoritativeTrackers) {
    const content = readRepoFile(relativePath);

    assert.ok(
      content.includes(
        "Final-H — Integrated regression/evidence completed; owner acceptance pending",
      ) ||
        content.includes(
          "Final-H status: Integrated regression/evidence completed; owner acceptance pending",
        ),
      `${relativePath} should show Final-H evidence complete but not accepted`,
    );
    assert.ok(
      content.includes("Phase 13") && content.includes("Not started"),
      `${relativePath} should keep Phase 13 not started`,
    );
  }
});

test("Final-H documentation does not self-accept the package or complete the full track", () => {
  const content = readRepoFile(
    "docs/211-final-h-integrated-regression-and-final-improvement-track-closure.md",
  );

  assert.equal(
    /Final-H[^\n]*Completed and accepted/i.test(content),
    false,
    "Final-H must not be marked accepted before owner approval",
  );
  assert.equal(
    /Final Improvement Track[^\n]*Completed and accepted/i.test(content),
    false,
    "The full Final Improvement Track must not be marked accepted before owner approval",
  );
  assert.ok(
    content.includes("owner explicitly accepts Final-H") &&
      content.includes("owner explicitly accepts the complete Final Improvement Track"),
    "Phase 13 gate should require explicit owner acceptance",
  );
});
