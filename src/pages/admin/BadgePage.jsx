import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AssetsCardBack, AssetsCardFront } from "../../components/AssetsCard";
import Icon from "../../components/Icon";
import { Alert, Spinner, StatusPill } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function BadgePage() {
  const { uid } = useParams();
  const location = useLocation();
  const [emp, setEmp] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  useEffect(() => {
    Promise.all([
      api.getEmployee(uid),
      api.getCardConfig(),
      api.listTrainings({ active_only: true }),
    ])
      .then(([empData, cfgData, trainingList]) => {
        setEmp(empData);
        setCfg(cfgData);
        setCatalog(Array.isArray(trainingList) ? trainingList : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  // Card canvas is 700 x 400 => 1.75 : 1 => 87.5 x 50 mm page.
  const PAGE_W = 87.5;
  const PAGE_H = 50;

  // Capture both cards at high resolution with SHARP (square) corners so they
  // fill the rectangular page with no white rounded-corner gaps.
  const captureCards = async () => {
    const cards = document.querySelectorAll(".assets-card-root");
    if (cards.length < 2) return null;
    const images = [];
    for (let i = 0; i < 2; i++) {
      const wrapper = cards[i].parentElement;
      const cardEl = cards[i].querySelector(".card");
      const orig = {
        transform: cards[i].style.transform,
        height: wrapper.style.height,
        overflow: wrapper.style.overflow,
        radius: cardEl ? cardEl.style.borderRadius : "",
      };
      cards[i].style.transform = "none";
      wrapper.style.height = "400px";
      wrapper.style.overflow = "visible";
      // Square the corners so the card fills the rectangular page with no
      // white rounded-corner gaps (the border stays for a crisp edge).
      if (cardEl) cardEl.style.borderRadius = "0px";

      const canvas = await html2canvas(cards[i], {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 700,
        height: 400,
      });

      cards[i].style.transform = orig.transform;
      wrapper.style.height = orig.height;
      wrapper.style.overflow = orig.overflow;
      if (cardEl) cardEl.style.borderRadius = orig.radius;
      images.push(canvas.toDataURL("image/jpeg", 1.0));
    }
    return images;
  };

  const handleDownload = async () => {
    try {
      setNotice("Generating 2-page PDF…");
      const images = await captureCards();
      if (!images) return;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_W, PAGE_H] });
      images.forEach((img, i) => {
        if (i) pdf.addPage([PAGE_W, PAGE_H], "landscape");
        pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
      });
      pdf.save(`Safety_Passport_${emp.employee_id || emp.uid}.pdf`);
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
          <button className="btn primary sm" onClick={handleDownload}>
            <Icon name="download" /> Download PDF
          </button>
          <button className="btn sm" onClick={handleBrowserPrint}>
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
                image: t.image,
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
