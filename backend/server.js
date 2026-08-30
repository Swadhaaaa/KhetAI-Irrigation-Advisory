require("dotenv").config();
const express = require("express");
const cors = require("cors");
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

app.use(cors());
app.use(express.json());

// TEST ROUTE — put this BEFORE everything else
app.get("/api/health", (req, res) => {
  console.log("HEALTH ROUTE HIT");
  res.status(200).json({
    status: "ok",
    message: "Backend is working",
    time: new Date().toISOString()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/plots", plotsRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/sensors", sensorsRoutes);
app.use("/api/advisory", advisoryRoutes);
app.use("/api/fertigation", fertigationRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Frontend
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(express.static(FRONTEND_DIR));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "API endpoint not found",
      path: req.path
    });
  }

  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Something went wrong on the server."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("🌾 Sugarcane Irrigation Advisory");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("=================================");
});
