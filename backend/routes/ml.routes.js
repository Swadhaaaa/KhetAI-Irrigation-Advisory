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
      plot = await findOwnedPlot(userId, plotId);
    }

    if (plot) {
      latestSensor = await ensureTodayReading(plot.id);
      forecast = await fetchForecast(plot.lat ?? plot.latitude ?? 16.5, plot.lng ?? plot.longitude ?? 75.1);
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
          algorithm: metadata.algorithm,
          metrics: metadata.metrics,
          prediction: mlPrediction,
          reason: metadata.reason,
          extractedFeaturesCount: mlVectorObj.vector.length,
          extractedFeaturesSample: mlVectorObj.namedFeatures,
        },
        provenance: {
          sensor: latestSensor ? (latestSensor.source || latestSensor.provenance || "SIMULATED") : "SIMULATED",
          weather: forecast ? (forecast.provenance || "FALLBACK") : "FALLBACK",
          mlModel: metadata.datasetName ? `External research dataset (${metadata.datasetName}, Zenodo DOI: ${metadata.datasetDOI})` : "EXTERNAL_RESEARCH_DATASET",
        },
      },
    });
  })
);

module.exports = router;
