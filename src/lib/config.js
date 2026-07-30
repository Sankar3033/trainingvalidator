// All runtime configuration comes from Vite env vars (see .env.example).
const raw = import.meta.env;

export const API_BASE_URL = (raw.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

export const ORG_NAME = raw.VITE_ORG_NAME || "Training Validator";
export const APP_SHORT_NAME = raw.VITE_APP_SHORT_NAME || "Training Validator";
export const QR_PATH_PREFIX = `/${(raw.VITE_QR_PATH_PREFIX || "/getInfo").replace(
  /^\/+|\/+$/g,
  ""
)}`;

export const TOKEN_KEY = "tv.token";
export const USER_KEY = "tv.user";
