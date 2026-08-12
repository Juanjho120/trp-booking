type FinalATest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalATest[] = [];

export function test(name: string, run: FinalATest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalATests(): Promise<void> {
  let passed = 0;

  console.log("Final-A integrated financial regression validation");
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

  console.log(`Final-A validation passed: ${passed}/${registeredTests.length} tests.`);
}
