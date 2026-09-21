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

async function buildAdvisory(plot) {
  const latest = await ensureTodayReading(plot);
  const forecast = await fetchForecast(plot);
  const advisory = computeIrrigationAdvisory(
    plot,
    { soilMoisturePct: latest.soilMoisture30, soilTemp: latest.soilTempC },
    forecast
  );
  return { advisory, forecast, latest };
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
  const { advisory, forecast } = await buildAdvisory(plot);
  const farmerMessage = generateMultilingual(advisory, lang);
  res.json({ advisory, forecast, farmerMessage, lang });
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
