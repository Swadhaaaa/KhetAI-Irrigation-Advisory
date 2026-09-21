import { describe, expect, it } from "vitest";
import { classifyMeasurement, classifyTimestamp } from "../utils/sensorQuality.js";

describe("sensor data quality", () => {
    it("accepts measurements within the declared unit range", () => {
        expect(classifyMeasurement({ type: "soil_moisture_30", value: 42, unit: "percent" }).field).toBe("soilMoisture30");
    });

    it("classifies out-of-range values as INVALID quality and throws on unit mismatches", () => {
        const outOfRange = classifyMeasurement({ type: "humidity", value: 120, unit: "percent" });
        expect(outOfRange.quality).toBe("INVALID");
        expect(outOfRange.qualityReason).toBe("out_of_range_humidity");

        expect(() => classifyMeasurement({ type: "rainfall", value: 2, unit: "percent" })).toThrow();
    });

    it("rejects timestamps too far in the future", () => {
        const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        expect(() => classifyTimestamp(future)).toThrow();
    });

    it("classifies old but structurally valid readings as suspect", () => {
        const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
        expect(classifyTimestamp(old)).toEqual({ quality: "SUSPECT", qualityReason: "measurement_older_than_30_days" });
    });
});
