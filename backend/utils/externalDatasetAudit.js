// -----------------------------------------------------------------------------
// backend/utils/externalDatasetAudit.js
//
// Dataset Loader & Preprocessing Utility for the Zenodo Sugarcane Dataset
// (catboostsugarcane_yield_prediction_regularized.csv)
// -----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const DATASET_PATH = path.join(
  __dirname,
  "../data/external/sugarcane_sidss/catboostsugarcane_yield_prediction_regularized.csv"
);

const STAGE_MAP = {
  germination: 0,
  tillering: 1,
  grandgrowth: 2,
  maturity: 3,
  drying: 4,
};

const SEASON_MAP = {
  monsoon: 0,
  summer: 1,
  winter: 2,
};

const FEATURE_NAMES = [
  "stomataopenclose",
  "nitrogen",
  "chloropyll",
  "phosphorus",
  "leafhumidity",
  "leafevaporation",
  "evapotranspiration",
  "stageCode",
  "soilph",
  "soilhumidity",
  "microclimatictemp",
  "seasonCode",
  "microclimaticwindspeed",
];

const EXCLUDED_COLUMNS = [
  "inputleaf",                       // ID string
  "predicted_water_liters_per_day", // Target copy / CatBoost model prediction with negative values
  "yield_kg_per_plant",             // Yield label
  "predicted_yield",                // Yield model prediction
];

/**
 * Load raw dataset rows from CSV.
 */
function loadRawDataset() {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset file not found at ${DATASET_PATH}`);
  }

  const fileStats = fs.statSync(DATASET_PATH);
  const rawText = fs.readFileSync(DATASET_PATH, "utf-8");
  const lines = rawText.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const parts = lines[i].split(",");
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = parts[idx].trim();
    });
    rows.push(rowObj);
  }

  return {
    path: DATASET_PATH,
    sizeBytes: fileStats.size,
    totalRows: rows.length,
    headers,
    rows,
  };
}

/**
 * Preprocess rows into feature matrices X, target vector y (log10 scale), and unscaled targets.
 */
function processDataset(rawRows) {
  const X = [];
  const yLog = [];
  const yRaw = [];

  rawRows.forEach((row) => {
    const stageCode = STAGE_MAP[row.stages ? row.stages.toLowerCase() : "germination"] ?? 0;
    const seasonCode = SEASON_MAP[row.microclimaticseason ? row.microclimaticseason.toLowerCase() : "monsoon"] ?? 0;

    const featureVector = [
      Number(row.stomataopenclose || 0),
      Number(row.nitrogen || 0),
      Number(row.chloropyll || 0),
      Number(row.phosphorus || 0),
      Number(row.leafhumidity || 0),
      Number(row.leafevaporation || 0),
      Number(row.evapotranspiration || 0),
      stageCode,
      Number(row.soilph || 0),
      Number(row.soilhumidity || 0),
      Number(row.microclimatictemp || 0),
      seasonCode,
      Number(row.microclimaticwindspeed || 0),
    ];

    const rawDrip = Number(row.drip_liters_per_day);
    const logTarget = Math.log10(Math.max(1, rawDrip));

    X.push(featureVector);
    yLog.push(logTarget);
    yRaw.push(rawDrip);
  });

  return {
    X,
    yLog,
    yRaw,
    featureNames: FEATURE_NAMES,
    excludedColumns: EXCLUDED_COLUMNS,
  };
}

module.exports = {
  loadRawDataset,
  processDataset,
  STAGE_MAP,
  SEASON_MAP,
  FEATURE_NAMES,
  EXCLUDED_COLUMNS,
  DATASET_PATH,
};
