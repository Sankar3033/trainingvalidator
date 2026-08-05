import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import { Alert } from "../components/ui";
import { useAuth } from "../lib/auth";
import { ORG_NAME } from "../lib/config";

export default function LoginPage() {
  const { login, isAuthed, checking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isAuthed && !checking) {
    return <Navigate to={location.state?.from || "/admin"} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell narrow>
      <div className="auth-wrap">
        <div className="card auth-card">
          <div className="auth-head">
            <Logo height={42} style={{ margin: "0 auto 16px" }} />
            <h1>Admin console login</h1>
            <p className="small muted">{ORG_NAME}</p>
          </div>

          <Alert type="error" onClose={() => setError("")}>
            {error}
          </Alert>

          <form onSubmit={submit}>
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="tiny muted" style={{ textAlign: "center", marginTop: 16 }}>
            Only software administrators sign in here. Employees are verified by
            scanning their badge.
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" className="small">
            <Icon name="arrow-left" /> Back to badge scanner
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
