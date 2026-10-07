const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { ensureTodayReading } = require("../utils/sensorSim");
const { fetchForecast } = require("../utils/weather");
const { computeIrrigationAdvisory } = require("../utils/aiEngine");
const { generate: generateMultilingual, SUPPORTED_LANGUAGES } = require("../utils/multilingual");
const { validateBody, irrigationLogSchema } = require("../utils/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  findOwnedPlot,
  plotResponse,
  createIrrigationEvent,
  listIrrigationEvents,
  countIrrigationEvents,
} = require("../repositories/postgres.repository");
const { parsePagination, paginationMeta, hasPaginationQuery } = require("../utils/pagination");

const router = express.Router();
router.use(requireAuth);

const { buildIrrigationFeatures } = require("../utils/irrigationFeatures");
const { computeIrrigationIntelligence } = require("../utils/irrigationEngine");

function determineDecisionBadge(advisory, status, rainfallNote) {
  if (status === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  if (rainfallNote) return "MONITOR";
  if (advisory.nextIrrigationInDays <= 0) return "IRRIGATE_NOW";
  if (advisory.nextIrrigationInDays <= 2) return "IRRIGATE_SOON";
  if (advisory.depletionPct >= 40) return "MONITOR";
  return "NO_IRRIGATION";
}

function formatTrustIndicators(forecastProvenance) {
  const isLive = !forecastProvenance || forecastProvenance === "LIVE_API";
  let weatherLabel = "Live weather forecast";
  if (forecastProvenance === "CACHED_API") weatherLabel = "Cached weather forecast";
  else if (forecastProvenance === "FALLBACK") weatherLabel = "Fallback weather simulation";

  return {
    sensorProvenance: "SIMULATED",
    sensorLabel: "Simulated demo data",
    weatherProvenance: forecastProvenance || "FALLBACK",
    weatherLabel,
    engineLabel: "Agronomic calculation",
    engineDetail: "FAO-56 Penman-Monteith crop water balance",
  };
}

function formatTechnicalDetails(forecastProvenance, sensorQuality, sensorSource) {
  return {
    modelType: "AGRONOMIC_BASELINE",
    featureVersion: "v1.0-fao56",
    weatherProvenance: forecastProvenance || "FALLBACK",
    sensorProvenance: sensorSource || "SIMULATED",
    dataQualityStatus: sensorQuality || "VALID",
    calculatedAt: new Date().toISOString(),
  };
}

async function buildAdvisory(plot) {
  const [latest, forecast, historyLogs] = await Promise.all([
    ensureTodayReading(plot),
    fetchForecast(plot),
    listIrrigationEvents(plot.id, { limit: 20 }),
  ]);

  const features = buildIrrigationFeatures(plot, latest, forecast, historyLogs);
  const intelligence = computeIrrigationIntelligence(features);

  const trustIndicators = formatTrustIndicators(forecast?.provenance);
  const technicalDetails = formatTechnicalDetails(forecast?.provenance, latest?.quality, latest?.source);

  if (intelligence.status === "INSUFFICIENT_DATA") {
    const fallbackAdvisory = computeIrrigationAdvisory(plot, latest, forecast);
    const decisionBadge = "INSUFFICIENT_DATA";
    const advisoryWithBadge = { ...fallbackAdvisory, decisionBadge };

    return {
      status: "INSUFFICIENT_DATA",
      decisionBadge,
      advisory: advisoryWithBadge,
      forecast,
      latest,
      explanation: intelligence.explanation,
      qualityGate: intelligence.qualityGate,
      trustIndicators,
      technicalDetails,
      provenance: features.provenanceSummary,
    };
  }

  const decisionBadge = determineDecisionBadge(intelligence.advisory, intelligence.status, intelligence.advisory.rainfallNote);
  const advisoryWithBadge = { ...intelligence.advisory, decisionBadge };

  const bullets = [
    `Soil moisture is currently at ${intelligence.advisory.soilMoisturePct}% relative to a field capacity of ${intelligence.advisory.fieldCapacityPct}%.`,
    `Current crop growth stage is '${intelligence.advisory.cropStage}' with a crop coefficient (Kc) of ${intelligence.advisory.kc}.`,
    `Daily reference evapotranspiration (ET0) is ${intelligence.advisory.et0MmPerDay} mm/day, yielding a crop water requirement (ETc) of ${intelligence.advisory.cropWaterRequirementMmPerDay} mm/day.`,
    intelligence.advisory.rainfallNote
      ? `Forecast adjustment: ${intelligence.advisory.rainfallNote}`
      : "No significant rainfall is expected in the next 3 days to offset the crop water deficit.",
  ];

  return {
    status: "OK",
    decisionBadge,
    advisory: advisoryWithBadge,
    forecast,
    latest,
    fertigation: intelligence.fertigation,
    yieldPrediction: intelligence.yieldPrediction,
    explanation: intelligence.explanation,
    explanationBullets: bullets,
    qualityGate: intelligence.qualityGate,
    trustIndicators,
    technicalDetails,
    provenance: intelligence.provenance,
  };
}

router.get("/languages", (req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

router.get("/:plotId", asyncHandler(async (req, res) => {
  const record = await findOwnedPlot(req.params.plotId, req.user.id);
  if (!record) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const plot = plotResponse(record);
  const lang = req.query.lang || "en";
  const result = await buildAdvisory(plot);
  const farmerMessage = generateMultilingual(result.advisory, lang);
  res.json({ ...result, farmerMessage, lang });
}));

// Log an irrigation event (manual override / confirmation of automated pump run)
router.post("/:plotId/log", validateBody(irrigationLogSchema), asyncHandler(async (req, res) => {
  const plot = await findOwnedPlot(req.params.plotId, req.user.id);
  if (!plot) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const { durationHours, waterAppliedM3 } = req.body;
  const log = await createIrrigationEvent(plot.id, req.user.id, { durationHours, waterAppliedM3 });
  res.status(201).json({ log });
}));

router.get("/:plotId/history", asyncHandler(async (req, res) => {
  const plot = await findOwnedPlot(req.params.plotId, req.user.id);
  if (!plot) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const pagination = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const [logs, total] = await Promise.all([
    listIrrigationEvents(plot.id, pagination),
    hasPaginationQuery(req.query) ? countIrrigationEvents(plot.id) : Promise.resolve(null),
  ]);
  const response = { logs };
  if (hasPaginationQuery(req.query)) response.pagination = paginationMeta(pagination.page, pagination.limit, total);
  res.json(response);
}));

module.exports = { router, buildAdvisory };
