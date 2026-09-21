import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const enabled = process.env.RUN_PG_INTEGRATION_TESTS === "1";
const suite = enabled ? describe : describe.skip;
let repository;
let owner;
let otherUser;
let plot;
let app;
let device;
const deviceSecret = "integration-device-secret";

function requireSafeTestDatabase() {
    const url = process.env.DATABASE_URL_TEST;
    if (!url) throw new Error("DATABASE_URL_TEST is required when RUN_PG_INTEGRATION_TESTS=1.");
    if (process.env.NODE_ENV === "production") throw new Error("PostgreSQL integration tests cannot run in production.");
    if (url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL.");

    const parsed = new URL(url);
    if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
        throw new Error("DATABASE_URL_TEST must target localhost, 127.0.0.1, or ::1.");
    }
    if (!['/khetai_test', '/khetai_test/'].includes(parsed.pathname)) {
        throw new Error("DATABASE_URL_TEST must target the khetai_test database.");
    }
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";
}

suite("PostgreSQL integration", () => {
    beforeAll(async () => {
        requireSafeTestDatabase();
        repository = await import("../repositories/postgres.repository.js");
        app = (await import("../server.js")).app;
        const suffix = Date.now().toString();
        owner = await repository.createUser({
            name: "Integration Owner",
            mobile: `900${suffix.slice(-7)}`,
            passwordHash: "integration-test-hash",
        });
        otherUser = await repository.createUser({
            name: "Integration Other",
            mobile: `901${suffix.slice(-7)}`,
            passwordHash: "integration-test-hash",
        });
        plot = await repository.createPlot(owner.id, {
            name: "Integration Plot",
            area: 1.25,
            crop: "Sugarcane",
            variety: "Co 86032",
            plantingDate: "2026-01-01",
            soilType: "Loam",
            lat: 16.5,
            lng: 75.1,
        });
        device = await repository.ensureSimulatorDevice(plot.id);
        await repository.provisionDeviceCredential(device.id, owner.id, await bcrypt.hash(deviceSecret, 12));
    });

    afterAll(async () => {
        if (!repository || !owner) return;
        const prisma = repository.prisma();
        await prisma.plot.deleteMany({ where: { id: plot?.id } });
        await prisma.farm.deleteMany({ where: { ownerId: { in: [owner.id, otherUser?.id].filter(Boolean) } } });
        await prisma.user.deleteMany({ where: { id: { in: [owner.id, otherUser?.id].filter(Boolean) } } });
        await repository.disconnect();
    });

    it("creates users, roles, farms, crops, and plots", async () => {
        const stored = await repository.findOwnedPlot(plot.id, owner.id);
        expect(stored?.farm.ownerId).toBe(owner.id);
        expect(stored?.crop.name).toBe("Sugarcane");
        expect(await repository.findOwnedPlot(plot.id, otherUser.id)).toBeNull();
    });

    it("isolates sensor devices/readings and irrigation events", async () => {
        await repository.ensureSimulatorDevice(plot.id);
        const reading = await repository.upsertSensorReading({
            id: `integration-reading-${Date.now()}`,
            plotId: plot.id,
            deviceId: `legacy-device-${plot.id}`,
            eventKey: `integration-reading-${Date.now()}`,
            measuredAt: new Date(),
            soilMoisture30: 22,
            soilMoisture60: 24,
            soilTemperature: 27,
            ambientTemperature: 30,
            humidityPct: 65,
            quality: "VALID",
            provenance: "SIMULATED",
        });
        expect(reading.source).toBe("SIMULATED");

        const event = await repository.createIrrigationEvent(plot.id, owner.id, {
            durationHours: 1.5,
            waterAppliedM3: 50,
        });
        expect(event.waterAppliedM3).toBe(50);
    });

    it("stores advisory, model, fertigation, yield, alert, and read-state records", async () => {
        const prisma = repository.prisma();
        const advisory = await prisma.advisory.create({
            data: {
                plotId: plot.id,
                recommendation: "IRRIGATE_TODAY",
                reasons: ["low moisture"],
                inputSnapshot: { source: "integration" },
                outputSnapshot: { waterVolumeM3: 50 },
                ruleVersion: "integration-1",
            },
        });
        await prisma.fertilizerRecommendation.create({
            data: { plotId: plot.id, advisoryId: advisory.id, assumptions: {}, quantities: { ureaKg: 1 } },
        });
        await prisma.yieldPrediction.create({
            data: { plotId: plot.id, predictedTPerHa: 100, lowTPerHa: 90, highTPerHa: 110, inputSnapshot: {}, modelVersion: "integration-1" },
        });
        await prisma.modelPrediction.create({
            data: { plotId: plot.id, advisoryId: advisory.id, predictionType: "IRRIGATION", modelVersion: "integration-1", inputSnapshot: {}, outputSnapshot: {} },
        });
        await repository.upsertAlert({ id: `integration-alert-${Date.now()}`, plotId: plot.id, type: "Test", severity: "low", message: "Test alert" });
        const alerts = await prisma.alert.findMany({ where: { plotId: plot.id } });
        expect(alerts.length).toBeGreaterThan(0);
        expect(await repository.markAlertRead(alerts[0].id, owner.id)).toBe(true);
        expect((await repository.readAlertIds(owner.id)).has(alerts[0].id)).toBe(true);
    });

    it("authenticates devices, validates readings, deduplicates, and reports health", async () => {
        const payload = {
            eventId: `integration-device-event-${Date.now()}`,
            measuredAt: new Date().toISOString(),
            measurements: [{ type: "soil_moisture_30", value: 24.5, unit: "percent" }],
            batteryPct: 82,
            firmware: "integration-1",
        };
        const headers = { "X-Device-Key": device.deviceKey, "X-Device-Secret": deviceSecret };
        const accepted = await request(app).post("/api/iot/readings").set(headers).send(payload);
        expect(accepted.status).toBe(202);
        const duplicate = await request(app).post("/api/iot/readings").set(headers).send(payload);
        expect(duplicate.status).toBe(202);
        expect(duplicate.body.duplicates).toBe(1);

        const outOfRange = await request(app).post("/api/iot/readings").set(headers).send({
            ...payload,
            eventId: `${payload.eventId}-out-of-range`,
            measurements: [{ type: "humidity", value: 120, unit: "percent" }],
        });
        expect(outOfRange.status).toBe(202);
        expect(outOfRange.body.quality.INVALID).toBe(1);

        const malformedUnit = await request(app).post("/api/iot/readings").set(headers).send({
            ...payload,
            eventId: `${payload.eventId}-malformed`,
            measurements: [{ type: "humidity", value: 50, unit: "mm" }],
        });
        expect(malformedUnit.status).toBe(400);
        const unauthorized = await request(app).post("/api/iot/readings").set({ ...headers, "X-Device-Secret": "wrong" }).send(payload);
        expect(unauthorized.status).toBe(401);

        const token = jwt.sign({ id: owner.id }, process.env.JWT_SECRET);
        const health = await request(app).get(`/api/iot/devices/health?plotId=${plot.id}`).set("Authorization", `Bearer ${token}`);
        expect(health.status).toBe(200);
        expect(health.body.devices[0].healthStatus).toBe("ONLINE");
    });
});
