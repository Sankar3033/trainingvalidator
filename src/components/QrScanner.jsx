import { useCallback, useEffect, useRef, useState } from "react";
import jsQRImport from "jsqr";
import Icon from "./Icon";

/** jsQR ships a UMD bundle; normalise the export shape. */
const decodeQr = jsQRImport?.default || jsQRImport;

/** Longest edge we feed the decoder. Smaller = faster on low-end phones. */
const MAX_EDGE = 640;
/** ms between decode attempts. A timer (not requestAnimationFrame) keeps the
 *  loop alive in webviews/backgrounded tabs where rAF is suspended, and caps
 *  the work at ~8 decodes/sec instead of one per rendered frame. */
const SCAN_INTERVAL = 120;
/** Native BarcodeDetector, when the browser has it (Android Chrome). */
const hasNativeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

function friendlyError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access was blocked. Allow camera permission for this site in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera was found on this device. Use the box below to type the Badge ID instead.";
  if (name === "NotReadableError")
    return "The camera is already in use by another app. Close it and try again.";
  return err?.message || "The camera could not be started.";
}

/**
 * Live camera QR scanner. Decodes the badge QR and hands the raw text back.
 * Requires a secure context (https or localhost) — Cloudflare Pages serves
 * https, so the camera is available in production.
 */
export default function QrScanner({ onDetected, onClose, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(0);
  const detectorRef = useRef(null);
  const runningRef = useRef(false);
  const doneRef = useRef(false);

  const [status, setStatus] = useState("starting"); // starting | scanning | error | found
  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [canTorch, setCanTorch] = useState(false);
  const [facing, setFacing] = useState("environment");

  const stop = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  /** Fired once when a QR is decoded. */
  const handleText = useCallback(
    (text) => {
      if (doneRef.current || !text) return;
      doneRef.current = true;
      setStatus("found");
      if (navigator.vibrate) navigator.vibrate(60);
      stop();
      onDetected(text);
    },
    [onDetected, stop]
  );

  useEffect(() => {
    let cancelled = false;

    const scan = async () => {
      const video = videoRef.current;
      if (!runningRef.current || !video) return;

      if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        try {
          // Fast path: let the OS decode straight off the video element.
          if (detectorRef.current) {
            const found = await detectorRef.current.detect(video);
            if (found?.length) {
              handleText(found[0].rawValue);
              return;
            }
          } else {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw && vh) {
              const ratio = Math.min(1, MAX_EDGE / Math.max(vw, vh));
              const w = Math.round(vw * ratio);
              const h = Math.round(vh * ratio);
              const canvas = canvasRef.current;
              if (canvas) {
                if (canvas.width !== w || canvas.height !== h) {
                  canvas.width = w;
                  canvas.height = h;
                }
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(video, 0, 0, w, h);
                const { data } = ctx.getImageData(0, 0, w, h);
                const result = decodeQr(data, w, h, {
                  inversionAttempts: "attemptBoth",
                });
                if (result?.data) {
                  handleText(result.data);
                  return;
                }
              }
            }
          }
        } catch {
          /* a single bad frame is not fatal — keep scanning */
        }
      }

      timerRef.current = setTimeout(scan, SCAN_INTERVAL);
    };

    /** Show the failure here AND tell the parent, so a page that opens the
     *  scanner automatically can fall back to manual entry instead of
     *  leaving the user stuck on an error screen. */
    const fail = (message) => {
      setStatus("error");
      setError(message);
      onError?.(message);
    };

    const start = async () => {
      setError("");
      setStatus("starting");

      if (!window.isSecureContext) {
        fail(
          "The camera needs a secure connection (https). Open this page over https, or type the Badge ID below."
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("This browser does not support camera access. Type the Badge ID below instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true"); // iOS: stay inline
        await video.play();

        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() || {};
        setCanTorch(Boolean(caps.torch));
        setTorchOn(false);

        if (hasNativeDetector && !detectorRef.current) {
          try {
            const formats = await window.BarcodeDetector.getSupportedFormats?.();
            if (!formats || formats.includes("qr_code")) {
              detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
            }
          } catch {
            detectorRef.current = null;
          }
        }

        runningRef.current = true;
        setStatus("scanning");
        timerRef.current = setTimeout(scan, 0);
      } catch (err) {
        if (cancelled) return;
        fail(friendlyError(err));
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, handleText, stop, onError]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch {
      setCanTorch(false);
    }
  };

  const flipCamera = () => {
    doneRef.current = false;
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  };

  return (
    <div className="qrscan">
      <div className="qrscan-head">
        <div className="qrscan-title">
          <Icon name="camera" /> Scan the badge QR
        </div>
        <button className="btn sm ghost" onClick={onClose} aria-label="Close scanner">
          <Icon name="xmark" /> Close
        </button>
      </div>

      {status === "error" ? (
        <div className="qrscan-error">
          <Icon name="warning" /> <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="qrscan-stage">
            <video ref={videoRef} className="qrscan-video" muted playsInline autoPlay />
            <canvas ref={canvasRef} className="qrscan-canvas" />
            <div className="qrscan-reticle" aria-hidden="true">
              <span className="c tl" />
              <span className="c tr" />
              <span className="c bl" />
              <span className="c br" />
              {status === "scanning" && <span className="qrscan-laser" />}
            </div>
            {status === "starting" && (
              <div className="qrscan-overlay">
                <div className="spinner" />
                <span>Starting camera…</span>
              </div>
            )}
            {status === "found" && (
              <div className="qrscan-overlay ok">
                <Icon name="check-circle" />
                <span>Badge found — opening…</span>
              </div>
            )}
          </div>

          <div className="qrscan-tools">
            <span className="tiny muted">Hold the badge QR inside the frame</span>
            <div className="row" style={{ gap: 8 }}>
              {canTorch && (
                <button
                  className={`btn sm ${torchOn ? "primary" : ""}`}
                  onClick={toggleTorch}
                  title="Toggle flashlight"
                >
                  <Icon name="bolt" /> {torchOn ? "Light off" : "Light"}
                </button>
              )}
              <button className="btn sm" onClick={flipCamera} title="Switch camera">
                <Icon name="rotate" /> Flip
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
