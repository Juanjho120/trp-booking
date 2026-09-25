type FinalFTest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalFTest[] = [];

export function test(name: string, run: FinalFTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalFTests(): Promise<void> {
  let passed = 0;

  console.log("Final-F targeted R4 validation");
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

  console.log(`Final-F targeted validation passed: ${passed}/${registeredTests.length} tests.`);
}
