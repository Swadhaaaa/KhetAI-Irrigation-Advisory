process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import { describe, it, expect, beforeEach } from "vitest";
import { KeywordExecutor } from "./keywords/KeywordExecutor.mjs";

describe("Phase 2 — Keyword-Driven Testing Suite", () => {
  let executor;

  beforeEach(() => {
    executor = new KeywordExecutor();
  });

  it("TC_KW_001: Execute Irrigation Advisory Keyword Flow (CALCULATE_ADVISORY -> VERIFY_DECISION_BADGE)", async () => {
    const testCase = {
      id: "TC_KW_001",
      description: "Verify that low soil moisture during grand growth triggers IRRIGATE_NOW badge",
      steps: [
        {
          action: "CALCULATE_ADVISORY",
          args: {
            soilMoisturePct: 18,
            fieldCapacityPct: 38,
            wiltingPointPct: 15,
            cropStage: "GRAND_GROWTH",
            et0MmPerDay: 6.0,
            rainfallMmNext3Days: 0,
          },
        },
        { action: "VERIFY_DECISION_BADGE", args: "IRRIGATE_NOW" },
      ],
    };

    const result = await executor.executeTestCase(testCase);
    expect(result.passed).toBe(true);
    expect(result.keywordsUsed).toBe("CALCULATE_ADVISORY -> VERIFY_DECISION_BADGE");
  });

  it("TC_KW_002: Execute Saturated Soil Moisture Keyword Flow (CALCULATE_ADVISORY -> VERIFY_DECISION_BADGE)", async () => {
    const testCase = {
      id: "TC_KW_002",
      description: "Verify that soil moisture near field capacity triggers NO_IRRIGATION badge",
      steps: [
        {
          action: "CALCULATE_ADVISORY",
          args: {
            soilMoisturePct: 35,
            fieldCapacityPct: 38,
            wiltingPointPct: 15,
            cropStage: "GERMINATION",
            et0MmPerDay: 4.5,
            rainfallMmNext3Days: 0,
          },
        },
        { action: "VERIFY_DECISION_BADGE", args: "NO_IRRIGATION" },
      ],
    };

    const result = await executor.executeTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  it("TC_KW_003: Execute Rainfall Forecast Keyword Flow (CALCULATE_ADVISORY -> VERIFY_DECISION_BADGE)", async () => {
    const testCase = {
      id: "TC_KW_003",
      description: "Verify that expected rainfall triggers MONITOR decision badge",
      steps: [
        {
          action: "CALCULATE_ADVISORY",
          args: {
            soilMoisturePct: 22,
            fieldCapacityPct: 38,
            wiltingPointPct: 15,
            cropStage: "GRAND_GROWTH",
            et0MmPerDay: 5.0,
            rainfallMmNext3Days: 25.0,
          },
        },
        { action: "VERIFY_DECISION_BADGE", args: "MONITOR" },
      ],
    };

    const result = await executor.executeTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  it("TC_KW_004: Execute Invalid Registration Keyword Flow (REGISTER_USER -> VERIFY_STATUS_CODE)", async () => {
    const testCase = {
      id: "TC_KW_004",
      description: "Verify that registering with short password returns HTTP 400",
      steps: [
        {
          action: "REGISTER_USER",
          args: { name: "Test Farmer", mobile: "9876543210", password: "123" },
        },
        { action: "VERIFY_STATUS_CODE", args: 400 },
        { action: "VERIFY_ERROR_MESSAGE", args: "Invalid request data" },
      ],
    };

    const result = await executor.executeTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  it("TC_KW_005: Execute System Health Check Keyword Flow (OPEN_APPLICATION -> VERIFY_STATUS_CODE)", async () => {
    const testCase = {
      id: "TC_KW_005",
      description: "Verify system health check endpoint accessible",
      steps: [
        { action: "OPEN_APPLICATION", args: {} },
        { action: "VERIFY_STATUS_CODE", args: 200 },
      ],
    };

    const result = await executor.executeTestCase(testCase);
    expect(result.passed).toBe(true);
  });
});
