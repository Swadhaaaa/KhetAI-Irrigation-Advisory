// Development-only sensor simulator. Every generated reading is persisted in
// PostgreSQL and marked SIMULATED so it cannot be confused with live devices.

const { generateId } = require("./idgen");
const { soilProfile } = require("./aiEngine");
const repository = require("../repositories/postgres.repository");

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function dayBounds(dateString) {
    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}

async function ensureTodayReading(plot) {
    const today = todayISO();
    const { start, end } = dayBounds(today);
    const existing = await repository.findReadingForDay(plot.id, start, end);
    if (existing) return repository.sensorResponse(existing);

    await repository.ensureSimulatorDevice(plot.id);
    const soil = soilProfile(plot.soilType);
    const last = await repository.findLatestReading(plot.id);

    let moisture30;
    if (!last) {
        moisture30 = soil.fieldCapacity - 2;
    } else {
        const lastDate = last.measuredAt.toISOString().slice(0, 10);
        const bounds = dayBounds(lastDate);
        const irrigatedRecently = Boolean(await repository.findIrrigationOnDay(plot.id, bounds.start, bounds.end));
        const naturalDrop = 0.8 + Math.random() * 0.9;
        moisture30 = irrigatedRecently
            ? Math.min(soil.fieldCapacity, Number(last.soilMoisture30) + 6 + Math.random() * 2)
            : Math.max(soil.wiltingPoint, Number(last.soilMoisture30) - naturalDrop);
    }

    return repository.upsertSensorReading({
        id: generateId("snr"),
        plotId: plot.id,
        deviceId: `legacy-device-${plot.id}`,
        eventKey: `sim-reading-${plot.id}-${today}`,
        measuredAt: new Date(),
        soilMoisture30: Number(moisture30.toFixed(1)),
        soilMoisture60: Number((moisture30 + 1.5 + Math.random()).toFixed(1)),
        soilTemperature: Number((26 + Math.random() * 4).toFixed(1)),
        ambientTemperature: Number((27 + Math.random() * 6).toFixed(1)),
        humidityPct: Math.round(55 + Math.random() * 30),
        ndvi: Number((0.55 + Math.random() * 0.3).toFixed(2)),
        quality: "VALID",
        provenance: "SIMULATED",
    });
}

async function getHistory(plotId, days = 14, options = {}) {
    return repository.listSensorReadings(plotId, days, options);
}

async function backfillHistory(plot, days = 14) {
    const soil = soilProfile(plot.soilType);
    const deviceId = `legacy-device-${plot.id}`;
    const prisma = repository.prisma();
    const readings = [];
    let moisture = soil.fieldCapacity - 3;

    await repository.ensureSimulatorDevice(plot.id);
    await prisma.$transaction(async (tx) => {
        for (let i = days; i >= 1; i -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);
            const irrigateEvent = i % 5 === 0;
            moisture = irrigateEvent
                ? Math.min(soil.fieldCapacity, moisture + 6 + Math.random() * 2)
                : Math.max(soil.wiltingPoint, moisture - (0.8 + Math.random() * 0.9));

            const reading = {
                id: generateId("snr"),
                plotId: plot.id,
                deviceId,
                eventKey: `sim-reading-${plot.id}-${dateStr}`,
                measuredAt: new Date(`${dateStr}T12:00:00.000Z`),
                soilMoisture30: Number(moisture.toFixed(1)),
                soilMoisture60: Number((moisture + 1.5 + Math.random()).toFixed(1)),
                soilTemperature: Number((26 + Math.random() * 4).toFixed(1)),
                ambientTemperature: Number((27 + Math.random() * 6).toFixed(1)),
                humidityPct: Math.round(55 + Math.random() * 30),
                ndvi: Number((0.55 + Math.random() * 0.3).toFixed(2)),
                quality: "VALID",
                provenance: "SIMULATED",
            };
            const saved = await tx.sensorReading.upsert({
                where: { eventKey: reading.eventKey },
                update: {},
                create: reading,
            });
            readings.push(repository.sensorResponse(saved));

            if (irrigateEvent) {
                await tx.irrigationEvent.upsert({
                    where: { eventKey: `sim-irrigation-${plot.id}-${dateStr}` },
                    update: {},
                    create: {
                        id: generateId("irr"),
                        plotId: plot.id,
                        eventKey: `sim-irrigation-${plot.id}-${dateStr}`,
                        occurredAt: new Date(`${dateStr}T12:00:00.000Z`),
                        durationHours: Number((1.5 + Math.random() * 2).toFixed(1)),
                        waterAppliedM3: Math.round(80 + Math.random() * 60),
                        source: "SIMULATOR",
                    },
                });
            }
        }
    }, { timeout: 120000 });

    return readings;
}

module.exports = { ensureTodayReading, getHistory, backfillHistory, todayISO };
