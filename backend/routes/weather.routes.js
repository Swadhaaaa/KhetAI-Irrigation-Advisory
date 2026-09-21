const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { fetchForecast } = require("../utils/weather");
const { asyncHandler } = require("../middleware/asyncHandler");
const { findOwnedPlot, plotResponse } = require("../repositories/postgres.repository");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", asyncHandler(async (req, res) => {
  const record = await findOwnedPlot(req.params.plotId, req.user.id);
  if (!record) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const plot = plotResponse(record);
  const forecast = await fetchForecast(plot);
  res.json(forecast);
}));

module.exports = router;
