import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import Icon from "../../components/Icon";
import { Alert, Field } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

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
      setNotice("Password changed successfully! Redirecting to login…");
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
          <h1 className="page-title">My Account</h1>
          <p className="page-sub">
            Signed in as <b>{user?.full_name || user?.username}</b> (@{user?.username} · {user?.role})
          </p>
        </div>
        <Link className="btn ghost" to="/admin/employees">
          <Icon name="arrow-left" /> Back to Console
        </Link>
      </div>

      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      {/* Main Single Card: Change Password */}
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-head">
          <div className="card-title">
            <span className="title-ico">
              <Icon name="key" />
            </span>
            Change Password
          </div>
        </div>

        <form onSubmit={submit}>
          <Field label="Current Password" required>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
            />
          </Field>

          <Field label="New Password" required hint="Minimum 6 characters">
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirm New Password" required>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          <button className="btn primary lg block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
            <Icon name="check" /> {busy ? "Updating Password…" : "Update Password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
