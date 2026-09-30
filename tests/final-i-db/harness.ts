type FinalIDbTest = Readonly<{
  name: string;
  run: () => Promise<void>;
}>;

const registeredTests: FinalIDbTest[] = [];

export function test(name: string, run: FinalIDbTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalIDbTests(): Promise<void> {
  let passed = 0;

  console.log("Final-I DB-backed validation");
  console.log(`Registered tests: ${registeredTests.length}`);

  for (const current of registeredTests) {
    try {
      await current.run();
      passed += 1;
      console.log(`PASS  ${current.name}`);
    } catch (error) {
      console.error(`FAIL  ${current.name}`);
      throw error;
    }
  }

  console.log(
    `Final-I DB-backed validation passed: ${passed}/${registeredTests.length} tests.`,
  );
}
