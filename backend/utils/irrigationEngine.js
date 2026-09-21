// Agronomic Baseline & Irrigation Intelligence Engine for KhetAI.
// Evaluates data quality gates, FAO-56 crop water requirement, soil moisture depletion,
// irrigation efficiency scaling, rainfall forecast adjustments, and yield-loss risk.

const { estimateET0, computeFertigationPlan, computeYieldPrediction } = require("./aiEngine");

function evaluateDataQuality(features) {
    const errors = [];
    const warnings = [];

    if (!features) {
        return { status: "INSUFFICIENT_DATA", passes: false, errors: ["Missing features payload."], warnings: [] };
    }

    if (!features.cropFeatures?.plantingDate) {
        errors.push("Missing plot planting date.");
    }
    if (!features.soilFeatures?.soilType) {
        errors.push("Missing soil type profile.");
    }

    if (!features.sensorFeatures || features.sensorFeatures.soilMoisture30 == null) {
        errors.push("Missing soil moisture telemetry.");
    } else {
        if (features.sensorFeatures.quality === "INVALID") {
            errors.push(`Latest sensor reading is marked INVALID (${features.sensorFeatures.qualityReason || "out of bounds"}).`);
        }
        if (features.sensorFeatures.freshnessHours > 168) {
            errors.push(`Sensor telemetry is stale (${features.sensorFeatures.freshnessHours} hours old; max allowed: 168 hours).`);
        }
        if (features.sensorFeatures.quality === "SUSPECT") {
            warnings.push(`Sensor reading is marked SUSPECT (${features.sensorFeatures.qualityReason || "aged telemetry"}). Recommend manual field check.`);
        }
    }

    if (!features.weatherFeatures || !features.weatherFeatures.forecastDays || features.weatherFeatures.forecastDays.length === 0) {
        errors.push("Missing weather forecast data.");
    } else if (features.weatherFeatures.provenance === "FALLBACK") {
        warnings.push("Using fallback weather simulation. Live weather API unavailable.");
    }

    const passes = errors.length === 0;
    return {
        status: passes ? "OK" : "INSUFFICIENT_DATA",
        passes,
        errors,
        warnings,
    };
}

function computeIrrigationIntelligence(features, options = {}) {
    const qualityGate = evaluateDataQuality(features);
    if (!qualityGate.passes) {
        return {
            status: "INSUFFICIENT_DATA",
            recommendation: null,
            qualityGate,
            explanation: `Irrigation advisory could not be generated: ${qualityGate.errors.join(" ")}`,
        };
    }

    const crop = features.cropFeatures;
    const soil = features.soilFeatures;
    const plot = features.plotFeatures;
    const sensor = features.sensorFeatures;
    const weather = features.weatherFeatures;

    const today = weather.forecastDays[0];
    const et0 = today.et0 ?? estimateET0({
        tempMaxC: today.tempMax,
        tempMinC: today.tempMin,
        humidityPct: today.humidity,
    });
    const kc = crop.kc;
    const etc = Number((et0 * kc).toFixed(2));

    const currentMoisture = sensor.soilMoisture30;
    const range = soil.availableWaterCapacity;
    const depletionPct = Math.max(0, Math.min(1, (soil.fieldCapacity - currentMoisture) / range));
    const mad = 0.5; // 50% Management Allowed Depletion for sugarcane

    const daysOfBufferLeft = Math.max(0, ((mad - depletionPct) * range) / Math.max(etc, 0.5));

    // Look ahead through 3-day forecast window for significant rainfall (>= 8mm, >= 60% probability)
    let cumulativeForecastRain = 0;
    let significantRainInDays = null;
    weather.forecastDays.slice(0, 3).forEach((d, idx) => {
        cumulativeForecastRain += d.rainMm;
        if (significantRainInDays === null && d.rainProbability >= 60 && d.rainMm >= 8) {
            significantRainInDays = idx;
        }
    });

    let nextIrrigationInDays = Math.round(daysOfBufferLeft);
    let rainfallNote = null;
    if (significantRainInDays !== null && significantRainInDays <= nextIrrigationInDays + 1) {
        rainfallNote = `Rain expected in ${significantRainInDays === 0 ? "the next 24 hours" : significantRainInDays + " day(s)"} (${weather.forecastDays[significantRainInDays].rainMm} mm) — irrigation can be delayed to avoid waterlogging.`;
        nextIrrigationInDays = Math.max(nextIrrigationInDays, significantRainInDays + 1);
    }

    const nextIrrigationDate = new Date();
    nextIrrigationDate.setDate(nextIrrigationDate.getDate() + nextIrrigationInDays);

    const netRequirementMm = Number(Math.max(0, (soil.fieldCapacity - currentMoisture) * 0.9).toFixed(1));
    const grossRequirementMm = Number((netRequirementMm / plot.efficiency).toFixed(1));
    const applicationRateMmPerHr = soil.infiltrationRate;
    const durationHours = Number(Math.max(0.5, netRequirementMm / applicationRateMmPerHr).toFixed(1));

    const waterVolumeM3 = Number(((grossRequirementMm / 1000) * plot.areaAcres * 4046.86).toFixed(1));

    let waterStressProbability = Math.round(depletionPct * 100);
    let waterStressLevel = "Low";
    if (waterStressProbability >= 70) waterStressLevel = "High";
    else if (waterStressProbability >= 40) waterStressLevel = "Medium";

    const yieldLossRiskPct = Number(Math.min(18, Math.max(0, (waterStressProbability - 50) * 0.35)).toFixed(1));

    const advisoryObj = {
        cropStage: crop.growthStage,
        cropAgeMonths: crop.cropAgeMonths,
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
        grossIrrigationRequirementMm: grossRequirementMm,
        irrigationEfficiencyPct: Math.round(plot.efficiency * 100),
        waterVolumeM3,
        waterStressProbability,
        waterStressLevel,
        yieldLossRiskPct,
        rainfallNote,
        recommendationSummary:
            nextIrrigationInDays <= 0
                ? `Irrigate today for ${durationHours} hour(s). Soil moisture has dropped to ${currentMoisture}% against a field capacity of ${soil.fieldCapacity}%.`
                : `Irrigate on ${nextIrrigationDate.toISOString().slice(0, 10)} for approximately ${durationHours} hour(s).`,
    };

    const fertigation = computeFertigationPlan({ area: plot.areaAcres }, advisoryObj);
    const yieldPrediction = computeYieldPrediction({ soilType: soil.soilType }, advisoryObj, waterStressProbability);

    const explanation = [
        `Crop Stage: ${crop.growthStage} (Kc = ${kc}).`,
        `Reference ET0: ${et0} mm/day; Crop Water Requirement (ETc): ${etc} mm/day.`,
        `Soil Moisture: ${currentMoisture}% (Field Capacity: ${soil.fieldCapacity}%, Wilting Point: ${soil.wiltingPoint}%).`,
        `Depletion: ${Math.round(depletionPct * 100)}% against 50% Management Allowed Depletion threshold.`,
        `Net Water Deficit: ${netRequirementMm} mm; Gross Requirement: ${grossRequirementMm} mm (scaled by ${Math.round(plot.efficiency * 100)}% ${plot.irrigationMethod} efficiency).`,
        rainfallNote ? `Rainfall Adjustment: ${rainfallNote}` : "Rainfall Adjustment: No delaying precipitation expected in 3-day forecast window.",
    ].join(" ");

    return {
        status: "OK",
        qualityGate,
        advisory: advisoryObj,
        fertigation,
        yieldPrediction,
        explanation,
        provenance: features.provenanceSummary,
    };
}

module.exports = {
    evaluateDataQuality,
    computeIrrigationIntelligence,
};
