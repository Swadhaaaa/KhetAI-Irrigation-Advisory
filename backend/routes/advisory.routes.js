const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { ensureTodayReading } = require("../utils/sensorSim");
const { fetchForecast } = require("../utils/weather");
const { computeIrrigationAdvisory } = require("../utils/aiEngine");
const { generate: generateMultilingual, SUPPORTED_LANGUAGES } = require("../utils/multilingual");
const { generateId } = require("../utils/idgen");

const router = express.Router();
router.use(requireAuth);

async function buildAdvisory(plot) {
  const latest = ensureTodayReading(plot);
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

router.get("/:plotId", async (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const lang = req.query.lang || "en";
  const { advisory, forecast } = await buildAdvisory(plot);
  const farmerMessage = generateMultilingual(advisory, lang);
  res.json({ advisory, forecast, farmerMessage, lang });
});

// Log an irrigation event (manual override / confirmation of automated pump run)
router.post("/:plotId/log", (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const { durationHours, waterAppliedM3 } = req.body || {};
  const log = {
    id: generateId("irr"),
    plotId: plot.id,
    date: new Date().toISOString().slice(0, 10),
    durationHours: Number(durationHours) || 2,
    waterAppliedM3: Number(waterAppliedM3) || 100,
    loggedBy: req.user.id,
  };
  db.insert("irrigationLogs", log);
  res.status(201).json({ log });
});

router.get("/:plotId/history", (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const logs = db
    .getAll("irrigationLogs")
    .filter((l) => l.plotId === plot.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ logs });
});

module.exports = { router, buildAdvisory };
