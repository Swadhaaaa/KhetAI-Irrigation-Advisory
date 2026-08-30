const Auth = {
  getToken() { return localStorage.getItem("khet_token"); },
  setSession(token, user) {
    localStorage.setItem("khet_token", token);
    localStorage.setItem("khet_user", JSON.stringify(user));
  },
  getUser() {
    const raw = localStorage.getItem("khet_user");
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem("khet_token");
    localStorage.removeItem("khet_user");
  },
  isLoggedIn() { return !!this.getToken(); },
  requireLogin() {
    if (!this.isLoggedIn()) window.location.href = "login.html";
  },
};

async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.getToken()) headers.Authorization = `Bearer ${Auth.getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (res.status === 401 && auth) {
    Auth.clear();
    window.location.href = "login.html";
    return Promise.reject(new Error("Session expired"));
  }

  if (!res.ok) {
    const message = (data && data.error) || (res.status === 404
      ? "Backend API not found. Check the deployed backend URL."
      : `Request failed (${res.status})`);
    throw new Error(message);
  }
  return data;
}

const api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => apiRequest("/auth/me"),

  listPlots: () => apiRequest("/plots"),
  createPlot: (payload) => apiRequest("/plots", { method: "POST", body: payload }),
  updatePlot: (id, payload) => apiRequest(`/plots/${id}`, { method: "PUT", body: payload }),
  deletePlot: (id) => apiRequest(`/plots/${id}`, { method: "DELETE" }),

  getWeather: (plotId) => apiRequest(`/weather/${plotId}`),
  getSensors: (plotId) => apiRequest(`/sensors/${plotId}`),
  getAdvisory: (plotId, lang = "en") => apiRequest(`/advisory/${plotId}?lang=${lang}`),
  getAdvisoryLanguages: () => apiRequest(`/advisory/languages`),
  logIrrigation: (plotId, payload) => apiRequest(`/advisory/${plotId}/log`, { method: "POST", body: payload }),
  getIrrigationHistory: (plotId) => apiRequest(`/advisory/${plotId}/history`),
  getFertigation: (plotId) => apiRequest(`/fertigation/${plotId}`),
  getYield: (plotId) => apiRequest(`/yield/${plotId}`),
  getAlerts: () => apiRequest(`/alerts`),
  markAlertRead: (id) => apiRequest(`/alerts/${id}/read`, { method: "POST" }),
  getDashboardSummary: () => apiRequest(`/dashboard/summary`),
};

function showToast(message, type = "default") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
