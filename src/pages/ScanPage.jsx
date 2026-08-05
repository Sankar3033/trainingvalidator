import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import CodeSearch from "../components/CodeSearch";
import Icon from "../components/Icon";
import QrScanner from "../components/QrScanner";
import { Alert } from "../components/ui";
import { extractUid } from "../lib/format";

export default function ScanPage() {
  const navigate = useNavigate();
  // Open straight into the camera: this page exists to scan badges, and
  // returning here after a lookup should be ready for the next one.
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");

  // Both callbacks are memoised: QrScanner restarts the camera whenever these
  // change identity, so passing fresh closures would loop the video feed.
  const handleDetected = useCallback(
    (raw) => {
      const uid = extractUid(raw);
      if (!uid) {
        setError("That QR code did not contain a Badge ID.");
        setScanning(false);
        return;
      }
      setScanning(false);
      navigate(`/getInfo/${encodeURIComponent(uid)}`);
    },
    [navigate]
  );

  // Camera blocked or unavailable: drop to manual entry rather than stranding
  // the user on an error screen they did not ask for.
  const handleScannerError = useCallback((message) => {
    setError(message);
    setScanning(false);
  }, []);

  const closeScanner = useCallback(() => setScanning(false), []);

  return (
    <AppShell narrow>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="panel scan-panel">
        {scanning ? (
          <QrScanner
            onDetected={handleDetected}
            onClose={closeScanner}
            onError={handleScannerError}
          />
        ) : (
          <>
            <div className="scan-top">
              <span className="scan-icon">
                <Icon name="qrcode" />
              </span>
              <div className="scan-head-text">
                <h1 className="scan-title">Scan or enter a Badge ID</h1>
                <p className="scan-desc">Scan the badge QR, or type the ID below.</p>
              </div>
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
