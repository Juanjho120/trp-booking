type FinalITest = Readonly<{
  name: string;
  run: () => void | Promise<void>;
}>;

const registeredTests: FinalITest[] = [];

export function test(name: string, run: FinalITest["run"]): void {
  registeredTests.push({ name, run });
}

export async function runFinalITests(): Promise<void> {
  let passed = 0;

  console.log("Final-I targeted validation");
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
    `Final-I targeted validation passed: ${passed}/${registeredTests.length} tests.`,
  );
}
