// -----------------------------------------------------------------------------
// backend/scripts/trainExternalMlModel.js
//
// Pure JS Machine Learning Training & Dual-Scale Validation Script
// for Sugarcane Drip Irrigation Need (Zenodo SIDSS Dataset).
// -----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { loadRawDataset, processDataset, FEATURE_NAMES } = require("../utils/externalDatasetAudit");

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function shuffleWithSeed(array, seed = 42) {
  const rng = seededRandom(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calculateMetrics(yTrue, yPred) {
  const n = yTrue.length;
  let maeSum = 0;
  let mseSum = 0;
  let sumTrue = 0;

  for (let i = 0; i < n; i++) {
    const err = yPred[i] - yTrue[i];
    maeSum += Math.abs(err);
    mseSum += err * err;
    sumTrue += yTrue[i];
  }

  const meanTrue = sumTrue / n;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const diff = yTrue[i] - meanTrue;
    ssTot += diff * diff;
  }

  const mae = maeSum / n;
  const rmse = Math.sqrt(mseSum / n);
  const r2 = ssTot === 0 ? 0 : 1 - mseSum / ssTot;

  return {
    mae: Number(mae.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    r2: Number(r2.toFixed(4)),
  };
}

class RidgeLinearRegression {
  constructor(lambda = 1e-3) {
    this.lambda = lambda;
    this.means = [];
    this.stds = [];
    this.weights = [];
    this.bias = 0;
  }

  fit(X, y) {
    const numSamples = X.length;
    const numFeatures = X[0].length;

    this.means = new Array(numFeatures).fill(0);
    this.stds = new Array(numFeatures).fill(0);

    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let i = 0; i < numSamples; i++) sum += X[i][j];
      this.means[j] = sum / numSamples;

      let varSum = 0;
      for (let i = 0; i < numSamples; i++) {
        const diff = X[i][j] - this.means[j];
        varSum += diff * diff;
      }
      this.stds[j] = Math.sqrt(varSum / numSamples) || 1.0;
    }

    const normX = X.map((row) =>
      row.map((val, j) => (val - this.means[j]) / this.stds[j])
    );

    this.weights = new Array(numFeatures).fill(0);
    this.bias = y.reduce((a, b) => a + b, 0) / numSamples;

    const lr = 0.05;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      const dw = new Array(numFeatures).fill(0);
      let db = 0;

      for (let i = 0; i < numSamples; i++) {
        let pred = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          pred += normX[i][j] * this.weights[j];
        }
        const err = pred - y[i];
        db += err;
        for (let j = 0; j < numFeatures; j++) {
          dw[j] += err * normX[i][j];
        }
      }

      this.bias -= (lr * db) / numSamples;
      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= lr * (dw[j] / numSamples + this.lambda * this.weights[j]);
      }
    }
  }

  predict(X) {
    return X.map((row) => {
      let val = this.bias;
      for (let j = 0; j < row.length; j++) {
        const normVal = (row[j] - this.means[j]) / this.stds[j];
        val += normVal * this.weights[j];
      }
      return val;
    });
  }
}

function buildDecisionTree(X, y, depth = 0, maxDepth = 5, minSplit = 10) {
  const n = y.length;
  const meanY = y.reduce((a, b) => a + b, 0) / (n || 1);

  if (depth >= maxDepth || n < minSplit) {
    return { val: meanY };
  }

  let bestFeature = -1;
  let bestThreshold = 0;
  let bestVarianceReduction = -1;

  const currentVariance = y.reduce((acc, v) => acc + (v - meanY) ** 2, 0);

  const numFeatures = X[0].length;
  for (let f = 0; f < numFeatures; f++) {
    const values = X.map((r) => r[f]);
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);

    for (let k = 0; k < unique.length - 1; k += Math.max(1, Math.floor(unique.length / 20))) {
      const thresh = (unique[k] + unique[k + 1]) / 2;
      const leftY = [];
      const rightY = [];

      for (let i = 0; i < n; i++) {
        if (X[i][f] <= thresh) leftY.push(y[i]);
        else rightY.push(y[i]);
      }

      if (leftY.length === 0 || rightY.length === 0) continue;

      const leftMean = leftY.reduce((a, b) => a + b, 0) / leftY.length;
      const rightMean = rightY.reduce((a, b) => a + b, 0) / rightY.length;

      const varLeft = leftY.reduce((acc, v) => acc + (v - leftMean) ** 2, 0);
      const varRight = rightY.reduce((acc, v) => acc + (v - rightMean) ** 2, 0);

      const varRed = currentVariance - (varLeft + varRight);
      if (varRed > bestVarianceReduction) {
        bestVarianceReduction = varRed;
        bestFeature = f;
        bestThreshold = thresh;
      }
    }
  }

  if (bestFeature === -1 || bestVarianceReduction <= 0) {
    return { val: meanY };
  }

  const leftX = [], leftY = [], rightX = [], rightY = [];
  for (let i = 0; i < n; i++) {
    if (X[i][bestFeature] <= bestThreshold) {
      leftX.push(X[i]);
      leftY.push(y[i]);
    } else {
      rightX.push(X[i]);
      rightY.push(y[i]);
    }
  }

  return {
    featureIndex: bestFeature,
    threshold: bestThreshold,
    left: buildDecisionTree(leftX, leftY, depth + 1, maxDepth, minSplit),
    right: buildDecisionTree(rightX, rightY, depth + 1, maxDepth, minSplit),
  };
}

function predictTree(node, row) {
  if (node.val !== undefined) return node.val;
  if (row[node.featureIndex] <= node.threshold) {
    return predictTree(node.left, row);
  } else {
    return predictTree(node.right, row);
  }
}

function runTraining() {
  console.log("=== KHETAI PHASE 9A.1 DUAL-SCALE VALIDATION & TRAINING ===");

  const rawData = loadRawDataset();
  const { X, yLog, yRaw } = processDataset(rawData.rows);

  const indices = Array.from({ length: X.length }, (_, i) => i);
  const shuffled = shuffleWithSeed(indices, 42);

  const total = X.length;
  const trainSize = Math.floor(total * 0.70);
  const valSize = Math.floor(total * 0.15);

  const trainIdx = shuffled.slice(0, trainSize);
  const valIdx = shuffled.slice(trainSize, trainSize + valSize);
  const testIdx = shuffled.slice(trainSize + valSize);

  const xTrain = trainIdx.map((i) => X[i]);
  const yTrainLog = trainIdx.map((i) => yLog[i]);
  const yTrainRaw = trainIdx.map((i) => yRaw[i]);

  const xTest = testIdx.map((i) => X[i]);
  const yTestLog = testIdx.map((i) => yLog[i]);
  const yTestRaw = testIdx.map((i) => yRaw[i]);

  // 1. Baseline
  const meanTrainLog = yTrainLog.reduce((a, b) => a + b, 0) / yTrainLog.length;
  const meanTrainRaw = yTrainRaw.reduce((a, b) => a + b, 0) / yTrainRaw.length;

  const basePredLog = new Array(xTest.length).fill(meanTrainLog);
  const basePredRaw = new Array(xTest.length).fill(meanTrainRaw);

  const baseLogMetrics = calculateMetrics(yTestLog, basePredLog);
  const baseRawMetrics = calculateMetrics(yTestRaw, basePredRaw);

  // 2. Multiple Linear Regression
  const linearModel = new RidgeLinearRegression(1e-3);
  linearModel.fit(xTrain, yTrainLog);

  const linearPredLog = linearModel.predict(xTest);
  const linearPredRaw = linearPredLog.map((v) => Math.pow(10, v));

  const linearLogMetrics = calculateMetrics(yTestLog, linearPredLog);
  const linearRawMetrics = calculateMetrics(yTestRaw, linearPredRaw);

  // 3. Decision Tree
  const treeModelNode = buildDecisionTree(xTrain, yTrainLog, 0, 6, 10);

  const treePredLog = xTest.map((r) => predictTree(treeModelNode, r));
  const treePredRaw = treePredLog.map((v) => Math.pow(10, v));

  const treeLogMetrics = calculateMetrics(yTestLog, treePredLog);
  const treeRawMetrics = calculateMetrics(yTestRaw, treePredRaw);

  console.log("\n=== 1. LOG10 TRANSFORMED SCALE METRICS ===");
  console.table([
    { Model: "Mean Baseline", ...baseLogMetrics },
    { Model: "Multiple Linear Regression", ...linearLogMetrics },
    { Model: "Decision Tree Regressor", ...treeLogMetrics },
  ]);

  console.log("\n=== 2. ORIGINAL LITERS/DAY SCALE METRICS ===");
  console.table([
    { Model: "Mean Baseline", MAE_liters: baseRawMetrics.mae.toExponential(4), RMSE_liters: baseRawMetrics.rmse.toExponential(4), R2: baseRawMetrics.r2.toFixed(4) },
    { Model: "Multiple Linear Regression", MAE_liters: linearRawMetrics.mae.toExponential(4), RMSE_liters: linearRawMetrics.rmse.toExponential(4), R2: linearRawMetrics.r2.toFixed(4) },
    { Model: "Decision Tree Regressor", MAE_liters: treeRawMetrics.mae.toExponential(4), RMSE_liters: treeRawMetrics.rmse.toExponential(4), R2: treeRawMetrics.r2.toFixed(4) },
  ]);

  const featureContributions = FEATURE_NAMES.map((name, idx) => ({
    name,
    weight: Number(linearModel.weights[idx].toFixed(4)),
    absWeight: Number(Math.abs(linearModel.weights[idx]).toFixed(4)),
  })).sort((a, b) => b.absWeight - a.absWeight);

  // Model Artifact JSON
  const modelArtifact = {
    modelVersion: "sugarcane-irrigation-v1",
    target: "drip_liters_per_day",
    targetTransformation: "log10",
    datasetOrigin: "EXTERNAL_MODEL_SIMULATED_RESEARCH_DATASET",
    dataset: "Sugarcane Irrigation Dataset for SIDSS Framework",
    datasetDOI: "10.5281/zenodo.19725692",
    temporalInformation: false,
    splitType: "RANDOM_FIXED_SEED",
    evaluationScale: "ORIGINAL_AND_LOG10",
    trainingRows: xTrain.length,
    validationRows: xVal.length,
    testRows: xTest.length,
    featureCount: FEATURE_NAMES.length,
    features: FEATURE_NAMES,
    algorithm: "LinearRegression",
    linearModel: {
      bias: Number(linearModel.bias.toFixed(6)),
      weights: linearModel.weights.map((w) => Number(w.toFixed(6))),
      means: linearModel.means.map((m) => Number(m.toFixed(6))),
      stds: linearModel.stds.map((s) => Number(s.toFixed(6))),
    },
    treeModel: treeModelNode,
    metricsLog10: linearLogMetrics,
    metricsOriginalLitersPerDay: {
      maeLitersPerDay: linearRawMetrics.mae,
      rmseLitersPerDay: linearRawMetrics.rmse,
      r2: linearRawMetrics.r2,
    },
    baselineMetricsLog10: baseLogMetrics,
    baselineMetricsOriginalLitersPerDay: {
      maeLitersPerDay: baseRawMetrics.mae,
      rmseLitersPerDay: baseRawMetrics.rmse,
      r2: baseRawMetrics.r2,
    },
    featuresWithStrongestContribution: featureContributions.slice(0, 5).map((f) => f.name),
    status: "EXPERIMENTAL",
    disclaimer: "Model approximates the dataset's generated irrigation-requirement target. The dataset is model-simulated and results do not establish real-world field performance.",
    trainedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "../ml/models");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "sugarcane_irrigation_v1.json");
  fs.writeFileSync(outputPath, JSON.stringify(modelArtifact, null, 2), "utf-8");

  console.log(`\nUpdated model artifact successfully saved to: ${outputPath}`);
}

runTraining();
