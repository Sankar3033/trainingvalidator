import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { Alert } from "../components/ui";
import { extractUid } from "../lib/format";

const READER_ID = "qr-reader";
const FILE_READER_ID = "qr-file-reader";

const SECURE =
  typeof window !== "undefined" &&
  (window.isSecureContext || location.hostname === "localhost");
const HAS_MEDIA =
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/** Choose the rear camera by default from a device list. */
function defaultCameraId(cams) {
  if (!cams?.length) return null;
  const back = cams.find((c) =>
    /back|rear|environment|arrière|traseira|trasera|world/i.test(c.label || "")
  );
  return (back || cams[cams.length - 1]).id;
}

/** Friendlier label than the raw "camera2 0, facing back" strings. */
function cameraLabel(cam, i) {
  const l = (cam.label || "").trim();
  if (!l) return `Camera ${i + 1}`;
  if (/back|rear|environment|world/i.test(l)) return `Back camera${/wide/i.test(l) ? " (wide)" : ""}`;
  if (/front|user|face/i.test(l)) return "Front camera";
  return l.length > 34 ? l.slice(0, 32) + "…" : l;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchable, setTorchable] = useState(false);

  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const fileInputRef = useRef(null);

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setTorchable(false);
    setTorchOn(false);
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* already stopped */
    }
    try {
      s.clear();
    } catch {
      /* nothing rendered */
    }
  }, []);

  const handleDecoded = useCallback(
    async (text) => {
      if (handledRef.current) return;
      const uid = extractUid(text);
      if (!uid) return;
      handledRef.current = true;
      try {
        navigator.vibrate?.(120);
      } catch {
        /* unsupported */
      }
      await stop();
      setScanning(false);
      navigate(`/getInfo/${encodeURIComponent(uid)}`);
    },
    [navigate, stop]
  );

  const friendlyError = (err) => {
    const s = `${err?.name || ""} ${err?.message || err || ""}`;
    if (/NotAllowedError|Permission|denied/i.test(s))
      return "Camera access was blocked. Tap the padlock/site settings in your browser, allow the Camera, then try again.";
    if (/NotFoundError|no camera|device not found|Requested device/i.test(s))
      return "No camera was found. You can scan a photo of the code instead.";
    if (/NotReadableError|TrackStart|in use/i.test(s))
      return "The camera is busy in another app or tab. Close it and try again.";
    if (/OverconstrainedError/i.test(s))
      return "That camera couldn't start. Pick a different one from the list above.";
    return "The camera couldn't start. Try again, or scan a photo of the code.";
  };

  /** Ask permission + enumerate cameras (labels only appear after grant). */
  const loadCameras = useCallback(async () => {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cams = await Html5Qrcode.getCameras(); // prompts for permission
    setCameras(cams || []);
    return cams || [];
  }, []);

  const beginWith = useCallback(
    async (deviceId) => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode"
      );
      setScanning(true);
      // let React mount the #qr-reader node
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));

      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        // Native BarcodeDetector on Android Chrome = faster, more forgiving.
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
      });
      scannerRef.current = scanner;

      await scanner.start(
        deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (vw, vh) => {
            const side = Math.max(160, Math.floor(Math.min(vw, vh) * 0.7));
            return { width: side, height: side };
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        handleDecoded,
        () => {}
      );

      try {
        setTorchable(Boolean(scanner.getRunningTrackCapabilities?.()?.torch));
      } catch {
        setTorchable(false);
      }
    },
    [handleDecoded]
  );

  const start = useCallback(async () => {
    setError("");
    setStarting(true);
    handledRef.current = false;
    try {
      let cams = cameras;
      if (!cams.length) cams = await loadCameras();
      const id = cameraId || defaultCameraId(cams) || "";
      setCameraId(id);
      await beginWith(id);
    } catch (err) {
      await stop();
      setScanning(false);
      setError(friendlyError(err));
    } finally {
      setStarting(false);
    }
  }, [beginWith, cameraId, cameras, loadCameras, stop]);

  const changeCamera = async (id) => {
    setCameraId(id);
    if (!scanning) return;
    setStarting(true);
    handledRef.current = false;
    try {
      await stop();
      await beginWith(id);
    } catch (err) {
      setScanning(false);
      setError(friendlyError(err));
    } finally {
      setStarting(false);
    }
  };

  const stopScanning = async () => {
    await stop();
    setScanning(false);
  };

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      await s.applyVideoConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch {
      setTorchable(false);
    }
  };

  // Populate the camera list up front on capable devices so the dropdown is
  // ready. (Only after a user gesture will labels be filled on some browsers.)
  useEffect(() => {
    if (!SECURE || !HAS_MEDIA) return;
    let alive = true;
    (async () => {
      try {
        const status = await navigator.permissions?.query({ name: "camera" });
        if (alive && status?.state === "granted") {
          const cams = await loadCameras();
          if (alive) setCameraId((c) => c || defaultCameraId(cams) || "");
        }
      } catch {
        /* Permissions API unavailable (Safari) — list loads on first tap */
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadCameras]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    handledRef.current = false;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode(FILE_READER_ID, { verbose: false });
      const result = await reader.scanFileV2(file, false);
      try {
        reader.clear();
      } catch {
        /* noop */
      }
      await handleDecoded(result?.decodedText || "");
    } catch {
      setError(
        "No code could be read from that photo. Move closer, avoid glare, and keep the whole code with its white border in the frame."
      );
    }
  };

  const submitManual = (e) => {
    e.preventDefault();
    const uid = extractUid(manual);
    if (!uid) {
      setError("Enter a badge ID or employee ID first.");
      return;
    }
    navigate(`/getInfo/${encodeURIComponent(uid)}`);
  };

  return (
    <AppShell narrow>
      <div className="page-head">
        <div>
          <h1 className="page-title">Verify a training badge</h1>
          <p className="page-sub">Point your camera at the QR code on the badge.</p>
        </div>
      </div>

      <div className="panel scan-panel">
        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>

        {!SECURE && (
          <Alert type="warn">
            Live camera needs a secure connection. You can still scan a photo of
            the badge below.
          </Alert>
        )}

        {/* camera picker + torch */}
        {cameras.length > 0 && (
          <div className="scan-toolbar">
            <select
              value={cameraId}
              onChange={(e) => changeCamera(e.target.value)}
              disabled={starting}
              aria-label="Choose camera"
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {cameraLabel(c, i)}
                </option>
              ))}
            </select>
            {scanning && torchable && (
              <button
                className={`btn ${torchOn ? "primary" : ""}`}
                onClick={toggleTorch}
                title="Torch"
              >
                <Icon name="bolt" />
              </button>
            )}
          </div>
        )}

        <div className="scan-box">
          {scanning ? (
            <>
              <div id={READER_ID} className="scan-viewport" />
              <div className="scan-frame">
                <span />
              </div>
            </>
          ) : (
            <div className="scan-idle">
              <div className="scan-ring">
                <Icon name="qrcode" />
              </div>
              <div className="scan-idle-title">
                {starting ? "Opening camera…" : "Ready to scan"}
              </div>
              <div className="small">
                {SECURE && HAS_MEDIA
                  ? "Tap “Scan with camera” to begin"
                  : "Use “Scan a photo” below"}
              </div>
            </div>
          )}
        </div>

        <div className="scan-actions">
          {scanning ? (
            <button className="btn danger lg block" onClick={stopScanning}>
              <Icon name="stop" /> Stop camera
            </button>
          ) : (
            <button
              className="btn primary lg block"
              onClick={start}
              disabled={starting || !SECURE || !HAS_MEDIA}
            >
              <Icon name="camera" />{" "}
              {starting ? "Opening camera…" : "Scan with camera"}
            </button>
          )}
        </div>

        <div className="scan-secondary">
          <button
            className="btn sm ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="image" /> Scan a photo instead
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPickFile}
          hidden
        />
        <div id={FILE_READER_ID} hidden />

        <div className="rule-label">or enter the ID</div>

        <form onSubmit={submitManual} className="input-row">
          <input
            type="search"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Badge ID or Employee ID"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button className="btn primary" type="submit">
            <Icon name="search" /> Find
          </button>
        </form>

        <p className="tiny muted scan-hint">
          Hold the phone about 10–15 cm from the code and keep it steady.
        </p>
      </div>
    </AppShell>
  );
}
