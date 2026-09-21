// -----------------------------------------------------------------------------
// backend/utils/mlDatasetBuilder.js
//
// Dataset Construction & Chronological Split Utility for KhetAI ML Pipeline.
// Prevents data leakage and validates data sufficiency before model training.
// -----------------------------------------------------------------------------

const { extractMlFeatures } = require("./mlFeatureBuilder");

const MINIMUM_REQUIRED_REAL_RECORDS = 30;

/**
 * Chronologically sorts input records and builds feature/label dataset.
 * Prevents data leakage by ensuring feature extraction at time t only uses data <= t.
 */
function buildMlDataset(records = [], options = {}) {
  const trainRatio = options.trainRatio || 0.70;
  const valRatio = options.valRatio || 0.15;
  // testRatio is remainder (15%)

  if (!Array.isArray(records) || records.length === 0) {
    return {
      status: "INSUFFICIENT_DATA",
      reason: "No historical records provided.",
      totalRecords: 0,
      realHardwareRecords: 0,
      simulatedRecords: 0,
      splits: { train: [], validation: [], test: [] },
    };
  }

  // Ensure chronological ordering by timestamp t
  const sorted = [...records].sort((a, b) => {
    const tA = new Date(a.timestamp || a.measuredAt || a.createdAt || 0).getTime();
    const tB = new Date(b.timestamp || b.measuredAt || b.createdAt || 0).getTime();
    return tA - tB;
  });

  let simulatedCount = 0;
  let realHardwareCount = 0;

  const datasetEntries = sorted.map((record) => {
    const prov = record.provenance || record.source || (record.sensor && record.sensor.source) || "SIMULATED";
    if (prov === "PHYSICAL_HARDWARE") {
      realHardwareCount++;
    } else {
      simulatedCount++;
    }

    // Extract features enforcing strict time boundary (only history <= record.timestamp)
    const historyUpToRecord = (record.historyLogs || []).filter((h) => {
      const hTime = new Date(h.date || h.occurredAt || 0).getTime();
      const rTime = new Date(record.timestamp || record.measuredAt || 0).getTime();
      return hTime < rTime; // Strictly BEFORE target time, preventing leakage
    });

    const featureObj = extractMlFeatures(
      record.plot,
      record.sensor,
      record.weather,
      historyUpToRecord
    );

    // Label: Did an irrigation event occur in the target window (e.g. next 24-48 hours)?
    // Or target water requirement (m3)
    const labelIrrigationOccurred = record.targetIrrigationOccurred ? 1 : 0;
    const labelWaterAppliedM3 = record.targetWaterAppliedM3 ?? 0;

    return {
      timestamp: record.timestamp || record.measuredAt || new Date().toISOString(),
      provenance: prov,
      features: featureObj.namedFeatures,
      vector: featureObj.vector,
      label: {
        irrigationOccurred: labelIrrigationOccurred,
        waterAppliedM3: labelWaterAppliedM3,
      },
    };
  });

  // Chronological Split (Train: 0..70%, Val: 70..85%, Test: 85..100%)
  const total = datasetEntries.length;
  const trainEnd = Math.floor(total * trainRatio);
  const valEnd = Math.floor(total * (trainRatio + valRatio));

  const trainSplit = datasetEntries.slice(0, trainEnd);
  const valSplit = datasetEntries.slice(trainEnd, valEnd);
  const testSplit = datasetEntries.slice(valEnd);

  const sufficiency = evaluateDataSufficiency({
    totalRecords: total,
    realHardwareRecords: realHardwareCount,
    simulatedRecords: simulatedCount,
  });

  return {
    status: sufficiency.status,
    reason: sufficiency.reason,
    totalRecords: total,
    realHardwareRecords: realHardwareCount,
    simulatedRecords: simulatedCount,
    splitCounts: {
      train: trainSplit.length,
      validation: valSplit.length,
      test: testSplit.length,
    },
    splits: {
      train: trainSplit,
      validation: valSplit,
      test: testSplit,
    },
    period: {
      start: total > 0 ? datasetEntries[0].timestamp : null,
      end: total > 0 ? datasetEntries[total - 1].timestamp : null,
    },
  };
}

/**
 * Checks if historical dataset has sufficient physical hardware records.
 */
function evaluateDataSufficiency(summary = {}) {
  const realCount = summary.realHardwareRecords || 0;
  const totalCount = summary.totalRecords || 0;

  if (totalCount === 0) {
    return {
      sufficient: false,
      status: "INSUFFICIENT_DATA",
      reason: "Zero historical sensor records found.",
    };
  }

  if (realCount < MINIMUM_REQUIRED_REAL_RECORDS) {
    return {
      sufficient: false,
      status: "INSUFFICIENT_HISTORICAL_DATA",
      reason: `Insufficient physical IoT hardware records (${realCount}/${MINIMUM_REQUIRED_REAL_RECORDS} required). Simulator data cannot be used to train production ML models.`,
    };
  }

  return {
    sufficient: true,
    status: "READY_FOR_TRAINING",
    reason: `Sufficient physical IoT hardware records available (${realCount} records).`,
  };
}

module.exports = {
  buildMlDataset,
  evaluateDataSufficiency,
  MINIMUM_REQUIRED_REAL_RECORDS,
};
