const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { ensureTodayReading, getHistory } = require("../utils/sensorSim");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const latest = ensureTodayReading(plot);
  const history = getHistory(plot.id, 14);
  res.json({ latest, history });
});

module.exports = router;
