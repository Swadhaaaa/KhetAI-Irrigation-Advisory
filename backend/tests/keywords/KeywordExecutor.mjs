import { Keywords } from "./Keywords.mjs";

/**
 * Keyword Executor: Executes structured keyword-driven test cases and formats results.
 */
export class KeywordExecutor {
  constructor() {
    this.keywords = new Keywords();
  }

  /**
   * Executes a single Keyword-Driven test step or full test case script.
   * 
   * Example test case object:
   * {
   *   id: "TC_KW_001",
   *   description: "Irrigation Advisory - Depleted Soil moisture requires immediate irrigation",
   *   steps: [
   *     { action: "CALCULATE_ADVISORY", args: { soilMoisturePct: 18, fieldCapacityPct: 38, cropStage: "GRAND_GROWTH" } },
   *     { action: "VERIFY_DECISION_BADGE", args: "IRRIGATE_NOW" }
   *   ]
   * }
   */
  async executeTestCase(testCase) {
    this.keywords.resetContext();
    const stepResults = [];
    let overallPassed = true;
    let failureReason = null;

    for (let idx = 0; idx < testCase.steps.length; idx++) {
      const step = testCase.steps[idx];
      const actionName = step.action;
      const args = step.args;

      if (typeof this.keywords[actionName] !== "function") {
        overallPassed = false;
        failureReason = `Keyword '${actionName}' is not recognized.`;
        stepResults.push({
          step: idx + 1,
          action: actionName,
          passed: false,
          details: failureReason
        });
        break;
      }

      try {
        const result = await this.keywords[actionName](args);

        // Verification keywords return { passed, actual, expected, message }
        if (actionName.startsWith("VERIFY_")) {
          if (!result.passed) {
            overallPassed = false;
            failureReason = result.message;
          }
          stepResults.push({
            step: idx + 1,
            action: actionName,
            passed: result.passed,
            actual: result.actual,
            expected: result.expected,
            details: result.message
          });
        } else {
          stepResults.push({
            step: idx + 1,
            action: actionName,
            passed: true,
            details: `Executed ${actionName} successfully.`
          });
        }
      } catch (err) {
        overallPassed = false;
        failureReason = err.message;
        stepResults.push({
          step: idx + 1,
          action: actionName,
          passed: false,
          details: `Error executing step: ${err.message}`
        });
        break;
      }
    }

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      keywordsUsed: testCase.steps.map(s => s.action).join(" -> "),
      passed: overallPassed,
      failureReason: overallPassed ? null : failureReason,
      stepResults,
      executedAt: new Date().toISOString()
    };
  }
}
