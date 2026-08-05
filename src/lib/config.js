// Runtime configuration. In the final build the backend serves this frontend,
// so the API is same-origin and VITE_API_BASE_URL can be left empty.
// For split dev (vite on :5173, backend on :8000) set VITE_API_BASE_URL.
const raw = import.meta.env;

export const API_BASE_URL = (raw.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const ORG_NAME = raw.VITE_ORG_NAME || "Schneider Training Validator";
export const APP_SHORT_NAME = raw.VITE_APP_SHORT_NAME || "Training Validator";
export const QR_PATH_PREFIX = `/${(raw.VITE_QR_PATH_PREFIX || "/getInfo").replace(
  /^\/+|\/+$/g,
  ""
)}`;

export const TOKEN_KEY = "tv.token";
export const USER_KEY = "tv.user";
