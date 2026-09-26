process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { parseCSV } from "./utils/csvParser.mjs";
import { KeywordExecutor } from "./keywords/KeywordExecutor.mjs";

const __dirname = path.resolve();
const CSV_DATA_PATH = path.join(__dirname, "tests", "test_data", "irrigation_advisory_test_cases.csv");
const JSON_DATA_PATH = path.join(__dirname, "tests", "test_data", "auth_test_cases.json");

describe("Phase 3 — Data-Driven Testing Suite", () => {
  let executor;

  beforeEach(() => {
    executor = new KeywordExecutor();
  });

  describe("CSV Dataset Execution — FAO-56 Irrigation Engine", () => {
    const csvContent = fs.readFileSync(CSV_DATA_PATH, "utf8");
    const testCases = parseCSV(csvContent);

    it(`Loaded ${testCases.length} test records from CSV data file`, () => {
      expect(testCases.length).toBeGreaterThan(0);
    });

    testCases.forEach((tc) => {
      it(`[CSV] ${tc.TestCaseID}: ${tc.Description} (${tc.Category})`, async () => {
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

        const result = await executor.executeTestCase(keywordScript);
        expect(result.passed, `Failed ${tc.TestCaseID}: ${result.failureReason}`).toBe(true);
      });
    });
  });

  describe("JSON Dataset Execution — Auth & Security Hardening", () => {
    const jsonContent = fs.readFileSync(JSON_DATA_PATH, "utf8");
    const testCases = JSON.parse(jsonContent);

    it(`Loaded ${testCases.length} test records from JSON data file`, () => {
      expect(testCases.length).toBeGreaterThan(0);
    });

    testCases.forEach((tc) => {
      it(`[JSON] ${tc.TestCaseID}: ${tc.Description} (${tc.Category})`, async () => {
        let keywordScript;
        if (tc.Action === "REGISTER") {
          keywordScript = {
            id: tc.TestCaseID,
            description: tc.Description,
            steps: [
              { action: "REGISTER_USER", args: tc.Input },
              { action: "VERIFY_STATUS_CODE", args: tc.ExpectedStatus },
            ],
          };
        } else if (tc.Action === "PROTECTED_ACCESS") {
          keywordScript = {
            id: tc.TestCaseID,
            description: tc.Description,
            steps: [
              { action: "LOG_IRRIGATION_EVENT", args: { plotId: "plot_test", durationHours: 2, waterAppliedM3: 50, token: "invalid.token.here" } },
              { action: "VERIFY_STATUS_CODE", args: tc.ExpectedStatus },
            ],
          };
        }

        const result = await executor.executeTestCase(keywordScript);
        expect(result.passed, `Failed ${tc.TestCaseID}: ${result.failureReason}`).toBe(true);
      });
    });
  });
});
