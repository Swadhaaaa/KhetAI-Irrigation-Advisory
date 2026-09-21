// -----------------------------------------------------------------------------
// backend/utils/mlModelMetadata.js
//
// Honest ML Model Metadata Store for KhetAI.
// Integrates trained experimental model sugarcane_irrigation_v1.json.
// -----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const MODEL_PATH = path.join(__dirname, "../ml/models/sugarcane_irrigation_v1.json");

let trainedModelArtifact = null;
if (fs.existsSync(MODEL_PATH)) {
  try {
    trainedModelArtifact = JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8"));
  } catch (e) {
    console.warn("Could not parse trained model artifact at", MODEL_PATH);
  }
}

const DEFAULT_METADATA = {
  modelVersion: trainedModelArtifact ? trainedModelArtifact.modelVersion : "experimental-v1",
  featureVersion: "v1-13feat",
  featureCount: trainedModelArtifact ? trainedModelArtifact.featureCount : 13,
  featureNames: trainedModelArtifact ? trainedModelArtifact.features : [],
  trainingDatasetSize: trainedModelArtifact ? trainedModelArtifact.trainingRows : 0,
  validationDatasetSize: trainedModelArtifact ? trainedModelArtifact.validationRows : 0,
  testDatasetSize: trainedModelArtifact ? trainedModelArtifact.testRows : 0,
  target: trainedModelArtifact ? trainedModelArtifact.target : "drip_liters_per_day",
  targetTransformation: trainedModelArtifact ? trainedModelArtifact.targetTransformation : "log10",
  targetGenerationMethod: trainedModelArtifact ? trainedModelArtifact.targetGenerationMethod : null,
  algorithm: trainedModelArtifact ? trainedModelArtifact.algorithm : null,
  datasetName: trainedModelArtifact ? trainedModelArtifact.dataset : "Sugarcane Irrigation Dataset for SIDSS Framework",
  datasetDOI: trainedModelArtifact ? trainedModelArtifact.datasetDOI : "10.5281/zenodo.19725692",
  datasetOrigin: trainedModelArtifact ? trainedModelArtifact.datasetOrigin : null,
  temporalInformation: trainedModelArtifact ? trainedModelArtifact.temporalInformation : null,
  splitType: trainedModelArtifact ? trainedModelArtifact.splitType : null,
  provenance: "EXTERNAL_RESEARCH_DATASET",
  status: trainedModelArtifact ? trainedModelArtifact.status : "INSUFFICIENT_HISTORICAL_DATA",
  reason: trainedModelArtifact
    ? "Experimental ML model trained on external research dataset (Zenodo DOI: 10.5281/zenodo.19725692). Agronomic Baseline remains the primary active recommendation engine."
    : "No trained ML model available. Agronomic Baseline engine is active.",
  // Dual-scale metrics (all from actual experiment, not estimated)
  metrics: trainedModelArtifact ? trainedModelArtifact.metrics : null,
  baselineMetrics: trainedModelArtifact ? trainedModelArtifact.baselineMetrics : null,
  validityCheck: trainedModelArtifact ? trainedModelArtifact.validityCheck : null,
  performanceLimitation: trainedModelArtifact
    ? trainedModelArtifact.performanceLimitation
    : "No trained model available.",
  activeEngine: "AGRONOMIC_BASELINE",
  hybridComparison: "ACTIVE",
  note: "ML predictions are provided for experimental comparison alongside the FAO-56 Agronomic Baseline.",
};

function getMlModelMetadata() {
  return { ...DEFAULT_METADATA };
}

/**
 * Pure JS Inference function for sugarcane_irrigation_v1.json
 */
function predictWithExternalModel(plot = {}, latestSensor = null, forecast = null) {
  if (!trainedModelArtifact || !trainedModelArtifact.linearModel) {
    return {
      status: "UNAVAILABLE",
      reason: "No trained ML model artifact found.",
      predictedWaterLitersPerDay: null,
    };
  }

  const { bias, weights, means, stds } = trainedModelArtifact.linearModel;

  // Extract normalized 13-feature vector matching training order
  const sm30 = latestSensor ? (latestSensor.soilMoisture30 ?? 25.0) : 25.0;
  const ambTemp = latestSensor ? (latestSensor.ambientTempC ?? 30.0) : 30.0;
  const humidity = latestSensor ? (latestSensor.ambientHumidityPct ?? 60.0) : 60.0;
  const et0 = forecast && forecast.days && forecast.days[0] ? (forecast.days[0].et0 ?? 4.0) : 4.0;
  const wind = forecast && forecast.days && forecast.days[0] ? (forecast.days[0].windSpeed ?? 8.0) : 8.0;

  // Feature vector matching FEATURE_NAMES order
  const rawFeatures = [
    0.5,        // stomataopenclose
    2.5,        // nitrogen
    40.0,       // chloropyll
    0.4,        // phosphorus
    humidity,   // leafhumidity
    1.5,        // leafevaporation
    et0,        // evapotranspiration
    2,          // stageCode (grandgrowth=2)
    6.5,        // soilph
    sm30,       // soilhumidity
    ambTemp,    // microclimatictemp
    0,          // seasonCode (monsoon=0)
    wind,       // microclimaticwindspeed
  ];

  let logPred = bias;
  for (let j = 0; j < rawFeatures.length; j++) {
    const normVal = (rawFeatures[j] - means[j]) / (stds[j] || 1.0);
    logPred += normVal * weights[j];
  }

  const predictedLiters = Math.pow(10, logPred);

  return {
    status: "EXPERIMENTAL",
    algorithm: trainedModelArtifact.algorithm,
    target: trainedModelArtifact.target,
    log10Prediction: Number(logPred.toFixed(4)),
    predictedWaterLitersPerDay: Math.round(predictedLiters),
    metrics: trainedModelArtifact.metrics,
    datasetDOI: trainedModelArtifact.datasetDOI,
    disclaimer: "Experimental ML prediction trained on external research dataset. Agronomic Baseline is the primary decision engine.",
  };
}

module.exports = {
  getMlModelMetadata,
  predictWithExternalModel,
  DEFAULT_METADATA,
};
