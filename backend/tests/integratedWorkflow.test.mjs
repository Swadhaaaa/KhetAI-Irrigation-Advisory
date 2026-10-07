process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { parseCSV } from "./utils/csvParser.mjs";
import { KeywordExecutor } from "./keywords/KeywordExecutor.mjs";
import { generateTestReport } from "../utils/reportGenerator.mjs";

const __dirname = path.resolve();
const SYNTHETIC_CSV_PATH = path.join(__dirname, "tests", "synthetic_data", "ai_generated_irrigation_cases.csv");

describe("Phase 5 — Integrated Testing Workflow (AI Synthetic -> Data-Driven -> Keyword-Driven -> Application -> Report)", () => {
  let executor;
  let testExecutionResults = [];

  beforeAll(() => {
    executor = new KeywordExecutor();
    testExecutionResults = [];
  });

  afterAll(() => {
    // Generate Test Execution Report upon completion
    if (testExecutionResults.length > 0) {
      generateTestReport(testExecutionResults);
    }
  });

  it("Step 1: AI Synthetic Data CSV exists and is non-empty", () => {
    expect(fs.existsSync(SYNTHETIC_CSV_PATH)).toBe(true);
    const csvContent = fs.readFileSync(SYNTHETIC_CSV_PATH, "utf8");
    const records = parseCSV(csvContent);
    expect(records.length).toBeGreaterThan(0);
  });

  const csvContent = fs.readFileSync(SYNTHETIC_CSV_PATH, "utf8");
  const syntheticCases = parseCSV(csvContent);

  syntheticCases.forEach((tc) => {
    it(`Integrated Pipeline Execution: ${tc.TestCaseID} — ${tc.Description}`, async () => {
      const keywordScript = {
        id: tc.TestCaseID,
        description: tc.Description,
        steps: [
          {
            action: "CALCULATE_ADVISORY",
            args: {
              soilMoisturePct: tc.soilMoisturePct,
              fieldCapacityPct: tc.fieldCapacityPct,
              wiltingPointPct: tc.wiltingPointPct,
              soilType: tc.soilType,
              cropStage: tc.cropStage,
              kc: tc.kc,
              et0MmPerDay: tc.et0MmPerDay,
              rainfallMmNext3Days: tc.rainfallMmNext3Days,
            },
          },
          {
            action: "VERIFY_DECISION_BADGE",
            args: tc.ExpectedDecisionBadge,
          },
        ],
      };

      const execution = await executor.executeTestCase(keywordScript);
      
      const record = {
        testCaseId: tc.TestCaseID,
        description: tc.Description,
        category: tc.Category,
        keywordsUsed: execution.keywordsUsed,
        expectedResult: tc.ExpectedDecisionBadge,
        actualResult: execution.stepResults[1]?.actual || (execution.passed ? tc.ExpectedDecisionBadge : "FAILED"),
        passed: execution.passed,
        failureReason: execution.failureReason,
      };

      testExecutionResults.push(record);
      expect(execution.passed, `Failed ${tc.TestCaseID}: ${execution.failureReason}`).toBe(true);
    });
  });
});
