import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import CodeSearch from "../components/CodeSearch";
import Icon from "../components/Icon";
import QrScanner from "../components/QrScanner";
import { Alert } from "../components/ui";
import { ORG_NAME } from "../lib/config";
import { extractUid } from "../lib/format";

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleDetected = (raw) => {
    const uid = extractUid(raw);
    if (!uid) {
      setError("That QR code did not contain a Badge ID. Try again or type the ID below.");
      setScanning(false);
      return;
    }
    setScanning(false);
    navigate(`/getInfo/${encodeURIComponent(uid)}`);
  };

  return (
    <AppShell narrow>
      <div className="scan-head">
        <h1 className="page-title">Verify a training badge</h1>
        <p className="page-sub">
          Scan the badge QR with your camera, or type the ID and search.
        </p>
      </div>

      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="panel scan-panel">
        {scanning ? (
          <QrScanner onDetected={handleDetected} onClose={() => setScanning(false)} />
        ) : (
          <>
            <div className="search-hero">
              <div className="search-hero-icon">
                <Icon name="qrcode" />
              </div>
              <div className="search-hero-title">Scan or enter a Badge ID</div>
              <div className="small muted">
                Point your camera at the QR on the badge, or type the Badge ID /
                Employee ID. A handheld barcode scanner also works.
              </div>
            </div>

            <button
              className="btn primary lg block scan-cta"
              onClick={() => {
                setError("");
                setScanning(true);
              }}
            >
              <Icon name="camera" /> Scan QR with camera
            </button>

            <div className="scan-or">
              <span>or enter it manually</span>
            </div>

            <CodeSearch big autoFocus={false} />

            <div className="search-steps">
              <div className="search-step">
                <span className="n">1</span>
                <span>Tap “Scan QR with camera” and hold the badge in the frame</span>
              </div>
              <div className="search-step">
                <span className="n">2</span>
                <span>The employee’s training record opens instantly</span>
              </div>
              <div className="search-step">
                <span className="n">3</span>
                <span>Review the trainings, then scan the next badge</span>
              </div>
            </div>
          </>
        )}

        <p className="tiny muted" style={{ textAlign: "center", marginTop: 20 }}>
          {ORG_NAME}
        </p>
      </div>
    </AppShell>
  );
}
