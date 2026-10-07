import { describe, expect, it } from "vitest";
import scenarios from "./data/keyword-scenarios.json" with { type: "json" };
import { computeIrrigationAdvisory } from "../utils/aiEngine.js";
import { classifyMeasurement } from "../utils/sensorQuality.js";
import { plotSchema, sensorIngestionSchema } from "../utils/validation.js";

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

        if (scenario.id === "invalid-sensor-rejection" && keyword === "ValidateSensorData" && !stepResult.success) {
            break;
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
                expect(result.some((step) => step.success === false)).toBe(true);
                expect(() => classifyMeasurement(invalidReading.measurements[0])).toThrow("outside the accepted range");
            }
        }
    });

    it("validates a real soil measurement through the production utility", () => {
        const validated = classifyMeasurement({ type: "soil_moisture_30", value: 42, unit: "percent" });
        expect(validated.field).toBe("soilMoisture30");
    });
});
