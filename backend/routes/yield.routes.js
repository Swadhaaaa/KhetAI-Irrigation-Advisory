const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { buildAdvisory } = require("./advisory.routes");
const { computeYieldPrediction } = require("../utils/aiEngine");
const { getHistory } = require("../utils/sensorSim");
const { soilProfile } = require("../utils/aiEngine");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", async (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const { advisory } = await buildAdvisory(plot);
  const history = getHistory(plot.id, 14);

  const soil = soilProfile(plot.soilType);
  const range = soil.fieldCapacity - soil.wiltingPoint;
  const stressReadings = history.map((h) =>
    Math.max(0, Math.min(100, ((soil.fieldCapacity - h.soilMoisture30) / range) * 100))
  );
  const historicalStressAvg = stressReadings.length
    ? stressReadings.reduce((a, b) => a + b, 0) / stressReadings.length
    : advisory.waterStressProbability;

  const prediction = computeYieldPrediction(plot, advisory, historicalStressAvg);
  res.json({ prediction, historicalStressAvg: Math.round(historicalStressAvg) });
});

module.exports = router;
