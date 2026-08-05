import { API_BASE_URL, TOKEN_KEY } from "./config";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function readableDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  // FastAPI 422 validation errors arrive as a list
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(" · ");
  }
  return JSON.stringify(detail);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

/** Fired when the API rejects our token so the app can bounce to /login. */
function signalSessionExpired() {
  window.dispatchEvent(new CustomEvent("tv:unauthorized"));
}

export async function request(
  path,
  { method = "GET", body, auth = true, signal } = {}
) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    // Keep this user-facing: no URLs, no config key names.
    throw new ApiError(
      "Cannot reach the server. Check your internet connection and try again.",
      0,
      null
    );
  }

  if (res.status === 204) return null;

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401 && auth) signalSessionExpired();
    const message =
      readableDetail(payload?.detail) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }
  return payload;
}

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const api = {
  // ---- meta / public -----------------------------------------------------
  health: () => request("/api/health", { auth: false }),
  publicConfig: () => request("/api/public/config", { auth: false }),
  licenseStatus: () => request("/api/license/status", { auth: false }),
  getInfo: (uid) =>
    request(`/api/getInfo/${encodeURIComponent(uid)}`, { auth: false }),

  // ---- card template (Safety Passport designer) -------------------------
  getCardConfig: () => request("/api/card-config", { auth: false }),
  saveCardConfig: (cfg) => request("/api/card-config", { method: "PUT", body: cfg }),

  // ---- auth --------------------------------------------------------------
  login: (username, password) =>
    request("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { username, password },
    }),
  me: () => request("/api/auth/me"),
  changeOwnPassword: (current_password, new_password) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: { current_password, new_password },
    }),

  // ---- console (software) users -----------------------------------------
  listConsoleUsers: () => request("/api/console-users"),
  createConsoleUser: (data) =>
    request("/api/console-users", { method: "POST", body: data }),
  updateConsoleUser: (id, data) =>
    request(`/api/console-users/${id}`, { method: "PATCH", body: data }),
  resetConsoleUserPassword: (id, new_password) =>
    request(`/api/console-users/${id}/password`, {
      method: "POST",
      body: { new_password },
    }),
  deleteConsoleUser: (id) =>
    request(`/api/console-users/${id}`, { method: "DELETE" }),

  // ---- training catalog --------------------------------------------------
  listTrainings: (params) => request(`/api/trainings${qs(params)}`),
  createTraining: (data) => request("/api/trainings", { method: "POST", body: data }),
  updateTraining: (id, data) =>
    request(`/api/trainings/${id}`, { method: "PATCH", body: data }),
  deleteTraining: (id) => request(`/api/trainings/${id}`, { method: "DELETE" }),
  trainingCategories: () => request("/api/trainings/meta/categories"),

  // ---- employees ---------------------------------------------------------
  listEmployees: (params) => request(`/api/employees${qs(params)}`),
  getEmployee: (key) => request(`/api/employees/${encodeURIComponent(key)}`),
  createEmployee: (data) => request("/api/employees", { method: "POST", body: data }),
  updateEmployee: (key, data) =>
    request(`/api/employees/${encodeURIComponent(key)}`, { method: "PUT", body: data }),
  replaceTrainings: (key, items) =>
    request(`/api/employees/${encodeURIComponent(key)}/trainings`, {
      method: "PUT",
      body: items,
    }),
  deleteEmployee: (key) =>
    request(`/api/employees/${encodeURIComponent(key)}`, { method: "DELETE" }),
  departments: () => request("/api/employees/meta/departments"),
  stats: () => request("/api/employees/meta/stats"),

  // Plain URLs for <img src> / downloads. These endpoints are unauthenticated
  // so no Authorization header is needed. Backend generates them.
  qrPngUrl: (uid, boxSize = 14) =>
    `${API_BASE_URL}/api/employees/${encodeURIComponent(uid)}/qr.png?box_size=${boxSize}`,
  badgePdfUrl: (uid) =>
    `${API_BASE_URL}/api/employees/${encodeURIComponent(uid)}/badge.pdf`,
};
