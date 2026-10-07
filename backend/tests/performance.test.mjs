import { describe, expect, it } from "vitest";
import cases from "./data/performance-cases.json" with { type: "json" };
import { computeIrrigationAdvisory } from "../utils/aiEngine.js";

const plot = {
    area: 2.5,
    plantingDate: "2025-09-01",
    soilType: "Loam",
};

const sensor = { soilMoisturePct: 42, soilTemp: 28.5 };
const forecast = {
    days: [
        { date: "2026-10-07", tempMax: 32, tempMin: 23, humidity: 55, rainProbability: 20, rainMm: 0 },
        { date: "2026-10-08", tempMax: 32, tempMin: 23, humidity: 55, rainProbability: 25, rainMm: 0 },
        { date: "2026-10-09", tempMax: 32, tempMin: 23, humidity: 55, rainProbability: 20, rainMm: 0 },
    ],
};

describe("KhetAI performance benchmarks", () => {
    for (const testCase of cases) {
        it(`${testCase.id}: executes ${testCase.iterations} advisory calculations`, () => {
            const start = performance.now();
            for (let i = 0; i < testCase.iterations; i += 1) {
                const advisory = computeIrrigationAdvisory(plot, sensor, forecast);
                expect(advisory.waterStressLevel).toBeDefined();
            }
            const durationMs = performance.now() - start;
            expect(durationMs).toBeLessThanOrEqual(testCase.maxDurationMs);
        });
    }
});
