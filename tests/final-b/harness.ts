type FinalBTest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalBTest[] = [];

export function test(name: string, run: FinalBTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalBTests(): Promise<void> {
  let passed = 0;

  console.log("Final-B integrated external-calendar regression validation");
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

  console.log(`Final-B validation passed: ${passed}/${registeredTests.length} tests.`);
}
