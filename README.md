# KhetAI — AI Irrigation Advisory System for Sugarcane

A full working implementation of the **KJS-AGR-01** use case: *"Irrigation Advisory
System for Sugarcane Crop using AI and Sensor-based Technology"* (KIAAR &
Godavari Biorefineries Ltd., K J Somaiya Institute of Technology).

It includes:

- A marketing **landing page**, **login/signup**, and a full **dashboard**.
- A real **Node.js/Express backend API** with JWT authentication.
- Nine rule-based "AI" models (irrigation date & duration, crop water
  requirement, water-stress probability, rainfall-adjusted advisory, yield-loss
  risk, fertigation plan, yield prediction, alerts, and a multilingual
  farmer-friendly advisory generator) — all computed live from real inputs,
  not hardcoded.
- **Live weather** from the free [Open-Meteo](https://open-meteo.com) API
  (falls back to a realistic simulator if you're offline).
- Simulated **IoT soil-moisture sensors** with believable day-by-day trends.
- Charts (Chart.js) and a plot-location map (Leaflet/OpenStreetMap).
- A tiny JSON-file database (`backend/data/db.json`) — no external database
  server to install.

---

## 1. Project structure

```
irrigation-advisory-system/
├── backend/
│   ├── server.js            # Express app entry point (also serves the frontend)
│   ├── db.js                 # JSON file "database" helpers
│   ├── data/db.json           # Your data lives here (auto-created/updated)
│   ├── middleware/auth.js     # JWT auth guard
│   ├── routes/                # One file per API resource
│   ├── utils/
│   │   ├── aiEngine.js         # The irrigation/fertigation/yield "AI" models
│   │   ├── weather.js          # Open-Meteo integration + offline fallback
│   │   ├── sensorSim.js        # Simulated IoT sensor data generator
│   │   ├── multilingual.js     # LLM-style multilingual advisory templates
│   │   └── seed.js             # Optional demo-data seeding script
│   ├── package.json
│   └── .env                    # Local configuration (already filled in)
└── frontend/
    ├── index.html               # Landing page
    ├── login.html / signup.html # Auth pages
    ├── dashboard.html            # Main app (single page, tab-based)
    ├── css/style.css
    └── js/                        # api.js, dashboard.js, gauge.js, config.js
```

The backend serves the frontend as static files, so **you only need to run
one server** to use the whole app.

---

## 2. Prerequisites

- [Node.js](https://nodejs.org) version **18 or newer** (check with `node -v`).
  Node 18+ is required because the weather integration uses the built-in
  `fetch` API.
- [Visual Studio Code](https://code.visualstudio.com) (or any editor).

---

## 3. Open the project in VS Code

1. Unzip the folder you downloaded.
2. Open VS Code → **File → Open Folder…** → select the unzipped
   `irrigation-advisory-system` folder.
3. Open a terminal inside VS Code: **Terminal → New Terminal**.

---

## 4. Install and run

In the VS Code terminal:

```bash
cd backend
npm install
npm start
```

You should see:

```
🌾  Sugarcane Irrigation Advisory server running
    → http://localhost:5000
```

Now open **http://localhost:5000** in your browser. That's it — the landing
page, login, signup and dashboard are all served from this one address.

### Optional: load demo data instantly

Instead of registering a new account and adding plots by hand, you can seed a
ready-made demo farmer with two plots and two weeks of sensor history:

```bash
npm run seed
```

Then log in with:
- **Mobile:** `9999999999`
- **Password:** `demo1234`

### Developer mode (auto-restart on file changes)

```bash
npm run dev
```

(This uses `nodemon`, already listed in `devDependencies`.)

---

## 5. Using the app

1. **Sign up** (or log in with the demo account above).
2. **Add a plot** — name, area, soil type, sugarcane variety and planting
   date. Two weeks of realistic sensor history are generated automatically so
   charts aren't empty.
3. Explore the sidebar:
   - **Overview** — key numbers across all your plots plus today's advisory.
   - **My Plots** — manage plots (add/remove).
   - **Irrigation Advisory** — the full AI recommendation, the calculation
     breakdown, and a form to log real irrigation events.
   - **Weather Forecast** — live 5-day forecast + a map of the plot location.
   - **Soil & Sensors** — soil moisture/temperature/NDVI trend charts.
   - **Fertigation** — Urea/DAP/MOP dosing recommendation for the plot.
   - **Yield Prediction** — predicted tonnes/hectare with a confidence range.
   - **Alerts** — live-generated alerts (low moisture, incoming rain, overdue
     irrigation, sensor status).
   - **Profile & Settings** — your farmer profile.
4. Switch the **language selector** (top bar) to see the advisory in English,
   Hindi, Kannada or Marathi.
5. Switch the **plot selector** (top bar) to move between your plots — every
   view updates for the selected plot.

---

## 6. How the "AI" actually works

To keep the project runnable without training real machine-learning models or
needing API keys, every prediction is computed with transparent agronomic
formulas in `backend/utils/aiEngine.js` (FAO-56 style crop-coefficient curves,
soil-moisture depletion, a Hargreaves-style ET₀ estimate, etc.) — driven by
**live weather and sensor data**, not fixed numbers. That means:

- Two different plots (different soil, crop age, or area) get **different**
  recommendations.
- The same plot's advisory **changes day to day** as weather and simulated
  soil moisture change.

This is intentionally structured so you can swap in a real trained ML model
later: every function in `aiEngine.js` has a clear input/output contract you
can replace without touching the routes or frontend.

---

## 7. Customizing

- **Change the color/typography system:** edit the CSS variables at the top
  of `frontend/css/style.css`.
- **Add a new dashboard section:** add a `<section class="view" id="view-x">`
  in `dashboard.html`, a sidebar link with `data-view="x"`, and a
  `renderX()` function in `dashboard.js`.
- **Add a new AI model:** add a function to `backend/utils/aiEngine.js`, wire
  it into a route, and call it from `frontend/js/api.js`.
- **Swap the database:** everything goes through `backend/db.js`. Replace its
  internals with a real database client and keep the same function names
  (`getAll`, `insert`, `update`, `remove`, `findById`) and no route code needs
  to change.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `npm start` fails with a `fetch is not defined` error | Upgrade Node.js to version 18+. |
| Port 5000 already in use | Edit `PORT` in `backend/.env`, then restart. |
| Weather shows "Simulated forecast" | Your machine has no internet access to `api.open-meteo.com`, or a firewall blocks it — the fallback keeps the app working either way. |
| "Session expired" right after logging in | Clear your browser's local storage for `localhost:5000` and log in again — this can happen if `JWT_SECRET` was changed after a token was issued. |
| Want to reset all data | Stop the server, replace the contents of `backend/data/db.json` with `{"users":[],"plots":[],"sensorReadings":[],"irrigationLogs":[],"alerts":[]}`, and restart. |

---

## 9. Use case reference

This build follows the *Framework for AI Use Case Integration in Curriculum
Delivery — KJS-AGR-01* document: irrigation and fertigation advisory,
water-stress/yield prediction, multilingual LLM-based advisory generation, a
farmer dashboard, and alerting — mapped to a working full-stack application.
