import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Alert, Confirm, Field, Modal, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDateTime } from "../../lib/format";

const BLANK = {
  username: "",
  password: "",
  full_name: "",
  role: "admin",
  is_active: true,
};

export default function ConsoleUsersPage() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listConsoleUsers()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createConsoleUser(form);
      setNotice(`Admin user “${form.username}” created`);
      setForm(BLANK);
      setCreating(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    setError("");
    try {
      await api.updateConsoleUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (u, role) => {
    setError("");
    try {
      await api.updateConsoleUser(u.id, { role });
      setNotice(`${u.username} is now ${role}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetPw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.resetConsoleUserPassword(pwTarget.id, newPw);
      setNotice(`Password reset for ${pwTarget.username}`);
      setPwTarget(null);
      setNewPw("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteConsoleUser(confirmDel.id);
      setNotice(`Deleted ${confirmDel.username}`);
      setConfirmDel(null);
      load();
    } catch (err) {
      setError(err.message);
      setConfirmDel(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Admin users</div>
            <div className="small muted">
              Logins for this admin panel. Not the same as employees.
            </div>
          </div>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> Add admin user
          </button>
        </div>

        <Alert type="info">
          <b>superadmin</b> can manage admin users; <b>admin</b> can manage
          employees and trainings.
        </Alert>

        {loading ? (
          <Spinner />
        ) : (
          <>
            {/* desktop / tablet: table */}
            <div className="table-wrap dtable">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td className="mono">
                        {u.username}
                        {u.id === me?.id && (
                          <span
                            className="pill info tiny"
                            style={{ marginLeft: 6 }}
                          >
                            you
                          </span>
                        )}
                      </td>
                      <td>{u.full_name || "—"}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value)}
                          disabled={u.id === me?.id}
                          style={{ width: 130 }}
                        >
                          <option value="superadmin">superadmin</option>
                          <option value="admin">admin</option>
                          <option value="viewer">viewer</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`pill ${u.is_active ? "valid" : "expired"}`}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="small muted">
                        {u.last_login_at
                          ? formatDateTime(u.last_login_at)
                          : "never"}
                      </td>
                      <td className="actions">
                        <button
                          className="btn sm ghost"
                          onClick={() => setPwTarget(u)}
                          title="Reset password"
                        >
                          <Icon name="key" /> Password
                        </button>{" "}
                        <button
                          className="btn sm ghost"
                          onClick={() => toggleActive(u)}
                          disabled={u.id === me?.id}
                          title={u.is_active ? "Disable account" : "Enable account"}
                        >
                          <Icon name={u.is_active ? "ban" : "check"} />{" "}
                          {u.is_active ? "Disable" : "Enable"}
                        </button>{" "}
                        <button
                          className="btn sm danger"
                          onClick={() => setConfirmDel(u)}
                          disabled={u.id === me?.id}
                          title="Delete admin user"
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile: cards */}
            <div className="mlist">
              {items.map((u) => (
                <div className="mcard" key={u.id}>
                  <div className="mcard-head">
                    <div className="mcard-title">
                      <span className="mono">{u.username}</span>
                      {u.id === me?.id && (
                        <span className="pill info" style={{ marginLeft: 6 }}>
                          you
                        </span>
                      )}
                      <span className="sub">{u.full_name || "—"}</span>
                    </div>
                    <span className={`pill ${u.is_active ? "valid" : "expired"}`}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="mcard-rows">
                    <div className="r">
                      <span>Role</span>
                      <span>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value)}
                          disabled={u.id === me?.id}
                        >
                          <option value="superadmin">superadmin</option>
                          <option value="admin">admin</option>
                          <option value="viewer">viewer</option>
                        </select>
                      </span>
                    </div>
                    <div className="r">
                      <span>Last login</span>
                      <span>
                        {u.last_login_at
                          ? formatDateTime(u.last_login_at)
                          : "never"}
                      </span>
                    </div>
                  </div>
                  <div className="mcard-actions">
                    <button
                      className="btn sm ghost"
                      onClick={() => setPwTarget(u)}
                    >
                      <Icon name="key" /> Password
                    </button>
                    <button
                      className="btn sm ghost"
                      onClick={() => toggleActive(u)}
                      disabled={u.id === me?.id}
                    >
                      <Icon name={u.is_active ? "ban" : "check"} />{" "}
                      {u.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="btn sm danger"
                      onClick={() => setConfirmDel(u)}
                      disabled={u.id === me?.id}
                    >
                      <Icon name="trash" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {creating && (
        <Modal title="Add admin user" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <div className="mini-grid">
              <Field label="Username" required>
                <input
                  value={form.username}
                  onChange={set("username")}
                  required
                  minLength={3}
                  placeholder="jdoe"
                />
              </Field>
              <Field label="Full name">
                <input value={form.full_name} onChange={set("full_name")} />
              </Field>
              <Field label="Password" required hint="Minimum 6 characters">
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  required
                  minLength={6}
                />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={set("role")}>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                  <option value="viewer">viewer</option>
                </select>
              </Field>
            </div>
            <label className="checkbox" style={{ marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={set("is_active")}
              />
              <span>Active</span>
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pwTarget && (
        <Modal
          title={`Reset password · ${pwTarget.username}`}
          onClose={() => setPwTarget(null)}
        >
          <form onSubmit={resetPw}>
            <Field label="New password" required hint="Minimum 6 characters">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
                autoFocus
              />
            </Field>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPwTarget(null)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Reset password"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Confirm
        open={Boolean(confirmDel)}
        title="Delete admin user?"
        message={`“${confirmDel?.username}” will lose access to the admin panel immediately.`}
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
        busy={busy}
      />
    </>
  );
}
