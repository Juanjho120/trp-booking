import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(process.cwd());

export function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function parseJsonFile<T>(relativePath: string): T {
  return JSON.parse(readRepoFile(relativePath)) as T;
}

export function assertFileContains(
  relativePath: string,
  expected: string | RegExp,
): void {
  const content = readRepoFile(relativePath);
  if (typeof expected === "string") {
    assert.ok(
      content.includes(expected),
      `${relativePath} should contain ${expected}`,
    );
    return;
  }

  assert.match(content, expected, `${relativePath} should match ${expected}`);
}

export function assertPathDoesNotContainRouteFile(relativePath: string): void {
  const absolutePath = path.join(repoRoot, relativePath);

  if (!existsSync(absolutePath)) {
    return;
  }

  const files = collectFiles(absolutePath);
  assert.deepEqual(
    files.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file)),
    [],
    `${relativePath} must not contain active route/runtime files`,
  );
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absoluteEntry = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(absoluteEntry);
    }

    if (!entry.isFile()) {
      return [];
    }

    return [absoluteEntry];
  });
}

export function assertNoRegexMatch(
  relativePath: string,
  pattern: RegExp,
): void {
  const content = readRepoFile(relativePath);
  assert.equal(
    pattern.test(content),
    false,
    `${relativePath} must not match ${pattern}`,
  );
}

export function assertFileExists(relativePath: string): void {
  const absolutePath = path.join(repoRoot, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} should exist`);
  assert.ok(statSync(absolutePath).isFile(), `${relativePath} should be a file`);
}
