import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import CodeSearch from "../components/CodeSearch";
import Icon from "../components/Icon";
import QrScanner from "../components/QrScanner";
import { Alert } from "../components/ui";
import { extractUid } from "../lib/format";

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleDetected = (raw) => {
    const uid = extractUid(raw);
    if (!uid) {
      setError("That QR code did not contain a Badge ID.");
      setScanning(false);
      return;
    }
    setScanning(false);
    navigate(`/getInfo/${encodeURIComponent(uid)}`);
  };

  return (
    <AppShell narrow>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="panel scan-panel">
        {scanning ? (
          <QrScanner onDetected={handleDetected} onClose={() => setScanning(false)} />
        ) : (
          <>
            <div className="scan-top">
              <h1 className="scan-title">Scan or enter a Badge ID</h1>
              <button
                className="btn primary scan-cam-btn"
                onClick={() => {
                  setError("");
                  setScanning(true);
                }}
              >
                <Icon name="camera" /> Scan with camera
              </button>
            </div>

            <CodeSearch autoFocus={false} />
          </>
        )}
      </div>
    </AppShell>
  );
}
