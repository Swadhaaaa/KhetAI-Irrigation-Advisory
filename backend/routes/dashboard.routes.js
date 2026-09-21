const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { buildAdvisory } = require("./advisory.routes");
const { asyncHandler } = require("../middleware/asyncHandler");
const { listOwnedPlots, listOwnedIrrigationEvents } = require("../repositories/postgres.repository");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", asyncHandler(async (req, res) => {
  const plots = await listOwnedPlots(req.user.id);

  let totalArea = 0;
  let totalWaterM3 = 0;
  let stressSum = 0;
  const perPlot = [];

  for (const plot of plots) {
    const { advisory } = await buildAdvisory(plot);
    totalArea += plot.area;
    totalWaterM3 += advisory.waterVolumeM3;
    stressSum += advisory.waterStressProbability;
    perPlot.push({
      id: plot.id,
      name: plot.name,
      area: plot.area,
      soilMoisturePct: advisory.soilMoisturePct,
      waterStressLevel: advisory.waterStressLevel,
      nextIrrigationDate: advisory.nextIrrigationDate,
      cropStage: advisory.cropStage,
    });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30 = await listOwnedIrrigationEvents(req.user.id, since);

  res.json({
    plotCount: plots.length,
    totalAreaAcres: Number(totalArea.toFixed(1)),
    avgWaterStressPct: plots.length ? Math.round(stressSum / plots.length) : 0,
    estimatedWaterNeedM3: Math.round(totalWaterM3),
    irrigationEventsLast30Days: last30.length,
    totalWaterAppliedLast30DaysM3: Math.round(
      last30.reduce((sum, l) => sum + (l.waterAppliedM3 || 0), 0)
    ),
    plots: perPlot,
  });
}));

module.exports = router;
