import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AssetsCardBack, AssetsCardFront } from "../../components/AssetsCard";
import Icon from "../../components/Icon";
import { Alert, Spinner, StatusPill } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { cached, KEYS } from "../../lib/prefetch";
import {
  PAGE_H,
  PAGE_W,
  badgeFileName,
  buildBadgePdf,
  captureCards as captureCards_,
} from "../../lib/badgeExport";

export default function BadgePage() {
  const { uid } = useParams();
  const location = useLocation();
  const [emp, setEmp] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [images, setImages] = useState(null); // null = still loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  // Stage 1 — everything except the images, so the card paints immediately.
  // The card config and the active catalog are usually already warmed.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getEmployee(uid),
      cached(KEYS.cardConfig, () => api.getCardConfig()),
      cached(`${KEYS.trainings}:active`, () =>
        api.listTrainings({ active_only: true })
      ),
    ])
      .then(([empData, cfgData, trainingList]) => {
        if (!alive) return;
        setEmp(empData);
        setCfg(cfgData);
        setCatalog(Array.isArray(trainingList) ? trainingList : []);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [uid]);

  // Stage 2 — the images. This is the ONLY screen that prints them, so this is
  // the only place they are fetched in bulk. Until they arrive the card shows
  // its built-in icons, and PDF/print are held back so an export can never
  // capture a half-loaded card.
  useEffect(() => {
    let alive = true;
    cached(KEYS.trainingImages, () => api.trainingImages({ active_only: true }))
      .then((rows) => {
        if (!alive) return;
        const byId = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          byId[r.id] = r.image;
        });
        setImages(byId);
      })
      .catch(() => alive && setImages({}));
    return () => {
      alive = false;
    };
  }, []);

  const imagesReady = images !== null;

  // Capture is shared with the bulk editor (lib/badgeExport.js) so a badge
  // printed one-at-a-time and one printed in a zip are identical.
  const captureCards = () => captureCards_(document);

  const handleDownload = async () => {
    try {
      setNotice("Generating 2-page PDF…");
      const images = await captureCards();
      if (!images) return;
      buildBadgePdf(images).save(badgeFileName(emp));
      setNotice("PDF downloaded successfully!");
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError("Failed to generate PDF. Please try again.");
    }
  };

  // Print through the browser's own print dialog (any installed printer).
  const handleBrowserPrint = async () => {
    try {
      setNotice("Preparing print…");
      const images = await captureCards();
      if (!images) return;
      const win = window.open("", "_blank");
      if (!win) {
        setError("Please allow pop-ups for this site to use Print.");
        return;
      }
      win.document.write(
        `<!doctype html><html><head><title>Safety Passport ${
          emp.employee_id || emp.uid
        }</title><style>
          @page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0; }
          html, body { margin: 0; padding: 0; }
          img { display: block; width: ${PAGE_W}mm; height: ${PAGE_H}mm; page-break-after: always; }
          img:last-child { page-break-after: auto; }
        </style></head><body onload="window.focus();window.print();">
          ${images.map((src) => `<img src="${src}">`).join("")}
        </body></html>`
      );
      win.document.close();
      setNotice("");
    } catch (err) {
      setError("Failed to open the print view. Please try again.");
    }
  };

  if (loading) return <Spinner label="Loading badge…" />;
  if (error && !emp) return <Alert type="error">{error}</Alert>;

  return (
    <>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="page-head no-print">
        <div>
          <h1 className="page-title thin">Safety Passport Badge</h1>
          <p className="page-sub">{emp.name} · {emp.employee_id}</p>
        </div>
        <div className="row badge-head-actions">
          <button
            className="btn primary sm"
            onClick={handleDownload}
            disabled={!imagesReady}
            title={imagesReady ? "" : "Loading training images…"}
          >
            <Icon name="download" /> Download PDF
          </button>
          <button
            className="btn sm"
            onClick={handleBrowserPrint}
            disabled={!imagesReady}
            title={imagesReady ? "" : "Loading training images…"}
          >
            <Icon name="print" /> Print
          </button>
          <Link className="btn sm" to={`/getInfo/${emp.uid}`} target="_blank">
            <Icon name="external-link" /> Preview Badge
          </Link>
          <Link className="btn ghost sm" to={`/admin/employees/${emp.uid}/edit`}>
            <Icon name="edit" /> Edit
          </Link>
          <Link className="btn ghost sm" to="/admin/employees">
            <Icon name="arrow-left" /> All employees
          </Link>
        </div>
      </div>

      <div className="badge-layout">
        {/* LEFT — badge preview */}
        <div className="badge-left">
          <div className="badge-print-container">
            <AssetsCardFront
              data={{
                name: emp.name,
                contract: emp.contract,
                passport_no: emp.passport_no || emp.uid,
                valid_up_to: formatDate(emp.valid_up_to),
              }}
              emergencyTitle={cfg?.emergency_title}
              emergencyContacts={cfg?.emergency_contacts || []}
              qrUrl={api.qrPngUrl(emp.uid, 12)}
            />

            <AssetsCardBack
              checklist={catalog.map((t) => ({
                label: t.name,
                code: t.code,
                image: images?.[t.id] || null,
              }))}
              showSafetyViolations={cfg?.show_safety_violations}
              safetyViolationBoxes={cfg?.safety_violation_boxes}
            />
          </div>
        </div>

        {/* RIGHT — assigned trainings */}
        <div className="badge-right no-print">
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                Assigned Trainings ({emp.training_count})
              </div>
            </div>
            {emp.trainings.length === 0 ? (
              <div className="empty">
                No trainings assigned.{" "}
                <Link to={`/admin/employees/${emp.uid}/edit`}>Assign trainings</Link>.
              </div>
            ) : (
              <>
                <div className="table-wrap dtable">
                  <table>
                    <thead>
                      <tr>
                        <th>Training</th>
                        <th>Valid Till</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.trainings.map((t) => (
                        <tr key={t.training_id}>
                          <td>
                            <b>{t.name}</b>
                            <div className="tiny muted mono">{t.code}</div>
                          </td>
                          <td>
                            {t.expires_on ? formatDate(t.expires_on) : "No expiry"}
                          </td>
                          <td>
                            <StatusPill status={t.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mlist">
                  {emp.trainings.map((t) => (
                    <div className={`tr-card ${t.status}`} key={t.training_id}>
                      <div className="top">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 650 }}>{t.name}</div>
                          <div className="tiny muted mono">{t.code}</div>
                        </div>
                        <StatusPill status={t.status} />
                      </div>
                      <div className="meta">
                        <span>
                          Completed<b>{formatDate(t.completed_on)}</b>
                        </span>
                        <span>
                          Valid till
                          <b>{t.expires_on ? formatDate(t.expires_on) : "No expiry"}</b>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
