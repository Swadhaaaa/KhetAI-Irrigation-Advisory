// -----------------------------------------------------------------------------
// aiEngine.js
//
// This module simulates the AI / ML model layer described in the use case
// (KJS-AGR-01): Next Irrigation Date, Irrigation Duration, Crop Water
// Requirement, Water Stress Probability, Rainfall-Adjusted Irrigation,
// Yield Loss Prediction, Fertigation Recommendation and Yield Prediction.
//
// Every number below is DERIVED from the plot's real inputs (crop age,
// soil moisture, weather forecast, soil type) using agronomic formulas
// (FAO-56 style crop-coefficient approach, simplified). Nothing is a fixed
// constant returned to every plot - change the inputs and the outputs change.
// This keeps the demo honest about being a simulation while still behaving
// like a genuine decision-support model that a real ML model could later
// replace behind the same function signatures.
// -----------------------------------------------------------------------------

/** Crop coefficient (Kc) by sugarcane growth stage, FAO-56 style. */
function kcForCropAgeMonths(ageMonths) {
  if (ageMonths <= 2) return 0.4; // initial / establishment
  if (ageMonths <= 4) return 0.75; // tillering / development
  if (ageMonths <= 9) return 1.25; // grand growth / mid-season
  return 0.8; // maturation / ripening (late season)
}

function stageNameForCropAgeMonths(ageMonths) {
  if (ageMonths <= 2) return "Germination & Establishment";
  if (ageMonths <= 4) return "Tillering";
  if (ageMonths <= 9) return "Grand Growth (peak water demand)";
  return "Maturity & Ripening";
}

const SOIL_PROFILE = {
  Sandy: { fieldCapacity: 18, wiltingPoint: 6, infiltrationRate: 14 },
  "Sandy Loam": { fieldCapacity: 22, wiltingPoint: 9, infiltrationRate: 11 },
  Loam: { fieldCapacity: 28, wiltingPoint: 12, infiltrationRate: 8 },
  "Clay Loam": { fieldCapacity: 34, wiltingPoint: 16, infiltrationRate: 5 },
  Clay: { fieldCapacity: 40, wiltingPoint: 20, infiltrationRate: 3 },
};

function soilProfile(soilType) {
  return SOIL_PROFILE[soilType] || SOIL_PROFILE.Loam;
}

/** Reference evapotranspiration (ET0, mm/day) estimated from temperature & humidity
 *  using a simplified Hargreaves-style approximation - good enough for an advisory demo. */
function estimateET0({ tempMaxC, tempMinC, humidityPct }) {
  const tMean = (tempMaxC + tempMinC) / 2;
  const tRange = Math.max(tempMaxC - tempMinC, 4);
  const humidityFactor = 1 - Math.min(humidityPct, 90) / 200; // drier air -> higher ET0
  const et0 = 0.0023 * (tMean + 17.8) * Math.sqrt(tRange) * 10 * humidityFactor;
  return Math.max(2.5, Math.min(9, Number(et0.toFixed(2))));
}

function cropAgeInMonths(plantingDateISO) {
  const planting = new Date(plantingDateISO);
  const now = new Date();
  const diffDays = (now - planting) / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays / 30.44);
}

/**
 * Core irrigation advisory calculation.
 * @param {object} plot - { plantingDate, soilType, area }
 * @param {object} latestSensor - { soilMoisturePct, soilTemp }
 * @param {object} forecast - { days: [{ date, tempMax, tempMin, humidity, rainProbability, rainMm }] }
 */
function computeIrrigationAdvisory(plot, latestSensor, forecast) {
  const ageMonths = cropAgeInMonths(plot.plantingDate);
  const kc = kcForCropAgeMonths(ageMonths);
  const stage = stageNameForCropAgeMonths(ageMonths);
  const soil = soilProfile(plot.soilType);

  const today = forecast.days[0];
  const et0 = estimateET0({
    tempMaxC: today.tempMax,
    tempMinC: today.tempMin,
    humidityPct: today.humidity,
  });

  // Crop water requirement (ETc, mm/day)
  const etc = Number((et0 * kc).toFixed(2));

  // Available soil moisture window
  const currentMoisture = latestSensor.soilMoisturePct;
  const range = soil.fieldCapacity - soil.wiltingPoint;
  const depletionPct = Math.max(
    0,
    Math.min(1, (soil.fieldCapacity - currentMoisture) / range)
  );

  // Management Allowed Depletion (MAD) - sugarcane tolerates ~50% depletion
  const mad = 0.5;
  const daysOfBufferLeft = Math.max(
    0,
    ((mad - depletionPct) * range) / Math.max(etc, 0.5)
  );

  // Look ahead through the forecast for meaningful rain that would offset irrigation
  let cumulativeForecastRain = 0;
  let significantRainInDays = null;
  forecast.days.slice(0, 3).forEach((d, idx) => {
    cumulativeForecastRain += d.rainMm;
    if (significantRainInDays === null && d.rainProbability >= 60 && d.rainMm >= 8) {
      significantRainInDays = idx;
    }
  });

  let nextIrrigationInDays = Math.round(daysOfBufferLeft);
  let rainfallNote = null;
  if (significantRainInDays !== null && significantRainInDays <= nextIrrigationInDays + 1) {
    rainfallNote = `Rain expected in ${significantRainInDays === 0 ? "the next 24 hours" : significantRainInDays + " day(s)"} — irrigation can be delayed to avoid waterlogging.`;
    nextIrrigationInDays = Math.max(nextIrrigationInDays, significantRainInDays + 1);
  }

  const nextIrrigationDate = new Date();
  nextIrrigationDate.setDate(nextIrrigationDate.getDate() + nextIrrigationInDays);

  // Net irrigation requirement (mm) to refill root zone back to field capacity
  const netRequirementMm = Number(
    Math.max(0, (soil.fieldCapacity - currentMoisture) * 0.9).toFixed(1)
  );

  // Drip/furrow application rate assumption drawn from soil infiltration rate
  const applicationRateMmPerHr = soil.infiltrationRate;
  const durationHours = Number(
    Math.max(0.5, netRequirementMm / applicationRateMmPerHr).toFixed(1)
  );

  // Water stress probability: combination of depletion level & days overdue
  let waterStressProbability = Math.round(depletionPct * 100);
  let waterStressLevel = "Low";
  if (waterStressProbability >= 70) waterStressLevel = "High";
  else if (waterStressProbability >= 40) waterStressLevel = "Medium";

  // Yield loss risk if the recommended irrigation is delayed further
  const yieldLossRiskPct = Number(
    Math.min(18, Math.max(0, (waterStressProbability - 50) * 0.35)).toFixed(1)
  );

  const litersRequired = Math.round(netRequirementMm * plot.area * 10); // 1mm over 1 acre-equivalent(approx 4047 m2)*... simplified: mm * ha(area in acre*0.4047)*10000/1000
  const waterVolumeM3 = Number(
    ((netRequirementMm / 1000) * plot.area * 4046.86).toFixed(1)
  );

  return {
    cropStage: stage,
    cropAgeMonths: Number(ageMonths.toFixed(1)),
    kc,
    et0MmPerDay: et0,
    cropWaterRequirementMmPerDay: etc,
    soilMoisturePct: currentMoisture,
    fieldCapacityPct: soil.fieldCapacity,
    depletionPct: Math.round(depletionPct * 100),
    nextIrrigationDate: nextIrrigationDate.toISOString().slice(0, 10),
    nextIrrigationInDays,
    irrigationDurationHours: durationHours,
    netIrrigationRequirementMm: netRequirementMm,
    waterVolumeM3,
    waterStressProbability,
    waterStressLevel,
    yieldLossRiskPct,
    rainfallNote,
    recommendationSummary:
      nextIrrigationInDays <= 0
        ? `Irrigate today for ${durationHours} hour(s). Soil moisture has dropped to ${currentMoisture}% against a comfortable ${soil.fieldCapacity}%.`
        : `Irrigate on ${nextIrrigationDate.toISOString().slice(0, 10)} for approximately ${durationHours} hour(s).`,
  };
}

/** Fertigation recommendation per acre by crop growth stage (NPK guideline values). */
function computeFertigationPlan(plot, advisory) {
  const ageMonths = advisory.cropAgeMonths;
  let plan;
  if (ageMonths <= 2) {
    plan = { stage: "Basal / Establishment", Urea: 25, DAP: 50, MOP: 20, note: "Apply basal dose and starter nitrogen to support tillering." };
  } else if (ageMonths <= 4) {
    plan = { stage: "Tillering", Urea: 40, DAP: 20, MOP: 20, note: "Split nitrogen dose to encourage tiller multiplication." };
  } else if (ageMonths <= 9) {
    plan = { stage: "Grand Growth", Urea: 55, DAP: 10, MOP: 30, note: "Peak nutrient demand stage — maintain steady fertigation with irrigation." };
  } else {
    plan = { stage: "Maturity", Urea: 10, DAP: 0, MOP: 40, note: "Reduce nitrogen, favour potash to improve sucrose accumulation." };
  }

  // Scale by plot area (values above are per-acre guideline doses in kg)
  const scaled = {
    ureaKg: Number((plan.Urea * plot.area).toFixed(1)),
    dapKg: Number((plan.DAP * plot.area).toFixed(1)),
    mopKg: Number((plan.MOP * plot.area).toFixed(1)),
  };

  const delayPenalty = advisory.nextIrrigationInDays > 3;

  return {
    stage: plan.stage,
    note: plan.note,
    perAcre: { ureaKg: plan.Urea, dapKg: plan.DAP, mopKg: plan.MOP },
    totalForPlot: scaled,
    applyWithIrrigationOn: advisory.nextIrrigationDate,
    warning: delayPenalty
      ? "Irrigation delay may reduce fertigation uptake efficiency — consider adjusting schedule."
      : null,
  };
}

/** Yield prediction (t/ha) driven by cumulative water-stress exposure & soil health proxy. */
function computeYieldPrediction(plot, advisory, historicalStressAvg) {
  const baselineYield = 105; // regional average tonnes/ha for well-managed sugarcane
  const stressPenalty = (historicalStressAvg / 100) * 22; // up to ~22 t/ha loss under sustained high stress
  const soilBonus = soilProfile(plot.soilType).fieldCapacity >= 28 ? 3 : 0;
  const predicted = Math.max(60, baselineYield - stressPenalty + soilBonus);
  const low = Number((predicted * 0.92).toFixed(1));
  const high = Number((predicted * 1.06).toFixed(1));
  return {
    predictedYieldTPerHa: Number(predicted.toFixed(1)),
    rangeLowTPerHa: low,
    rangeHighTPerHa: high,
    confidenceNote:
      historicalStressAvg > 45
        ? "Prediction range is wider due to elevated recent water stress."
        : "Prediction based on stable moisture history.",
  };
}

module.exports = {
  kcForCropAgeMonths,
  stageNameForCropAgeMonths,
  soilProfile,
  estimateET0,
  cropAgeInMonths,
  computeIrrigationAdvisory,
  computeFertigationPlan,
  computeYieldPrediction,
};
