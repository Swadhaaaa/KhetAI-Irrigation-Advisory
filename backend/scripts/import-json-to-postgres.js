require("dotenv").config();

const db = require("../db");
const { createPrismaClient } = require("../prisma/client");

function dateOrNow(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date in JSON data: ${value}`);
    return date;
}

function cropIdFor(plot) {
    const key = `${plot.crop || "Sugarcane"}:${plot.variety || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `legacy-crop-${key || "sugarcane"}`;
}

async function importData() {
    const source = db.readDB();
    const { prisma, pool } = createPrismaClient();
    const report = {
        users: 0,
        farms: 0,
        crops: 0,
        plots: 0,
        devices: 0,
        sensorReadings: 0,
        irrigationEvents: 0,
        alertMarkersSkipped: 0,
    };

    try {
        await prisma.$transaction(async (tx) => {
            const farmByUserId = new Map();

            for (const user of source.users || []) {
                await tx.user.upsert({
                    where: { id: user.id },
                    update: {
                        name: user.name,
                        mobile: user.mobile,
                        village: user.village || null,
                        taluk: user.taluk || null,
                        district: user.district || null,
                        passwordHash: user.passwordHash,
                    },
                    create: {
                        id: user.id,
                        name: user.name,
                        mobile: user.mobile,
                        passwordHash: user.passwordHash,
                        village: user.village || null,
                        taluk: user.taluk || null,
                        district: user.district || null,
                        createdAt: dateOrNow(user.createdAt),
                        roles: { create: { role: "FARMER" } },
                    },
                });
                report.users += 1;

                const farmId = `legacy-farm-${user.id}`;
                await tx.farm.upsert({
                    where: { id: farmId },
                    update: {},
                    create: {
                        id: farmId,
                        ownerId: user.id,
                        name: `${user.name} Farm`,
                        address: [user.village, user.taluk, user.district].filter(Boolean).join(", ") || null,
                    },
                });
                farmByUserId.set(user.id, farmId);
                report.farms += 1;
            }

            const plotById = new Map();
            for (const plot of source.plots || []) {
                const farmId = farmByUserId.get(plot.userId);
                if (!farmId) throw new Error(`Plot ${plot.id} references missing user ${plot.userId}.`);
                const cropId = cropIdFor(plot);

                await tx.crop.upsert({
                    where: { id: cropId },
                    update: {},
                    create: {
                        id: cropId,
                        name: plot.crop || "Sugarcane",
                        variety: plot.variety || null,
                    },
                });
                report.crops += 1;

                await tx.plot.upsert({
                    where: { id: plot.id },
                    update: {
                        farmId,
                        cropId,
                        name: plot.name,
                        areaAcres: plot.area,
                        variety: plot.variety || null,
                        plantingDate: dateOrNow(plot.plantingDate),
                        soilType: plot.soilType,
                        latitude: plot.lat ?? null,
                        longitude: plot.lng ?? null,
                    },
                    create: {
                        id: plot.id,
                        farmId,
                        cropId,
                        name: plot.name,
                        areaAcres: plot.area,
                        plantingDate: dateOrNow(plot.plantingDate),
                        soilType: plot.soilType,
                        latitude: plot.lat ?? null,
                        longitude: plot.lng ?? null,
                        createdAt: dateOrNow(plot.createdAt),
                    },
                });
                plotById.set(plot.id, plot);
                report.plots += 1;

                await tx.soilProfile.create({
                    data: {
                        plotId: plot.id,
                        soilType: plot.soilType,
                        source: "legacy-json",
                        version: "legacy-1",
                        measuredAt: dateOrNow(plot.createdAt),
                    },
                });

                const deviceId = `legacy-device-${plot.id}`;
                await tx.sensorDevice.upsert({
                    where: { id: deviceId },
                    update: {},
                    create: {
                        id: deviceId,
                        plotId: plot.id,
                        deviceKey: deviceId,
                        name: "Development simulator",
                        connected: true,
                    },
                });
                report.devices += 1;
            }

            for (const reading of source.sensorReadings || []) {
                if (!plotById.has(reading.plotId)) throw new Error(`Sensor reading ${reading.id} references missing plot.`);
                await tx.sensorReading.upsert({
                    where: { eventKey: `legacy-reading-${reading.id}` },
                    update: {},
                    create: {
                        id: reading.id,
                        plotId: reading.plotId,
                        deviceId: `legacy-device-${reading.plotId}`,
                        eventKey: `legacy-reading-${reading.id}`,
                        measuredAt: dateOrNow(reading.date),
                        soilMoisture30: reading.soilMoisture30,
                        soilMoisture60: reading.soilMoisture60,
                        soilTemperature: reading.soilTempC,
                        ambientTemperature: reading.ambientTempC,
                        humidityPct: reading.ambientHumidityPct,
                        ndvi: reading.ndvi,
                        quality: "VALID",
                        provenance: "SIMULATED",
                        rawPayload: reading,
                    },
                });
                report.sensorReadings += 1;
            }

            for (const event of source.irrigationLogs || []) {
                if (!plotById.has(event.plotId)) throw new Error(`Irrigation log ${event.id} references missing plot.`);
                const actorId = source.users?.some((user) => user.id === event.loggedBy) ? event.loggedBy : null;
                await tx.irrigationEvent.upsert({
                    where: { eventKey: `legacy-irrigation-${event.id}` },
                    update: {},
                    create: {
                        id: event.id,
                        plotId: event.plotId,
                        actorId,
                        eventKey: `legacy-irrigation-${event.id}`,
                        occurredAt: dateOrNow(event.date),
                        durationHours: event.durationHours,
                        waterAppliedM3: event.waterAppliedM3,
                        source: event.loggedBy === "system-history" ? "SIMULATOR" : "FARMER",
                        createdAt: dateOrNow(event.date),
                    },
                });
                report.irrigationEvents += 1;
            }

            report.alertMarkersSkipped = (source.alerts || []).length;
        });

        console.log(JSON.stringify({ status: "ok", report }, null, 2));
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

importData().catch((error) => {
    console.error("JSON to PostgreSQL import failed:", error.message);
    process.exitCode = 1;
});
