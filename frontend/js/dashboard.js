Auth.requireLogin();

const state = {
  user: null,
  plots: [],
  currentPlotId: null,
  lang: localStorage.getItem("khet_lang") || "en",
  charts: {},
  leafletMap: null,
};

const CHART_COLORS = {
  green: "#1f4d3d",
  gold: "#c98a2c",
  blue: "#2f6f8f",
  grid: "rgba(22,33,28,0.08)",
};

const UI_TRANSLATIONS = {
  en: {
    "nav.overview": "Overview", "nav.plots": "My Plots", "nav.advisory": "Irrigation Advisory",
    "nav.weather": "Weather Forecast", "nav.sensors": "Soil & Sensors", "nav.fertigation": "Fertigation",
    "nav.yield": "Yield Prediction", "nav.alerts": "Alerts", "nav.settings": "Profile & Settings", "nav.logout": "Log out",
    "actions.addPlot": "+ Add plot", "status.today": "Today", "status.noAlerts": "All clear",
    "overview.recommendation": "Today's recommendation", "overview.soilMoisture": "Soil moisture — last 14 days", "overview.sensorPerDay": "30cm depth sensor, per day", "overview.yourPlots": "Your plots", "overview.quickStatus": "Quick status across everything you manage",
    "advisory.recommendation": "AI Irrigation Recommendation", "advisory.modelBreakdown": "Model breakdown", "advisory.calculated": "How this recommendation was calculated", "advisory.logEvent": "Log an irrigation event", "advisory.confirmPump": "Confirm a pump run so future advisories account for it",
    "labels.nextIrrigation": "Next irrigation", "labels.duration": "Duration", "labels.waterStress": "Water stress", "labels.predictedYield": "Predicted yield", "labels.cropStage": "Crop stage", "labels.waterRequirement": "Water requirement", "labels.volumeNeeded": "Volume needed", "labels.yieldLossRisk": "Yield-loss risk",
  },
  hi: {
    "nav.overview": "अवलोकन", "nav.plots": "मेरे खेत", "nav.advisory": "सिंचाई सलाह",
    "nav.weather": "मौसम पूर्वानुमान", "nav.sensors": "मिट्टी और सेंसर", "nav.fertigation": "उर्वरक सिंचाई",
    "nav.yield": "उपज अनुमान", "nav.alerts": "सूचनाएं", "nav.settings": "प्रोफ़ाइल और सेटिंग्स", "nav.logout": "लॉग आउट",
    "actions.addPlot": "+ खेत जोड़ें", "status.today": "आज", "status.noAlerts": "सब ठीक है",
    "overview.recommendation": "आज की सलाह", "overview.soilMoisture": "मिट्टी की नमी — पिछले 14 दिन", "overview.sensorPerDay": "30 सेमी सेंसर, प्रतिदिन", "overview.yourPlots": "आपके खेत", "overview.quickStatus": "आपके सभी खेतों की स्थिति",
    "advisory.recommendation": "एआई सिंचाई सलाह", "advisory.modelBreakdown": "मॉडल विवरण", "advisory.calculated": "यह सलाह कैसे तैयार की गई", "advisory.logEvent": "सिंचाई दर्ज करें", "advisory.confirmPump": "भविष्य की सलाह के लिए पंप चलने की पुष्टि करें",
    "labels.nextIrrigation": "अगली सिंचाई", "labels.duration": "अवधि", "labels.waterStress": "जल तनाव", "labels.predictedYield": "अनुमानित उपज", "labels.cropStage": "फसल अवस्था", "labels.waterRequirement": "पानी की आवश्यकता", "labels.volumeNeeded": "आवश्यक मात्रा", "labels.yieldLossRisk": "उपज हानि का जोखिम",
  },
  kn: {
    "nav.overview": "ಅವಲೋಕನ", "nav.plots": "ನನ್ನ ಹೊಲಗಳು", "nav.advisory": "ನೀರಾವರಿ ಸಲಹೆ",
    "nav.weather": "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ", "nav.sensors": "ಮಣ್ಣು ಮತ್ತು ಸೆನ್ಸರ್‌ಗಳು", "nav.fertigation": "ಫರ್ಟಿಗೇಶನ್",
    "nav.yield": "ಇಳುವರಿ ಮುನ್ಸೂಚನೆ", "nav.alerts": "ಎಚ್ಚರಿಕೆಗಳು", "nav.settings": "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು", "nav.logout": "ಲಾಗ್ ಔಟ್",
    "actions.addPlot": "+ ಹೊಲ ಸೇರಿಸಿ", "status.today": "ಇಂದು", "status.noAlerts": "ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ",
    "overview.recommendation": "ಇಂದಿನ ಸಲಹೆ", "overview.soilMoisture": "ಮಣ್ಣಿನ ತೇವಾಂಶ — ಕಳೆದ 14 ದಿನಗಳು", "overview.sensorPerDay": "30 ಸೆಂ.ಮೀ ಸೆನ್ಸರ್, ಪ್ರತಿದಿನ", "overview.yourPlots": "ನಿಮ್ಮ ಹೊಲಗಳು", "overview.quickStatus": "ನೀವು ನಿರ್ವಹಿಸುವ ಎಲ್ಲಾ ಹೊಲಗಳ ಸ್ಥಿತಿ",
    "advisory.recommendation": "AI ನೀರಾವರಿ ಸಲಹೆ", "advisory.modelBreakdown": "ಮಾದರಿ ವಿವರ", "advisory.calculated": "ಈ ಸಲಹೆಯನ್ನು ಹೇಗೆ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ", "advisory.logEvent": "ನೀರಾವರಿ ದಾಖಲಿಸಿ", "advisory.confirmPump": "ಮುಂದಿನ ಸಲಹೆಗಳಿಗೆ ಪಂಪ್ ಚಾಲನೆಯನ್ನು ದೃಢೀಕರಿಸಿ",
    "labels.nextIrrigation": "ಮುಂದಿನ ನೀರಾವರಿ", "labels.duration": "ಅವಧಿ", "labels.waterStress": "ನೀರಿನ ಒತ್ತಡ", "labels.predictedYield": "ಅಂದಾಜು ಇಳುವರಿ", "labels.cropStage": "ಬೆಳೆಯ ಹಂತ", "labels.waterRequirement": "ನೀರಿನ ಅವಶ್ಯಕತೆ", "labels.volumeNeeded": "ಅಗತ್ಯ ಪ್ರಮಾಣ", "labels.yieldLossRisk": "ಇಳುವರಿ ನಷ್ಟದ ಅಪಾಯ",
  },
  mr: {
    "nav.overview": "आढावा", "nav.plots": "माझी शेतजमीन", "nav.advisory": "सिंचन सल्ला",
    "nav.weather": "हवामान अंदाज", "nav.sensors": "माती आणि सेन्सर", "nav.fertigation": "फर्टिगेशन",
    "nav.yield": "उत्पादन अंदाज", "nav.alerts": "सूचना", "nav.settings": "प्रोफाइल आणि सेटिंग्ज", "nav.logout": "लॉग आउट",
    "actions.addPlot": "+ शेतजमीन जोडा", "status.today": "आज", "status.noAlerts": "सर्व ठीक आहे",
    "overview.recommendation": "आजची शिफारस", "overview.soilMoisture": "मातीतील ओलावा — मागील १४ दिवस", "overview.sensorPerDay": "३० सेमी सेन्सर, दररोज", "overview.yourPlots": "तुमची शेतजमीन", "overview.quickStatus": "तुम्ही व्यवस्थापित करत असलेल्या सर्व शेतांची स्थिती",
    "advisory.recommendation": "एआय सिंचन सल्ला", "advisory.modelBreakdown": "मॉडेल तपशील", "advisory.calculated": "ही शिफारस कशी मोजली गेली", "advisory.logEvent": "सिंचन नोंदवा", "advisory.confirmPump": "पुढील सल्ल्यासाठी पंप चालवल्याची पुष्टी करा",
    "labels.nextIrrigation": "पुढील सिंचन", "labels.duration": "कालावधी", "labels.waterStress": "पाण्याचा ताण", "labels.predictedYield": "अंदाजे उत्पादन", "labels.cropStage": "पिकाची अवस्था", "labels.waterRequirement": "पाण्याची गरज", "labels.volumeNeeded": "आवश्यक मात्रा", "labels.yieldLossRisk": "उत्पादन घटण्याचा धोका",
  },
};

function applyLanguage() {
  const lang = UI_TRANSLATIONS[state.lang] ? state.lang : "en";
  state.lang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = UI_TRANSLATIONS[lang][element.dataset.i18n] || UI_TRANSLATIONS.en[element.dataset.i18n];
    if (value) element.textContent = value;
  });
}

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------
async function init() {
  applyLanguage();
  state.user = Auth.getUser();
  renderSidebarUser();

  try {
    const { plots } = await api.listPlots();
    state.plots = plots;
  } catch (err) {
    showToast(err.message, "error");
  }

  populatePlotSelect();

  if (state.plots.length === 0) {
    openPlotModal();
    showToast("Welcome! Add your first plot to see live AI advisories.", "success");
  } else {
    state.currentPlotId = state.plots[0].id;
  }

  document.getElementById("lang-select").value = state.lang;

  bindNav();
  bindTopbar();
  bindPlotModal();
  bindForms();
  bindSettings();

  await loadView("overview");
}

function renderSidebarUser() {
  if (!state.user) return;
  document.getElementById("sidebar-name").textContent = state.user.name;
  document.getElementById("sidebar-village").textContent = [state.user.village, state.user.district].filter(Boolean).join(", ") || "—";
  document.getElementById("sidebar-avatar").textContent = state.user.name.charAt(0).toUpperCase();
}

function populatePlotSelect() {
  const select = document.getElementById("plot-select");
  select.innerHTML = state.plots
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("") || `<option value="">No plots yet</option>`;
  if (state.currentPlotId) select.value = state.currentPlotId;
}

function currentPlot() {
  return state.plots.find((p) => p.id === state.currentPlotId) || null;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
const VIEW_TITLES = {
  overview: "Overview",
  plots: "My Plots",
  advisory: "Irrigation Advisory",
  weather: "Weather Forecast",
  sensors: "Soil & Sensors",
  fertigation: "Fertigation",
  yield: "Yield Prediction",
  alerts: "Alerts & Notifications",
  settings: "Profile & Settings",
};

function bindNav() {
  document.querySelectorAll(".side-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      loadView(view);
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    Auth.clear();
    window.location.href = "index.html";
  });
}

async function loadView(view) {
  document.querySelectorAll(".side-link").forEach((l) => l.classList.toggle("active", l.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.getElementById("topbar-title").textContent = UI_TRANSLATIONS[state.lang][`nav.${view}`] || VIEW_TITLES[view];

  if (!currentPlot() && view !== "settings" && view !== "plots") {
    return; // wait until a plot exists
  }

  try {
    if (view === "overview") await renderOverview();
    if (view === "plots") renderPlotsGrid();
    if (view === "advisory") await renderAdvisory();
    if (view === "weather") await renderWeather();
    if (view === "sensors") await renderSensors();
    if (view === "fertigation") await renderFertigation();
    if (view === "yield") await renderYieldView();
    if (view === "alerts") await renderAlerts();
    if (view === "settings") renderSettings();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function bindTopbar() {
  document.getElementById("plot-select").addEventListener("change", (e) => {
    state.currentPlotId = e.target.value;
    const active = document.querySelector(".side-link.active").dataset.view;
    loadView(active);
  });

  document.getElementById("lang-select").addEventListener("change", (e) => {
    state.lang = UI_TRANSLATIONS[e.target.value] ? e.target.value : "en";
    applyLanguage();
    localStorage.setItem("khet_lang", state.lang);
    const active = document.querySelector(".side-link.active").dataset.view;
    loadView(active);
  });

  document.getElementById("add-plot-btn").addEventListener("click", openPlotModal);
  document.getElementById("add-plot-btn-2").addEventListener("click", openPlotModal);
}

// ---------------------------------------------------------------------------
// Plot modal
// ---------------------------------------------------------------------------
function openPlotModal() {
  document.getElementById("plot-modal-backdrop").classList.add("show");
}
function closePlotModal() {
  document.getElementById("plot-modal-backdrop").classList.remove("show");
}
function bindPlotModal() {
  document.getElementById("modal-close").addEventListener("click", closePlotModal);
  document.getElementById("plot-modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "plot-modal-backdrop") closePlotModal();
  });

  document.getElementById("plot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("plot-form-error");
    errorBox.classList.remove("show");

    const payload = {
      name: document.getElementById("plot-name").value.trim(),
      area: document.getElementById("plot-area").value,
      soilType: document.getElementById("plot-soil").value,
      variety: document.getElementById("plot-variety").value.trim(),
      plantingDate: document.getElementById("plot-planting").value,
      lat: document.getElementById("plot-lat").value || undefined,
      lng: document.getElementById("plot-lng").value || undefined,
    };

    try {
      const { plot } = await api.createPlot(payload);
      state.plots.push(plot);
      state.currentPlotId = plot.id;
      populatePlotSelect();
      closePlotModal();
      document.getElementById("plot-form").reset();
      showToast(`${plot.name} added — generating its first advisory.`, "success");
      loadView("overview");
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
    }
  });
}

// ---------------------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------------------
async function renderOverview() {
  const plot = currentPlot();
  const [summary, advisoryRes, yieldRes, sensorsRes] = await Promise.all([
    api.getDashboardSummary(),
    api.getAdvisory(plot.id, state.lang),
    api.getYield(plot.id),
    api.getSensors(plot.id),
  ]);

  const kpiHtml = [
    { label: "Total area managed", value: `${summary.totalAreaAcres} ac`, delta: `${summary.plotCount} plot(s)`, cls: "flat" },
    { label: "Avg. water stress", value: `${summary.avgWaterStressPct}%`, delta: summary.avgWaterStressPct >= 60 ? "Needs attention" : "Within range", cls: summary.avgWaterStressPct >= 60 ? "down" : "up" },
    { label: "Water needed now", value: `${summary.estimatedWaterNeedM3} m³`, delta: "Across all plots", cls: "flat" },
    { label: "Irrigation events (30d)", value: summary.irrigationEventsLast30Days, delta: `${summary.totalWaterAppliedLast30DaysM3} m³ applied`, cls: "flat" },
  ];
  document.getElementById("overview-kpis").innerHTML = kpiHtml
    .map(
      (k) => `<div class="card kpi"><span class="label">${k.label}</span><b>${k.value}</b><span class="delta ${k.cls}">${k.delta}</span></div>`
    )
    .join("");

  const advisory = advisoryRes.advisory;
  document.getElementById("overview-plot-name").textContent = plot.name;
  document.getElementById("overview-advisory-text").textContent = advisoryRes.farmerMessage;
  document.getElementById("overview-next-date").textContent = advisory.nextIrrigationInDays <= 0 ? "Today" : advisory.nextIrrigationDate;
  document.getElementById("overview-duration").textContent = `${advisory.irrigationDurationHours} hrs`;
  document.getElementById("overview-stress").textContent = `${advisory.waterStressLevel} (${advisory.waterStressProbability}%)`;
  document.getElementById("overview-yield").textContent = `${yieldRes.prediction.predictedYieldTPerHa} t/ha`;
  document.getElementById("overview-gauge").innerHTML = renderGauge({
    pct: advisory.soilMoisturePct, size: 130, stroke: 12, zones: [
      { upTo: 33, color: "#e2b673" }, { upTo: 66, color: "#f0d9a6" }, { upTo: 100, color: "#f5efdd" },
    ]
  });

  // Moisture trend chart
  const history = sensorsRes.history;
  drawLineChart("overview-moisture-chart", {
    labels: history.map((h) => h.date.slice(5)),
    datasets: [{ label: "Soil moisture (30cm) %", data: history.map((h) => h.soilMoisture30), color: CHART_COLORS.green }],
  });

  // Plots table
  const tbody = document.querySelector("#overview-plots-table tbody");
  tbody.innerHTML = summary.plots
    .map(
      (p) => `<tr><td>${p.name}</td><td>${p.cropStage}</td><td>${badgeForStress(p.waterStressLevel)}</td></tr>`
    )
    .join("");
}

function badgeForStress(level) {
  const cls = level === "High" ? "badge-high" : level === "Medium" ? "badge-medium" : "badge-low";
  return `<span class="badge ${cls}">${level}</span>`;
}

// ---------------------------------------------------------------------------
// MY PLOTS
// ---------------------------------------------------------------------------
function renderPlotsGrid() {
  const grid = document.getElementById("plots-grid");
  if (state.plots.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><h3>No plots yet</h3><p>Add your first sugarcane plot to start receiving AI advisories.</p></div>`;
    return;
  }
  grid.innerHTML = state.plots
    .map(
      (p) => `
    <div class="plot-card">
      <div class="plot-card-head">
        <h4>${p.name}</h4>
        <span class="badge badge-info">${p.crop}</span>
      </div>
      <div class="plot-meta">
        <span>${p.area} acres</span>
        <span>${p.variety}</span>
        <span>${p.soilType} soil</span>
        <span>Planted ${p.plantingDate}</span>
      </div>
      <div class="plot-actions">
        <button class="btn btn-outline btn-sm" onclick="selectPlotAndGo('${p.id}','advisory')">View advisory</button>
        <button class="btn btn-ghost btn-sm" onclick="deletePlotConfirm('${p.id}')">Remove</button>
      </div>
    </div>`
    )
    .join("");
}

function selectPlotAndGo(id, view) {
  state.currentPlotId = id;
  document.getElementById("plot-select").value = id;
  loadView(view);
}

async function deletePlotConfirm(id) {
  const plot = state.plots.find((p) => p.id === id);
  if (!confirm(`Remove ${plot.name}? This deletes its sensor and irrigation history.`)) return;
  try {
    await api.deletePlot(id);
    state.plots = state.plots.filter((p) => p.id !== id);
    if (state.currentPlotId === id) state.currentPlotId = state.plots[0]?.id || null;
    populatePlotSelect();
    renderPlotsGrid();
    showToast("Plot removed.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------------------------------------------------------------------
// IRRIGATION ADVISORY
// ---------------------------------------------------------------------------
async function renderAdvisory() {
  const plot = currentPlot();
  const [{ advisory, farmerMessage }, { logs }, langs] = await Promise.all([
    api.getAdvisory(plot.id, state.lang),
    api.getIrrigationHistory(plot.id),
    api.getAdvisoryLanguages(),
  ]);

  document.getElementById("advisory-plot-name").textContent = plot.name;
  document.getElementById("advisory-farmer-text").textContent = farmerMessage;
  document.getElementById("advisory-stage").textContent = advisory.cropStage;
  document.getElementById("advisory-etc").textContent = `${advisory.cropWaterRequirementMmPerDay} mm/day`;
  document.getElementById("advisory-volume").textContent = `${advisory.waterVolumeM3} m³`;
  document.getElementById("advisory-riskloss").textContent = `${advisory.yieldLossRiskPct}%`;
  document.getElementById("advisory-gauge").innerHTML = renderGauge({ pct: advisory.soilMoisturePct, size: 150, stroke: 14 });

  document.getElementById("advisory-lang-strip").innerHTML = langs.languages
    .map((l) => `<span class="lang-chip ${l.code === state.lang ? "active" : ""}" onclick="setLangAndReload('${l.code}')">${l.label}</span>`)
    .join("");

  const rows = [
    ["Crop age", `${advisory.cropAgeMonths} months`],
    ["Crop coefficient (Kc)", advisory.kc],
    ["Reference ET₀", `${advisory.et0MmPerDay} mm/day`],
    ["Field capacity", `${advisory.fieldCapacityPct}%`],
    ["Current soil moisture", `${advisory.soilMoisturePct}%`],
    ["Depletion vs. field capacity", `${advisory.depletionPct}%`],
    ["Net irrigation requirement", `${advisory.netIrrigationRequirementMm} mm`],
  ];
  document.querySelector("#advisory-breakdown-table tbody").innerHTML = rows
    .map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right; font-family:var(--font-mono);">${v}</td></tr>`)
    .join("");

  document.querySelector("#irrigation-history-table tbody").innerHTML = logs.length
    ? logs.slice(0, 8).map((l) => `<tr><td>${l.date}</td><td>${l.durationHours} hrs</td><td>${l.waterAppliedM3}</td></tr>`).join("")
    : `<tr><td colspan="3" style="color:var(--ink-soft)">No irrigation logged yet.</td></tr>`;
}

function setLangAndReload(code) {
  state.lang = UI_TRANSLATIONS[code] ? code : "en";
  document.getElementById("lang-select").value = state.lang;
  applyLanguage();
  localStorage.setItem("khet_lang", state.lang);
  renderAdvisory();
}

function bindForms() {
  document.getElementById("log-irrigation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const plot = currentPlot();
    const durationHours = document.getElementById("log-duration").value;
    const waterAppliedM3 = document.getElementById("log-water").value;
    try {
      await api.logIrrigation(plot.id, { durationHours, waterAppliedM3 });
      showToast("Irrigation logged.", "success");
      renderAdvisory();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// ---------------------------------------------------------------------------
// WEATHER
// ---------------------------------------------------------------------------
async function renderWeather() {
  const plot = currentPlot();
  const forecast = await api.getWeather(plot.id);
  const source = forecast.days[0]?.source === "open-meteo" ? "Live data from Open-Meteo" : "Simulated forecast (offline fallback)";
  document.getElementById("weather-source-note").textContent = source;

  document.getElementById("weather-cards").innerHTML = forecast.days
    .map(
      (d, i) => `
    <div class="card" style="padding:16px; text-align:center;">
      <div style="font-size:12px; color:var(--ink-soft); font-family:var(--font-mono);">${i === 0 ? "Today" : d.date.slice(5)}</div>
      <div style="font-size:22px; margin:10px 0 4px; font-family:var(--font-mono); color:var(--cane-green-dark);">${Math.round(d.tempMax)}°</div>
      <div style="font-size:12px; color:var(--ink-soft);">${Math.round(d.tempMin)}° min</div>
      <div style="margin-top:8px;"><span class="badge ${d.rainProbability > 55 ? "badge-info" : "badge-low"}">${d.rainProbability}% rain</span></div>
      <div style="margin-top:6px; font-size:11.5px; color:var(--ink-soft);">${d.condition}</div>
    </div>`
    )
    .join("");

  if (!state.leafletMap) {
    state.leafletMap = L.map("weather-map", { zoomControl: false, attributionControl: false }).setView([plot.lat, plot.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(state.leafletMap);
    state.leafletMarker = L.marker([plot.lat, plot.lng]).addTo(state.leafletMap).bindPopup(plot.name);
  } else {
    state.leafletMap.setView([plot.lat, plot.lng], 12);
    state.leafletMarker.setLatLng([plot.lat, plot.lng]).bindPopup(plot.name);
    setTimeout(() => state.leafletMap.invalidateSize(), 200);
  }
}

// ---------------------------------------------------------------------------
// SOIL & SENSORS
// ---------------------------------------------------------------------------
async function renderSensors() {
  const plot = currentPlot();
  const { latest, history } = await api.getSensors(plot.id);

  const kpis = [
    { label: "Soil moisture (30cm)", value: `${latest.soilMoisture30}%` },
    { label: "Soil moisture (60cm)", value: `${latest.soilMoisture60}%` },
    { label: "Soil temperature", value: `${latest.soilTempC}°C` },
    { label: "NDVI (crop health)", value: latest.ndvi },
  ];
  document.getElementById("sensor-kpis").innerHTML = kpis
    .map((k) => `<div class="card kpi"><span class="label">${k.label}</span><b>${k.value}</b></div>`)
    .join("");

  drawLineChart("sensor-chart", {
    labels: history.map((h) => h.date.slice(5)),
    datasets: [
      { label: "Soil moisture 30cm (%)", data: history.map((h) => h.soilMoisture30), color: CHART_COLORS.green },
      { label: "Soil moisture 60cm (%)", data: history.map((h) => h.soilMoisture60), color: CHART_COLORS.blue },
      { label: "Soil temperature (°C)", data: history.map((h) => h.soilTempC), color: CHART_COLORS.gold, dashed: true },
    ],
  });
}

// ---------------------------------------------------------------------------
// FERTIGATION
// ---------------------------------------------------------------------------
async function renderFertigation() {
  const plot = currentPlot();
  const { plan } = await api.getFertigation(plot.id);

  document.getElementById("fert-stage-title").textContent = `Fertigation Plan — ${plan.stage}`;
  document.getElementById("fert-note").textContent = plan.note;
  document.getElementById("fert-apply-date").textContent = plan.applyWithIrrigationOn;

  document.getElementById("fert-list").innerHTML = [
    ["Urea", plan.totalForPlot.ureaKg],
    ["DAP", plan.totalForPlot.dapKg],
    ["MOP (Potash)", plan.totalForPlot.mopKg],
  ]
    .map(([name, val]) => `<div class="fertigation-row"><span>${name} — total for ${plot.area} acres</span><b>${val} kg</b></div>`)
    .join("");

  document.querySelector("#fert-per-acre-table tbody").innerHTML = [
    ["Urea", plan.perAcre.ureaKg],
    ["DAP", plan.perAcre.dapKg],
    ["MOP (Potash)", plan.perAcre.mopKg],
  ]
    .map(([name, val]) => `<tr><td>${name}</td><td style="text-align:right; font-family:var(--font-mono);">${val}</td></tr>`)
    .join("");

  const warnBox = document.getElementById("fert-warning");
  if (plan.warning) {
    warnBox.textContent = plan.warning;
    warnBox.style.display = "block";
  } else {
    warnBox.style.display = "none";
  }
}

// ---------------------------------------------------------------------------
// YIELD PREDICTION
// ---------------------------------------------------------------------------
async function renderYieldView() {
  const plot = currentPlot();
  const { prediction, historicalStressAvg } = await api.getYield(plot.id);

  document.getElementById("yield-value").textContent = prediction.predictedYieldTPerHa;
  document.getElementById("yield-range").textContent = `${prediction.rangeLowTPerHa} – ${prediction.rangeHighTPerHa}`;
  document.getElementById("yield-confidence-note").textContent = prediction.confidenceNote;

  drawBarChart("yield-chart", {
    labels: ["Low estimate", "Predicted", "High estimate"],
    data: [prediction.rangeLowTPerHa, prediction.predictedYieldTPerHa, prediction.rangeHighTPerHa],
  });

  document.getElementById("yield-stress-gauge").innerHTML = renderGauge({
    pct: historicalStressAvg,
    size: 160,
    stroke: 14,
    zones: [{ upTo: 33, color: "#2f7d5a" }, { upTo: 66, color: "#c98a2c" }, { upTo: 100, color: "#b8442f" }],
  });
}

// ---------------------------------------------------------------------------
// ALERTS
// ---------------------------------------------------------------------------
async function renderAlerts() {
  const { alerts } = await api.getAlerts();
  const unread = alerts.filter((a) => !a.read).length;
  document.getElementById("alert-count-badge").textContent = unread > 0 ? unread : "";

  const list = document.getElementById("alerts-list");
  if (alerts.length === 0) {
    list.innerHTML = `<div class="empty-state"><h3>All clear</h3><p>No alerts across your plots right now.</p></div>`;
    return;
  }
  list.innerHTML = alerts
    .map(
      (a) => `
    <div class="alert-item ${a.read ? "is-read" : ""}">
      <span class="alert-dot ${a.severity}"></span>
      <div style="flex:1;">
        <div><b>${a.type}</b> — ${a.plotName}</div>
        <div>${a.message}</div>
        <div class="meta">${a.date}</div>
      </div>
      ${!a.read ? `<button class="btn btn-ghost btn-sm" onclick="markRead('${a.id}')">Mark read</button>` : ""}
    </div>`
    )
    .join("");
}

async function markRead(id) {
  await api.markAlertRead(id);
  renderAlerts();
}

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------
function renderSettings() {
  const u = state.user;
  document.getElementById("settings-name").textContent = u.name;
  document.getElementById("settings-mobile").textContent = u.mobile;
  document.getElementById("settings-village").textContent = u.village || "—";
  document.getElementById("settings-taluk").textContent = u.taluk || "—";
  document.getElementById("settings-district").textContent = u.district || "—";
  document.getElementById("settings-since").textContent = new Date(u.createdAt).toLocaleDateString();
  const units = localStorage.getItem("khet_units") || "metric";
  document.getElementById("settings-language").value = state.lang;
  document.getElementById("settings-units").value = units;
  ["plain-language-toggle", "irrigation-notifications", "rain-notifications", "sensor-notifications"].forEach((id) => {
    const saved = localStorage.getItem(`khet_${id}`);
    if (saved !== null) document.getElementById(id).checked = saved === "true";
  });
}

function bindSettings() {
  document.getElementById("settings-language").addEventListener("change", (e) => {
    state.lang = UI_TRANSLATIONS[e.target.value] ? e.target.value : "en";
    localStorage.setItem("khet_lang", state.lang);
    applyLanguage();
    loadView("settings");
  });
  document.getElementById("settings-units").addEventListener("change", (e) => localStorage.setItem("khet_units", e.target.value));
  ["plain-language-toggle", "irrigation-notifications", "rain-notifications", "sensor-notifications"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (e) => localStorage.setItem(`khet_${id}`, e.target.checked));
  });
  document.getElementById("edit-profile-btn").addEventListener("click", () => showToast("Profile editing will be available in a future update."));
  document.getElementById("download-data-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ user: state.user, plots: state.plots }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "khetai-my-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.getElementById("change-password-btn").addEventListener("click", () => showToast("Password reset is not connected yet."));
  document.getElementById("sign-out-all-btn").addEventListener("click", () => { Auth.clear(); window.location.href = "login.html"; });
  document.getElementById("delete-account-btn").addEventListener("click", () => showToast("Please contact an administrator to delete your account.", "error"));
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------
function drawLineChart(canvasId, { labels, datasets }) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + "22",
        borderDash: d.dashed ? [5, 4] : [],
        tension: 0.35,
        fill: datasets.length === 1,
        pointRadius: 2,
      })),
    },
    options: {
      responsive: true,
      plugins: { legend: { display: datasets.length > 1, labels: { font: { family: "Inter", size: 11 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: CHART_COLORS.grid } },
      },
    },
  });
}

function drawBarChart(canvasId, { labels, data }) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: [CHART_COLORS.gold + "aa", CHART_COLORS.green, CHART_COLORS.blue + "aa"], borderRadius: 8 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: CHART_COLORS.grid } } },
    },
  });
}

init();
