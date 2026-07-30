import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Alert, Confirm, Field, Modal, Spinner } from "../../components/ui";
import { api } from "../../lib/api";

const BLANK = {
  code: "",
  name: "",
  category: "",
  description: "",
  validity_months: 0,
  is_active: true,
};

export default function TrainingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (new) | training
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listTrainings({ q })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const openNew = () => {
    setForm(BLANK);
    setEditing({});
  };
  const openEdit = (t) => {
    setForm({ ...t });
    setEditing(t);
  };
  const set = (k) => (e) => {
    const v =
      e.target.type === "checkbox"
        ? e.target.checked
        : e.target.type === "number"
        ? Number(e.target.value)
        : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category || "",
        description: form.description || "",
        validity_months: Number(form.validity_months) || 0,
        is_active: Boolean(form.is_active),
      };
      if (editing?.id) {
        await api.updateTraining(editing.id, payload);
        setNotice(`Updated “${payload.name}”`);
      } else {
        await api.createTraining(payload);
        setNotice(`Added “${payload.name}”`);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteTraining(confirmDel.id);
      setNotice(`Deleted “${confirmDel.name}”`);
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
            <div className="card-title">Training list</div>
            <div className="small muted">
              The configurable catalog you pick from when registering an employee.
            </div>
          </div>
          <div className="row">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code / name / category"
              style={{ width: 240 }}
            />
            <button className="btn primary" onClick={openNew}>
              <Icon name="plus" /> Add training
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="empty">
            No trainings configured yet. Click <b>Add training</b> to create the
            first one.
          </div>
        ) : (
          <>
            {/* desktop / tablet: table */}
            <div className="table-wrap dtable">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Training</th>
                    <th>Category</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.code}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        {t.description && (
                          <div className="tiny muted">{t.description}</div>
                        )}
                      </td>
                      <td>{t.category || "—"}</td>
                      <td>
                        {t.validity_months
                          ? `${t.validity_months} month(s)`
                          : "No expiry"}
                      </td>
                      <td>
                        <span
                          className={`pill ${t.is_active ? "valid" : "unknown"}`}
                        >
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn sm ghost"
                          onClick={() => openEdit(t)}
                          title="Edit training"
                        >
                          <Icon name="edit" />{" "}
                          <span className="btn-label">Edit</span>
                        </button>{" "}
                        <button
                          className="btn sm danger"
                          onClick={() => setConfirmDel(t)}
                          title="Delete training"
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
              {items.map((t) => (
                <div className="mcard" key={t.id}>
                  <div className="mcard-head">
                    <div className="mcard-title">
                      {t.name}
                      <span className="sub mono">{t.code}</span>
                    </div>
                    <span className={`pill ${t.is_active ? "valid" : "unknown"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mcard-rows">
                    <div className="r">
                      <span>Category</span>
                      <span>{t.category || "—"}</span>
                    </div>
                    <div className="r">
                      <span>Validity</span>
                      <span>
                        {t.validity_months
                          ? `${t.validity_months} month(s)`
                          : "No expiry"}
                      </span>
                    </div>
                  </div>
                  <div className="mcard-actions">
                    <button className="btn sm ghost" onClick={() => openEdit(t)}>
                      <Icon name="edit" /> Edit
                    </button>
                    <button
                      className="btn sm danger"
                      onClick={() => setConfirmDel(t)}
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

      {editing && (
        <Modal
          title={editing.id ? "Edit training" : "Add training"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <div className="mini-grid">
              <Field label="Code" required hint="Unique, e.g. SAF-001">
                <input
                  value={form.code}
                  onChange={set("code")}
                  required
                  placeholder="SAF-001"
                />
              </Field>
              <Field label="Category" hint="Groups the picker list">
                <input
                  value={form.category}
                  onChange={set("category")}
                  placeholder="Safety"
                  list="tv-categories"
                />
                <datalist id="tv-categories">
                  {[...new Set(items.map((i) => i.category).filter(Boolean))].map(
                    (c) => (
                      <option key={c} value={c} />
                    )
                  )}
                </datalist>
              </Field>
            </div>
            <Field label="Training name" required>
              <input
                value={form.name}
                onChange={set("name")}
                required
                placeholder="Electrical Safety Awareness"
              />
            </Field>
            <Field
              label="Validity (months)"
              hint="0 = never expires. Used to auto-fill the expiry date."
            >
              <input
                type="number"
                min="0"
                max="600"
                value={form.validity_months}
                onChange={set("validity_months")}
              />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={set("description")} />
            </Field>
            <label className="checkbox" style={{ marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={set("is_active")}
              />
              <span>Active (available for new assignments)</span>
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save training"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Confirm
        open={Boolean(confirmDel)}
        title="Delete training?"
        message={`“${confirmDel?.name}” will be removed from the catalog. Trainings already assigned to employees cannot be deleted — mark them inactive instead.`}
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
        busy={busy}
      />
    </>
  );
}
