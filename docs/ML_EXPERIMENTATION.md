# KhetAI ML Experimentation & Prediction Pipeline Documentation

## 1. Overview & Architectural Philosophy

KhetAI uses an **agronomic decision engine** grounded in standard soil-water-crop physics (FAO-56 style calculation). 

While ML holds promise for optimizing irrigation recommendations, training an ML model on synthetic or simulated telemetry produces a model that merely learns the simulator's explicit equations. Therefore, KhetAI enforces a strict architectural boundary:

- **Primary Production Engine**: Agronomic Baseline (FAO-56 ET₀ + soil water depletion budget)
- **ML Experimentation Layer**: Standardized feature extraction, dataset builder, chronological train/val/test splitter, data leakage guard, and transparent metadata reporting (`INSUFFICIENT_HISTORICAL_DATA`).

---

## 2. Available Historical Data Inventory

| Entity / Source | Field Name | Data Type | Provenance | Description |
|---|---|---|---|---|
| **Plot Profile** | `cropType`, `variety` | String | User Input | Crop identification (default Sugarcane) |
| | `plantingDate` | ISO Date String | User Input | Used to calculate crop age and Kc |
| | `soilType` | String | User Input | Sandy, Sandy Loam, Loam, Clay Loam, Clay |
| | `area` / `areaAcres` | Float | User Input | Field size in acres |
| | `irrigationMethod` | String | User Input | Drip, MicroSprinkler, Sprinkler, Furrow, Flood, Surface |
| **Sensor Telemetry** | `soilMoisture30` | Float (%) | SIMULATED / PHYSICAL | 0–30 cm soil moisture |
| | `soilMoisture60` | Float (%) | SIMULATED / PHYSICAL | 30–60 cm soil moisture |
| | `soilTempC` | Float (°C) | SIMULATED / PHYSICAL | Soil temperature |
| | `ambientTempC` | Float (°C) | SIMULATED / PHYSICAL | Ambient air temperature |
| | `ambientHumidityPct` | Float (%) | SIMULATED / PHYSICAL | Air humidity |
| | `rainfallMm` | Float (mm) | SIMULATED / PHYSICAL | Local rainfall measured at sensor node |
| | `ndvi` | Float | NULL (Future Hardware) | Satellite / optical sensor vegetation index |
| | `quality` | Enum | VALID / STALE / OUT_OF_RANGE | Telemetry health status |
| **Weather Forecast** | `tempMax`, `tempMin` | Float (°C) | LIVE_API / CACHED_API / FALLBACK | Daily temperature extrema from Open-Meteo |
| | `humidity` | Float (%) | LIVE_API / CACHED_API / FALLBACK | Relative humidity |
| | `rainMm`, `rainProbability` | Float | LIVE_API / CACHED_API / FALLBACK | Daily forecast precipitation |
| | `windSpeed` | Float (km/h) | LIVE_API / CACHED_API / FALLBACK | Wind speed |
| | `et0` | Float (mm/day) | Derived / API | Reference evapotranspiration |
| **Irrigation Logs** | `durationHours` | Float (hrs) | Pump Log | Duration of irrigation run |
| | `waterAppliedM3` | Float (m³) | Pump Log | Total volume applied |
| | `occurredAt` | ISO Date String | Timestamp | Date/time of pump execution |

---

## 3. Feature Engineering Pipeline (`mlFeatureBuilder.js`)

The feature builder converts raw inputs into a flat 30-element numerical vector \(\mathbf{x} \in \mathbb{R}^{30}\):

### Categorical Encodings
- **`soilCode`**: Sandy = 0, Sandy Loam = 1, Loam = 2, Clay Loam = 3, Clay = 4
- **`growthStageCode`**: Germination (\(\le 2\text{ mo}\)) = 0, Tillering (\(\le 4\text{ mo}\)) = 1, Grand Growth (\(\le 9\text{ mo}\)) = 2, Maturity (\(> 9\text{ mo}\)) = 3
- **`irrigationMethodCode`**: Drip = 0, MicroSprinkler = 1, Sprinkler = 2, Furrow = 3, Flood = 4, Surface = 5
- **`sensorQualityScore`**: VALID = 1.0, STALE = 0.5, OUT_OF_RANGE = 0.0, UNRELIABLE = 0.0, MISSING = 0.0
- **`sensorProvenanceScore`**: PHYSICAL_HARDWARE = 2.0, SIMULATED = 1.0, SYNTHETIC = 1.0, NONE = 0.0
- **`weatherProvenanceScore`**: LIVE_API = 2.0, CACHED_API = 1.0, FALLBACK = 0.0

### Full 30-Feature Vector Specification

| Index | Feature Name | Range / Unit | Description |
|---|---|---|---|
| 0 | `cropAgeMonths` | \(0 - 24\) months | Calculated from planting date |
| 1 | `kc` | \(0.4 - 1.25\) | Crop coefficient (FAO-56) |
| 2 | `growthStageCode` | \(0 - 3\) | Ordinal crop growth phase |
| 3 | `soilCode` | \(0 - 4\) | Soil texture class code |
| 4 | `fieldCapacity` | \(18 - 40\%\) | Soil field capacity |
| 5 | `wiltingPoint` | \(6 - 20\%\) | Permanent wilting point |
| 6 | `availableWaterCapacity` | \(12 - 20\%\) | FC - WP |
| 7 | `infiltrationRate` | \(3 - 14\) mm/h | Soil water intake capacity |
| 8 | `areaAcres` | \(0.1 - 50\) acres | Field area |
| 9 | `irrigationMethodCode` | \(0 - 5\) | Application method code |
| 10 | `efficiency` | \(0.55 - 0.90\) | Irrigation application efficiency |
| 11 | `soilMoisture30` | \(0 - 100\%\) | Topsoil moisture level |
| 12 | `soilMoisture60` | \(0 - 100\%\) | Subsoil moisture level |
| 13 | `soilTempC` | \(-5 - 60^\circ\text{C}\) | Soil temperature |
| 14 | `ambientTempC` | \(-10 - 55^\circ\text{C}\) | Air temperature at sensor |
| 15 | `sensorHumidityPct` | \(0 - 100\%\) | Relative humidity at sensor |
| 16 | `sensorRainfallMm` | \(\ge 0\) mm | Rain measured by field gauge |
| 17 | `sensorQualityScore` | \(0.0 - 1.0\) | Telemetry reliability score |
| 18 | `sensorFreshnessHours` | \(\ge 0\) hrs | Time elapsed since reading |
| 19 | `sensorProvenanceScore` | \(0.0 - 2.0\) | Data origin authenticity |
| 20 | `et0` | \(2.5 - 9.0\) mm/d | Reference evapotranspiration |
| 21 | `tempMax` | °C | Forecast max daily temperature |
| 22 | `tempMin` | °C | Forecast min daily temperature |
| 23 | `weatherHumidity` | \% | Forecast air humidity |
| 24 | `rainMm` | mm | Forecast 24h precipitation |
| 25 | `rainProbability` | \% | Forecast rain probability |
| 26 | `windSpeed` | km/h | Forecast wind speed |
| 27 | `weatherProvenanceScore` | \(0.0 - 2.0\) | Weather source authenticity |
| 28 | `lastIrrigationWaterVolumeM3` | m³ | Volume of last logged irrigation |
| 29 | `recentCount30Days` | Integer | Frequency of irrigation runs (30d) |

---

## 4. Target Variables & Labels

For supervised learning, dataset building supports dual target labels:

1. **Classification Target (`irrigationOccurred`)**: Binary \(y \in \{0, 1\}\) — Indicates whether an irrigation event occurred within the 24-48 hour window following timestamp \(t\).
2. **Regression Target (`waterVolumeM3`)**: Continuous \(y \in \mathbb{R}_{\ge 0}\) — Actual volume of water applied in \(m^3\).

---

## 5. Dataset Construction & Chronological Split Strategy (`mlDatasetBuilder.js`)

### Chronological Ordering
Time-series agricultural telemetry cannot be randomly shuffled (\(k\)-fold cross-validation is invalid for temporal sequence data due to temporal autocorrelation). 

Records are strictly ordered by timestamp \(t\) before splitting:
- **Train Split**: Earliest 70% of historical timeline
- **Validation Split**: Next 15% of historical timeline
- **Test Split**: Final 15% of historical timeline (out-of-sample evaluation)

### Data Leakage Prevention Principles
To guarantee unbiased feature representation:
1. **No Future Weather**: Forecast features at time \(t\) use only the forecast available at or before time \(t\).
2. **No Future Irrigation Logs**: History features at time \(t\) strictly filter out logs where `occurredAt` \(\ge t\).
3. **No Target-Derived Features**: Features do not include the label or intermediate baseline calculations derived from the target period.

---

## 6. Minimum Data Sufficiency Guard

Before model training is permitted, `evaluateDataSufficiency()` verifies:

- **Minimum Threshold**: At least **30 physical hardware records** (`provenance = PHYSICAL_HARDWARE`).
- **Simulator Policy**: Simulated records (`provenance = SIMULATED`) are explicitly rejected as training targets to prevent synthetic loop bias.
- **Status Reporting**: When threshold is not met, system returns:
  ```json
  {
    "status": "INSUFFICIENT_HISTORICAL_DATA",
    "reason": "Insufficient physical IoT hardware records (0/30 required). Simulator data cannot be used to train production ML models.",
    "activeEngine": "AGRONOMIC_BASELINE"
  }
  ```

---

## 7. Model Architecture Plan & Evaluation Metrics

### Selected Algorithms (Planned)
- **Classification**: Logistic Regression or Decision Tree / Random Forest (interpretable, low latency, robust to small datasets).
- **Regression**: Gradient Boosted Trees or Ridge Regression for water volume estimation.
- **Deep Learning Non-Goal**: Complex neural networks (LSTM/Transformers) are explicitly avoided due to sample inefficiency and lack of agronomic interpretability.

### Metrics Framework
- **Classification**: Precision (avoiding over-irrigation), Recall (avoiding crop stress), F1-Score, and ROC-AUC.
- **Regression**: Mean Absolute Error (MAE in m³) and Root Mean Squared Error (RMSE).

---

## 8. Hybrid Production Strategy

When physical IoT deployments scale and reach data sufficiency:

```
                  +-----------------------------------+
                  |   Incoming Telemetry & Forecast   |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |      Data Quality & Provenance     |
                  +-----------------+-----------------+
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
    +---------------------------+       +---------------------------+
    |    Agronomic Baseline     |       |    Trained ML Model       |
    |      (FAO-56 Engine)      |       |  (Decision Tree / Ridge)  |
    +-------------+-------------+       +-------------+-------------+
                  |                                   |
                  | Primary Safety Guard              | Secondary Advisor
                  v                                   v
    +---------------------------------------------------------------+
    |                  Hybrid Decision Arbiter                      |
    |  - If ML disagrees by >25% vs Baseline -> Flag for Audit      |
    |  - Baseline provides hard safety bounds (never underwater)    |
    +---------------------------------------------------------------+
```

Currently, since physical hardware data count = 0, the Agronomic Baseline operates as the **sole active recommendation engine**, and the ML Layer transparently reports `INSUFFICIENT_HISTORICAL_DATA`.
