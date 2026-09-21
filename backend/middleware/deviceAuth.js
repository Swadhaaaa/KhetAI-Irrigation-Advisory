const bcrypt = require("bcryptjs");
const { asyncHandler } = require("./asyncHandler");
const { findDeviceByKey } = require("../repositories/postgres.repository");

const authenticateDevice = asyncHandler(async (req, res, next) => {
    const deviceKey = req.get("X-Device-Key");
    const deviceSecret = req.get("X-Device-Secret");
    if (!deviceKey || !deviceSecret || deviceKey.length > 160 || deviceSecret.length > 256) {
        return res.status(401).json({ error: "Invalid device credentials." });
    }

    const device = await findDeviceByKey(deviceKey);
    if (!device || !device.isActive || device.credentialRevokedAt || !device.credentialHash) {
        return res.status(401).json({ error: "Invalid device credentials." });
    }
    if (!(await bcrypt.compare(deviceSecret, device.credentialHash))) {
        return res.status(401).json({ error: "Invalid device credentials." });
    }
    if (device.plot.deletedAt || device.plot.farm.deletedAt) {
        return res.status(403).json({ error: "Device is not associated with an active plot." });
    }

    req.device = device;
    next();
});

module.exports = { authenticateDevice };
