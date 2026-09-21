# KhetAI — 5 to 10 Minute End-to-End Project Demo Script

This script provides a step-by-step walkthrough for demonstrating KhetAI to project evaluators, agricultural extension officers, or technical assessors.

---

## Demo Overview & Timing

| Step | Topic | Duration | Key Talking Point |
|---|---|---|---|
| **1** | **Problem Statement** | 0.5 min | Sugarcane irrigation scheduling is often unscientific, causing water waste or yield loss. |
| **2** | **KhetAI Dashboard** | 0.5 min | Unified farmer workspace showing managed area, stress indicators, and plot status. |
| **3** | **Plot & Crop Profile** | 0.5 min | Detailed sugarcane plot metadata (area, soil type, variety, planting date). |
| **4** | **Sensor Telemetry (Simulated)** | 0.5 min | Topsoil moisture & temperature telemetry (`provenance: SIMULATED`). |
| **5** | **Live Weather Ingestion** | 0.5 min | Live 5-day ET₀ forecast via Open-Meteo API with fallback caching. |
| **6** | **Irrigation Recommendation** | 1.0 min | Clear primary answer: Should I irrigate? When? Volume? Duration? |
| **7** | **Agronomic Explanation** | 0.5 min | Plain-language breakdown of Kc stage, ET₀ demand, and soil depletion budget. |
| **8** | **Live Scenario Demo Controls** | 1.0 min | Real-time backend execution of Low Moisture, Rain Expected, and Stale Sensor scenarios. |
| **9** | **Irrigation Logging & History** | 0.5 min | Logging pump runtime to PostgreSQL to adjust future depletion budgets. |
| **10** | **Alerts & Notifications** | 0.5 min | Automated water stress and weather event warnings. |
| **11** | **Fertigation Plan** | 0.5 min | Stage-specific N-P-K nutrient application guidelines synchronized with irrigation. |
| **12** | **Yield Prediction** | 0.5 min | Water-stress impact modeling on projected sugarcane tonnage per hectare. |
| **13** | **Experimental ML Analysis** | 1.0 min | Secondary analytical model trained on Zenodo sugarcane research data (`NOT_DIRECTLY_COMPARABLE`). |
| **14** | **Technical Architecture** | 0.5 min | Node.js Express, PostgreSQL / Prisma, JWT security, and hybrid baseline architecture. |
| **15** | **Software Scope & Limitations** | 0.5 min | Clear disclosure of simulated sensor data and experimental ML gating. |

---

## Step-by-Step Walkthrough Instructions

### 1. Problem Statement (30 seconds)
> *"Sugarcane is a high-water-requirement crop. Farmers frequently over-irrigate or under-irrigate due to lack of localized evapotranspiration and soil moisture insights. KhetAI delivers localized, data-driven irrigation advice."*

### 2. Dashboard Overview (30 seconds)
- Open `dashboard.html` (or click **🌱 Instant Demo Login** on the login screen).
- Point out the KPI summary: Total Area Managed, Average Water Stress %, Total Water Needed Now, and Managed Plots Table.

### 3. Plot & Crop Profile (30 seconds)
- Navigate to **My Plots** view.
- Show *Sugarcane Block A* (2.5 acres, Clay Loam soil, Co 86032 variety, drip irrigation).

### 4. Soil & Sensor Telemetry (30 seconds)
- Navigate to **Soil & Sensors** view.
- Point out 14-day soil moisture trend at 30cm depth.
- Highlight the **Trust Badge**: *"Sensor data: Simulated demo data"* (`provenance: SIMULATED`).

### 5. Weather Forecast (30 seconds)
- Navigate to **Weather Forecast** view.
- Point out the 5-day forecast for lat 16.5, lng 75.1 (Sameerwadi/Mudhol, Karnataka).
- Highlight the **Trust Badge**: *"Weather: Live weather forecast"* (retrieved live via Open-Meteo API).

### 6. Irrigation Advisory — Primary Recommendation (1 minute)
- Navigate to **Irrigation Advisory** view.
- Show the 4 core farmer answers:
  1. **Should I irrigate?** — Decision Badge (`MONITOR`, `IRRIGATE_NOW`, `IRRIGATE_SOON`).
  2. **When?** — Recommended date (e.g. *Today* or *In 3 days*).
  3. **How much water?** — Volume needed in \(\text{m}^3\).
  4. **For how long?** — Recommended pump runtime in hours.

### 7. Agronomic Explanation (30 seconds)
- Scroll down to **"WHY THIS RECOMMENDATION?"**.
- Show the plain-language bullets detailing soil moisture depletion vs field capacity, reference ET₀ demand, and crop coefficient (Kc).

### 8. Live Scenario Demo Controls (1 minute)
- Scroll to **SIMULATED SCENARIO DEMO CONTROL**.
- Click **Low Moisture (14% - Irrigate)**: Observe the decision badge update immediately to `IRRIGATE_NOW`.
- Click **Rain Forecast (25mm)**: Observe the decision badge delay irrigation to `MONITOR`.
- Click **Stale / Invalid Sensor**: Observe the decision badge update to `INSUFFICIENT_DATA`.
- *Note for Evaluators: Scenario execution runs real backend FAO-56 decision logic.*

### 9. Irrigation Logging & History (30 seconds)
- On the Advisory tab, locate **Log an irrigation event**.
- Enter runtime (e.g. 2.5 hours) and volume (120 \(\text{m}^3\)) and submit.
- Show the new record appearing in **Recent irrigation history**.

### 10. Alerts & Notifications (30 seconds)
- Navigate to **Alerts** view.
- Show active high/medium stress notifications generated from sensor and weather triggers.

### 11. Fertigation Guidelines (30 seconds)
- Navigate to **Fertigation** view.
- Show stage-specific N-P-K recommendation per acre for the current growth stage.

### 12. Yield Prediction (30 seconds)
- Navigate to **Yield Prediction** view.
- Show projected tonnage per hectare (e.g. 95 t/ha) driven by 14-day cumulative water stress exposure.

### 13. Experimental ML Analysis (1 minute)
- Return to **Irrigation Advisory** and locate **Experimental ML Analysis** (below the scenario panel).
- Highlight:
  - **Algorithm & Version**: Multiple Linear Regression (`sugarcane-irrigation-v1`).
  - **Dataset Source**: External Sugarcane Research Dataset (Zenodo DOI: `10.5281/zenodo.19725692`).
  - **Dataset Origin**: `MODEL_SIMULATED` (CatBoost pipeline simulation outputs).
  - **Metrics**: Held-out test set \(R^2 = 0.8507\) (original scale) and \(R^2 = 0.9421\) (\(\log_{10}\) scale).
  - **Comparability Warning**: Marked as `NOT_DIRECTLY_COMPARABLE` because dataset target scale represents unscaled daily model outputs, whereas KhetAI calculates event-level plot water requirements.
  - **Non-Interference Guarantee**: The ML model never overrides the Agronomic Baseline recommendation.
  - **Scientific Disclaimer**: Prominently displayed callout.

### 14. Technical Architecture (30 seconds)
- Click **View Technical Details & Provenance**.
- Highlight Express API, Prisma / PostgreSQL storage, JWT authentication, and structured error handling.

### 15. Software Scope & Limitations (30 seconds)
- Summarize honest status: KhetAI is a complete software application demo. No physical IoT hardware is connected; sensor data is simulated; ML model status is experimental; FAO-56 agronomic engine is the primary recommendation engine.
