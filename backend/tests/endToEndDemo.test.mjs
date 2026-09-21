process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../server.js";

const isPgAvailable = process.env.RUN_PG_INTEGRATION_TESTS === "1";
const pgSuite = isPgAvailable ? describe : describe.skip;

describe("Phase 8 — End-to-End API Contracts & Security Hardening (Unit/Contract Tests)", () => {
  it("1. GET /api/health and GET /api/ready return valid status responses", async () => {
    const resHealth = await request(app).get("/api/health");
    expect(resHealth.status).toBe(200);
    expect(resHealth.body.status).toBe("ok");

    const resReady = await request(app).get("/api/ready");
    // Returns 200 when DB connected, 503 when DB disconnected - never unhandled crash
    expect([200, 503]).toContain(resReady.status);
    expect(resReady.body).toHaveProperty("status");
  });

  it("2. GET /api/ml/status returns transparent ML model status", async () => {
    const res = await request(app).get("/api/ml/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(["EXPERIMENTAL_MODEL_TRAINED", "INSUFFICIENT_HISTORICAL_DATA"]).toContain(res.body.data.status);
    expect(res.body.data.activeEngine).toBe("AGRONOMIC_BASELINE");
  });

  it("3. Unauthenticated requests to protected routes return 401 Unauthorized", async () => {
    const resPlots = await request(app).get("/api/plots");
    expect(resPlots.status).toBe(401);

    const resSensors = await request(app).get("/api/sensors/some_plot");
    expect(resSensors.status).toBe(401);

    const resWeather = await request(app).get("/api/weather/some_plot");
    expect(resWeather.status).toBe(401);

    const resAdvisory = await request(app).get("/api/advisory/some_plot");
    expect(resAdvisory.status).toBe(401);

    const resAlerts = await request(app).get("/api/alerts");
    expect(resAlerts.status).toBe(401);

    const resMlPredict = await request(app).post("/api/ml/predict").send({ plotId: "p1" });
    expect(resMlPredict.status).toBe(401);
  });

  it("4. Registration endpoint rejects invalid payloads with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Short", mobile: "123", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request data.");
  });

  it("5. Scenario endpoint rejects missing plotId or scenario with 400 Bad Request", async () => {
    const validTestToken = jwt.sign(
      { id: "usr_test", name: "Test Farmer", mobile: "9999999999" },
      process.env.JWT_SECRET || "khetai-dev-secret-change-in-production"
    );
    const res = await request(app)
      .post("/api/demo/scenario")
      .set("Authorization", `Bearer ${validTestToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("plotId and scenario are required.");
  });
});

pgSuite("Phase 8 — End-to-End PostgreSQL Integration & Cross-User Security Audit", () => {
  let userAToken = "";
  let plotAId = "";
  let userBToken = "";
  let plotBId = "";

  it("6. Seed demo farmer account and environment", async () => {
    const res = await request(app).post("/api/demo/seed");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  it("7. User registration, plot creation, and isolation", async () => {
    const mobA = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regA = await request(app).post("/api/auth/register").send({
      name: "Farmer A",
      mobile: mobA,
      password: "UserAPass123!",
    });
    expect(regA.status).toBe(201);
    userAToken = regA.body.token;

    const mobB = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regB = await request(app).post("/api/auth/register").send({
      name: "Farmer B",
      mobile: mobB,
      password: "UserBPass123!",
    });
    expect(regB.status).toBe(201);
    userBToken = regB.body.token;

    const plotResA = await request(app)
      .post("/api/plots")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ name: "Plot A", area: 2.0, soilType: "Loam", plantingDate: "2026-01-01" });
    expect(plotResA.status).toBe(201);
    plotAId = plotResA.body.plot.id;

    const plotResB = await request(app)
      .post("/api/plots")
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ name: "Plot B", area: 1.5, soilType: "Clay", plantingDate: "2026-02-01" });
    expect(plotResB.status).toBe(201);
    plotBId = plotResB.body.plot.id;
  });

  it("8. Cross-User Security Audit: User A cannot read or modify User B's plot", async () => {
    const getRes = await request(app)
      .get(`/api/plots/${plotBId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(getRes.status).toBe(404);

    const logRes = await request(app)
      .post(`/api/advisory/${plotBId}/log`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ durationHours: 2, waterAppliedM3: 100 });
    expect(logRes.status).toBe(404);
  });
});
