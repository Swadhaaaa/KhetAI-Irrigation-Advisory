// Fetches a real 5-day forecast from Open-Meteo (https://open-meteo.com) which is
// free and requires no API key. If the request fails (e.g. no internet access in
// a sandboxed environment) we fall back to a deterministic simulated forecast so
// the advisory engine downstream never breaks.

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

function simulateForecast(plotId, days = 5) {
  const rand = seededRandom(seedFromString(plotId + new Date().toISOString().slice(0, 10)));
  const out = [];
  const baseTemp = 28 + rand() * 4;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const rainProbability = Math.round(rand() * 100);
    const rainMm = rainProbability > 55 ? Number((rand() * 25).toFixed(1)) : 0;
    out.push({
      date: date.toISOString().slice(0, 10),
      tempMax: Number((baseTemp + rand() * 3).toFixed(1)),
      tempMin: Number((baseTemp - 6 - rand() * 2).toFixed(1)),
      humidity: Math.round(50 + rand() * 35),
      rainProbability,
      rainMm,
      condition: rainProbability > 55 ? "Rain likely" : rainProbability > 25 ? "Partly cloudy" : "Clear",
      source: "simulated",
    });
  }
  return { days: out };
}

async function fetchForecast(plot) {
  const lat = plot.lat ?? 16.5; // default: Northern Karnataka (Sameerwadi region)
  const lng = plot.lng ?? 75.1;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean&forecast_days=5&timezone=auto`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
    const json = await res.json();
    const d = json.daily;
    const days = d.time.map((date, i) => {
      const rainProbability = d.precipitation_probability_max?.[i] ?? 0;
      const rainMm = d.precipitation_sum?.[i] ?? 0;
      return {
        date,
        tempMax: d.temperature_2m_max[i],
        tempMin: d.temperature_2m_min[i],
        humidity: d.relative_humidity_2m_mean ? d.relative_humidity_2m_mean[i] : 60,
        rainProbability,
        rainMm,
        condition: rainProbability > 55 ? "Rain likely" : rainProbability > 25 ? "Partly cloudy" : "Clear",
        source: "open-meteo",
      };
    });
    return { days };
  } catch (err) {
    return simulateForecast(plot.id);
  }
}

module.exports = { fetchForecast, simulateForecast, seededRandom, seedFromString };
