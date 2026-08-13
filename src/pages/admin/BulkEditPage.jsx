import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AssetsCardBack, AssetsCardFront } from "../../components/AssetsCard";
import Icon from "../../components/Icon";
import { Alert, Field, Modal, Spinner, StatusPill } from "../../components/ui";
import { api } from "../../lib/api";
import { badgeFileName, buildBadgePdf, captureCards } from "../../lib/badgeExport";
import { formatDate, todayISO } from "../../lib/format";
import { cached, invalidate, KEYS } from "../../lib/prefetch";

const BLANK_NEW = {
  name: "",
  employee_id: "",
  department: "",
  designation: "",
  contract: "",
  passport_no: "",
  valid_up_to: "",
  is_active: true,
};

/** Draft shape used by the editor rows. `uid` empty => this row is a create. */
function toDraft(emp) {
  return {
    key: emp.uid || `new:${emp._tmp}`,
    uid: emp.uid || "",
    name: emp.name || "",
    employee_id: emp.employee_id || "",
    contract: emp.contract || "",
    passport_no: emp.passport_no || "",
    valid_up_to: emp.valid_up_to || "",
    department: emp.department || "",
    designation: emp.designation || "",
    email: emp.email || "",
    phone: emp.phone || "",
    location: emp.location || "",
    notes: emp.notes || "",
    is_active: emp.is_active !== false,
    trainings: (emp.trainings || []).map((t) => ({
      training_id: t.training_id,
      completed_on: t.completed_on || todayISO(),
      expires_on: t.expires_on || "",
      trainer: t.trainer || "",
      certificate_no: t.certificate_no || "",
      score: t.score ?? null,
      remarks: t.remarks || "",
    })),
  };
}

function addMonths(iso, months) {
  if (!iso || !months) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  const pad = (n) => String(n).padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

/** Local mirror of the backend's expiry classification, for the chips. */
function statusOf(expires_on) {
  if (!expires_on) return "valid";
  const today = todayISO();
  if (expires_on < today) return "expired";
  const warn = addMonths(today, 1); // ~30 days, matches EXPIRY_WARNING_DAYS
  return expires_on <= warn ? "expiring" : "valid";
}

export default function BulkEditPage() {
  const [roster, setRoster] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_NEW);
  const [trainingFor, setTrainingFor] = useState(null); // draft key
  const [results, setResults] = useState(null);

  // Badge export needs the card template + the per-training images.
  const [cardCfg, setCardCfg] = useState(null);
  const [trainingImages, setTrainingImages] = useState(null);
  const [stage, setStage] = useState(null); // employee currently being captured
  const stageRef = useRef(null);
  const tmpId = useRef(0);
  const pending = useRef(new Set());
  const timer = useRef(null);

  useEffect(() => {
    Promise.all([
      api.employeesPicker(),
      cached(KEYS.trainings, () => api.listTrainings()),
      cached(KEYS.departments, () => api.departments()).catch(() => []),
    ])
      .then(([people, cat, deps]) => {
        setRoster(people || []);
        setCatalog(cat || []);
        setDepartments(deps || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Badge assets load in the background — only the Print button needs them.
  useEffect(() => {
    cached(KEYS.cardConfig, () => api.getCardConfig())
      .then(setCardCfg)
      .catch(() => setCardCfg({}));
    cached(KEYS.trainingImages, () => api.trainingImages({ active_only: true }))
      .then((rows) => {
        const byId = {};
        (rows || []).forEach((r) => {
          byId[r.id] = r.image;
        });
        setTrainingImages(byId);
      })
      .catch(() => setTrainingImages({}));
  }, []);

  const byKey = useMemo(
    () => Object.fromEntries(drafts.map((d) => [d.key, d])),
    [drafts]
  );
  const selectedUids = useMemo(
    () => new Set(drafts.filter((d) => d.uid).map((d) => d.uid)),
    [drafts]
  );
  const catalogById = useMemo(
    () => Object.fromEntries(catalog.map((t) => [t.id, t])),
    [catalog]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) =>
      `${r.name} ${r.uid} ${r.employee_id} ${r.department} ${r.designation}`
        .toLowerCase()
        .includes(q)
    );
  }, [roster, query]);

  /**
   * Selecting a person needs their full record. Clicks are pooled for a beat
   * so a rapid multi-select (or Select all) costs ONE request, not N.
   */
  const queueFetch = useCallback((uid) => {
    pending.current.add(uid);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const uids = [...pending.current];
      pending.current.clear();
      if (!uids.length) return;
      setFetching(true);
      try {
        const full = await api.bulkFetchEmployees(uids);
        setDrafts((prev) => {
          const have = new Set(prev.map((d) => d.uid).filter(Boolean));
          const added = (full || [])
            .filter((e) => !have.has(e.uid))
            .map((e) => toDraft(e));
          return [...prev, ...added];
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setFetching(false);
      }
    }, 220);
  }, []);

  const toggle = (row) => {
    if (selectedUids.has(row.uid)) {
      setDrafts((prev) => prev.filter((d) => d.uid !== row.uid));
      pending.current.delete(row.uid);
    } else {
      queueFetch(row.uid);
    }
  };

  const selectAllVisible = () => {
    const missing = visible.filter((r) => !selectedUids.has(r.uid));
    if (!missing.length) return;
    missing.forEach((r) => pending.current.add(r.uid));
    queueFetch(missing[0].uid);
  };

  const clearSelection = () => setDrafts((prev) => prev.filter((d) => !d.uid));

  const setField = (key, field) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: v } : d))
    );
  };

  const removeRow = (key) =>
    setDrafts((prev) => prev.filter((d) => d.key !== key));

  // ---- add (local only until Save) ----------------------------------------
  const submitAdd = (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.employee_id.trim()) {
      setError("Name and Employee ID are required.");
      return;
    }
    const dup = drafts.some(
      (d) =>
        d.employee_id.trim().toUpperCase() ===
        addForm.employee_id.trim().toUpperCase()
    );
    if (dup) {
      setError(`'${addForm.employee_id}' is already in the list below.`);
      return;
    }
    tmpId.current += 1;
    setDrafts((prev) => [
      toDraft({ ...addForm, _tmp: tmpId.current, trainings: [] }),
      ...prev,
    ]);
    setAddForm(BLANK_NEW);
    setAddOpen(false);
    setNotice("Added to the list — nothing is saved until you press Save all.");
  };

  // ---- trainings ----------------------------------------------------------
  const toggleTraining = (key, t) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const has = d.trainings.some((r) => r.training_id === t.id);
        if (has) {
          return {
            ...d,
            trainings: d.trainings.filter((r) => r.training_id !== t.id),
          };
        }
        const done = todayISO();
        return {
          ...d,
          trainings: [
            ...d.trainings,
            {
              training_id: t.id,
              completed_on: done,
              expires_on: t.validity_months
                ? addMonths(done, t.validity_months)
                : "",
              trainer: "",
              certificate_no: "",
              score: null,
              remarks: "",
            },
          ],
        };
      })
    );
  };

  const setTrainingDate = (key, tid, field, value) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        return {
          ...d,
          trainings: d.trainings.map((r) => {
            if (r.training_id !== tid) return r;
            const next = { ...r, [field]: value };
            if (field === "completed_on") {
              const months = catalogById[tid]?.validity_months || 0;
              if (months) next.expires_on = addMonths(value, months);
            }
            return next;
          }),
        };
      })
    );
  };

  // ---- the single save ----------------------------------------------------
  const saveAll = async () => {
    if (!drafts.length) return;
    const bad = drafts.find((d) => !d.name.trim() || !d.employee_id.trim());
    if (bad) {
      setError(`Every row needs a name and an Employee ID (check '${bad.name || bad.employee_id || "the blank row"}').`);
      return;
    }
    setSaving(true);
    setError("");
    setResults(null);
    try {
      const payload = drafts.map((d) => ({
        uid: d.uid,
        name: d.name,
        employee_id: d.employee_id,
        contract: d.contract,
        passport_no: d.passport_no,
        valid_up_to: d.valid_up_to,
        department: d.department,
        designation: d.designation,
        email: d.email || null,
        phone: d.phone,
        location: d.location,
        notes: d.notes,
        is_active: d.is_active,
        trainings: d.trainings.map((r) => ({
          training_id: r.training_id,
          completed_on: r.completed_on || null,
          expires_on: r.expires_on || null,
          trainer: r.trainer || "",
          certificate_no: r.certificate_no || "",
          score: r.score ?? null,
          remarks: r.remarks || "",
        })),
      }));
      const res = await api.bulkSaveEmployees(payload);
      setResults(res);
      invalidate(KEYS.departments);
      if (res.failed) {
        setError(`${res.failed} row(s) failed — see the table below.`);
      } else {
        setNotice(
          `Saved: ${res.created} created, ${res.updated} updated in one request.`
        );
      }
      // Re-pull the roster so new people appear, and refresh the drafts with
      // their server state (new rows now have a uid).
      const [people, refreshed] = await Promise.all([
        api.employeesPicker(),
        api.bulkFetchEmployees(
          res.results.filter((r) => r.action !== "failed").map((r) => r.uid)
        ),
      ]);
      setRoster(people || []);
      const failedKeys = new Set(
        res.results.filter((r) => r.action === "failed").map((r) => r.employee_id)
      );
      setDrafts((prev) => [
        ...prev.filter((d) => failedKeys.has(d.employee_id)),
        ...(refreshed || []).map(toDraft),
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- badge zip ----------------------------------------------------------
  const printBadges = async () => {
    const printable = drafts.filter((d) => d.uid);
    if (!printable.length) {
      setError("Select at least one saved employee. New rows must be saved first.");
      return;
    }
    if (!trainingImages || !cardCfg) {
      setError("Badge assets are still loading — try again in a moment.");
      return;
    }
    setError("");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < printable.length; i++) {
        const d = printable[i];
        setPrinting(`Rendering ${i + 1} of ${printable.length} — ${d.name}`);
        // Mount this employee's cards in the offscreen stage, let React commit,
        // then capture with exactly the single-badge code path.
        // Deliberately a timeout, NOT requestAnimationFrame: a background tab
        // stops firing rAF, which would stall a long export indefinitely.
        setStage(d);
        await new Promise((r) => setTimeout(r, 180));
        const images = await captureCards(stageRef.current);
        if (!images) throw new Error(`Could not render the badge for ${d.name}.`);
        const blob = buildBadgePdf(images).output("blob");
        zip.file(badgeFileName(d), blob);
      }
      setStage(null);
      setPrinting("Building zip…");
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Safety_Passports_${printable.length}_badges.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice(`Downloaded ${printable.length} badge PDF(s) as a zip.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setStage(null);
      setPrinting("");
    }
  };

  if (loading) return <Spinner label="Loading roster…" />;

  const activeCatalog = catalog.filter((t) => t.is_active);
  const editing = trainingFor ? byKey[trainingFor] : null;
  const newCount = drafts.filter((d) => !d.uid).length;

  return (
    <>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      <div className="bulk-head card">
        <div>
          <div className="card-title">
            <span className="title-ico">
              <Icon name="users" />
            </span>
            Bulk edit employees
          </div>
          <div className="small muted">
            Tick people on the left to load them. Everything you change here is
            held in the browser — <b>Save all</b> is the only write to the
            database.
          </div>
        </div>
        <div className="row bulk-actions">
          <button className="btn sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" /> Add employee
          </button>
          <button
            className="btn sm"
            onClick={printBadges}
            disabled={Boolean(printing) || !drafts.some((d) => d.uid)}
            title="Download a badge PDF for every selected employee, as one zip"
          >
            <Icon name="print" /> {printing || "Print badges"}
          </button>
          <button
            className="btn primary"
            onClick={saveAll}
            disabled={saving || !drafts.length}
          >
            <Icon name="check" />{" "}
            {saving
              ? "Saving…"
              : `Save all${drafts.length ? ` (${drafts.length})` : ""}`}
          </button>
        </div>
      </div>

      <div className="bulk-layout">
        {/* ---------------- LEFT: roster picker ---------------- */}
        <aside className="card bulk-picker">
          <div className="bulk-picker-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, badge ID, employee ID…"
            />
            <div className="row bulk-picker-tools">
              <button className="btn sm ghost" onClick={selectAllVisible}>
                <Icon name="check" /> Select all ({visible.length})
              </button>
              <button className="btn sm ghost" onClick={clearSelection}>
                <Icon name="xmark" /> Clear
              </button>
            </div>
          </div>

          <div className="bulk-picker-list">
            {visible.length === 0 && (
              <div className="picker-row muted">No employees match.</div>
            )}
            {visible.map((r) => {
              const checked = selectedUids.has(r.uid);
              return (
                <label
                  key={r.id}
                  className={`picker-row ${checked ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r)}
                  />
                  <span className="picker-name">
                    <b>{r.name}</b>
                    <span className="code">
                      {r.employee_id} · {r.department || "—"}
                    </span>
                  </span>
                  {!r.is_active && <span className="pill unknown">Off</span>}
                </label>
              );
            })}
          </div>
          <div className="bulk-picker-foot tiny muted">
            {roster.length} employee(s) · {drafts.length} selected
            {fetching && " · loading…"}
          </div>
        </aside>

        {/* ---------------- RIGHT: editable rows ---------------- */}
        <section className="bulk-editor">
          {drafts.length === 0 ? (
            <div className="card">
              <div className="empty">
                Nothing selected. Tick employees on the left, or use{" "}
                <b>Add employee</b> to create new ones — then press{" "}
                <b>Save all</b> once.
              </div>
            </div>
          ) : (
            <>
              {newCount > 0 && (
                <div className="alert info bulk-new-note">
                  <Icon name="info" /> {newCount} new employee row(s) are not in
                  the database yet. They get their badge ID on save.
                </div>
              )}

              {drafts.map((d) => {
                const isNew = !d.uid;
                return (
                  <div
                    className={`card bulk-row ${isNew ? "is-new" : ""}`}
                    key={d.key}
                  >
                    <div className="bulk-row-head">
                      <div className="bulk-row-id">
                        {isNew ? (
                          <span className="pill info">New</span>
                        ) : (
                          <span className="mono tiny">{d.uid}</span>
                        )}
                        <b>{d.name || "(unnamed)"}</b>
                      </div>
                      <div className="row">
                        <label className="checkbox tiny">
                          <input
                            type="checkbox"
                            checked={d.is_active}
                            onChange={setField(d.key, "is_active")}
                          />
                          <span>Active</span>
                        </label>
                        {!isNew && (
                          <Link
                            className="btn sm ghost"
                            to={`/admin/employees/${d.uid}/badge`}
                            title="Open this badge"
                          >
                            <Icon name="qrcode" />
                          </Link>
                        )}
                        <button
                          className="btn sm danger icon-only"
                          onClick={() => removeRow(d.key)}
                          title="Remove from this list (does not delete)"
                        >
                          <Icon name="xmark" />
                        </button>
                      </div>
                    </div>

                    <div className="bulk-row-grid">
                      <Field label="Full name" required>
                        <input
                          value={d.name}
                          onChange={setField(d.key, "name")}
                          placeholder="Ravi Kumar"
                        />
                      </Field>
                      <Field label="Employee ID" required>
                        <input
                          value={d.employee_id}
                          onChange={setField(d.key, "employee_id")}
                          placeholder="EMP-10234"
                        />
                      </Field>
                      <Field label="Department">
                        <input
                          value={d.department}
                          onChange={setField(d.key, "department")}
                          list="tv-bulk-departments"
                        />
                      </Field>
                      <Field label="Designation">
                        <input
                          value={d.designation}
                          onChange={setField(d.key, "designation")}
                        />
                      </Field>
                      <Field label="Contract">
                        <input
                          value={d.contract}
                          onChange={setField(d.key, "contract")}
                        />
                      </Field>
                      <Field label="Passport no.">
                        <input
                          value={d.passport_no}
                          onChange={setField(d.key, "passport_no")}
                        />
                      </Field>
                      <Field label="Badge valid up to" hint="Drives badge expiry alerts">
                        <input
                          type="date"
                          value={d.valid_up_to || ""}
                          onChange={setField(d.key, "valid_up_to")}
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          value={d.phone}
                          onChange={setField(d.key, "phone")}
                        />
                      </Field>
                    </div>

                    <div className="bulk-row-trainings">
                      <div className="bulk-tr-head">
                        <span className="lbl">
                          Trainings completed ({d.trainings.length})
                        </span>
                        <button
                          className="btn sm ghost"
                          onClick={() => setTrainingFor(d.key)}
                        >
                          <Icon name="edit" /> Edit trainings
                        </button>
                      </div>
                      {d.trainings.length === 0 ? (
                        <span className="tiny muted">None assigned.</span>
                      ) : (
                        <div className="bulk-tr-chips">
                          {d.trainings.map((r) => {
                            const t = catalogById[r.training_id];
                            const st = statusOf(r.expires_on);
                            return (
                              <span
                                className={`tr-chip ${st}`}
                                key={r.training_id}
                                title={`${t?.name || "Training"} · ${
                                  r.expires_on
                                    ? `valid till ${formatDate(r.expires_on)}`
                                    : "no expiry"
                                }`}
                              >
                                <b>{t?.code || "?"}</b>
                                <span>
                                  {r.expires_on ? formatDate(r.expires_on) : "∞"}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {results && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">Save result</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Badge ID</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((r, i) => (
                      <tr key={i}>
                        <td>
                          {r.name}{" "}
                          <span className="tiny muted mono">{r.employee_id}</span>
                        </td>
                        <td className="mono tiny">{r.uid || "—"}</td>
                        <td>
                          {r.action === "failed" ? (
                            <span className="pill expired" title={r.error}>
                              {r.error || "Failed"}
                            </span>
                          ) : (
                            <span className="pill valid">{r.action}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <datalist id="tv-bulk-departments">
        {departments.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>

      {/* ---------------- add-employee popup ---------------- */}
      {addOpen && (
        <Modal title="Add employee" onClose={() => setAddOpen(false)}>
          <form onSubmit={submitAdd}>
            <div className="small muted" style={{ marginBottom: 12 }}>
              This only adds a row to the list. Nothing reaches the database
              until you press <b>Save all</b>.
            </div>
            <div className="mini-grid">
              <Field label="Full name" required>
                <input
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  autoFocus
                  placeholder="Ravi Kumar"
                />
              </Field>
              <Field label="Employee ID" required>
                <input
                  value={addForm.employee_id}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, employee_id: e.target.value }))
                  }
                  required
                  placeholder="EMP-10234"
                />
              </Field>
            </div>
            <div className="mini-grid">
              <Field label="Department">
                <input
                  value={addForm.department}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, department: e.target.value }))
                  }
                  list="tv-bulk-departments"
                />
              </Field>
              <Field label="Designation">
                <input
                  value={addForm.designation}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, designation: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="mini-grid">
              <Field label="Contract">
                <input
                  value={addForm.contract}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, contract: e.target.value }))
                  }
                />
              </Field>
              <Field label="Badge valid up to">
                <input
                  type="date"
                  value={addForm.valid_up_to}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, valid_up_to: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit">
                <Icon name="plus" /> Add to list
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- per-row training editor ---------------- */}
      {editing && (
        <Modal
          size="wide"
          title={`Trainings — ${editing.name || "(unnamed)"}`}
          onClose={() => setTrainingFor(null)}
          footer={
            <button
              className="btn primary"
              onClick={() => setTrainingFor(null)}
            >
              Done
            </button>
          }
        >
          <div className="small muted" style={{ marginBottom: 10 }}>
            Still local — press <b>Save all</b> when you have finished editing
            everyone.
          </div>
          {/* The header lives INSIDE the scroll container: keeping it outside
              left it misaligned by the scrollbar width. */}
          <div className="picker" style={{ maxHeight: "56vh" }}>
            <div className="bulk-tr-row head">
              <span />
              <span>Training</span>
              <span>Completed on</span>
              <span>Valid till</span>
              <span>Status</span>
            </div>
            {activeCatalog.map((t) => {
              const row = editing.trainings.find((r) => r.training_id === t.id);
              return (
                <div
                  key={t.id}
                  className={`picker-row bulk-tr-row ${row ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(row)}
                    onChange={() => toggleTraining(editing.key, t)}
                  />
                  <span className="picker-name">
                    <b>{t.name}</b>
                    <span className="code">
                      {t.code}
                      {t.validity_months
                        ? ` · ${t.validity_months} mo`
                        : " · no expiry"}
                    </span>
                  </span>
                  {row && (
                    <>
                      <input
                        type="date"
                        aria-label="Completed on"
                        value={row.completed_on || ""}
                        onChange={(e) =>
                          setTrainingDate(
                            editing.key,
                            t.id,
                            "completed_on",
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="date"
                        aria-label="Valid till"
                        value={row.expires_on || ""}
                        onChange={(e) =>
                          setTrainingDate(
                            editing.key,
                            t.id,
                            "expires_on",
                            e.target.value
                          )
                        }
                      />
                      <StatusPill status={statusOf(row.expires_on)} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Offscreen render target for the zip export. Must be laid out (not
          display:none) or html2canvas measures nothing. */}
      <div
        ref={stageRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 700,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {stage && (
          <div className="badge-print-container">
            <AssetsCardFront
              data={{
                name: stage.name,
                contract: stage.contract,
                passport_no: stage.passport_no || stage.uid,
                valid_up_to: formatDate(stage.valid_up_to),
              }}
              emergencyTitle={cardCfg?.emergency_title}
              emergencyContacts={cardCfg?.emergency_contacts || []}
              qrUrl={api.qrPngUrl(stage.uid, 12)}
            />
            <AssetsCardBack
              checklist={activeCatalog.map((t) => ({
                label: t.name,
                code: t.code,
                image: trainingImages?.[t.id] || null,
              }))}
              showSafetyViolations={cardCfg?.show_safety_violations}
              safetyViolationBoxes={cardCfg?.safety_violation_boxes}
            />
          </div>
        )}
      </div>
    </>
  );
}
