// -----------------------------------------------------------------------------
// backend/routes/ml.routes.js
//
// Express router for KhetAI ML Research & Experimentation layer.
// Provides endpoints for checking ML model status and experimental predictions.
// -----------------------------------------------------------------------------

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { getMlModelMetadata, predictWithExternalModel } = require("../utils/mlModelMetadata");
const { extractMlFeatures } = require("../utils/mlFeatureBuilder");
const { findOwnedPlot } = require("../repositories/postgres.repository");
const { ensureTodayReading } = require("../utils/sensorSim");
const { fetchForecast } = require("../utils/weather");
const { computeIrrigationIntelligence } = require("../utils/irrigationEngine");
const { buildIrrigationFeatures } = require("../utils/irrigationFeatures");

const router = express.Router();

/**
 * GET /api/ml/status
 * Public endpoint returning transparent ML model status and metadata.
 */
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const metadata = getMlModelMetadata();
    res.json({
      success: true,
      data: metadata,
    });
  })
);

/**
 * POST /api/ml/predict
 * Protected endpoint returning hybrid recommendation structure.
 * Evaluates agronomic baseline recommendation alongside honest ML status and experimental model prediction.
 */
router.post(
  "/predict",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const plotId = req.body.plotId;

    let plot = null;
    let latestSensor = null;
    let forecast = null;

    if (plotId) {
      try {
        plot = await findOwnedPlot(userId, plotId);
      } catch (e) {
        plot = null;
      }
    }

    if (plot) {
      try {
        latestSensor = await ensureTodayReading(plot.id);
        forecast = await fetchForecast(plot.lat ?? plot.latitude ?? 16.5, plot.lng ?? plot.longitude ?? 75.1);
      } catch (e) {
        latestSensor = null;
        forecast = null;
      }
    }

    // Build features
    const features = buildIrrigationFeatures(plot, latestSensor, forecast, []);
    const baselineResult = computeIrrigationIntelligence(features);
    const mlVectorObj = extractMlFeatures(plot, latestSensor, forecast, []);
    const metadata = getMlModelMetadata();

    // Run inference using trained sugarcane_irrigation_v1 model
    const mlPrediction = predictWithExternalModel(plot, latestSensor, forecast);

    res.json({
      success: true,
      data: {
        plotId: plot ? plot.id : null,
        activeRecommendation: "AGRONOMIC_BASELINE",
        agronomicBaseline: {
          recommendation: baselineResult.recommendation,
          decisionBadge: baselineResult.status === "INSUFFICIENT_DATA" ? "INSUFFICIENT_DATA" : "AGRONOMIC_DECISION",
          dataQuality: baselineResult.dataQuality,
        },
        mlExperimentation: {
          mlStatus: metadata.status,
          modelVersion: metadata.modelVersion,
          featureVersion: metadata.featureVersion,
          algorithm: metadata.algorithm || "Linear Regression",
          model: {
            version: metadata.modelVersion,
            algorithm: metadata.algorithm || "Linear Regression",
          },
          dataset: {
            source: "External Sugarcane Research Dataset (SIDSS Framework)",
            doi: metadata.datasetDOI || "10.5281/zenodo.19725692",
            origin: metadata.targetGenerationMethod === "D_GENERATED_BY_ML_PIPELINE" ? "MODEL_SIMULATED" : "EXTERNAL_RESEARCH_DATASET",
          },
          unit: "LITERS_PER_DAY_DATASET_SCALE",
          comparability: "NOT_DIRECTLY_COMPARABLE",
          metrics: metadata.metrics,
          baselineMetrics: metadata.baselineMetrics,
          performanceLimitation: metadata.performanceLimitation,
          disclaimer: "This experimental model was trained on an external model-simulated sugarcane research dataset. Its test metrics describe performance on that dataset and do not establish real-world field accuracy.",
          prediction: {
            ...mlPrediction,
            value: mlPrediction ? mlPrediction.predictedWaterLitersPerDay : null,
            unit: "LITERS_PER_DAY_DATASET_SCALE",
            comparability: "NOT_DIRECTLY_COMPARABLE",
          },
          reason: metadata.reason,
          extractedFeaturesCount: mlVectorObj.vector.length,
          extractedFeaturesSample: mlVectorObj.namedFeatures,
        },
        provenance: {
          sensor: latestSensor ? (latestSensor.source || latestSensor.provenance || "SIMULATED") : "SIMULATED",
          weather: forecast ? (forecast.provenance || "FALLBACK") : "FALLBACK",
          mlModel: metadata.datasetName ? `External research dataset (${metadata.datasetName}, Zenodo DOI: ${metadata.datasetDOI})` : "EXTERNAL_RESEARCH_DATASET",
          primaryEngine: "FAO-56 agronomic baseline",
        },
      },
    });
  })
);

module.exports = router;
