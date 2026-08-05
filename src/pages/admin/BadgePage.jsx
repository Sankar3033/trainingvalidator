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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  useEffect(() => {
    Promise.all([api.getEmployee(uid), api.getCardConfig()])
      .then(([empData, cfgData]) => {
        setEmp(empData);
        setCfg(cfgData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  const handlePrint = async () => {
    try {
      const cards = document.querySelectorAll(".assets-card-root");
      if (cards.length < 2) return;
      
      setNotice("Generating high-quality 2-page PDF...");

      // Page matches the card canvas: 700 x 400 px => 1.75 : 1 (87.5 x 50 mm)
      const PAGE_W = 87.5;
      const PAGE_H = 50;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [PAGE_W, PAGE_H]
      });
      
      for (let i = 0; i < 2; i++) {
        const wrapper = cards[i].parentElement;
        const originalTransform = cards[i].style.transform;
        const originalHeight = wrapper.style.height;
        const originalOverflow = wrapper.style.overflow;
        
        cards[i].style.transform = "none";
        wrapper.style.height = "400px";
        wrapper.style.overflow = "visible";

        const canvas = await html2canvas(cards[i], {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 700,
          height: 400
        });
        
        cards[i].style.transform = originalTransform;
        wrapper.style.height = originalHeight;
        wrapper.style.overflow = originalOverflow;
        
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        
        if (i === 1) {
          pdf.addPage([PAGE_W, PAGE_H], "landscape");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W, PAGE_H);
      }
      
      pdf.save(`Safety_Passport_${emp.employee_id || emp.uid}.pdf`);
      
      setNotice("PDF downloaded successfully!");
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) return <Spinner label="Loading badge…" />;
  if (error && !emp) return <Alert type="error">{error}</Alert>;

  const completedSet = new Set(
    (emp.trainings || []).filter((t) => t.status === "valid").map((t) => t.name)
  );

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
          <button className="btn primary sm" onClick={handlePrint}>
            <Icon name="download" /> Download PDF
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
              checklist={cfg?.back_checklist || []}
              completedSet={completedSet}
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
