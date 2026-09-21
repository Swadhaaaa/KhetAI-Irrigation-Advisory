# KhetAI — Weather Data Pipeline Documentation

This document describes the weather data integration, caching strategy, fallback behavior, data quality controls, and agronomic advisory calculations for KhetAI.

---

## 1. Provider & Endpoint Architecture

- **Primary Provider**: [Open-Meteo Forecast API](https://open-meteo.com)
- **Authentication**: Free public API — no API key required.
- **Base Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Request Parameters**:
  ```http
  latitude={lat}
  &longitude={lng}
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max,et0_fao_evapotranspiration
  &forecast_days=5
  &timezone=auto
  ```

---

## 2. Coordinate Resolution & Validation

- **Coordinate Source**: Extracted from `Plot.latitude` and `Plot.longitude` (stored in PostgreSQL).
- **Validation Rules**:
  - `latitude`: Valid finite number between `-90.0` and `90.0`.
  - `longitude`: Valid finite number between `-180.0` and `180.0`.
- **Default Coordinates**: If coordinates are unsupplied, null, or out of range, the system uses `latitude: 16.5`, `longitude: 75.1` (Northern Karnataka sugarcane region: Sameerwadi / Bagalkot district).

---

## 3. Requested Variables & Response Normalization

Each daily weather entry is normalized into a standard object:

```json
{
  "date": "2026-09-21",
  "tempMax": 32.5,
  "tempMin": 22.0,
  "humidity": 65,
  "rainProbability": 15,
  "rainMm": 0.0,
  "windSpeed": 14.2,
  "et0": 5.2,
  "condition": "Clear",
  "source": "open-meteo",
  "provenance": "LIVE_API"
}
```

### Reference Evapotranspiration (ET0)
- **Primary Method**: Direct extraction of FAO-56 reference evapotranspiration `et0_fao_evapotranspiration` (mm/day) returned by Open-Meteo.
- **Fallback Method**: Simplified Hargreaves equation (`estimateET0`) when API ET0 is missing:
  $$ET_0 = 0.0023 \times (T_{\text{mean}} + 17.8) \times \sqrt{T_{\text{max}} - T_{\text{min}}} \times 10 \times (1 - \frac{\text{humidity}}{200})$$

---

## 4. PostgreSQL Caching Strategy

To prevent excessive external HTTP calls during repeated advisory or dashboard requests:
- **Storage Model**: `WeatherData` table in PostgreSQL.
- **Cache Freshness Window**: 6 hours (360 minutes).
- **Flow**:
  1. Check `WeatherData` table for existing forecast for `plotId` fetched within the last 6 hours.
  2. If fresh cache exists, return cached daily forecast array immediately with `provenance: "CACHED_API"`.
  3. If cache is expired or missing, execute live Open-Meteo HTTP request.
  4. On HTTP success, upsert 5-day forecast entries into `WeatherData` table with `provenance: "LIVE"` and return response with `provenance: "LIVE_API"`.

---

## 5. Fallback & Failure Handling

When live API requests fail (e.g., network timeout, sandboxed deployment, API HTTP 500/503 errors):
1. **Stale Cache Fallback**: System attempts to load older cached weather up to 24 hours old (`provenance: "CACHED_API"`).
2. **Deterministic Simulator Fallback**: If no cache is available, system executes `simulateForecast(plotId)`:
   - Generates deterministic pseudo-random 5-day forecast seeded by `plotId + YYYY-MM-DD`.
   - Explicitly tags response with `provenance: "FALLBACK"` and `source: "simulated"`.
   - Ensures the advisory engine downstream never crashes due to weather API outages.

---

## 6. Weather Provenance Classification

Every weather response explicitly includes its data source origin:

| Provenance Tag | Origin Description |
| :--- | :--- |
| **`LIVE_API`** | Live response fetched directly from Open-Meteo API. |
| **`CACHED_API`** | Fresh forecast loaded from PostgreSQL `WeatherData` database cache. |
| **`FALLBACK`** | Deterministic simulation returned due to network failure or API error. |

---

## 7. Agronomic Advisory Influence

Weather forecast variables directly drive sugarcane irrigation recommendations in `aiEngine.js`:

1. **Crop Water Requirement ($ET_c$)**: Calculated as $ET_c = ET_0 \times K_c$ where $K_c$ is sugarcane growth stage coefficient.
2. **Soil Moisture Depletion**: Evaluated against Management Allowed Depletion (MAD = 50%).
3. **Rainfall Adjustment**: Look-ahead across 3-day forecast window. If significant rainfall ($\ge 8\text{ mm}$ with $\ge 60\%$ probability) is expected within 24–48 hours, scheduled irrigation is delayed to prevent waterlogging.
