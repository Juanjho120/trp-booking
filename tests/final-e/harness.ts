type FinalETest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalETest[] = [];

export function test(name: string, run: FinalETest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalETests(): Promise<void> {
  let passed = 0;

  console.log("Final-E targeted foundation validation");
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

  console.log(`Final-E targeted validation passed: ${passed}/${registeredTests.length} tests.`);
}
