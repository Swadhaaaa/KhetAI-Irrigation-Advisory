require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const plotsRoutes = require("./routes/plots.routes");
const weatherRoutes = require("./routes/weather.routes");
const sensorsRoutes = require("./routes/sensors.routes");
const { router: advisoryRoutes } = require("./routes/advisory.routes");
const fertigationRoutes = require("./routes/fertigation.routes");
const yieldRoutes = require("./routes/yield.routes");
const alertsRoutes = require("./routes/alerts.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const iotRoutes = require("./routes/iot.routes");
const demoRoutes = require("./routes/demo.routes");
const mlRoutes = require("./routes/ml.routes");
const repository = require("./repositories/postgres.repository");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "32kb" }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

app.use((req, res, next) => {
  const requestId = typeof req.headers["x-request-id"] === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(req.headers["x-request-id"])
    ? req.headers["x-request-id"]
    : crypto.randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(JSON.stringify({
      type: "request",
      requestId,
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    }));
  });
  next();
});

function validateRuntimeConfig() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured before starting the server.");
  }
  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production.");
  }
  if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must be configured in production.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured in production.");
  }
}

// TEST
app.get("/test", (req, res) => {
  res.send("BACKEND IS WORKING");
});

// HEALTH
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is working",
    time: new Date().toISOString()
  });
});

app.get("/api/ready", async (req, res) => {
  try {
    await repository.prisma().$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "connected", time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      error: "Database unavailable or not configured",
      time: new Date().toISOString(),
    });
  }
});

// API
app.use("/api/auth", authRoutes);
app.use("/api/plots", plotsRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/sensors", sensorsRoutes);
app.use("/api/advisory", advisoryRoutes);
app.use("/api/fertigation", fertigationRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/ml", mlRoutes);

// FRONTEND
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(express.static(FRONTEND_DIR));

// Unknown API
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl
  });
});

// Frontend pages
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Error
app.use((err, req, res, next) => {
  const code = err?.code || "INTERNAL_ERROR";
  const status = code === "P2002" || code === "DUPLICATE_READING_CONFLICT" ? 409 : code === "P2003" || code === "P2025" ? 404 : code.startsWith("INVALID_SENSOR_") ? 400 : 500;
  const safeMessage = String(err?.message || "").replace(/(postgres(?:ql)?:\/\/[^\s:]+):[^\s@]+@/gi, "$1:***@");
  console.error(JSON.stringify({ type: "error", requestId: req.requestId, code, status, message: safeMessage }));
  if (res.headersSent) return next(err);
  res.status(status).json({
    error: status === 409 ? "A record with these details already exists." : status === 404 ? "Requested resource was not found." : status === 400 ? "Invalid sensor data." : "Something went wrong on the server.",
  });
});

if (require.main === module) {
  validateRuntimeConfig();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  const shutdown = async (signal) => {
    console.log(JSON.stringify({ type: "shutdown", signal }));
    server.close(async () => {
      await repository.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { app, validateRuntimeConfig };
