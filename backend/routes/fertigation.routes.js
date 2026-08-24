const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { buildAdvisory } = require("./advisory.routes");
const { computeFertigationPlan } = require("../utils/aiEngine");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", async (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const { advisory } = await buildAdvisory(plot);
  const plan = computeFertigationPlan(plot, advisory);
  res.json({ plan });
});

module.exports = router;
