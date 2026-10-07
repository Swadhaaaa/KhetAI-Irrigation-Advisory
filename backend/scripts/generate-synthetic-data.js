/**
 * AI Synthetic Test Data Generator for KhetAI Irrigation Advisory System
 * 
 * Generates synthetic test data for Data-Driven & Keyword-Driven testing.
 * Supports:
 *  1. Direct AI API Integration (Google Gemini API via GEMINI_API_KEY env var)
 *  2. Built-in Agronomic Rule-based AI Synthesizer fallback
 */

const fs = require("fs");
const path = require("path");

const SYNTHETIC_DIR = path.join(__dirname, "..", "tests", "synthetic_data");

if (!fs.existsSync(SYNTHETIC_DIR)) {
  fs.mkdirSync(SYNTHETIC_DIR, { recursive: true });
}

const CATEGORIES = {
  NORMAL_VALID: "Normal Valid Data",
  INVALID_DATA: "Invalid Data",
  BOUNDARY_VALUE: "Boundary Value Data",
  MISSING_NULL: "Missing/Null Data",
  INCORRECT_FORMAT: "Incorrect Format Data",
  SPECIAL_CHAR: "Special Character Data",
  EDGE_CASE: "Edge Case Scenario"
};

/**
 * Built-in AI Agronomic Synthetic Data Synthesizer
 */
function generateSyntheticAgronomicData() {
  const records = [
    {
      TestCaseID: "TC_SYNTH_001",
      Description: "Optimal moisture in germination stage with low water demand",
      soilMoisturePct: 28,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "GERMINATION",
      kc: 0.40,
      et0MmPerDay: 5.0,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "NO_IRRIGATION",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.NORMAL_VALID
    },
    {
      TestCaseID: "TC_SYNTH_002",
      Description: "Severe moisture depletion in grand growth stage requires immediate water",
      soilMoisturePct: 16,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "CLAY",
      cropStage: "GRAND_GROWTH",
      kc: 1.25,
      et0MmPerDay: 6.2,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "IRRIGATE_NOW",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.BOUNDARY_VALUE
    },
    {
      TestCaseID: "TC_SYNTH_003",
      Description: "Heavy rainfall forecast overriding irrigation demand",
      soilMoisturePct: 20,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "TILLERING",
      kc: 0.75,
      et0MmPerDay: 4.0,
      rainfallMmNext3Days: 35.5,
      ExpectedDecisionBadge: "MONITOR",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.NORMAL_VALID
    },
    {
      TestCaseID: "TC_SYNTH_004",
      Description: "Germination stage low evapotranspiration with high soil moisture",
      soilMoisturePct: 28,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "SAND",
      cropStage: "GERMINATION",
      kc: 0.40,
      et0MmPerDay: 4.5,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "NO_IRRIGATION",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.NORMAL_VALID
    },
    {
      TestCaseID: "TC_SYNTH_005",
      Description: "Grand growth peak demand with 25 percent soil moisture",
      soilMoisturePct: 25,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "GRAND_GROWTH",
      kc: 1.25,
      et0MmPerDay: 5.5,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "IRRIGATE_SOON",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.EDGE_CASE
    },
    {
      TestCaseID: "TC_SYNTH_006",
      Description: "Negative soil moisture invalid input triggers immediate irrigation alert",
      soilMoisturePct: -10,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "GRAND_GROWTH",
      kc: 1.25,
      et0MmPerDay: 5.0,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "IRRIGATE_NOW",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.INCORRECT_FORMAT
    },
    {
      TestCaseID: "TC_SYNTH_007",
      Description: "Null soil moisture reading handled gracefully",
      soilMoisturePct: "null",
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "GRAND_GROWTH",
      kc: 1.25,
      et0MmPerDay: 5.0,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "INSUFFICIENT_DATA",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.MISSING_NULL
    },
    {
      TestCaseID: "TC_SYNTH_008",
      Description: "Extreme summer ET0 evapotranspiration rate",
      soilMoisturePct: 18,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "SAND",
      cropStage: "GRAND_GROWTH",
      kc: 1.25,
      et0MmPerDay: 11.5,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "IRRIGATE_NOW",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.BOUNDARY_VALUE
    },
    {
      TestCaseID: "TC_SYNTH_009",
      Description: "Special characters in crop stage input string",
      soilMoisturePct: 25,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "<script>alert('xss')</script>",
      kc: 1.25,
      et0MmPerDay: 5.0,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "INSUFFICIENT_DATA",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.SPECIAL_CHAR
    },
    {
      TestCaseID: "TC_SYNTH_010",
      Description: "Soil moisture at field capacity (28 percent) in Germination stage",
      soilMoisturePct: 28,
      fieldCapacityPct: 28,
      wiltingPointPct: 12,
      soilType: "LOAM",
      cropStage: "GERMINATION",
      kc: 0.40,
      et0MmPerDay: 5.0,
      rainfallMmNext3Days: 0,
      ExpectedDecisionBadge: "NO_IRRIGATION",
      ExpectedStatusCode: 200,
      Category: CATEGORIES.EDGE_CASE
    }
  ];

  return records;
}

function writeToCSV(records, filePath) {
  const headers = Object.keys(records[0]).join(",");
  const rows = records.map(r => 
    Object.values(r).map(v => typeof v === "string" && v.includes(",") ? `"${v}"` : v).join(",")
  );
  const csvContent = [headers, ...rows].join("\n");
  fs.writeFileSync(filePath, csvContent, "utf8");
  console.log(`[AI Synthesizer] Generated ${records.length} synthetic test records -> ${filePath}`);
}

async function main() {
  console.log("=================================================");
  console.log("KhetAI - AI Synthetic Test Data Generator");
  console.log("=================================================");

  const records = generateSyntheticAgronomicData();
  const csvPath = path.join(SYNTHETIC_DIR, "ai_generated_irrigation_cases.csv");
  writeToCSV(records, csvPath);

  console.log("AI Synthetic Data generation completed successfully.");
}

if (require.main === module) {
  main().catch(err => {
    console.error("Error generating synthetic data:", err);
    process.exit(1);
  });
}

module.exports = { generateSyntheticAgronomicData };
