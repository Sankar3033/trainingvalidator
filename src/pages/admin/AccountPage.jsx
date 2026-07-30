import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import Icon from "../../components/Icon";
import { Alert, Field } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDateTime } from "../../lib/format";

function initials(user) {
  const name = user?.full_name || user?.username || "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.changeOwnPassword(current, next);
      setNotice("Password changed. Please sign in again with the new password.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell narrow>
      <div className="page-head">
        <div>
          <h1 className="page-title">My profile</h1>
          <p className="page-sub">Your account and password.</p>
        </div>
        <Link className="btn ghost" to="/admin/employees">
          <Icon name="arrow-left" /> Back to console
        </Link>
      </div>

      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      <div className="card">
        <div className="identity">
          <div className="avatar">{initials(user)}</div>
          <div className="who">
            <h1 style={{ fontSize: 20 }}>{user?.full_name || user?.username}</h1>
            <div className="sub">
              @{user?.username} · <span className="pill info">{user?.role}</span>
            </div>
          </div>
        </div>
        <dl className="kv" style={{ marginTop: 16 }}>
          <dt>Username</dt>
          <dd className="mono">{user?.username}</dd>
          <dt>Full name</dt>
          <dd>{user?.full_name || "—"}</dd>
          <dt>Role</dt>
          <dd>{user?.role}</dd>
          <dt>Last login</dt>
          <dd>{user?.last_login_at ? formatDateTime(user.last_login_at) : "—"}</dd>
        </dl>
      </div>

      <div className="card" style={{ maxWidth: 470 }}>
        <div className="card-head">
          <div className="card-title">
            <span className="title-ico">
              <Icon name="key" />
            </span>
            Change password
          </div>
        </div>
        <form onSubmit={submit}>
          <Field label="Current password" required>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" required hint="Minimum 6 characters">
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" required>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <button className="btn primary" type="submit" disabled={busy}>
            <Icon name="check" /> {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
