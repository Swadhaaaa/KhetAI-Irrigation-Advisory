const express = require("express");
const db = require("../db");
const { generateId } = require("../utils/idgen");
const { requireAuth } = require("../middleware/auth");
const { backfillHistory, ensureTodayReading } = require("../utils/sensorSim");

const router = express.Router();
router.use(requireAuth);

function ownedPlotOr404(req, res) {
  const plot = db.findById("plots", req.params.id);
  if (!plot || plot.userId !== req.user.id) {
    res.status(404).json({ error: "Plot not found." });
    return null;
  }
  return plot;
}

router.get("/", (req, res) => {
  const plots = db.getAll("plots").filter((p) => p.userId === req.user.id);
  res.json({ plots });
});

router.post("/", (req, res) => {
  const { name, area, crop, variety, plantingDate, soilType, lat, lng } = req.body || {};
  if (!name || !area || !plantingDate || !soilType) {
    return res.status(400).json({ error: "name, area, plantingDate and soilType are required." });
  }

  const plot = {
    id: generateId("plt"),
    userId: req.user.id,
    name,
    area: Number(area),
    crop: crop || "Sugarcane",
    variety: variety || "Co 86032",
    plantingDate,
    soilType,
    lat: lat != null ? Number(lat) : 16.5 + (Math.random() - 0.5) * 0.4,
    lng: lng != null ? Number(lng) : 75.1 + (Math.random() - 0.5) * 0.4,
    createdAt: new Date().toISOString(),
  };
  db.insert("plots", plot);

  // Seed a couple weeks of believable sensor + irrigation history so charts
  // aren't empty on the very first visit.
  backfillHistory(plot, 14);
  ensureTodayReading(plot);

  res.status(201).json({ plot });
});

router.get("/:id", (req, res) => {
  const plot = ownedPlotOr404(req, res);
  if (!plot) return;
  res.json({ plot });
});

router.put("/:id", (req, res) => {
  const plot = ownedPlotOr404(req, res);
  if (!plot) return;
  const patch = { ...req.body };
  delete patch.id;
  delete patch.userId;
  const updated = db.update("plots", plot.id, patch);
  res.json({ plot: updated });
});

router.delete("/:id", (req, res) => {
  const plot = ownedPlotOr404(req, res);
  if (!plot) return;
  db.remove("plots", plot.id);
  // Cascade-clean related records
  db.saveAll("sensorReadings", db.getAll("sensorReadings").filter((r) => r.plotId !== plot.id));
  db.saveAll("irrigationLogs", db.getAll("irrigationLogs").filter((r) => r.plotId !== plot.id));
  db.saveAll("alerts", db.getAll("alerts").filter((r) => r.plotId !== plot.id));
  res.json({ success: true });
});

module.exports = router;
