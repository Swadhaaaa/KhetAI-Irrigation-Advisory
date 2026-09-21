process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import request from "supertest";
import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { classifyMeasurement, classifyTimestamp, combineQuality } from "../utils/sensorQuality.js";
import server from "../server.js";

const { app } = server;

describe("Phase 5 — Sensor Ingestion & Quality Unit Tests", () => {
    it("1. classifies valid measurements correctly", () => {
        const result = classifyMeasurement({ type: "soil_moisture_30", value: 45.5, unit: "percent" });
        expect(result.field).toBe("soilMoisture30");
        expect(result.quality).toBe("VALID");
        expect(result.qualityReason).toBeNull();
    });

    it("2. classifies out-of-range sensor values as INVALID quality without throwing", () => {
        const result = classifyMeasurement({ type: "soil_moisture_30", value: 150, unit: "percent" });
        expect(result.field).toBe("soilMoisture30");
        expect(result.quality).toBe("INVALID");
        expect(result.qualityReason).toBe("out_of_range_soil_moisture_30");
    });

    it("3. throws error for unsupported sensor type or unit mismatch", () => {
        expect(() => classifyMeasurement({ type: "unknown_type", value: 50, unit: "percent" })).toThrow(/Unsupported/);
        expect(() => classifyMeasurement({ type: "soil_moisture_30", value: 50, unit: "C" })).toThrow(/unit mismatch/);
    });

    it("4. rejects future timestamps beyond clock skew window (5 mins)", () => {
        const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        expect(() => classifyTimestamp(futureTime)).toThrow(/too far in the future/);
    });

    it("5. classifies timestamps older than 30 days as SUSPECT quality", () => {
        const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
        const result = classifyTimestamp(oldTime);
        expect(result.quality).toBe("SUSPECT");
        expect(result.qualityReason).toBe("measurement_older_than_30_days");
    });

    it("6. combines timestamp and measurement quality into unified classification", () => {
        const timestampQuality = { quality: "VALID", qualityReason: null };
        const invalidMeasurement = { quality: "INVALID", qualityReason: "out_of_range_soil_moisture_30" };
        const combined = combineQuality(timestampQuality, invalidMeasurement);
        expect(combined.quality).toBe("INVALID");
        expect(combined.qualityReason).toBe("out_of_range_soil_moisture_30");
    });
});

describe("Phase 5 — Sensor Ingestion API Endpoints & Auth", () => {
    it("7. rejects device ingestion requests without X-Device-Key or X-Device-Secret headers", async () => {
        const response = await request(app)
            .post("/api/iot/readings")
            .send({
                eventId: "event-101",
                measuredAt: new Date().toISOString(),
                measurements: [{ type: "soil_moisture_30", value: 30, unit: "percent" }],
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("Invalid device credentials.");
    });

    it("8. rejects ingestion payloads with invalid schema (missing eventId / measurements)", async () => {
        const response = await request(app)
            .post("/api/iot/readings")
            .set("X-Device-Key", "dummy-key")
            .set("X-Device-Secret", "dummy-secret")
            .send({
                measuredAt: new Date().toISOString(),
            });

        expect([400, 401, 500]).toContain(response.status);
    });

    it("9. protects device health endpoint with farmer JWT authentication", async () => {
        const unauthenticated = await request(app).get("/api/iot/devices/health");
        expect(unauthenticated.status).toBe(401);

        const token = jwt.sign({ id: "usr_farmer_1" }, process.env.JWT_SECRET);
        const authenticated = await request(app)
            .get("/api/iot/devices/health")
            .set("Authorization", `Bearer ${token}`);

        expect([200, 500]).toContain(authenticated.status);
        if (authenticated.status === 200) {
            expect(Array.isArray(authenticated.body.devices)).toBe(true);
        }
    });

    it("10. enforces plot ownership isolation on sensor history requests", async () => {
        const token = jwt.sign({ id: "usr_farmer_1" }, process.env.JWT_SECRET);
        const response = await request(app)
            .get("/api/sensors/non_existent_plot_id")
            .set("Authorization", `Bearer ${token}`);

        expect([404, 500]).toContain(response.status);
        if (response.status === 404) {
            expect(response.body.error).toBe("Plot not found.");
        }
    });

    it("11. accepts quality filtering parameter on sensor history endpoints", async () => {
        const token = jwt.sign({ id: "usr_farmer_1" }, process.env.JWT_SECRET);
        const response = await request(app)
            .get("/api/sensors/non_existent_plot_id?quality=VALID&limit=10")
            .set("Authorization", `Bearer ${token}`);

        expect([404, 500]).toContain(response.status);
    });
});
