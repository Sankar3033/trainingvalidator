import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import { Alert, Field, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { todayISO } from "../../lib/format";

const BLANK = {
  name: "",
  employee_id: "",
  department: "",
  designation: "",
};

/** Add N months to an ISO date, clamping the day. */
function addMonths(iso, months) {
  if (!iso || !months) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  const pad = (n) => String(n).padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(
    target.getDate()
  )}`;
}

export default function EmployeeFormPage() {
  const { uid } = useParams();
  const isEdit = Boolean(uid);
  const navigate = useNavigate();

  const [form, setForm] = useState(BLANK);
  const [rows, setRows] = useState([]); // selected trainings
  const [catalog, setCatalog] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.listTrainings(),
      api.departments().catch(() => []),
      isEdit ? api.getEmployee(uid) : Promise.resolve(null),
    ])
      .then(([cat, deps, emp]) => {
        if (!alive) return;
        setCatalog(cat);
        setDepartments(deps);
        if (emp) {
          setForm({
            name: emp.name || "",
            employee_id: emp.employee_id || "",
            department: emp.department || "",
            designation: emp.designation || "",
          });
          setRows(
            emp.trainings.map((t) => ({
              training_id: t.training_id,
              completed_on: t.completed_on || todayISO(),
              expires_on: t.expires_on || "",
              // kept but not edited here, so existing data survives a save
              trainer: t.trainer || "",
              certificate_no: t.certificate_no || "",
              score: t.score ?? null,
              remarks: t.remarks || "",
            }))
          );
        }
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [uid, isEdit]);

  const byId = useMemo(
    () => Object.fromEntries(catalog.map((t) => [t.id, t])),
    [catalog]
  );
  const selectedIds = useMemo(() => new Set(rows.map((r) => r.training_id)), [rows]);

  // One flat list — no category grouping. Category shows as a tag per row.
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return catalog
      .filter((t) => t.is_active || selectedIds.has(t.id))
      .filter(
        (t) => !q || `${t.code} ${t.name} ${t.category}`.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, filter, selectedIds]);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggle = (t) => {
    setRows((prev) => {
      if (prev.some((r) => r.training_id === t.id))
        return prev.filter((r) => r.training_id !== t.id);
      const done = todayISO();
      return [
        ...prev,
        {
          training_id: t.id,
          completed_on: done,
          expires_on: t.validity_months ? addMonths(done, t.validity_months) : "",
          trainer: "",
          certificate_no: "",
          score: null,
          remarks: "",
        },
      ];
    });
  };

  const setDate = (id, key, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.training_id !== id) return r;
        const next = { ...r, [key]: value };
        if (key === "completed_on") {
          const months = byId[id]?.validity_months || 0;
          if (months) next.expires_on = addMonths(value, months);
        }
        return next;
      })
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.employee_id.trim()) {
      setError("Name and Employee ID are required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    try {
      const trainings = rows.map((r) => ({
        training_id: r.training_id,
        completed_on: r.completed_on || null,
        expires_on: r.expires_on || null,
        trainer: r.trainer || "",
        certificate_no: r.certificate_no || "",
        score: r.score ?? null,
        remarks: r.remarks || "",
      }));
      // Only these four fields plus trainings — anything else on the record
      // (if it exists) is left untouched by the backend on update.
      const payload = { ...form, trainings };

      if (isEdit) {
        await api.updateEmployee(uid, payload);
        navigate(`/admin/employees/${uid}/badge`, {
          state: { notice: "Employee updated" },
        });
      } else {
        const created = await api.createEmployee(payload);
        navigate(`/admin/employees/${created.uid}/badge`, {
          state: { notice: "Employee created — badge is ready" },
        });
      }
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading…" />;

  return (
    <form onSubmit={submit}>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">
              {isEdit ? `Edit employee — ${uid}` : "New employee"}
            </div>
            <div className="small muted">
              The badge and QR code are created automatically when you save.
            </div>
          </div>
          <Link className="btn ghost" to="/admin/employees">
            <Icon name="arrow-left" /> Back
          </Link>
        </div>

        <div className="form-grid">
          <Field label="Full name" required>
            <input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="Employee ID" required>
            <input value={form.employee_id} onChange={set("employee_id")} required />
          </Field>
          <Field label="Department">
            <input
              value={form.department}
              onChange={set("department")}
              list="tv-departments"
            />
            <datalist id="tv-departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label="Designation">
            <input value={form.designation} onChange={set("designation")} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Trainings</div>
            <div className="small muted">
              Tick the trainings this employee has completed.
            </div>
          </div>
          <span className="pill info">{rows.length} selected</span>
        </div>

        {catalog.length === 0 ? (
          <div className="empty">
            No trainings configured yet.{" "}
            <Link to="/admin/trainings">Set up the training list</Link> first.
          </div>
        ) : (
          <div className="train-layout">
            {/* -------- left: flat pick list -------- */}
            <div className="train-pick">
              <div className="train-pick-search">
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search trainings…"
                />
              </div>
              <div className="picker">
                {visible.length === 0 && (
                  <div className="picker-row muted">No trainings match.</div>
                )}
                {visible.map((t) => {
                  const checked = selectedIds.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`picker-row ${checked ? "checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(t)}
                      />
                      <span className="picker-name">
                        <b>{t.name}</b>
                        <span className="code">{t.code}</span>
                      </span>
                      {t.category && (
                        <span className="pill neutral">{t.category}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* -------- right: selected, inline dates -------- */}
            <div className="train-selected">
              <div className="train-selected-head">
                <span>Selected trainings</span>
              </div>
              {rows.length === 0 ? (
                <div className="empty" style={{ borderRadius: 0, border: "none" }}>
                  Nothing selected yet.
                </div>
              ) : (
                <div className="selrows">
                  <div className="selrow selrow-header">
                    <span>Training</span>
                    <span>Done on</span>
                    <span>Valid till</span>
                    <span />
                  </div>
                  {rows.map((r) => {
                    const t = byId[r.training_id];
                    return (
                      <div className="selrow" key={r.training_id}>
                        <div className="selrow-name">
                          <b>{t?.name || "—"}</b>
                          <span className="code">
                            {t?.code}
                            {t?.validity_months
                              ? ` · ${t.validity_months} mo validity`
                              : " · no expiry"}
                          </span>
                        </div>
                        <input
                          type="date"
                          aria-label="Done on"
                          value={r.completed_on || ""}
                          onChange={(e) =>
                            setDate(r.training_id, "completed_on", e.target.value)
                          }
                        />
                        <input
                          type="date"
                          aria-label="Valid till"
                          value={r.expires_on || ""}
                          onChange={(e) =>
                            setDate(r.training_id, "expires_on", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn sm danger selrow-del"
                          onClick={() => toggle({ id: r.training_id })}
                          title="Remove"
                        >
                          <Icon name="xmark" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* -------- always-visible save bar -------- */}
      <div className="save-bar">
        <span className="small muted save-bar-note">
          {rows.length} training{rows.length === 1 ? "" : "s"} selected
        </span>
        <Link className="btn" to="/admin/employees">
          Cancel
        </Link>
        <button className="btn primary" type="submit" disabled={busy}>
          <Icon name={isEdit ? "check" : "qrcode"} />{" "}
          {busy ? "Saving…" : isEdit ? "Save changes" : "Save & create badge"}
        </button>
      </div>
    </form>
  );
}
