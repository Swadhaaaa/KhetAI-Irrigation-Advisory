const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { buildAdvisory } = require("./advisory.routes");
const { computeFertigationPlan } = require("../utils/aiEngine");
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
  const { advisory } = await buildAdvisory(plot);
  const plan = computeFertigationPlan(plot, advisory);
  res.json({ plan });
}));

module.exports = router;
