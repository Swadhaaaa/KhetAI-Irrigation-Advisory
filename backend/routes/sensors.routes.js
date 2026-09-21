const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { ensureTodayReading, getHistory } = require("../utils/sensorSim");
const { findOwnedPlot, plotResponse } = require("../repositories/postgres.repository");
const { asyncHandler } = require("../middleware/asyncHandler");
const { parsePagination } = require("../utils/pagination");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", asyncHandler(async (req, res) => {
  const record = await findOwnedPlot(req.params.plotId, req.user.id);
  if (!record) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const plot = plotResponse(record);
  const latest = await ensureTodayReading(plot);
  const pagination = parsePagination(req.query, { defaultLimit: 14, maxLimit: 100 });
  const history = await getHistory(plot.id, pagination.limit, pagination);
  res.json({ latest, history });
}));

module.exports = router;
