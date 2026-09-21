# KhetAI — Irrigation Advisory

KhetAI is a software decision-support application for sugarcane cultivation. It combines plot parameters, soil telemetry, localized weather forecasts, and transparent FAO-56 agronomic calculations to deliver precise irrigation, fertigation, and yield guidance.

> **Project Operational Status**: KhetAI is **PROJECT DEMO-READY** for software assessments and technical demonstrations. Physical IoT hardware is not connected (telemetry is simulated), and the ML layer is experimental. The primary recommendation engine is governed by the FAO-56 Agronomic Baseline.

---

## Key Features

- **FAO-56 Agronomic Irrigation Engine**: Calculates reference evapotranspiration (\(ET_0\)), crop coefficient (\(K_c\)), crop evapotranspiration (\(ET_c\)), available water capacity (AWC), and Management Allowed Depletion (MAD) to recommend net irrigation volume (\(\text{m}^3\)) and pump runtime (hours).
- **Multilingual Advisory**: Plain-language recommendations in English, Hindi, Kannada, and Marathi.
- **Telemetry & Weather Ingestion**:
  - Telemetry: Deterministic, physics-consistent soil moisture depletion simulator (`provenance: SIMULATED`).
  - Weather: Live 5-day ET₀ forecast via Open-Meteo API with PostgreSQL 6-hour cache and historical climate fallback.
- **Interactive Demo Scenario Simulator**: Live backend execution of field conditions (`SCENARIO_1_NORMAL`, `SCENARIO_2_LOW_MOISTURE`, `SCENARIO_3_RAIN_EXPECTED`, `SCENARIO_4_STALE_SENSOR`).
- **Experimental ML Analysis Layer**: Pure JavaScript Ridge Linear Regression model (`sugarcane-irrigation-v1`) trained on external sugarcane research data (Zenodo DOI: `10.5281/zenodo.19725692`). Held-out test set metrics: \(R^2 = 0.8507\) (original scale) and \(R^2 = 0.9421\) (\(\log_{10}\) scale). Explicitly marked `NOT_DIRECTLY_COMPARABLE` and secondary to the agronomic engine.
- **Security & Authorization**: JWT authentication, bcrypt password hashing, rate limiting, Helmet HTTP security headers, and strict multi-tenant ownership isolation (`farm.ownerId == userId`).
- **Data Persistence**: Relational schema in PostgreSQL managed via Prisma ORM.

---

## System Architecture Overview

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

## Quick Start & Setup

### Prerequisites

- Node.js (v18+)
- npm
- PostgreSQL database (local or Supabase)

### 1. Clone & Install

```bash
git clone <repository-url>
cd KhetAI-Irrigation-Advisory/backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env`:

```dotenv
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/khetai?schema=public
JWT_SECRET=your_secret_min_32_characters_here
NODE_ENV=development
```

### 3. Run Prisma Migrations

```bash
npx prisma migrate deploy
```

### 4. Start Server

```bash
npm start
```

Open `http://localhost:5000` in your web browser.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars in production) | `your_long_jwt_secret_key` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5000` |
| `NODE_ENV` | Runtime mode (`development` or `production`) | `development` |

---

## Testing

Run the full automated test suite using `vitest`:

```bash
cd backend
npm test
```

### Test Results
- **Passed:** 71 unit and contract tests
- **Failed:** 0
- **Skipped:** 7 (PostgreSQL integration tests requiring live DB connection)

---

## Documentation

Complete documentation is available in the `docs/` folder:

- [`docs/PROJECT_DEMO_SCRIPT.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/PROJECT_DEMO_SCRIPT.md): 5–10 minute step-by-step evaluator presentation script.
- [`docs/PROJECT_FACTS.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/PROJECT_FACTS.md): Comprehensive project FAQ answering 16 technical questions.
- [`docs/FINAL_ARCHITECTURE.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/FINAL_ARCHITECTURE.md): System architecture, decision hierarchy, and non-interference guarantees.
- [`docs/FINAL_PROJECT_READINESS.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/FINAL_PROJECT_READINESS.md): Subsystem readiness matrix, test verification, and known limitations.
- [`docs/EXTERNAL_DATASET_AUDIT.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/EXTERNAL_DATASET_AUDIT.md): Full audit of Zenodo research dataset (DOI: `10.5281/zenodo.19725692`).
- [`docs/ML_IRRIGATION_MODEL.md`](file:///c:/Users/sudha/Downloads/New%20folder%20%282%29/KhetAI-Irrigation-Advisory/docs/ML_IRRIGATION_MODEL.md): Model specification, pure JS inference engine, dual-scale test metrics, and unit comparability details.

---

## Known Limitations

1. **Hardware Scope:** Telemetry is simulated (`provenance: SIMULATED`). Physical IoT hardware is not connected.
2. **Experimental ML Scale:** The ML model was trained on an external model-simulated research dataset (`10.5281/zenodo.19725692`) whose target `drip_liters_per_day` represents unscaled daily simulation outputs. It is explicitly marked `NOT_DIRECTLY_COMPARABLE` to KhetAI's plot water volume calculations (\(\text{m}^3\)).
3. **Operational Scope:** KhetAI is **project demo-ready** for software evaluation and technical assessment, not operationally validated for commercial farming deployment.
