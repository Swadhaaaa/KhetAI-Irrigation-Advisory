require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
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
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    error: "Something went wrong on the server."
  });
});

if (require.main === module) {
  validateRuntimeConfig();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, validateRuntimeConfig };
