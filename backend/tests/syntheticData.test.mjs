import { describe, expect, it } from "vitest";
import records from "./data/synthetic-records.json" with { type: "json" };
import { classifyMeasurement } from "../utils/sensorQuality.js";

const errorCodes = new Set(["INVALID_SENSOR_MEASUREMENT", "INVALID_SENSOR_TIMESTAMP"]);

describe("KhetAI synthetic agricultural sensor data", () => {
    for (const record of records) {
        it(`${record.id}: ${record.description}`, () => {
            const result = record.record.measurements.map((measurement) => {
                try {
                    return { measurement, classified: classifyMeasurement(measurement) };
                } catch (error) {
                    return { measurement, error: error.code || error.name };
                }
            });

            if (record.expected.accept) {
                expect(result.every(({ error }) => !error)).toBe(true);
                expect(result.some(({ classified }) => classified.field)).toBe(true);
            } else {
                const invalidResult = result.some(({ error, classified }) =>
                    errorCodes.has(error) || (classified && classified.quality === "INVALID")
                );
                expect(invalidResult).toBe(true);
            }
        });
    }
});
