process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-at-least-32-characters";

import request from "supertest";
import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import server from "../server.js";

const { app } = server;

describe("API hardening", () => {
  it("returns a health response without authentication", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("rejects weak registration data with structured validation errors", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Farmer", mobile: "123", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request data.");
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it("protects plot data with authentication", async () => {
    const response = await request(app).get("/api/plots");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Authorization/);
  });

  it("rejects malformed irrigation values instead of applying defaults", async () => {
    const token = jwt.sign({ id: "usr_test", name: "Test Farmer", mobile: "9999999999" }, process.env.JWT_SECRET);
    const response = await request(app)
      .post("/api/advisory/plot_missing/log")
      .set("Authorization", `Bearer ${token}`)
      .send({ durationHours: -1, waterAppliedM3: "not-a-number" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request data.");
  });
});