const RANGES = {
    soil_moisture_30: { unit: "percent", min: 0, max: 100, field: "soilMoisture30" },
    soil_moisture_60: { unit: "percent", min: 0, max: 100, field: "soilMoisture60" },
    soil_temperature: { unit: "C", min: -20, max: 80, field: "soilTemperature" },
    ambient_temperature: { unit: "C", min: -40, max: 80, field: "ambientTemperature" },
    humidity: { unit: "percent", min: 0, max: 100, field: "humidityPct" },
    rainfall: { unit: "mm", min: 0, max: 500, field: "rainfallMm" },
    ndvi: { unit: "unitless", min: -1, max: 1, field: "ndvi" },
};

function classifyMeasurement(measurement) {
    const rule = RANGES[measurement.type];
    if (!rule || measurement.unit !== rule.unit) {
        const error = new Error("Unsupported sensor type or unit.");
        error.code = "INVALID_SENSOR_MEASUREMENT";
        throw error;
    }
    if (measurement.value < rule.min || measurement.value > rule.max) {
        const error = new Error(`Sensor value for ${measurement.type} is outside the accepted range.`);
        error.code = "INVALID_SENSOR_MEASUREMENT";
        throw error;
    }
    return rule;
}

function classifyTimestamp(measuredAt) {
    const now = Date.now();
    const timestamp = new Date(measuredAt).getTime();
    if (!Number.isFinite(timestamp)) {
        const error = new Error("Measurement timestamp is invalid.");
        error.code = "INVALID_SENSOR_TIMESTAMP";
        throw error;
    }
    if (timestamp > now + 5 * 60 * 1000) {
        const error = new Error("Measurement timestamp is too far in the future.");
        error.code = "INVALID_SENSOR_TIMESTAMP";
        throw error;
    }
    return timestamp < now - 30 * 24 * 60 * 60 * 1000
        ? { quality: "SUSPECT", qualityReason: "measurement_older_than_30_days" }
        : { quality: "VALID", qualityReason: null };
}

module.exports = { RANGES, classifyMeasurement, classifyTimestamp };
