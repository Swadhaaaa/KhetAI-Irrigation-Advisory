const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const repository = require("../repositories/postgres.repository");
const { generateId } = require("../utils/idgen");
const { todayISO } = require("../utils/sensorSim");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile },
    process.env.JWT_SECRET || "khetai-dev-secret-change-in-production",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * POST /api/demo/seed
 * Unauthenticated development/evaluator mechanism to seed a demo farmer account & plot.
 */
router.post("/seed", asyncHandler(async (req, res) => {
  const demoMobile = "9876543210";
  let user = await repository.findUserByMobile(demoMobile);

  if (!user) {
    const passwordHash = bcrypt.hashSync("DemoFarmer123!", 10);
    user = await repository.createUser({
      name: "Demo Farmer",
      mobile: demoMobile,
      village: "Mudhol",
      taluk: "Mudhol",
      district: "Bagalkot",
      passwordHash,
    });
  }

  // Ensure plot exists
  const plots = await repository.listOwnedPlots(user.id);
  let plot = plots.find((p) => p.name === "Sugarcane Block A");

  if (!plot) {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    plot = await repository.createPlotRecord(user.id, {
      name: "Sugarcane Block A",
      area: 2.5,
      soilType: "Clay Loam",
      crop: "Sugarcane",
      variety: "Co 86032",
      plantingDate: sixMonthsAgo,
      lat: 16.5,
      lng: 75.1,
      irrigationMethod: "Drip",
    });
  }

  // Ensure simulator device & today's reading
  await repository.ensureSimulatorDevice(plot.id);
  const today = todayISO();
  const eventKey = `sim-reading-${plot.id}-${today}`;

  await repository.upsertDemoScenarioReading(eventKey, {
    id: generateId("snr"),
    plotId: plot.id,
    deviceId: `legacy-device-${plot.id}`,
    eventKey,
    measuredAt: new Date(),
    soilMoisture30: 24.5,
    soilMoisture60: 26.0,
    soilTemperature: 27.0,
    ambientTemperature: 31.0,
    humidityPct: 58,
    rainfallMm: 0,
    quality: "VALID",
    provenance: "SIMULATED",
  });

  const token = signToken(user);
  const { passwordHash, ...publicUser } = user;

  res.json({
    success: true,
    message: "Demo farmer environment seeded successfully.",
    token,
    user: publicUser,
    plot: repository.plotResponse(plot),
  });
}));

// Gated routes below this middleware
router.use(requireAuth);

router.post("/scenario", asyncHandler(async (req, res) => {
    const { plotId, scenario } = req.body;
    if (!plotId || !scenario) {
        return res.status(400).json({ error: "plotId and scenario are required." });
    }

    const plot = await repository.findOwnedPlot(plotId, req.user.id);
    if (!plot) {
        return res.status(404).json({ error: "Plot not found." });
    }

    await repository.ensureSimulatorDevice(plot.id);
    const today = todayISO();
    const eventKey = `sim-reading-${plot.id}-${today}`;

    let readingData = {
        id: generateId("snr"),
        plotId: plot.id,
        deviceId: `legacy-device-${plot.id}`,
        eventKey,
        measuredAt: new Date(),
        quality: "VALID",
        provenance: "SIMULATED",
    };

    switch (scenario) {
        case "SCENARIO_1_NORMAL":
            readingData = {
                ...readingData,
                soilMoisture30: 26.0,
                soilMoisture60: 27.5,
                soilTemperature: 27.0,
                ambientTemperature: 30.0,
                humidityPct: 60,
                quality: "VALID",
                qualityReason: null,
            };
            break;
        case "SCENARIO_2_LOW_MOISTURE":
            readingData = {
                ...readingData,
                soilMoisture30: 14.0,
                soilMoisture60: 15.5,
                soilTemperature: 29.0,
                ambientTemperature: 34.0,
                humidityPct: 45,
                quality: "VALID",
                qualityReason: null,
            };
            break;
        case "SCENARIO_3_RAIN_EXPECTED":
            readingData = {
                ...readingData,
                soilMoisture30: 22.0,
                soilMoisture60: 23.5,
                soilTemperature: 26.0,
                ambientTemperature: 28.0,
                humidityPct: 80,
                rainfallMm: 15.0,
                quality: "VALID",
                qualityReason: null,
            };
            break;
        case "SCENARIO_4_STALE_SENSOR":
            readingData = {
                ...readingData,
                measuredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days stale
                soilMoisture30: 18.0,
                soilMoisture60: 19.0,
                soilTemperature: 28.0,
                ambientTemperature: 31.0,
                humidityPct: 55,
                quality: "INVALID",
                qualityReason: "stale_telemetry_older_than_7_days",
            };
            break;
        default:
            return res.status(400).json({ error: "Unknown scenario identifier." });
    }

    // Force update of existing reading for today to reflect scenario
    await repository.upsertDemoScenarioReading(eventKey, readingData);

    res.json({
        success: true,
        scenario,
        plotId: plot.id,
        message: `Scenario '${scenario}' applied to plot ${plot.name}. Query advisory to inspect backend decision.`,
    });
}));

module.exports = router;
