import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import { Alert, Spinner, StatusPill } from "../../components/ui";
import { api } from "../../lib/api";
import { ORG_NAME } from "../../lib/config";
import { formatDate } from "../../lib/format";

export default function BadgePage() {
  const { uid } = useParams();
  const location = useLocation();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getEmployee(uid)
      .then(setEmp)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(emp.qr_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard blocked by the browser — copy the link manually.");
    }
  };

  if (loading) return <Spinner label="Loading badge…" />;
  if (error && !emp) return <Alert type="error">{error}</Alert>;

  const pngUrl = api.qrPngUrl(emp.uid, 14);
  const svgUrl = api.qrSvgUrl(emp.uid);
  // A QR pointing at localhost opens the *phone's* localhost and fails.
  const localOnly = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(
    emp.qr_url || ""
  );

  return (
    <>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      {localOnly && (
        <div className="no-print">
          <Alert type="warn">
            <b>Not ready to print yet.</b> This badge is still linked to a test
            address, so scanning it on a phone will not open the record. Ask your
            system administrator to publish the site address, then create the
            badge again.
          </Alert>
        </div>
      )}

      <div className="card">
        <div className="card-head no-print">
          <div>
            <div className="card-title">Badge / QR code</div>
            <div className="small muted">
              Print this and stick it on the ID card. Scanning it opens the training
              record.
            </div>
          </div>
          <div className="row">
            <Link className="btn ghost" to={`/admin/employees/${emp.uid}/edit`}>
              <Icon name="edit" /> Edit employee
            </Link>
            <Link className="btn ghost" to="/admin/employees">
              <Icon name="arrow-left" /> All employees
            </Link>
          </div>
        </div>

        <div className="badge-card">
          <div className="org">{ORG_NAME}</div>
          {/* SVG so the code stays sharp on screen and in print at any size */}
          <img className="qr" src={svgUrl} alt={`QR code for ${emp.uid}`} />
          <h3>{emp.name}</h3>
          <div className="dept">
            {[emp.designation, emp.department].filter(Boolean).join(" · ") || "—"}
          </div>
          <div className="uid">{emp.uid}</div>
          <div className="dept">Emp ID: {emp.employee_id}</div>
        </div>

        <div className="row no-print" style={{ justifyContent: "center", marginTop: 18 }}>
          <button className="btn primary" onClick={() => window.print()}>
            <Icon name="print" /> Print badge
          </button>
          <a className="btn" href={pngUrl} download={`${emp.uid}-qr.png`}>
            <Icon name="download" /> PNG
          </a>
          <a className="btn" href={svgUrl} download={`${emp.uid}-qr.svg`}>
            <Icon name="download" /> SVG
          </a>
          <button className="btn" onClick={copyLink}>
            <Icon name={copied ? "check" : "link"} />{" "}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <Link className="btn ghost" to={`/getInfo/${emp.uid}`} target="_blank">
            <Icon name="external-link" /> Preview
          </Link>
        </div>
      </div>

      <div className="card no-print">
        <div className="card-head">
          <div className="card-title">
            Assigned trainings ({emp.training_count})
          </div>
        </div>
        {emp.trainings.length === 0 ? (
          <div className="empty">
            No trainings assigned.{" "}
            <Link to={`/admin/employees/${emp.uid}/edit`}>Add some</Link>.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Training</th>
                  <th>Completed</th>
                  <th>Valid till</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {emp.trainings.map((t) => (
                  <tr key={t.training_id}>
                    <td className="mono">{t.code}</td>
                    <td>{t.name}</td>
                    <td>{formatDate(t.completed_on)}</td>
                    <td>{t.expires_on ? formatDate(t.expires_on) : "No expiry"}</td>
                    <td>
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
