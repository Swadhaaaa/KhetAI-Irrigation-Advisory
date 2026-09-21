const repository = require("../repositories/postgres.repository");

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function estimateET0({ tempMaxC, tempMinC, humidityPct }) {
  const tMean = (tempMaxC + tempMinC) / 2;
  const tRange = Math.max(tempMaxC - tempMinC, 4);
  const humidityFactor = 1 - Math.min(humidityPct, 90) / 200;
  const et0 = 0.0023 * (tMean + 17.8) * Math.sqrt(tRange) * 10 * humidityFactor;
  return Math.max(2.5, Math.min(9, Number(et0.toFixed(2))));
}

function validateCoordinates(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || numLat < -90 || numLat > 90) {
    return { valid: false, lat: 16.5, lng: 75.1 };
  }
  if (!Number.isFinite(numLng) || numLng < -180 || numLng > 180) {
    return { valid: false, lat: 16.5, lng: 75.1 };
  }
  return { valid: true, lat: numLat, lng: numLng };
}

function simulateForecast(plotId, days = 5) {
  const rand = seededRandom(seedFromString(plotId + new Date().toISOString().slice(0, 10)));
  const out = [];
  const baseTemp = 28 + rand() * 4;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const rainProbability = Math.round(rand() * 100);
    const rainMm = rainProbability > 55 ? Number((rand() * 25).toFixed(1)) : 0;
    const tempMax = Number((baseTemp + rand() * 3).toFixed(1));
    const tempMin = Number((baseTemp - 6 - rand() * 2).toFixed(1));
    const humidity = Math.round(50 + rand() * 35);
    const windSpeed = Number((10 + rand() * 15).toFixed(1));
    const et0 = estimateET0({ tempMaxC: tempMax, tempMinC: tempMin, humidityPct: humidity });

    out.push({
      date: date.toISOString().slice(0, 10),
      tempMax,
      tempMin,
      humidity,
      rainProbability,
      rainMm,
      windSpeed,
      et0,
      condition: rainProbability > 55 ? "Rain likely" : rainProbability > 25 ? "Partly cloudy" : "Clear",
      source: "simulated",
      provenance: "FALLBACK",
    });
  }
  return { days: out, provenance: "FALLBACK" };
}

async function fetchForecast(plot, options = {}) {
  const plotId = plot?.id || "default_plot";
  const coords = validateCoordinates(plot?.lat ?? plot?.latitude, plot?.lng ?? plot?.longitude);
  const freshnessMinutes = options.freshnessMinutes ?? 360; // 6 hours cache window

  if (!options.bypassCache && repository.getCachedWeather) {
    const cached = await repository.getCachedWeather(plotId, freshnessMinutes);
    if (cached && cached.days && cached.days.length >= 5) {
      return cached;
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max,et0_fao_evapotranspiration&forecast_days=5&timezone=auto`;

  try {
    const fetchFn = options.fetch || globalThis.fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 4000);
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

    const json = await res.json();
    if (!json || !json.daily || !Array.isArray(json.daily.time) || json.daily.time.length === 0) {
      throw new Error("Open-Meteo response structure was invalid or missing daily array.");
    }

    const d = json.daily;
    const days = d.time.map((date, i) => {
      const rainProbability = d.precipitation_probability_max?.[i] ?? 0;
      const rainMm = d.precipitation_sum?.[i] ?? 0;
      const tempMax = d.temperature_2m_max?.[i] ?? 32;
      const tempMin = d.temperature_2m_min?.[i] ?? 22;
      const humidity = d.relative_humidity_2m_mean?.[i] ?? 60;
      const windSpeed = d.wind_speed_10m_max?.[i] ?? 12;
      const et0Api = d.et0_fao_evapotranspiration?.[i];
      const et0 = et0Api != null ? Number(et0Api.toFixed(2)) : estimateET0({ tempMaxC: tempMax, tempMinC: tempMin, humidityPct: humidity });

      return {
        date,
        tempMax,
        tempMin,
        humidity,
        rainProbability,
        rainMm,
        windSpeed,
        et0,
        condition: rainProbability > 55 ? "Rain likely" : rainProbability > 25 ? "Partly cloudy" : "Clear",
        source: "open-meteo",
        provenance: "LIVE_API",
      };
    });

    const result = { days, provenance: "LIVE_API", fetchedAt: new Date().toISOString() };
    if (repository.saveCachedWeather) {
      await repository.saveCachedWeather(plotId, "OPEN_METEO", coords.lat, coords.lng, days, json, "LIVE_API");
    }
    return result;
  } catch (err) {
    if (repository.getCachedWeather) {
      const staleCache = await repository.getCachedWeather(plotId, 24 * 60); // 24 hours stale fallback
      if (staleCache && staleCache.days && staleCache.days.length >= 5) {
        return { ...staleCache, provenance: "CACHED_API" };
      }
    }
    return simulateForecast(plotId);
  }
}

module.exports = {
  fetchForecast,
  simulateForecast,
  estimateET0,
  validateCoordinates,
  seededRandom,
  seedFromString,
};

