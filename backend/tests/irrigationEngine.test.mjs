import { describe, expect, it } from "vitest";
import { buildIrrigationFeatures, getIrrigationEfficiency } from "../utils/irrigationFeatures.js";
import { evaluateDataQuality, computeIrrigationIntelligence } from "../utils/irrigationEngine.js";

const samplePlot = {
    id: "plot_test_100",
    name: "North Field",
    area: 2.5,
    crop: "Sugarcane",
    variety: "Co 86032",
    plantingDate: "2026-01-01",
    soilType: "Loam",
    irrigationMethod: "Drip",
    lat: 16.5,
    lng: 75.1,
};

const sampleSensor = {
    soilMoisture30: 20.0,
    soilMoisture60: 22.0,
    soilTempC: 27.5,
    ambientTempC: 32.0,
    ambientHumidityPct: 60,
    quality: "VALID",
    source: "SIMULATED",
    measuredAt: new Date().toISOString(),
};

const sampleForecast = {
    provenance: "LIVE_API",
    days: [
        { date: "2026-09-21", tempMax: 33, tempMin: 22, humidity: 60, rainProbability: 10, rainMm: 0, et0: 5.2, provenance: "LIVE_API" },
        { date: "2026-09-22", tempMax: 32, tempMin: 21, humidity: 65, rainProbability: 15, rainMm: 0, et0: 5.0, provenance: "LIVE_API" },
        { date: "2026-09-23", tempMax: 31, tempMin: 21, humidity: 70, rainProbability: 20, rainMm: 1, et0: 4.8, provenance: "LIVE_API" },
        { date: "2026-09-24", tempMax: 30, tempMin: 20, humidity: 75, rainProbability: 25, rainMm: 2, et0: 4.5, provenance: "LIVE_API" },
        { date: "2026-09-25", tempMax: 32, tempMin: 22, humidity: 60, rainProbability: 10, rainMm: 0, et0: 5.1, provenance: "LIVE_API" },
    ],
};

const sampleHistory = [
    { date: "2026-09-15", durationHours: 2.0, waterAppliedM3: 80 },
];

describe("Phase 6B — KhetAI Irrigation Intelligence Engine", () => {
    it("1. extracts complete features from plot, sensor, weather, and history inputs", () => {
        const features = buildIrrigationFeatures(samplePlot, sampleSensor, sampleForecast, sampleHistory);
        expect(features.plotId).toBe("plot_test_100");
        expect(features.cropFeatures.kc).toBeGreaterThan(0.3);
        expect(features.soilFeatures.fieldCapacity).toBe(28);
        expect(features.plotFeatures.efficiency).toBe(0.90); // Drip efficiency
        expect(features.sensorFeatures.soilMoisture30).toBe(20.0);
        expect(features.weatherFeatures.et0).toBe(5.2);
        expect(features.historyFeatures.recentCount30Days).toBe(1);
        expect(features.provenanceSummary.sensor).toBe("SIMULATED");
        expect(features.provenanceSummary.weather).toBe("LIVE_API");
    });

    it("2. returns INSUFFICIENT_DATA when mandatory plantingDate or soilType is missing", () => {
        const incompletePlot = { ...samplePlot, plantingDate: null };
        const features = buildIrrigationFeatures(incompletePlot, sampleSensor, sampleForecast);
        const quality = evaluateDataQuality(features);
        expect(quality.passes).toBe(false);
        expect(quality.status).toBe("INSUFFICIENT_DATA");
        expect(quality.errors[0]).toMatch(/planting date/);
    });

    it("3. rejects INVALID quality sensor reading at Data Quality Gate", () => {
        const invalidSensor = { ...sampleSensor, quality: "INVALID", qualityReason: "out_of_range_soil_moisture_30" };
        const features = buildIrrigationFeatures(samplePlot, invalidSensor, sampleForecast);
        const quality = evaluateDataQuality(features);
        expect(quality.passes).toBe(false);
        expect(quality.status).toBe("INSUFFICIENT_DATA");
        expect(quality.errors[0]).toMatch(/INVALID/);
    });

    it("4. issues a warning for SUSPECT quality sensor reading but permits advisory computation", () => {
        const suspectSensor = { ...sampleSensor, quality: "SUSPECT", qualityReason: "measurement_older_than_30_days" };
        const features = buildIrrigationFeatures(samplePlot, suspectSensor, sampleForecast);
        const quality = evaluateDataQuality(features);
        expect(quality.passes).toBe(true);
        expect(quality.warnings.length).toBeGreaterThan(0);
        expect(quality.warnings[0]).toMatch(/SUSPECT/);

        const result = computeIrrigationIntelligence(features);
        expect(result.status).toBe("OK");
        expect(result.advisory).not.toBeNull();
    });

    it("5. computes immediate irrigation when soil moisture is below MAD limit (50% depletion)", () => {
        const lowMoistureSensor = { ...sampleSensor, soilMoisture30: 14.0 }; // FC 28, WP 12, range 16 -> 14% is 87.5% depletion
        const features = buildIrrigationFeatures(samplePlot, lowMoistureSensor, sampleForecast);
        const result = computeIrrigationIntelligence(features);
        expect(result.status).toBe("OK");
        expect(result.advisory.nextIrrigationInDays).toBe(0);
        expect(result.advisory.recommendationSummary).toMatch(/Irrigate today/);
    });

    it("6. computes scheduled future irrigation when soil moisture is adequate", () => {
        const highMoistureSensor = { ...sampleSensor, soilMoisture30: 26.0 }; // FC 28, WP 12, range 16 -> 26% is 12.5% depletion
        const features = buildIrrigationFeatures(samplePlot, highMoistureSensor, sampleForecast);
        const result = computeIrrigationIntelligence(features);
        expect(result.status).toBe("OK");
        expect(result.advisory.nextIrrigationInDays).toBeGreaterThan(0);
    });

    it("7. delays irrigation recommendation when significant rainfall is forecast", () => {
        const rainyForecast = {
            provenance: "LIVE_API",
            days: [
                { date: "2026-09-21", tempMax: 30, tempMin: 20, humidity: 80, rainProbability: 85, rainMm: 18.0, et0: 3.5, provenance: "LIVE_API" },
                { date: "2026-09-22", tempMax: 29, tempMin: 19, humidity: 85, rainProbability: 90, rainMm: 25.0, et0: 3.2, provenance: "LIVE_API" },
                { date: "2026-09-23", tempMax: 31, tempMin: 21, humidity: 70, rainProbability: 30, rainMm: 2.0, et0: 4.0, provenance: "LIVE_API" },
                { date: "2026-09-24", tempMax: 32, tempMin: 22, humidity: 65, rainProbability: 10, rainMm: 0.0, et0: 4.8, provenance: "LIVE_API" },
                { date: "2026-09-25", tempMax: 33, tempMin: 23, humidity: 60, rainProbability: 5, rainMm: 0.0, et0: 5.2, provenance: "LIVE_API" },
            ],
        };

        const features = buildIrrigationFeatures(samplePlot, sampleSensor, rainyForecast);
        const result = computeIrrigationIntelligence(features);
        expect(result.status).toBe("OK");
        expect(result.advisory.rainfallNote).toMatch(/Rain expected/);
    });

    it("8. scales gross water volume requirement by irrigation efficiency (Drip 90% vs Flood 55%)", () => {
        const dripPlot = { ...samplePlot, irrigationMethod: "Drip" };
        const floodPlot = { ...samplePlot, irrigationMethod: "Flood" };

        const dripFeatures = buildIrrigationFeatures(dripPlot, sampleSensor, sampleForecast);
        const floodFeatures = buildIrrigationFeatures(floodPlot, sampleSensor, sampleForecast);

        const dripResult = computeIrrigationIntelligence(dripFeatures);
        const floodResult = computeIrrigationIntelligence(floodFeatures);

        expect(dripFeatures.plotFeatures.efficiency).toBe(0.90);
        expect(floodFeatures.plotFeatures.efficiency).toBe(0.55);
        expect(floodResult.advisory.waterVolumeM3).toBeGreaterThan(dripResult.advisory.waterVolumeM3);
    });

    it("9. evaluates fertigation plan and yield prediction accurately", () => {
        const features = buildIrrigationFeatures(samplePlot, sampleSensor, sampleForecast);
        const result = computeIrrigationIntelligence(features);
        expect(result.fertigation).toBeDefined();
        expect(result.fertigation.totalForPlot.ureaKg).toBeGreaterThan(0);
        expect(result.yieldPrediction.predictedYieldTPerHa).toBeGreaterThan(50);
    });

    it("10. tracks feature provenance summary in the intelligence engine result", () => {
        const features = buildIrrigationFeatures(samplePlot, sampleSensor, sampleForecast);
        const result = computeIrrigationIntelligence(features);
        expect(result.provenance.sensor).toBe("SIMULATED");
        expect(result.provenance.weather).toBe("LIVE_API");
    });
});
