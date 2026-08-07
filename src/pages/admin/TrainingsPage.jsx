import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Alert, Confirm, Field, Modal, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { MAX_ACTIVE_TRAININGS } from "../../lib/config";

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
  const [activeCount, setActiveCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listTrainings({ q })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q]);

  // Active count is tracked separately from `items` (which the search box
  // filters) so the cap stays accurate while searching.
  const refreshActiveCount = useCallback(() => {
    api
      .listTrainings({ active_only: true })
      .then((list) => setActiveCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    refreshActiveCount();
  }, [refreshActiveCount]);

  const capReached = activeCount >= MAX_ACTIVE_TRAININGS;
  // Can't switch this training ON: at the cap and it isn't already active.
  const lockActivate = capReached && !(editing?.id && editing?.is_active);

  const openNew = () => {
    // At the cap a new training can still be created, but only as inactive.
    setForm({ ...BLANK, is_active: !capReached });
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
    setError("");

    // Cap the number of ACTIVE trainings. Block only operations that would add
    // a new active row (a new active training, or activating an inactive one).
    const willBeActive = Boolean(form.is_active);
    const wasActive = Boolean(editing?.id && editing?.is_active);
    if (willBeActive && !wasActive && capReached) {
      setError(
        `Only ${MAX_ACTIVE_TRAININGS} trainings can be active at once — that's the maximum the Safety Passport card can print. Deactivate one first, or save this as inactive.`
      );
      return;
    }

    setBusy(true);
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
      refreshActiveCount();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !editing?.id) return;
    setUploading(true);
    setError("");
    try {
      const updated = await api.uploadTrainingImage(editing.id, file);
      setForm((f) => ({ ...f, image: updated.image }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!editing?.id) return;
    setUploading(true);
    setError("");
    try {
      const updated = await api.clearTrainingImage(editing.id);
      setForm((f) => ({ ...f, image: updated.image || null }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteTraining(confirmDel.id);
      setNotice(`Deleted “${confirmDel.name}”`);
      setConfirmDel(null);
      load();
      refreshActiveCount();
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
            <div className="card-title">
              Training list{" "}
              <span className={`pill ${capReached ? "expired" : "info"}`}>
                {activeCount} / {MAX_ACTIVE_TRAININGS} active
              </span>
            </div>
            <div className="small muted">
              The configurable catalog you pick from when registering an employee.
              Up to {MAX_ACTIVE_TRAININGS} trainings can be active — the most the
              Safety Passport card can print.
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
                    <th className="hide-sm">Code</th>
                    <th>Training</th>
                    <th className="hide-sm">Category</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="mono hide-sm">{t.code}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div className="tiny muted mono" style={{ marginTop: 2 }}>
                          {t.code}
                        </div>
                      </td>
                      <td className="hide-sm">{t.category || "—"}</td>
                      <td>
                        {t.validity_months
                          ? `${t.validity_months} mo`
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

            {editing?.id ? (
              <Field
                label="Training image"
                hint="JPG, JPEG, PNG or SVG — auto-resized to 400×400. Shown on the badge."
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      flex: "0 0 auto",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: "var(--surface-2)",
                    }}
                  >
                    {form.image ? (
                      <img
                        src={form.image}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span className="tiny muted">None</span>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <label className="btn sm ghost" style={{ cursor: "pointer" }}>
                      <Icon name="image" /> {uploading ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.svg,image/png,image/jpeg,image/svg+xml"
                        onChange={onPickImage}
                        disabled={uploading}
                        style={{ display: "none" }}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        className="btn sm danger"
                        onClick={removeImage}
                        disabled={uploading}
                      >
                        <Icon name="trash" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </Field>
            ) : (
              <div className="tiny muted" style={{ marginBottom: 12 }}>
                Save the training first, then reopen it to add an image.
              </div>
            )}
            <label className="checkbox" style={{ marginBottom: lockActivate ? 6 : 14 }}>
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={set("is_active")}
                disabled={lockActivate}
              />
              <span>Active (available for new assignments)</span>
            </label>
            {lockActivate && (
              <div className="tiny muted" style={{ marginBottom: 14 }}>
                Active limit reached (max {MAX_ACTIVE_TRAININGS}) — deactivate
                another training before activating this one. It can still be
                saved as inactive.
              </div>
            )}
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
