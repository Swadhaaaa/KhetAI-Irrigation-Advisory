# KhetAI — Final System Architecture (`FINAL_ARCHITECTURE.md`)

## System Architecture Diagram

```
                                 FARMER / EVALUATOR
                                         │
                                         ▼
                            [ Web Dashboard Frontend ]
                            (HTML5, Vanilla CSS, JS)
                                         │
                                         ▼
                            [ Express REST API Gateway ]
                         (JWT Auth, Rate Limiting, Helmet)
                                         │
                 ┌───────────────────────┼────────────────────────┐
                 │                       │                        │
                 ▼                       ▼                        ▼
      [ PostgreSQL Database ]   [ Live Weather Service ]   [ Sensor Telemetry ]
      (Prisma ORM Persistence)  (Open-Meteo 5-Day Forecast) (SIMULATED TELEMETRY)
                 │                       │                        │
                 │                       │                        │
                 └───────────┬───────────┴────────────────────────┘
                             ▼
            [ FAO-56 Irrigation Intelligence Engine ]
               ├── Reference Evapotranspiration (ET₀)
               ├── Crop Coefficient (Kc) & ETc
               └── Soil Water Depletion Budget (MAD)
                             │
                             ▼
             ┌───────────────────────────────┐
             │   PRIMARY FARMER ADVISORY     │
             │ (FAO-56 AGRONOMIC BASELINE)   │
             └───────────────┬───────────────┘
                             │
                             ▼
             ┌───────────────────────────────┐
             │   EXPERIMENTAL ML ANALYSIS    │
             │ (SECONDARY ANALYTICAL SIGNAL) │
             └───────────────▲───────────────┘
                             │
                [ External Research Dataset ]
                (Zenodo DOI: 10.5281/zenodo.19725692)
```

---

## Decision Engine Hierarchy & Non-Interference Guarantee

### 1. PRIMARY DECISION ENGINE: FAO-56 Agronomic Baseline
- **Role:** Generates active farmer recommendations (`IRRIGATE_NOW`, `IRRIGATE_SOON`, `MONITOR`, `RAIN_EXPECTED`, `INSUFFICIENT_DATA`).
- **Calculations:** Reference Evapotranspiration (\(ET_0\)), Crop Coefficient (\(K_c\)), Crop Evapotranspiration (\(ET_c\)), Available Water Capacity (AWC), Management Allowed Depletion (MAD), net irrigation requirement (\(\text{mm}\)), and required water volume (\(\text{m}^3\)).
- **Guarantees:** Always controls farmer-facing decision badges, next irrigation dates, volume needed, and pump duration.

### 2. SECONDARY ANALYTICAL SIGNAL: Experimental ML Model
- **Role:** Provides experimental side-by-side predictions for research comparison (`sugarcane-irrigation-v1`).
- **Dataset:** Trained on external Zenodo research dataset (`10.5281/zenodo.19725692`).
- **Unit & Scale:** Marked as `LITERS_PER_DAY_DATASET_SCALE` (`NOT_DIRECTLY_COMPARABLE`).
- **Non-Interference:** Cannot override agronomic decision badges, dates, durations, or volumes.

---

## Key Subsystems Breakdown

1. **Frontend Layer (`/frontend`):**
   - Single Page Application (SPA) shell with Vanilla CSS design tokens.
   - Dynamic Gauge visualization (`gauge.js`) for soil moisture depletion.
   - Multilingual advisory translation support (English, Hindi, Kannada, Marathi).
   - Demo scenario simulator controls for live evaluation.
   - Secondary Experimental ML Analysis card with scientific disclaimers.

2. **API Gateway Layer (`backend/server.js` & `backend/routes`):**
   - Express 4 API server with rate limiting (300 req / 15 min), Helmet security headers, CORS origin verification, and UUID request tracing (`X-Request-Id`).
   - `/api/health` process liveness endpoint.
   - `/api/ready` dependency readiness endpoint (verifies PostgreSQL availability, returning 503 if disconnected).

3. **Data & Storage Layer (`backend/repositories/postgres.repository.js` & `backend/prisma`):**
   - Prisma ORM connecting to PostgreSQL database.
   - Enforces user ownership isolation (`farm.ownerId == userId`).
   - 6-hour caching for weather forecasts.
