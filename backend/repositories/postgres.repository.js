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
    const where = { plotId };
    if (options.quality) {
        where.quality = options.quality;
    } else if (options.excludeInvalid) {
        where.quality = { in: ["VALID", "SUSPECT"] };
    }
    const readings = await prisma().sensorReading.findMany({
        where,
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
    const now = Date.now();
    return devices.map((device) => {
        let computedHealth = device.healthStatus || "UNKNOWN";
        if (!device.isActive) {
            computedHealth = "OFFLINE";
        } else if (device.lastSeenAt) {
            const diffHours = (now - device.lastSeenAt.getTime()) / (1000 * 60 * 60);
            if (diffHours > 168) {
                computedHealth = "OFFLINE";
            } else if (diffHours > 24) {
                computedHealth = "STALE";
            } else if (device.batteryPct !== null && Number(device.batteryPct) < 15) {
                computedHealth = "DEGRADED";
            } else if (computedHealth === "UNKNOWN") {
                computedHealth = "ONLINE";
            }
        }
        return {
            ...device,
            healthStatus: computedHealth,
            batteryPct: numberValue(device.batteryPct),
            lastSeenAt: device.lastSeenAt?.toISOString() || null,
            lastIngestedAt: device.lastIngestedAt?.toISOString() || null,
        };
    });
}

async function ingestDeviceReadings(device, records, deviceState) {
    return prisma().$transaction(async (tx) => {
        let accepted = 0;
        let duplicates = 0;
        const quality = { VALID: 0, SUSPECT: 0, INVALID: 0 };
        let hasInvalid = false;

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

            if (record.quality === "INVALID") hasInvalid = true;

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

        let computedHealthStatus = "ONLINE";
        if (deviceState.batteryPct !== undefined && deviceState.batteryPct < 15) {
            computedHealthStatus = "DEGRADED";
        } else if (hasInvalid) {
            computedHealthStatus = "DEGRADED";
        }

        await tx.sensorDevice.update({
            where: { id: device.id },
            data: {
                lastSeenAt: new Date(),
                lastIngestedAt: new Date(),
                batteryPct: deviceState.batteryPct ?? undefined,
                firmware: deviceState.firmware ?? undefined,
                connected: true,
                healthStatus: computedHealthStatus,
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

async function upsertDemoScenarioReading(eventKey, readingData) {
    return prisma().sensorReading.upsert({
        where: { eventKey },
        update: {
            measuredAt: readingData.measuredAt,
            soilMoisture30: readingData.soilMoisture30,
            soilMoisture60: readingData.soilMoisture60,
            soilTemperature: readingData.soilTemperature,
            ambientTemperature: readingData.ambientTemperature,
            humidityPct: readingData.humidityPct,
            rainfallMm: readingData.rainfallMm ?? null,
            quality: readingData.quality,
            qualityReason: readingData.qualityReason ?? null,
            provenance: "SIMULATED",
        },
        create: readingData,
    });
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

async function getCachedWeather(plotId, freshnessMinutes = 360) {
    try {
        const since = new Date(Date.now() - freshnessMinutes * 60 * 1000);
        const records = await prisma().weatherData.findMany({
            where: {
                plotId,
                kind: "FORECAST",
                fetchedAt: { gte: since },
            },
            orderBy: { validAt: "asc" },
            take: 14,
        });
        if (!records || records.length === 0) return null;

        const days = records.map((r) => ({
            date: dateOnly(r.validAt),
            tempMax: numberValue(r.temperatureMax),
            tempMin: numberValue(r.temperatureMin),
            humidity: numberValue(r.humidityPct) ?? 60,
            rainProbability: numberValue(r.rainProbability) ?? 0,
            rainMm: numberValue(r.rainfallMm) ?? 0,
            windSpeed: numberValue(r.windSpeed) ?? 0,
            et0: r.rawPayload?.et0 != null ? numberValue(r.rawPayload.et0) : null,
            condition: r.rawPayload?.condition || (r.rainProbability > 55 ? "Rain likely" : r.rainProbability > 25 ? "Partly cloudy" : "Clear"),
            source: r.provider === "OPEN_METEO" ? "open-meteo" : "simulated",
            provenance: "CACHED_API",
            fetchedAt: r.fetchedAt.toISOString(),
        }));

        return { days, provenance: "CACHED_API", fetchedAt: records[0].fetchedAt.toISOString() };
    } catch (err) {
        return null;
    }
}

async function saveCachedWeather(plotId, provider, lat, lng, days, rawPayload = {}, provenance = "LIVE_API") {
    try {
        const now = new Date();
        const operations = days.map((day) => {
            const validAt = new Date(`${day.date}T00:00:00.000Z`);
            const dbProvenance = provenance === "LIVE_API" || provenance === "LIVE" ? "LIVE" : provenance === "FALLBACK" ? "FALLBACK" : "LIVE";
            return prisma().weatherData.upsert({
                where: {
                    plotId_kind_provider_validAt: {
                        plotId,
                        kind: "FORECAST",
                        provider,
                        validAt,
                    },
                },
                update: {
                    latitude: lat,
                    longitude: lng,
                    fetchedAt: now,
                    temperatureMax: day.tempMax,
                    temperatureMin: day.tempMin,
                    humidityPct: day.humidity,
                    rainfallMm: day.rainMm,
                    rainProbability: day.rainProbability,
                    windSpeed: day.windSpeed ?? null,
                    rawPayload: { ...rawPayload, et0: day.et0, condition: day.condition },
                    provenance: dbProvenance,
                },
                create: {
                    id: generateId("wtr"),
                    plotId,
                    kind: "FORECAST",
                    provider,
                    latitude: lat,
                    longitude: lng,
                    validAt,
                    fetchedAt: now,
                    temperatureMax: day.tempMax,
                    temperatureMin: day.tempMin,
                    humidityPct: day.humidity,
                    rainfallMm: day.rainMm,
                    rainProbability: day.rainProbability,
                    windSpeed: day.windSpeed ?? null,
                    rawPayload: { ...rawPayload, et0: day.et0, condition: day.condition },
                    provenance: dbProvenance,
                },
            });
        });

        await prisma().$transaction(operations, { timeout: 30000 });
        return true;
    } catch (err) {
        return false;
    }
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
    getCachedWeather,
    saveCachedWeather,
    upsertDemoScenarioReading,
};
