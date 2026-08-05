import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { Alert, Empty, Spinner, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import { expiryText, formatDate } from "../lib/format";

/** One training as an expandable table row (desktop). */
function TrainingRow({ t }) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    t.trainer || t.certificate_no || (t.score ?? null) !== null || t.remarks;
  return (
    <>
      <tr>
        <td>
          {hasDetail ? (
            <button
              className="tr-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Hide details" : "Show details"}
            >
              <Icon name={open ? "chevron-up" : "chevron-down"} />
            </button>
          ) : null}
        </td>
        <td className="tr-name">
          <b>{t.name}</b>
          <span className="code">
            {t.code}
            {t.category ? ` · ${t.category}` : ""}
          </span>
        </td>
        <td className="hide-sm">
          {t.category ? <span className="cat-link">{t.category}</span> : "—"}
        </td>
        <td>{formatDate(t.completed_on)}</td>
        <td>{t.expires_on ? formatDate(t.expires_on) : "No expiry"}</td>
        <td>
          <StatusPill status={t.status} />
          <div className="tiny muted" style={{ marginTop: 3 }}>
            {expiryText(t)}
          </div>
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="tr-detail">
          <td colSpan={6}>
            <div className="tr-detail-inner">
              <div className="tr-detail-block">
                <h5>Certification</h5>
                {t.trainer && (
                  <div className="line">
                    Trainer: <b>{t.trainer}</b>
                  </div>
                )}
                {t.certificate_no && (
                  <div className="line">
                    Certificate: <b className="mono">{t.certificate_no}</b>
                  </div>
                )}
                {(t.score ?? null) !== null && (
                  <div className="line">
                    Score: <b>{t.score}</b>
                  </div>
                )}
              </div>
              {t.remarks && (
                <div className="tr-detail-block">
                  <h5>Remarks</h5>
                  <div className="line">{t.remarks}</div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Same training as a stacked card (mobile). */
function TrainingCard({ t }) {
  return (
    <div className={`tr-card ${t.status}`}>
      <div className="top">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650 }}>{t.name}</div>
          <div className="tiny muted mono">
            {t.code}
            {t.category ? ` · ${t.category}` : ""}
          </div>
        </div>
        <StatusPill status={t.status} />
      </div>
      <div className="meta">
        <span>
          Completed<b>{formatDate(t.completed_on)}</b>
        </span>
        <span>
          Valid till<b>{t.expires_on ? formatDate(t.expires_on) : "No expiry"}</b>
        </span>
        {t.trainer && (
          <span>
            Trainer<b>{t.trainer}</b>
          </span>
        )}
        {t.certificate_no && (
          <span>
            Certificate<b className="mono">{t.certificate_no}</b>
          </span>
        )}
        {(t.score ?? null) !== null && (
          <span>
            Score<b>{t.score}</b>
          </span>
        )}
      </div>
      {t.remarks && (
        <div className="small muted" style={{ marginTop: 8 }}>
          {t.remarks}
        </div>
      )}
    </div>
  );
}

export default function InfoPage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .getInfo(uid)
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(load, [load]);

  const initials = (data?.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <AppShell narrow>
      {loading && <Spinner label={`Fetching record for ${uid}…`} />}

      {!loading && error && (
        <div className="card">
          <div className="empty">
            <div style={{ fontSize: 34, color: "var(--danger)" }}>
              <Icon name="ban" />
            </div>
            <h3>Badge not recognised</h3>
            <p className="small">
              <span className="mono">{uid}</span> is not in the training register.
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className="btn" onClick={load}>
                <Icon name="refresh" /> Try again
              </button>
              <Link className="btn primary" to="/">
                <Icon name="barcode" /> Search another
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ---- compact identity (name + department only) ---- */}
          <div className="card">
            <div className="identity">
              <div className="avatar">{initials}</div>
              <div className="who">
                <h1>{data.name}</h1>
                <div className="sub">
                  {data.department || "—"}
                  {data.designation ? ` · ${data.designation}` : ""}
                </div>
                <div className="identity-tags">
                  <span className="pill info mono">{data.uid}</span>
                  <span className={`pill ${data.is_active ? "valid" : "expired"}`}>
                    {data.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- MAIN: trainings ---- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <span className="title-ico">
                  <Icon name="training" />
                </span>
                Trainings completed ({data.training_count})
              </div>
              <div className="row">
                {data.expiring_count > 0 && (
                  <span className="pill expiring">
                    {data.expiring_count} expiring
                  </span>
                )}
                {data.expired_count > 0 && (
                  <span className="pill expired">{data.expired_count} expired</span>
                )}
                {data.expiring_count === 0 && data.expired_count === 0 && (
                  <span className="pill valid">All valid</span>
                )}
              </div>
            </div>

            {data.trainings.length === 0 ? (
              <Empty>No trainings have been recorded for this employee yet.</Empty>
            ) : (
              <>
                {/* desktop / tablet: table */}
                <div className="table-wrap tr-table-wrap">
                  <table className="tr-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Training</th>
                        <th className="hide-sm">Category</th>
                        <th>Completed</th>
                        <th>Valid till</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trainings.map((t) => (
                        <TrainingRow key={t.training_id} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* mobile: cards */}
                <div className="tr-cards">
                  {data.trainings.map((t) => (
                    <TrainingCard key={t.training_id} t={t} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ---- remaining details ---- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <span className="title-ico">
                  <Icon name="badge" />
                </span>
                Employee details
              </div>
            </div>
            <dl className="kv">
              <dt>Employee ID</dt>
              <dd className="mono">{data.employee_id}</dd>
              <dt>Badge ID</dt>
              <dd className="mono">{data.uid}</dd>
              <dt>Department</dt>
              <dd>{data.department || "—"}</dd>
              <dt>Designation</dt>
              <dd>{data.designation || "—"}</dd>
              {data.location && (
                <>
                  <dt>Location</dt>
                  <dd>{data.location}</dd>
                </>
              )}
              {data.email && (
                <>
                  <dt>Email</dt>
                  <dd>{data.email}</dd>
                </>
              )}
              {data.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>{data.phone}</dd>
                </>
              )}
            </dl>
          </div>

          <p className="tiny muted" style={{ textAlign: "center" }}>
            Verified {data.verified_at} · {data.org_name}
          </p>

          <div className="sticky-bottom no-print">
            <div className="row" style={{ gap: 10 }}>
              <button
                className="btn primary lg"
                style={{ flex: 1 }}
                onClick={() => navigate("/")}
              >
                <Icon name="barcode" /> Search another badge
              </button>
              <button className="btn lg" onClick={load} title="Reload this record">
                <Icon name="refresh" />
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
