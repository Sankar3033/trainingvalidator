import { useEffect } from "react";
import { STATUS_LABEL } from "../lib/format";
import Icon from "./Icon";

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="center-pad">
      <div className="spinner" />
      <div className="small" style={{ marginTop: 12 }}>
        {label}
      </div>
    </div>
  );
}

const ALERT_ICON = {
  error: "warning",
  warn: "warning",
  ok: "check-circle",
  info: "info",
};

export function Alert({ type = "error", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert ${type}`}>
      <Icon name={ALERT_ICON[type] || "info"} className="alert-ico" />
      <div className="alert-body">{children}</div>
      {onClose && (
        <button className="btn sm ghost" onClick={onClose} aria-label="Dismiss">
          <Icon name="xmark" />
        </button>
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export function Empty({ children = "Nothing here yet." }) {
  return <div className="empty">{children}</div>;
}

/** `size="wide"` for modals holding a data table — see .modal.wide in styles.css. */
export function Modal({ title, children, onClose, footer, size = "" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${size}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-head">
          <div className="card-title">{title}</div>
          <button className="btn sm ghost" onClick={onClose} aria-label="Close">
            <Icon name="xmark" />
          </button>
        </div>
        {children}
        {footer && (
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, required, hint, children }) {
  return (
    <div className="field">
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

export function Confirm({ open, title, message, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <Modal
      title={title || "Are you sure?"}
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : "Yes, continue"}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
