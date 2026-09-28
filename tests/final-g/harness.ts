type FinalGTest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalGTest[] = [];

export function test(name: string, run: FinalGTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalGTests(): Promise<void> {
  let passed = 0;

  console.log("Final-G targeted validation");
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

  console.log(`Final-G validation passed: ${passed}/${registeredTests.length} tests.`);
}
