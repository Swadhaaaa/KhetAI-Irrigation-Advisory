const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth");
const { buildAdvisory } = require("./advisory.routes");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  listOwnedPlots,
  upsertAlert,
  upsertAlerts,
  readAlertIds,
  markAlertRead,
} = require("../repositories/postgres.repository");

const router = express.Router();
router.use(requireAuth);

function alertId(parts) {
  return "alt_" + crypto.createHash("md5").update(parts.join("|")).digest("hex").slice(0, 10);
}

async function generateAlertsForPlot(plot) {
  const { advisory, forecast } = await buildAdvisory(plot);
  const today = new Date().toISOString().slice(0, 10);
  const alerts = [];

  if (advisory.waterStressLevel === "High") {
    alerts.push({
      id: alertId([plot.id, "stress", today]),
      plotId: plot.id,
      plotName: plot.name,
      severity: "high",
      type: "Soil Moisture",
      message: `Soil moisture is low in ${plot.name} (${advisory.soilMoisturePct}%). Irrigation recommended.`,
      date: today,
    });
  }

  const rainDay = forecast.days.find((d) => d.rainProbability >= 60);
  if (rainDay) {
    alerts.push({
      id: alertId([plot.id, "rain", rainDay.date]),
      plotId: plot.id,
      plotName: plot.name,
      severity: "medium",
      type: "Weather",
      message: `Rainfall expected on ${rainDay.date} in ${plot.name} (${rainDay.rainProbability}% chance). Plan irrigation accordingly.`,
      date: today,
    });
  }

  if (advisory.nextIrrigationInDays < 0) {
    alerts.push({
      id: alertId([plot.id, "delay", today]),
      plotId: plot.id,
      plotName: plot.name,
      severity: "high",
      type: "Irrigation Delay",
      message: `Irrigation is overdue in ${plot.name} by ${Math.abs(advisory.nextIrrigationInDays)} day(s). Estimated yield risk: ${advisory.yieldLossRiskPct}%.`,
      date: today,
    });
  }

  alerts.push({
    id: alertId([plot.id, "sensorcheck", today]),
    plotId: plot.id,
    plotName: plot.name,
    severity: "low",
    type: "Sensor Check",
    message: `All sensors reporting normally in ${plot.name} as of this morning.`,
    date: today,
  });

  return alerts;
}

router.get("/", asyncHandler(async (req, res) => {
  const plots = await listOwnedPlots(req.user.id);
  const readIds = await readAlertIds(req.user.id);

  const all = [];
  for (const plot of plots) {
    const plotAlerts = await generateAlertsForPlot(plot);
    await upsertAlerts(plotAlerts);
    plotAlerts.forEach((alert) => all.push({ ...alert, read: readIds.has(alert.id) }));
  }

  all.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  res.json({ alerts: all });
}));

router.post("/:alertId/read", asyncHandler(async (req, res) => {
  const marked = await markAlertRead(req.params.alertId, req.user.id);
  if (!marked) return res.status(404).json({ error: "Alert not found." });
  res.json({ success: true });
}));

module.exports = router;
