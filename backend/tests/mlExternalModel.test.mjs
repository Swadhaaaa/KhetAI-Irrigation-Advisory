process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { app } from "../server.js";
import { loadRawDataset, processDataset, EXCLUDED_COLUMNS, FEATURE_NAMES } from "../utils/externalDatasetAudit.js";
import { getMlModelMetadata, predictWithExternalModel } from "../utils/mlModelMetadata.js";

describe("Phase 9A — External Sugarcane Dataset Audit & ML Pipeline", () => {
  it("1. CSV dataset file exists and contains 1,500 rows and 18 expected headers", () => {
    const raw = loadRawDataset();
    expect(raw.totalRows).toBe(1500);
    expect(raw.headers.length).toBe(18);
    expect(raw.headers).toContain("drip_liters_per_day");
    expect(raw.headers).toContain("stomataopenclose");
    expect(raw.headers).toContain("predicted_water_liters_per_day");
  });

  it("2. Data audit verifies 0 missing values and processes 13 feature columns", () => {
    const raw = loadRawDataset();
    const processed = processDataset(raw.rows);
    expect(processed.X.length).toBe(1500);
    expect(processed.X[0].length).toBe(13);
    expect(processed.yLog.length).toBe(1500);
    expect(processed.featureNames.length).toBe(13);
  });

  it("3. Target leakage prevention excludes target copies and yield predictions from feature set", () => {
    const raw = loadRawDataset();
    const processed = processDataset(raw.rows);
    
    EXCLUDED_COLUMNS.forEach((col) => {
      expect(processed.featureNames).not.toContain(col);
    });
  });

  it("4. Model artifact sugarcane_irrigation_v1.json exists and reports valid training metrics", () => {
    const artifactPath = path.join(process.cwd(), "ml/models/sugarcane_irrigation_v1.json");
    expect(fs.existsSync(artifactPath)).toBe(true);

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    expect(artifact.modelVersion).toBe("sugarcane-irrigation-v1");
    expect(artifact.status).toBe("EXPERIMENTAL_MODEL_TRAINED");
    expect(artifact.metrics).toHaveProperty("logScaleR2");
    expect(artifact.metrics.logScaleR2).toBeGreaterThan(0.9);
    expect(artifact.metrics).toHaveProperty("originalScaleMAE");
    expect(artifact.metrics).toHaveProperty("originalScaleRMSE");
    expect(artifact.metrics).toHaveProperty("originalScaleR2");
    expect(artifact.metrics.originalScaleR2).toBeGreaterThan(0.8);
  });

  it("5. predictWithExternalModel performs pure JS inference accurately and handles inverse log transform", () => {
    const pred = predictWithExternalModel({}, null, null);
    expect(pred.status).toBe("EXPERIMENTAL");
    expect(pred).toHaveProperty("predictedWaterLitersPerDay");
    expect(typeof pred.predictedWaterLitersPerDay).toBe("number");
    expect(pred.predictedWaterLitersPerDay).toBeGreaterThan(0);
    expect(pred).toHaveProperty("log10Prediction");
    const inverseCalc = Math.pow(10, pred.log10Prediction);
    expect(Math.abs(inverseCalc - pred.predictedWaterLitersPerDay)).toBeLessThan(pred.predictedWaterLitersPerDay * 0.01);
  });

  it("6. GET /api/ml/status API endpoint returns transparent trained metadata with target generation and limitations", async () => {
    const res = await request(app).get("/api/ml/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("EXPERIMENTAL_MODEL_TRAINED");
    expect(res.body.data.datasetDOI).toBe("10.5281/zenodo.19725692");
    expect(res.body.data.targetGenerationMethod).toBe("D_GENERATED_BY_ML_PIPELINE");
    expect(res.body.data.featureCount).toBe(13);
    expect(res.body.data.testDatasetSize).toBe(225);
    expect(res.body.data.performanceLimitation).toBeDefined();
    expect(res.body.data.validityCheck.mlRawPredictions.invalidCount).toBe(0);
  });

  it("7. POST /api/ml/predict API endpoint returns hybrid baseline + ML side-by-side output with unit, comparability & disclaimer", async () => {
    const validTestToken = jwt.sign(
      { id: "usr_test", name: "Test Farmer", mobile: "9999999999" },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .post("/api/ml/predict")
      .set("Authorization", `Bearer ${validTestToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeRecommendation).toBe("AGRONOMIC_BASELINE");
    expect(res.body.data.mlExperimentation.unit).toBe("LITERS_PER_DAY_DATASET_SCALE");
    expect(res.body.data.mlExperimentation.comparability).toBe("NOT_DIRECTLY_COMPARABLE");
    expect(res.body.data.mlExperimentation.dataset.origin).toBe("MODEL_SIMULATED");
    expect(res.body.data.mlExperimentation.disclaimer).toContain("external model-simulated sugarcane research dataset");
    expect(res.body.data.mlExperimentation.prediction.status).toBe("EXPERIMENTAL");
    expect(res.body.data.mlExperimentation.prediction).toHaveProperty("predictedWaterLitersPerDay");
    expect(res.body.data.mlExperimentation.prediction.unit).toBe("LITERS_PER_DAY_DATASET_SCALE");
    expect(res.body.data.provenance.primaryEngine).toBe("FAO-56 agronomic baseline");
  });

  it("8. Phase 9B Safety Guarantee — ML prediction never overrides agronomic baseline decision", async () => {
    const validTestToken = jwt.sign(
      { id: "usr_test", name: "Test Farmer", mobile: "9999999999" },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .post("/api/ml/predict")
      .set("Authorization", `Bearer ${validTestToken}`)
      .send({ plotId: "invalid-plot-123" });

    expect(res.status).toBe(200);
    expect(res.body.data.activeRecommendation).toBe("AGRONOMIC_BASELINE");
    expect(res.body.data.agronomicBaseline).toHaveProperty("recommendation");
  });
});
