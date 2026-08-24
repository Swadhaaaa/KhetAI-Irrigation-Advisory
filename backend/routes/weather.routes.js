const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { fetchForecast } = require("../utils/weather");

const router = express.Router();
router.use(requireAuth);

router.get("/:plotId", async (req, res) => {
  const plot = db.findById("plots", req.params.plotId);
  if (!plot || plot.userId !== req.user.id) {
    return res.status(404).json({ error: "Plot not found." });
  }
  const forecast = await fetchForecast(plot);
  res.json(forecast);
});

module.exports = router;
