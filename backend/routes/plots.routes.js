const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { backfillHistory, ensureTodayReading } = require("../utils/sensorSim");
const { validateBody, plotSchema, plotUpdateSchema } = require("../utils/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  findOwnedPlot,
  listOwnedPlots,
  createPlot,
  updateOwnedPlot,
  deleteOwnedPlot,
  plotResponse,
  listOwnedPlotsPage,
} = require("../repositories/postgres.repository");
const { parsePagination, paginationMeta, hasPaginationQuery } = require("../utils/pagination");

const router = express.Router();
router.use(requireAuth);

async function ownedPlotOr404(req, res) {
  const plot = await findOwnedPlot(req.params.id, req.user.id);
  if (!plot) {
    res.status(404).json({ error: "Plot not found." });
    return null;
  }
  return plot;
}

router.get("/", asyncHandler(async (req, res) => {
  if (hasPaginationQuery(req.query)) {
    const pagination = parsePagination(req.query);
    const result = await listOwnedPlotsPage(req.user.id, pagination);
    return res.json({ plots: result.plots, pagination: paginationMeta(result.page, result.limit, result.total) });
  }
  const plots = await listOwnedPlots(req.user.id, { limit: 100 });
  res.json({ plots });
}));

router.post("/", validateBody(plotSchema), asyncHandler(async (req, res) => {
  const { name, area, crop, variety, plantingDate, soilType, lat, lng } = req.body;

  const plot = await createPlot(req.user.id, {
    name,
    area: Number(area),
    crop,
    variety,
    plantingDate,
    soilType,
    lat: lat != null ? Number(lat) : 16.5 + (Math.random() - 0.5) * 0.4,
    lng: lng != null ? Number(lng) : 75.1 + (Math.random() - 0.5) * 0.4,
  });

  // Seed a couple weeks of believable sensor + irrigation history so charts
  // aren't empty on the very first visit.
  try {
    await backfillHistory(plot, 14);
    await ensureTodayReading(plot);
  } catch (error) {
    await deleteOwnedPlot(plot.id, req.user.id);
    throw error;
  }

  res.status(201).json({ plot });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const plot = await ownedPlotOr404(req, res);
  if (!plot) return;
  res.json({ plot: plotResponse(plot) });
}));

router.put("/:id", validateBody(plotUpdateSchema), asyncHandler(async (req, res) => {
  const plot = await ownedPlotOr404(req, res);
  if (!plot) return;
  const updated = await updateOwnedPlot(plot.id, req.user.id, req.body);
  res.json({ plot: updated });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const plot = await ownedPlotOr404(req, res);
  if (!plot) return;
  await deleteOwnedPlot(plot.id, req.user.id);
  res.json({ success: true });
}));

module.exports = router;
