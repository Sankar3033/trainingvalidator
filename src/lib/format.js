/** Pull the employee UID out of whatever the camera decoded. */
export function extractUid(raw) {
  if (!raw) return "";
  const text = String(raw).trim();

  const m = text.match(/getinfo\/([^/?#\s]+)/i);
  if (m) return decodeURIComponent(m[1]).trim().toUpperCase();

  if (/^https?:\/\//i.test(text)) {
    try {
      const parts = new URL(text).pathname.split("/").filter(Boolean);
      if (parts.length) return decodeURIComponent(parts[parts.length - 1]).toUpperCase();
    } catch {
      /* fall through */
    }
  }
  return text.toUpperCase();
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABEL = {
  valid: "Valid",
  expiring: "Expiring soon",
  expired: "Expired",
  unknown: "Unknown",
};

export function expiryText(t) {
  if (!t.expires_on) return "No expiry";
  if (t.status === "expired")
    return `Expired ${Math.abs(t.days_to_expiry ?? 0)} day(s) ago`;
  if (t.days_to_expiry === 0) return "Expires today";
  return `${t.days_to_expiry} day(s) left`;
}

export function todayISO() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}
