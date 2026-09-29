type FinalHTest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalHTest[] = [];

export function test(name: string, run: FinalHTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalHTests(): Promise<void> {
  let passed = 0;

  console.log("Final-H targeted validation");
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

  console.log(`Final-H validation passed: ${passed}/${registeredTests.length} tests.`);
}
