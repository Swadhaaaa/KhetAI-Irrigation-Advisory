import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  extractMlFeatures,
  encodeGrowthStage,
  encodeSoilType,
  encodeIrrigationMethod,
  SOIL_TYPE_MAP,
  IRRIGATION_METHOD_MAP,
  SENSOR_QUALITY_MAP,
} from "../utils/mlFeatureBuilder.js";
import { buildMlDataset, evaluateDataSufficiency } from "../utils/mlDatasetBuilder.js";
import { getMlModelMetadata, DEFAULT_METADATA } from "../utils/mlModelMetadata.js";

// We can import app from server.js for API testing
import { app } from "../server.js";

describe("Phase 7 — ML Feature Builder Layer", () => {
  it("encodes growth stages correctly based on crop age in months", () => {
    expect(encodeGrowthStage(1.5)).toBe(0); // Germination (<=2)
    expect(encodeGrowthStage(3.0)).toBe(1); // Tillering (<=4)
    expect(encodeGrowthStage(6.0)).toBe(2); // Grand Growth (<=9)
    expect(encodeGrowthStage(10.0)).toBe(3); // Maturity (>9)
  });

  it("encodes soil types with case-insensitive matching and fallback", () => {
    expect(encodeSoilType("Clay")).toBe(SOIL_TYPE_MAP.Clay);
    expect(encodeSoilType("sandy loam")).toBe(SOIL_TYPE_MAP["Sandy Loam"]);
    expect(encodeSoilType("UnknownSoil")).toBe(SOIL_TYPE_MAP.Loam);
  });

  it("encodes irrigation methods with fallback", () => {
    expect(encodeIrrigationMethod("Drip Irrigation")).toBe(IRRIGATION_METHOD_MAP.Drip);
    expect(encodeIrrigationMethod("Furrow")).toBe(IRRIGATION_METHOD_MAP.Furrow);
    expect(encodeIrrigationMethod("UnknownMethod")).toBe(IRRIGATION_METHOD_MAP.Furrow);
  });

  it("extracts 30-element feature vector and named object matching specification", () => {
    const mockPlot = {
      id: "plot_test_1",
      plantingDate: "2026-03-01T00:00:00.000Z",
      soilType: "Clay Loam",
      area: 2.5,
      irrigationMethod: "Drip",
    };

    const mockSensor = {
      measuredAt: new Date().toISOString(),
      soilMoisture30: 22.5,
      soilMoisture60: 28.0,
      soilTempC: 24.0,
      ambientTempC: 30.0,
      ambientHumidityPct: 60.0,
      rainfallMm: 0.0,
      quality: "VALID",
      source: "SIMULATED",
    };

    const mockWeather = {
      provenance: "LIVE_API",
      days: [
        {
          tempMax: 34.0,
          tempMin: 22.0,
          humidity: 50.0,
          rainMm: 2.0,
          rainProbability: 25,
          windSpeed: 12.0,
          et0: 5.5,
        },
      ],
    };

    const mockLogs = [
      {
        occurredAt: "2026-09-15T00:00:00.000Z",
        waterAppliedM3: 45.0,
      },
    ];

    const result = extractMlFeatures(mockPlot, mockSensor, mockWeather, mockLogs);

    expect(result).toHaveProperty("vector");
    expect(result).toHaveProperty("featureNames");
    expect(result).toHaveProperty("namedFeatures");
    expect(result.vector.length).toBe(30);
    expect(result.featureNames.length).toBe(30);
    expect(result.sensorProvenance).toBe("SIMULATED");
    expect(result.weatherProvenance).toBe("LIVE_API");

    // Specific feature verifications
    expect(result.namedFeatures.soilCode).toBe(SOIL_TYPE_MAP["Clay Loam"]);
    expect(result.namedFeatures.irrigationMethodCode).toBe(IRRIGATION_METHOD_MAP.Drip);
    expect(result.namedFeatures.soilMoisture30).toBe(22.5);
    expect(result.namedFeatures.tempMax).toBe(34.0);
    expect(result.namedFeatures.lastIrrigationWaterVolumeM3).toBe(45.0);
  });

  it("handles empty/null plot, sensor, weather, and logs gracefully with defaults", () => {
    const result = extractMlFeatures(null, null, null, null);
    expect(result.vector.length).toBe(30);
    expect(result.namedFeatures.soilMoisture30).toBe(25.0);
    expect(result.namedFeatures.tempMax).toBe(32.0);
    expect(result.namedFeatures.recentCount30Days).toBe(0);
  });
});

describe("Phase 7 — ML Dataset Builder & Data Leakage Prevention", () => {
  it("sorts records chronologically and performs train/val/test 70/15/15 split", () => {
    const records = [];
    for (let i = 0; i < 20; i++) {
      records.push({
        timestamp: new Date(2026, 8, 20 - i).toISOString(), // Unsorted dates
        provenance: "SIMULATED",
        plot: { soilType: "Loam" },
        sensor: { soilMoisture30: 20 + i },
      });
    }

    const dataset = buildMlDataset(records, { trainRatio: 0.7, valRatio: 0.15 });

    expect(dataset.totalRecords).toBe(20);
    expect(dataset.splitCounts.train).toBe(14);
    expect(dataset.splitCounts.validation).toBe(3);
    expect(dataset.splitCounts.test).toBe(3);

    // Verify chronological ordering in splits
    const tFirstTrain = new Date(dataset.splits.train[0].timestamp).getTime();
    const tLastTrain = new Date(dataset.splits.train[13].timestamp).getTime();
    expect(tFirstTrain).toBeLessThan(tLastTrain);
  });

  it("prevents data leakage by filtering out future irrigation logs relative to record timestamp", () => {
    const recordTimestamp = "2026-09-10T12:00:00.000Z";
    const pastLog = { occurredAt: "2026-09-08T10:00:00.000Z", waterAppliedM3: 50 };
    const futureLog = { occurredAt: "2026-09-12T10:00:00.000Z", waterAppliedM3: 80 };

    const record = {
      timestamp: recordTimestamp,
      provenance: "SIMULATED",
      historyLogs: [pastLog, futureLog],
    };

    const dataset = buildMlDataset([record], { trainRatio: 1.0, valRatio: 0.0 });
    const entry = dataset.splits.train[0];

    // Should only incorporate the past log (50 m3), ignoring the future log (80 m3)
    expect(entry.features.lastIrrigationWaterVolumeM3).toBe(50);
  });

  it("flags insufficient historical data when real physical hardware records < 30", () => {
    const simRecords = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(2026, 0, i + 1).toISOString(),
      provenance: "SIMULATED",
    }));

    const dataset = buildMlDataset(simRecords);

    expect(dataset.status).toBe("INSUFFICIENT_HISTORICAL_DATA");
    expect(dataset.realHardwareRecords).toBe(0);
    expect(dataset.simulatedRecords).toBe(50);
  });
});

describe("Phase 7 — ML Model Metadata Store", () => {
  it("returns default metadata with baseline as active engine", () => {
    const metadata = getMlModelMetadata();
    expect(["EXPERIMENTAL_MODEL_TRAINED", "INSUFFICIENT_HISTORICAL_DATA"]).toContain(metadata.status);
    expect(metadata.activeEngine).toBe("AGRONOMIC_BASELINE");
    expect(metadata.modelVersion).toBe("sugarcane-irrigation-v1");
  });
});

describe("Phase 7 — ML API Endpoints (/api/ml)", () => {
  it("GET /api/ml/status returns metadata reporting valid status", async () => {
    const res = await request(app).get("/api/ml/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(["EXPERIMENTAL_MODEL_TRAINED", "INSUFFICIENT_HISTORICAL_DATA"]).toContain(res.body.data.status);
    expect(res.body.data.activeEngine).toBe("AGRONOMIC_BASELINE");
  });
});
