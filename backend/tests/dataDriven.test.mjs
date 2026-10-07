import { describe, expect, it } from "vitest";
import cases from "./data/advisory-cases.json" with { type: "json" };
import { computeIrrigationAdvisory } from "../utils/aiEngine.js";

function expectAdvisoryProperties(actual, expected) {
    for (const [key, value] of Object.entries(expected)) {
        expect(actual[key], `case property ${key}`).toBe(value);
    }
}

describe("KhetAI data-driven advisory tests", () => {
    for (const testCase of cases) {
        it(`${testCase.id}: ${testCase.description}`, () => {
            const advisory = computeIrrigationAdvisory(
                testCase.plot,
                testCase.latestSensor,
                testCase.forecast
            );

            expectAdvisoryProperties(advisory, testCase.expected);
            expect(advisory.cropStage).toBeTypeOf("string");
            expect(advisory.nextIrrigationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(advisory.waterVolumeM3).toBeGreaterThanOrEqual(0);
        });
    }
});
