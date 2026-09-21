const { createPrismaClient } = require("../prisma/client");
const { generateId } = require("../utils/idgen");

let client;

function prisma() {
    if (!client) client = createPrismaClient();
    return client.prisma;
}

async function disconnect() {
    if (!client) return;
    await client.prisma.$disconnect();
    await client.pool.end();
    client = undefined;
}

function numberValue(value) {
    return value == null ? value : Number(value);
}

function dateValue(value) {
    return value instanceof Date ? value : new Date(value);
}

function dateOnly(value) {
    return dateValue(value).toISOString().slice(0, 10);
}

function plotResponse(plot) {
    return {
        id: plot.id,
        userId: plot.farm.ownerId,
        name: plot.name,
        area: numberValue(plot.areaAcres),
        crop: plot.crop.name,
        variety: plot.variety || plot.crop.variety || "",
        plantingDate: dateOnly(plot.plantingDate),
        soilType: plot.soilType,
        irrigationMethod: plot.irrigationMethod || undefined,
        lat: numberValue(plot.latitude),
        lng: numberValue(plot.longitude),
        createdAt: dateValue(plot.createdAt).toISOString(),
    };
}

function sensorResponse(reading) {
    return {
        id: reading.id,
        plotId: reading.plotId,
        date: dateOnly(reading.measuredAt),
        soilMoisture30: numberValue(reading.soilMoisture30),
        soilMoisture60: numberValue(reading.soilMoisture60),
        soilTempC: numberValue(reading.soilTemperature),
        ambientTempC: numberValue(reading.ambientTemperature),
        ambientHumidityPct: numberValue(reading.humidityPct),
        ndvi: numberValue(reading.ndvi),
        source: reading.provenance,
        quality: reading.quality,
        qualityReason: reading.qualityReason || null,
        sensorType: reading.sensorType || null,
        unit: reading.unit || null,
        value: numberValue(reading.value),
        measuredAt: reading.measuredAt.toISOString(),
        ingestedAt: reading.ingestedAt?.toISOString() || null,
    };
}

function mergeSensorRows(readings) {
    const grouped = new Map();
    for (const reading of readings) {
        const groupKey = reading.rawPayload?.eventId || reading.eventKey;
        const current = grouped.get(groupKey) || { ...reading };
        for (const field of ["soilMoisture30", "soilMoisture60", "soilTemperature", "ambientTemperature", "humidityPct", "rainfallMm", "ndvi", "batteryPct"]) {
            if (reading[field] != null) current[field] = reading[field];
        }
        if (reading.quality === "SUSPECT") current.quality = "SUSPECT";
        current.qualityReason = current.qualityReason || reading.qualityReason;
        grouped.set(groupKey, current);
    }
    return [...grouped.values()].sort((a, b) => b.measuredAt - a.measuredAt);
}

function irrigationResponse(event) {
    return {
        id: event.id,
        plotId: event.plotId,
        date: dateOnly(event.occurredAt),
        durationHours: numberValue(event.durationHours),
        waterAppliedM3: numberValue(event.waterAppliedM3),
        loggedBy: event.actorId || event.source,
    };
}

const plotInclude = {
    farm: { select: { ownerId: true, deletedAt: true } },
    crop: true,
};

async function findPlotById(id) {
    return prisma().plot.findFirst({
        where: { id, deletedAt: null, farm: { deletedAt: null } },
        include: plotInclude,
    });
}

async function findOwnedPlot(id, userId) {
    return prisma().plot.findFirst({
        where: {
            id,
            deletedAt: null,
            farm: { ownerId: userId, deletedAt: null },
        },
        include: plotInclude,
    });
}

async function listOwnedPlots(userId, options = {}) {
    const limit = Math.min(options.limit || 100, 100);
    const plots = await prisma().plot.findMany({
        where: { deletedAt: null, farm: { ownerId: userId, deletedAt: null } },
        include: plotInclude,
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: options.skip || 0,
    });
    return plots.map(plotResponse);
}

async function listOwnedPlotsPage(userId, { page, limit, skip }) {
    const where = { deletedAt: null, farm: { ownerId: userId, deletedAt: null } };
    const [plots, total] = await prisma().$transaction([
        prisma().plot.findMany({ where, include: plotInclude, orderBy: { createdAt: "asc" }, take: limit, skip }),
        prisma().plot.count({ where }),
    ]);
    return { plots: plots.map(plotResponse), total, page, limit };
}

async function createPlot(userId, input) {
    const result = await prisma().$transaction(async (tx) => {
        let farm = await tx.farm.findFirst({
            where: { ownerId: userId, deletedAt: null },
            orderBy: { createdAt: "asc" },
        });
        if (!farm) {
            farm = await tx.farm.create({
                data: {
                    ownerId: userId,
                    name: "My Farm",
                    latitude: input.lat ?? null,
                    longitude: input.lng ?? null,
                },
            });
        }

        const cropName = input.crop || "Sugarcane";
        const variety = input.variety || "Co 86032";
        let crop = await tx.crop.findFirst({ where: { name: cropName, variety } });
        if (!crop) crop = await tx.crop.create({ data: { name: cropName, variety } });

        return tx.plot.create({
            data: {
                id: generateId("plt"),
                farmId: farm.id,
                cropId: crop.id,
                name: input.name,
                areaAcres: input.area,
                variety,
                plantingDate: dateValue(input.plantingDate),
                soilType: input.soilType,
                latitude: input.lat ?? null,
                longitude: input.lng ?? null,
            },
            include: plotInclude,
        });
    }, { timeout: 30000 });
    return plotResponse(result);
}

async function updateOwnedPlot(id, userId, patch) {
    const existing = await findOwnedPlot(id, userId);
    if (!existing) return null;

    const data = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.area !== undefined) data.areaAcres = patch.area;
    if (patch.plantingDate !== undefined) data.plantingDate = dateValue(patch.plantingDate);
    if (patch.soilType !== undefined) data.soilType = patch.soilType;
    if (patch.lat !== undefined) data.latitude = patch.lat;
    if (patch.lng !== undefined) data.longitude = patch.lng;
    if (patch.irrigationMethod !== undefined) data.irrigationMethod = patch.irrigationMethod;

    const cropName = patch.crop ?? existing.crop.name;
    const variety = patch.variety ?? existing.variety ?? existing.crop.variety ?? "Co 86032";
    if (patch.crop !== undefined || patch.variety !== undefined) {
        const updated = await prisma().$transaction(async (tx) => {
            let crop = await tx.crop.findFirst({ where: { name: cropName, variety } });
            if (!crop) crop = await tx.crop.create({ data: { name: cropName, variety } });
            return tx.plot.update({
                where: { id },
                data: { ...data, cropId: crop.id, variety },
                include: plotInclude,
            });
        }, { timeout: 30000 });
        return plotResponse(updated);
    }

    const updated = await prisma().plot.update({ where: { id }, data, include: plotInclude });
    return plotResponse(updated);
}

async function deleteOwnedPlot(id, userId) {
    const existing = await findOwnedPlot(id, userId);
    if (!existing) return false;
    await prisma().plot.delete({ where: { id } });
    return true;
}

async function findUserById(id) {
    return prisma().user.findUnique({ where: { id } });
}

async function findUserByMobile(mobile) {
    return prisma().user.findUnique({ where: { mobile } });
}

async function createUser(data) {
    return prisma().$transaction(async (tx) => tx.user.create({
        data: {
            id: generateId("usr"),
            name: data.name,
            mobile: data.mobile,
            village: data.village || null,
            taluk: data.taluk || null,
            district: data.district || null,
            passwordHash: data.passwordHash,
            roles: { create: { role: "FARMER" } },
        },
    }), { timeout: 30000 });
}

async function findLatestReading(plotId) {
    const readings = await prisma().sensorReading.findMany({
        where: { plotId },
        orderBy: { measuredAt: "desc" },
        take: 32,
    });
    return mergeSensorRows(readings)[0] || null;
}

async function findReadingForDay(plotId, start, end) {
    return prisma().sensorReading.findFirst({
        where: { plotId, measuredAt: { gte: start, lt: end } },
        orderBy: { measuredAt: "desc" },
    });
}

async function listSensorReadings(plotId, days = 14, options = {}) {
    const limit = Math.min(options.limit || days, 100);
    const readings = await prisma().sensorReading.findMany({
        where: { plotId },
        orderBy: { measuredAt: "desc" },
        take: Math.min(limit * 8, 800),
    });
    return mergeSensorRows(readings).slice(options.skip || 0, (options.skip || 0) + limit).reverse().map(sensorResponse);
}

async function ensureSimulatorDevice(plotId) {
    return prisma().sensorDevice.upsert({
        where: { deviceKey: `legacy-device-${plotId}` },
        update: { connected: true, lastSeenAt: new Date() },
        create: {
            id: `legacy-device-${plotId}`,
            plotId,
            deviceKey: `legacy-device-${plotId}`,
            name: "Development simulator",
            connected: true,
            lastSeenAt: new Date(),
        },
    });
}

async function findDeviceByKey(deviceKey) {
    return prisma().sensorDevice.findUnique({
        where: { deviceKey },
        include: { plot: { include: { farm: { select: { ownerId: true, deletedAt: true } } } } },
    });
}

async function findOwnedDevice(deviceId, userId) {
    return prisma().sensorDevice.findFirst({
        where: { id: deviceId, plot: { deletedAt: null, farm: { ownerId: userId, deletedAt: null } } },
    });
}

async function provisionDeviceCredential(deviceId, userId, credentialHash) {
    const device = await findOwnedDevice(deviceId, userId);
    if (!device) return null;
    return prisma().sensorDevice.update({
        where: { id: deviceId },
        data: {
            credentialHash,
            credentialCreatedAt: new Date(),
            credentialRevokedAt: null,
            isActive: true,
            healthStatus: "UNKNOWN",
        },
    });
}

async function listOwnedDeviceHealth(userId, plotId) {
    const devices = await prisma().sensorDevice.findMany({
        where: {
            ...(plotId ? { plotId } : {}),
            plot: { deletedAt: null, farm: { ownerId: userId, deletedAt: null } },
        },
        select: {
            id: true,
            plotId: true,
            name: true,
            firmware: true,
            isActive: true,
            connected: true,
            healthStatus: true,
            lastSeenAt: true,
            lastIngestedAt: true,
            batteryPct: true,
            lastErrorCode: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
    });
    return devices.map((device) => ({
        ...device,
        batteryPct: numberValue(device.batteryPct),
        lastSeenAt: device.lastSeenAt?.toISOString() || null,
        lastIngestedAt: device.lastIngestedAt?.toISOString() || null,
    }));
}

async function ingestDeviceReadings(device, records, deviceState) {
    return prisma().$transaction(async (tx) => {
        let accepted = 0;
        let duplicates = 0;
        const quality = { VALID: 0, SUSPECT: 0 };

        for (const record of records) {
            const existing = await tx.sensorReading.findFirst({
                where: { deviceId: device.id, sourceEventId: record.sourceEventId },
            });
            if (existing) {
                const same = Number(existing.value) === record.value
                    && existing.sensorType === record.sensorType
                    && existing.unit === record.unit
                    && new Date(existing.measuredAt).getTime() === record.measuredAt.getTime();
                if (!same) {
                    const error = new Error("The device event ID was already used with different data.");
                    error.code = "DUPLICATE_READING_CONFLICT";
                    throw error;
                }
                duplicates += 1;
                quality[existing.quality] = (quality[existing.quality] || 0) + 1;
                continue;
            }

            const data = {
                id: generateId("snr"),
                plotId: device.plotId,
                deviceId: device.id,
                eventKey: `device-${device.id}-${record.sourceEventId}`,
                sourceEventId: record.sourceEventId,
                measuredAt: record.measuredAt,
                ingestedAt: new Date(),
                sensorType: record.sensorType,
                unit: record.unit,
                value: record.value,
                quality: record.quality,
                qualityReason: record.qualityReason,
                provenance: "LIVE",
                rawPayload: deviceState.rawPayload,
                [record.field]: record.value,
            };
            await tx.sensorReading.create({ data });
            accepted += 1;
            quality[record.quality] = (quality[record.quality] || 0) + 1;
        }

        await tx.sensorDevice.update({
            where: { id: device.id },
            data: {
                lastSeenAt: new Date(),
                lastIngestedAt: new Date(),
                batteryPct: deviceState.batteryPct ?? undefined,
                firmware: deviceState.firmware ?? undefined,
                connected: true,
                healthStatus: "ONLINE",
                lastErrorCode: null,
            },
        });
        return { accepted, duplicates, quality };
    }, { timeout: 30000 });
}

async function upsertSensorReading(data) {
    const reading = await prisma().sensorReading.upsert({
        where: { eventKey: data.eventKey },
        update: {},
        create: data,
    });
    return sensorResponse(reading);
}

async function findIrrigationOnDay(plotId, start, end) {
    return prisma().irrigationEvent.findFirst({
        where: { plotId, occurredAt: { gte: start, lt: end } },
        orderBy: { occurredAt: "desc" },
    });
}

async function createIrrigationEvent(plotId, actorId, data) {
    const event = await prisma().irrigationEvent.create({
        data: {
            id: generateId("irr"),
            plotId,
            actorId,
            occurredAt: new Date(),
            durationHours: data.durationHours,
            waterAppliedM3: data.waterAppliedM3,
            source: "FARMER",
        },
    });
    return irrigationResponse(event);
}

async function listIrrigationEvents(plotId, options = {}) {
    const limit = Math.min(options.limit || 100, 100);
    const events = await prisma().irrigationEvent.findMany({
        where: { plotId },
        orderBy: { occurredAt: "desc" },
        take: limit,
        skip: options.skip || 0,
    });
    return events.map(irrigationResponse);
}

async function countIrrigationEvents(plotId) {
    return prisma().irrigationEvent.count({ where: { plotId } });
}

async function listOwnedIrrigationEvents(userId, since) {
    const events = await prisma().irrigationEvent.findMany({
        where: {
            occurredAt: { gte: since },
            plot: { deletedAt: null, farm: { ownerId: userId, deletedAt: null } },
        },
    });
    return events.map(irrigationResponse);
}

async function listOwnedPlotRecords(userId) {
    return prisma().plot.findMany({
        where: { deletedAt: null, farm: { ownerId: userId, deletedAt: null } },
        include: plotInclude,
        orderBy: { createdAt: "asc" },
        take: 100,
    });
}

async function upsertAlert(alert) {
    return prisma().alert.upsert({
        where: { id: alert.id },
        update: { type: alert.type, severity: alert.severity, message: alert.message },
        create: {
            id: alert.id,
            plotId: alert.plotId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            source: "RULE_ENGINE",
        },
    });
}

async function upsertAlerts(alerts) {
    return prisma().$transaction(alerts.map((alert) => prisma().alert.upsert({
        where: { id: alert.id },
        update: { type: alert.type, severity: alert.severity, message: alert.message },
        create: {
            id: alert.id,
            plotId: alert.plotId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            source: "RULE_ENGINE",
        },
    })), { timeout: 30000 });
}

async function readAlertIds(userId) {
    const reads = await prisma().alertRead.findMany({
        where: { userId, alert: { plot: { farm: { ownerId: userId } } } },
        select: { alertId: true },
    });
    return new Set(reads.map((read) => read.alertId));
}

async function markAlertRead(alertId, userId) {
    const alert = await prisma().alert.findFirst({
        where: { id: alertId, plot: { farm: { ownerId: userId } } },
    });
    if (!alert) return false;
    await prisma().alertRead.upsert({
        where: { alertId_userId: { alertId, userId } },
        update: { readAt: new Date() },
        create: { alertId, userId },
    });
    return true;
}

module.exports = {
    prisma,
    disconnect,
    numberValue,
    dateOnly,
    plotResponse,
    sensorResponse,
    irrigationResponse,
    findPlotById,
    findOwnedPlot,
    listOwnedPlots,
    listOwnedPlotsPage,
    createPlot,
    updateOwnedPlot,
    deleteOwnedPlot,
    findUserById,
    findUserByMobile,
    createUser,
    findLatestReading,
    findReadingForDay,
    listSensorReadings,
    ensureSimulatorDevice,
    findDeviceByKey,
    findOwnedDevice,
    provisionDeviceCredential,
    listOwnedDeviceHealth,
    ingestDeviceReadings,
    upsertSensorReading,
    findIrrigationOnDay,
    createIrrigationEvent,
    listIrrigationEvents,
    countIrrigationEvents,
    listOwnedIrrigationEvents,
    listOwnedPlotRecords,
    upsertAlert,
    upsertAlerts,
    readAlertIds,
    markAlertRead,
};
