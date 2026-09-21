// -----------------------------------------------------------------------------
// backend/utils/mlFeatureBuilder.js
//
// Pure JS ML Feature Builder for KhetAI Irrigation Advisor.
// Transforms raw plot, sensor telemetry, weather, and irrigation logs into a flat
// numeric feature vector suitable for machine learning dataset construction.
// -----------------------------------------------------------------------------

const { kcForCropAgeMonths, soilProfile, cropAgeInMonths, estimateET0 } = require("./aiEngine");
const { getIrrigationEfficiency } = require("./irrigationFeatures");

const SOIL_TYPE_MAP = {
  Sandy: 0,
  "Sandy Loam": 1,
  Loam: 2,
  "Clay Loam": 3,
  Clay: 4,
};

const IRRIGATION_METHOD_MAP = {
  Drip: 0,
  MicroSprinkler: 1,
  Sprinkler: 2,
  Furrow: 3,
  Flood: 4,
  Surface: 5,
};

const SENSOR_QUALITY_MAP = {
  VALID: 1,
  STALE: 0.5,
  OUT_OF_RANGE: 0,
  UNRELIABLE: 0,
  MISSING: 0,
};

const WEATHER_PROVENANCE_MAP = {
  LIVE_API: 2,
  CACHED_API: 1,
  FALLBACK: 0,
};

const SENSOR_PROVENANCE_MAP = {
  PHYSICAL_HARDWARE: 2,
  SIMULATED: 1,
  SYNTHETIC: 1,
  NONE: 0,
};

function encodeGrowthStage(ageMonths) {
  if (ageMonths <= 2) return 0; // Germination
  if (ageMonths <= 4) return 1; // Tillering
  if (ageMonths <= 9) return 2; // Grand Growth
  return 3; // Maturity
}

function encodeSoilType(soilTypeStr) {
  if (!soilTypeStr) return SOIL_TYPE_MAP.Loam;
  const match = Object.keys(SOIL_TYPE_MAP).find(
    (k) => k.toLowerCase() === String(soilTypeStr).trim().toLowerCase()
  );
  return match !== undefined ? SOIL_TYPE_MAP[match] : SOIL_TYPE_MAP.Loam;
}

function encodeIrrigationMethod(methodStr) {
  if (!methodStr) return IRRIGATION_METHOD_MAP.Furrow;
  const match = Object.keys(IRRIGATION_METHOD_MAP).find(
    (k) => String(methodStr).toLowerCase().includes(k.toLowerCase())
  );
  return match !== undefined ? IRRIGATION_METHOD_MAP[match] : IRRIGATION_METHOD_MAP.Furrow;
}

/**
  * Build a flat numeric ML feature vector from plot, sensor, weather, and optional history logs.
  */
function extractMlFeatures(plotInput = {}, sensorInput = null, weatherInput = null, historyLogsInput = []) {
  const plot = plotInput || {};
  const sensor = sensorInput || null;
  const weather = weatherInput || null;
  const historyLogs = Array.isArray(historyLogsInput) ? historyLogsInput : [];
  const plantingDate = plot.plantingDate || null;
  const cropAgeMonths = plantingDate ? cropAgeInMonths(plantingDate) : 6.0;
  const kc = kcForCropAgeMonths(cropAgeMonths);
  const growthStageCode = encodeGrowthStage(cropAgeMonths);

  // 2. Soil
  const soilTypeStr = plot.soilType || "Loam";
  const soilCode = encodeSoilType(soilTypeStr);
  const soil = soilProfile(soilTypeStr);
  const fieldCapacity = soil.fieldCapacity;
  const wiltingPoint = soil.wiltingPoint;
  const availableWaterCapacity = Number((fieldCapacity - wiltingPoint).toFixed(2));
  const infiltrationRate = soil.infiltrationRate;

  // 3. Plot
  const areaAcres = Number(plot.area || plot.areaAcres || 1.0);
  const methodStr = plot.irrigationMethod || "Furrow";
  const methodCode = encodeIrrigationMethod(methodStr);
  const efficiency = getIrrigationEfficiency(methodStr);

  // 4. Sensor
  const sm30 = sensor ? (sensor.soilMoisture30 ?? sensor.soilMoisturePct ?? 25.0) : 25.0;
  const sm60 = sensor ? (sensor.soilMoisture60 ?? sm30) : sm30;
  const soilTemp = sensor ? (sensor.soilTempC ?? sensor.soilTemperature ?? 28.0) : 28.0;
  const ambTemp = sensor ? (sensor.ambientTempC ?? sensor.ambientTemperature ?? 32.0) : 32.0;
  const sensorHumidity = sensor ? (sensor.ambientHumidityPct ?? sensor.humidityPct ?? 55.0) : 55.0;
  const sensorRain = sensor ? (sensor.rainfallMm ?? 0.0) : 0.0;
  const qualityStr = sensor ? (sensor.quality || "VALID") : "MISSING";
  const sensorQualityScore = SENSOR_QUALITY_MAP[qualityStr] ?? 0;
  const sensorProvStr = sensor ? (sensor.source || sensor.provenance || "SIMULATED") : "NONE";
  const sensorProvenanceScore = SENSOR_PROVENANCE_MAP[sensorProvStr] ?? 0;

  let freshnessHours = 999;
  if (sensor && sensor.measuredAt) {
    freshnessHours = Math.max(0, (Date.now() - new Date(sensor.measuredAt).getTime()) / (1000 * 60 * 60));
  } else if (sensor) {
    freshnessHours = 0;
  }

  // 5. Weather
  let et0 = 5.0;
  let tMax = 32.0;
  let tMin = 22.0;
  let weatherHumidity = 55.0;
  let rainMm = 0.0;
  let rainProb = 0.0;
  let windSpeed = 10.0;
  let weatherProvStr = "FALLBACK";

  if (weather) {
    const today = (weather.days && weather.days[0]) ? weather.days[0] : weather;
    tMax = today.tempMax ?? today.tempMaxC ?? tMax;
    tMin = today.tempMin ?? today.tempMinC ?? tMin;
    weatherHumidity = today.humidity ?? today.humidityPct ?? weatherHumidity;
    rainMm = today.rainMm ?? today.rainfallMm ?? rainMm;
    rainProb = today.rainProbability ?? today.rainProb ?? rainProb;
    windSpeed = today.windSpeed ?? windSpeed;
    et0 = today.et0 ?? estimateET0({ tempMaxC: tMax, tempMinC: tMin, humidityPct: weatherHumidity });
    weatherProvStr = weather.provenance || today.provenance || "FALLBACK";
  }
  const weatherProvenanceScore = WEATHER_PROVENANCE_MAP[weatherProvStr] ?? 0;

  // 6. Irrigation History
  let lastVolumeM3 = 0;
  let recentCount30Days = 0;
  if (Array.isArray(historyLogs) && historyLogs.length > 0) {
    const sorted = [...historyLogs].sort((a, b) => new Date(b.date || b.occurredAt) - new Date(a.date || a.occurredAt));
    lastVolumeM3 = sorted[0].waterAppliedM3 ?? sorted[0].waterVolumeM3 ?? 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    recentCount30Days = sorted.filter((l) => new Date(l.date || l.occurredAt) >= thirtyDaysAgo).length;
  }

  // Complete numeric feature vector
  const vector = [
    Number(cropAgeMonths.toFixed(2)),
    Number(kc.toFixed(2)),
    growthStageCode,
    soilCode,
    fieldCapacity,
    wiltingPoint,
    availableWaterCapacity,
    infiltrationRate,
    areaAcres,
    methodCode,
    Number(efficiency.toFixed(2)),
    Number(sm30.toFixed(2)),
    Number(sm60.toFixed(2)),
    Number(soilTemp.toFixed(2)),
    Number(ambTemp.toFixed(2)),
    Number(sensorHumidity.toFixed(2)),
    Number(sensorRain.toFixed(2)),
    sensorQualityScore,
    Number(freshnessHours.toFixed(1)),
    sensorProvenanceScore,
    Number(et0.toFixed(2)),
    Number(tMax.toFixed(2)),
    Number(tMin.toFixed(2)),
    Number(weatherHumidity.toFixed(2)),
    Number(rainMm.toFixed(2)),
    Number(rainProb.toFixed(2)),
    Number(windSpeed.toFixed(2)),
    weatherProvenanceScore,
    Number(lastVolumeM3.toFixed(2)),
    recentCount30Days,
  ];

  const featureNames = [
    "cropAgeMonths",
    "kc",
    "growthStageCode",
    "soilCode",
    "fieldCapacity",
    "wiltingPoint",
    "availableWaterCapacity",
    "infiltrationRate",
    "areaAcres",
    "irrigationMethodCode",
    "efficiency",
    "soilMoisture30",
    "soilMoisture60",
    "soilTempC",
    "ambientTempC",
    "sensorHumidityPct",
    "sensorRainfallMm",
    "sensorQualityScore",
    "sensorFreshnessHours",
    "sensorProvenanceScore",
    "et0",
    "tempMax",
    "tempMin",
    "weatherHumidity",
    "rainMm",
    "rainProbability",
    "windSpeed",
    "weatherProvenanceScore",
    "lastIrrigationWaterVolumeM3",
    "recentCount30Days",
  ];

  const namedFeatures = {};
  featureNames.forEach((name, idx) => {
    namedFeatures[name] = vector[idx];
  });

  return {
    vector,
    featureNames,
    namedFeatures,
    sensorProvenance: sensorProvStr,
    weatherProvenance: weatherProvStr,
  };
}

module.exports = {
  extractMlFeatures,
  encodeGrowthStage,
  encodeSoilType,
  encodeIrrigationMethod,
  SOIL_TYPE_MAP,
  IRRIGATION_METHOD_MAP,
  SENSOR_QUALITY_MAP,
  WEATHER_PROVENANCE_MAP,
  SENSOR_PROVENANCE_MAP,
};
