// Feature builder layer for KhetAI Irrigation Intelligence Engine.
// Aggregates plot profile, sensor telemetry, weather forecasts, and irrigation logs
// with explicit data quality and provenance metadata.

const { kcForCropAgeMonths, stageNameForCropAgeMonths, soilProfile, cropAgeInMonths } = require("./aiEngine");

const IRRIGATION_EFFICIENCY = {
    Drip: 0.90,
    MicroSprinkler: 0.85,
    Sprinkler: 0.75,
    Furrow: 0.60,
    Flood: 0.55,
    Surface: 0.60,
};

function getIrrigationEfficiency(method) {
    if (!method) return IRRIGATION_EFFICIENCY.Surface;
    const key = Object.keys(IRRIGATION_EFFICIENCY).find(
        (k) => k.toLowerCase() === String(method).trim().toLowerCase()
    );
    return key ? IRRIGATION_EFFICIENCY[key] : IRRIGATION_EFFICIENCY.Surface;
}

function buildIrrigationFeatures(plot, latestSensor = null, forecast = null, historyLogs = []) {
    // 1. Crop Features
    const plantingDate = plot?.plantingDate || null;
    const cropAgeMonths = plantingDate ? cropAgeInMonths(plantingDate) : 0;
    const kc = kcForCropAgeMonths(cropAgeMonths);
    const growthStage = stageNameForCropAgeMonths(cropAgeMonths);

    // 2. Soil Features
    const soilType = plot?.soilType || "Loam";
    const soil = soilProfile(soilType);
    const fieldCapacity = soil.fieldCapacity;
    const wiltingPoint = soil.wiltingPoint;
    const availableWaterCapacity = Number((fieldCapacity - wiltingPoint).toFixed(2));
    const infiltrationRate = soil.infiltrationRate;

    // 3. Plot Features
    const areaAcres = Number(plot?.area || 1.0);
    const lat = plot?.lat ?? plot?.latitude ?? 16.5;
    const lng = plot?.lng ?? plot?.longitude ?? 75.1;
    const irrigationMethod = plot?.irrigationMethod || "Surface / Furrow";
    const efficiency = getIrrigationEfficiency(irrigationMethod);

    // 4. Sensor Features
    let sensorFeatures = null;
    if (latestSensor) {
        const measuredAtTime = latestSensor.measuredAt ? new Date(latestSensor.measuredAt).getTime() : Date.now();
        const freshnessHours = Number(((Date.now() - measuredAtTime) / (1000 * 60 * 60)).toFixed(1));

        sensorFeatures = {
            soilMoisture30: latestSensor.soilMoisture30 ?? latestSensor.soilMoisturePct ?? null,
            soilMoisture60: latestSensor.soilMoisture60 ?? null,
            soilTempC: latestSensor.soilTempC ?? latestSensor.soilTemperature ?? null,
            ambientTempC: latestSensor.ambientTempC ?? latestSensor.ambientTemperature ?? null,
            humidityPct: latestSensor.ambientHumidityPct ?? latestSensor.humidityPct ?? null,
            rainfallMm: latestSensor.rainfallMm ?? null,
            ndvi: latestSensor.ndvi ?? null,
            quality: latestSensor.quality || "VALID",
            qualityReason: latestSensor.qualityReason || null,
            freshnessHours,
            provenance: latestSensor.source || latestSensor.provenance || "SIMULATED",
        };
    }

    // 5. Weather Features
    let weatherFeatures = null;
    if (forecast && forecast.days && forecast.days.length > 0) {
        const today = forecast.days[0];
        weatherFeatures = {
            et0: today.et0 ?? null,
            tempMax: today.tempMax ?? null,
            tempMin: today.tempMin ?? null,
            humidity: today.humidity ?? null,
            rainMm: today.rainMm ?? null,
            rainProbability: today.rainProbability ?? null,
            windSpeed: today.windSpeed ?? null,
            forecastDaysCount: forecast.days.length,
            forecastDays: forecast.days,
            provenance: forecast.provenance || today.provenance || "FALLBACK",
        };
    }

    // 6. History Features
    let historyFeatures = {
        lastIrrigationDate: null,
        lastIrrigationDurationHours: null,
        lastIrrigationWaterVolumeM3: null,
        recentCount30Days: 0,
    };
    if (Array.isArray(historyLogs) && historyLogs.length > 0) {
        const sorted = [...historyLogs].sort((a, b) => new Date(b.date || b.occurredAt) - new Date(a.date || a.occurredAt));
        const last = sorted[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentLogs = sorted.filter((l) => new Date(l.date || l.occurredAt) >= thirtyDaysAgo);

        historyFeatures = {
            lastIrrigationDate: last.date || last.occurredAt ? new Date(last.date || last.occurredAt).toISOString().slice(0, 10) : null,
            lastIrrigationDurationHours: last.durationHours ?? null,
            lastIrrigationWaterVolumeM3: last.waterAppliedM3 ?? null,
            recentCount30Days: recentLogs.length,
        };
    }

    // 7. Overall Provenance Summary
    const provenanceSummary = {
        sensor: sensorFeatures ? sensorFeatures.provenance : "NONE",
        weather: weatherFeatures ? weatherFeatures.provenance : "NONE",
        soilProfile: "FAO56_STANDARD",
    };

    return {
        plotId: plot?.id || "unknown_plot",
        cropFeatures: {
            cropType: plot?.crop || "Sugarcane",
            plantingDate,
            cropAgeMonths: Number(cropAgeMonths.toFixed(1)),
            growthStage,
            kc,
        },
        soilFeatures: {
            soilType,
            fieldCapacity,
            wiltingPoint,
            availableWaterCapacity,
            infiltrationRate,
        },
        plotFeatures: {
            areaAcres,
            lat,
            lng,
            irrigationMethod,
            efficiency,
        },
        sensorFeatures,
        weatherFeatures,
        historyFeatures,
        provenanceSummary,
    };
}

module.exports = {
    buildIrrigationFeatures,
    getIrrigationEfficiency,
    IRRIGATION_EFFICIENCY,
};
