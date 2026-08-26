type FinalCTest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalCTest[] = [];

export function test(name: string, run: FinalCTest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalCTests(): Promise<void> {
  let passed = 0;

  console.log("Final-C pricing regression validation");
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

  console.log(`Final-C validation passed: ${passed}/${registeredTests.length} tests.`);
}
