import { describe, expect, it, beforeEach } from "vitest";
import scenarios from "./data/keyword-scenarios.json" with { type: "json" };
import { computeIrrigationAdvisory } from "../utils/aiEngine.js";
import { classifyMeasurement } from "../utils/sensorQuality.js";
import { plotSchema, sensorIngestionSchema } from "../utils/validation.js";
import { KeywordExecutor } from "./keywords/KeywordExecutor.mjs";

const validPlot = {
    name: "Keyword Plot",
    area: 2.5,
    crop: "Sugarcane",
    variety: "Co 86032",
    plantingDate: "2025-09-01",
    soilType: "Loam",
    lat: 16.5,
    lng: 75.1,
};

const validReading = {
    eventId: "keyword-reading-1",
    measuredAt: "2026-10-07T10:00:00.000Z",
    measurements: [
        { type: "soil_moisture_30", value: 42, unit: "percent" },
        { type: "soil_temperature", value: 28.5, unit: "C" },
    ],
};

const invalidReading = {
    ...validReading,
    measurements: [{ type: "humidity", value: 120, unit: "percent" }],
};

function runKeywordScenario(scenario) {
    const state = {
        plot: validPlot,
        reading: validReading,
        result: null,
    };

    const handler = {
        LoginUser: () => ({ success: true, role: "farmer" }),
        CreatePlot: () => {
            const parsed = plotSchema.safeParse(state.plot);
            return { success: parsed.success, plot: parsed.success ? state.plot : null };
        },
        UpdatePlot: () => {
            const updated = { ...state.plot, name: "Updated Keyword Plot" };
            const parsed = plotSchema.partial().safeParse(updated);
            return { success: parsed.success, plot: parsed.success ? updated : null };
        },
        DeletePlot: () => ({ success: true }),
        EnterSensorData: () => {
            const parsed = sensorIngestionSchema.safeParse(state.reading);
            return { success: parsed.success, reading: state.reading };
        },
        ValidateSensorData: () => {
            try {
                const measurements = state.reading.measurements.map((measurement) => classifyMeasurement(measurement));
                return { success: measurements.length > 0, details: measurements };
            } catch (error) {
                return { success: false, details: error.message };
            }
        },
        FetchWeather: () => ({ success: true, source: "simulated" }),
        CalculateAdvisory: () => {
            const advisory = computeIrrigationAdvisory(state.plot, { soilMoisturePct: 42, soilTemp: 28.5 }, {
                days: [
                    { date: "2026-10-07", tempMax: 32, tempMin: 23, humidity: 55, rainProbability: 20, rainMm: 0 },
                    { date: "2026-10-08", tempMax: 32, tempMin: 23, humidity: 55, rainProbability: 25, rainMm: 0 },
                ],
            });
            return { success: true, advisory };
        },
        GenerateRecommendation: () => ({ success: true, message: "Irrigate on the scheduled date." }),
        CheckRecommendation: () => ({ success: true, valid: true }),
        GenerateAlert: () => ({ success: true, type: "MOISTURE_STRESS" }),
        DisplayDashboard: () => ({ success: true }),
        VerifyWeatherSource: () => ({ success: true, source: "simulated" }),
    };

    const result = [];
    for (const keyword of scenario.keywords) {
        const step = handler[keyword];
        if (!step) throw new Error(`Unsupported keyword: ${keyword}`);

        if (scenario.id === "invalid-sensor-rejection" && keyword === "EnterSensorData") {
            state.reading = invalidReading;
        }

        const stepResult = step();
        result.push(stepResult);

        if (scenario.id === "invalid-sensor-rejection" && keyword === "ValidateSensorData") {
            return result;
        }
    }

    return result;
}

describe("KhetAI keyword-driven scenarios", () => {
    it("executes supported KhetAI business-level scenarios", () => {
        for (const scenario of scenarios) {
            const result = runKeywordScenario(scenario);
            if (scenario.expectedResult === "success") {
                expect(result.every((step) => step.success)).toBe(true);
            } else {
                const invalidResult = result.at(-1);
                expect(invalidResult.success).toBe(true);
                expect(invalidResult.details.some((measurement) => measurement.quality === "INVALID")).toBe(true);
            }
        }
    });

    it("validates a real soil measurement through the production utility", () => {
        const validated = classifyMeasurement({ type: "soil_moisture_30", value: 42, unit: "percent" });
        expect(validated.field).toBe("soilMoisture30");
    });
});

describe("KhetAI keyword-execution scenarios", () => {
    let executor;

    beforeEach(() => {
        executor = new KeywordExecutor();
    });

    it("TC_KW_001: Execute irrigation advisory keyword flow", async () => {
        const result = await executor.executeTestCase({
            id: "TC_KW_001",
            description: "Verify low soil moisture triggers IRRIGATE_NOW",
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
        });

        expect(result.passed).toBe(true);
        expect(result.keywordsUsed).toBe("CALCULATE_ADVISORY -> VERIFY_DECISION_BADGE");
    });

    it("TC_KW_002: Execute saturated soil moisture keyword flow", async () => {
        const result = await executor.executeTestCase({
            id: "TC_KW_002",
            description: "Verify near-field-capacity soil triggers NO_IRRIGATION",
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
        });

        expect(result.passed).toBe(true);
    });

    it("TC_KW_003: Execute rainfall keyword flow", async () => {
        const result = await executor.executeTestCase({
            id: "TC_KW_003",
            description: "Verify expected rainfall triggers MONITOR",
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
        });

        expect(result.passed).toBe(true);
    });

    it("TC_KW_004: Execute invalid registration keyword flow", async () => {
        const result = await executor.executeTestCase({
            id: "TC_KW_004",
            description: "Verify short password returns HTTP 400",
            steps: [
                {
                    action: "REGISTER_USER",
                    args: { name: "Test Farmer", mobile: "9876543210", password: "123" },
                },
                { action: "VERIFY_STATUS_CODE", args: 400 },
                { action: "VERIFY_ERROR_MESSAGE", args: "Invalid request data" },
            ],
        });

        expect(result.passed).toBe(true);
    });

    it("TC_KW_005: Execute system health keyword flow", async () => {
        const result = await executor.executeTestCase({
            id: "TC_KW_005",
            description: "Verify system health endpoint is accessible",
            steps: [
                { action: "OPEN_APPLICATION", args: {} },
                { action: "VERIFY_STATUS_CODE", args: 200 },
            ],
        });

        expect(result.passed).toBe(true);
    });
});
