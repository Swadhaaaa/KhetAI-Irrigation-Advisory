const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { authenticateDevice } = require("../middleware/deviceAuth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody, sensorIngestionSchema } = require("../utils/validation");
const { classifyMeasurement, classifyTimestamp, combineQuality } = require("../utils/sensorQuality");
const {
    findOwnedDevice,
    provisionDeviceCredential,
    ingestDeviceReadings,
    listOwnedDeviceHealth,
} = require("../repositories/postgres.repository");

const router = express.Router();
const deviceRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

router.post("/devices/:deviceId/credential", requireAuth, asyncHandler(async (req, res) => {
    const credential = crypto.randomBytes(32).toString("base64url");
    const hash = await bcrypt.hash(credential, 12);
    const device = await provisionDeviceCredential(req.params.deviceId, req.user.id, hash);
    if (!device) return res.status(404).json({ error: "Device not found." });
    res.status(201).json({ deviceId: device.id, credential });
}));

router.get("/devices/health", requireAuth, asyncHandler(async (req, res) => {
    const devices = await listOwnedDeviceHealth(req.user.id, req.query.plotId);
    res.json({ devices });
}));

router.post("/readings", deviceRateLimit, authenticateDevice, validateBody(sensorIngestionSchema), asyncHandler(async (req, res) => {
    const timestampQuality = classifyTimestamp(req.body.measuredAt);
    const measuredAt = new Date(req.body.measuredAt);
    const records = req.body.measurements.map((measurement) => {
        const mQuality = classifyMeasurement(measurement);
        const combined = combineQuality(timestampQuality, mQuality);
        return {
            sourceEventId: `${req.body.eventId}:${measurement.type}`,
            measuredAt,
            sensorType: measurement.type,
            unit: measurement.unit,
            value: measurement.value,
            field: mQuality.field,
            quality: combined.quality,
            qualityReason: combined.qualityReason,
        };
    });

    const result = await ingestDeviceReadings(req.device, records, {
        batteryPct: req.body.batteryPct,
        firmware: req.body.firmware,
        rawPayload: req.body,
    });
    res.status(202).json({
        accepted: result.accepted,
        duplicates: result.duplicates,
        quality: result.quality,
        deviceId: req.device.id,
        plotId: req.device.plotId,
    });
}));

module.exports = router;
