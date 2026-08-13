import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Spinner } from "../../components/ui";
import { api } from "../../lib/api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

/**
 * Recipient list for the expiry digest, stored in the `settings` collection.
 *
 * Each row can be test-mailed on its own so a typo is caught before the real
 * digest goes out. Lives at the bottom of the Configuration tab.
 */
export default function EmailNotifications({ onError, onNotice }) {
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");   // address currently under test
  const [tested, setTested] = useState({});     // address -> "ok" | error text
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api
      .getNotificationSettings()
      .then((d) => {
        setData(d);
        setRows(d.recipients.length ? d.recipients : [""]);
      })
      .catch((e) => onError?.(e.message))
      .finally(() => setLoading(false));
  }, [onError]);

  const setRow = (i, value) =>
    setRows((r) => r.map((v, idx) => (idx === i ? value : v)));
  const addRow = () => setRows((r) => [...r, ""]);
  const removeRow = (i) =>
    setRows((r) => (r.length === 1 ? [""] : r.filter((_, idx) => idx !== i)));

  const clean = rows.map((r) => r.trim()).filter(Boolean);
  const invalid = clean.filter((r) => !EMAIL_RE.test(r));

  const save = async () => {
    if (invalid.length) {
      onError?.(`Not a valid email address: ${invalid.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const saved = await api.saveNotificationSettings({
        recipients: clean,
        enabled: data?.enabled ?? true,
      });
      setData(saved);
      setRows(saved.recipients.length ? saved.recipients : [""]);
      onNotice?.(
        `Notification list saved — ${saved.recipients.length} recipient(s).`
      );
    } catch (e) {
      onError?.(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Per-address test, so one bad entry is obvious.
  const test = async (address) => {
    const addr = (address || "").trim();
    if (!EMAIL_RE.test(addr)) {
      onError?.(`'${addr || "(empty)"}' is not a valid email address.`);
      return;
    }
    setTesting(addr);
    setTested((t) => ({ ...t, [addr]: undefined }));
    try {
      await api.sendTestEmail(addr);
      setTested((t) => ({ ...t, [addr]: "ok" }));
      onNotice?.(`Test email sent to ${addr}.`);
    } catch (e) {
      setTested((t) => ({ ...t, [addr]: e.message }));
      onError?.(e.message);
    } finally {
      setTesting("");
    }
  };

  const runScan = useCallback(
    async (dryRun) => {
      setScanning(true);
      setReport(null);
      try {
        if (dryRun) {
          const r = await api.expiryReport();
          setReport(r);
          onNotice?.(
            `${r.badge_count} badge(s) and ${r.training_record_count} training record(s) would be reported. Nothing was sent.`
          );
        } else {
          const res = await api.runExpiryScan();
          setReport(res.report);
          onNotice?.(res.message);
        }
      } catch (e) {
        onError?.(e.message);
      } finally {
        setScanning(false);
      }
    },
    [onError, onNotice]
  );

  if (loading) return <Spinner label="Loading notification settings…" />;

  const smtpOff = data && !data.smtp_configured;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-head">
        <div>
          <div className="card-title">
            <span className="title-ico">
              <Icon name="bell" />
            </span>
            Email notifications
          </div>
          <div className="small muted">
            Everyone listed here receives the expiry digest — employees whose
            badge has expired, and every training record past its validity date.
          </div>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>
          <Icon name="check" /> {saving ? "Saving…" : "Save recipients"}
        </button>
      </div>

      {smtpOff && (
        <div className="alert warn" style={{ marginBottom: 14 }}>
          <Icon name="triangle-exclamation" /> Email is not configured on the
          server. Set <code>SMTP_USER</code> and <code>SMTP_APP_PASSWORD</code> in
          the backend environment before testing.
        </div>
      )}

      <div className="contacts-editor">
        <label className="lbl">To — notification recipients</label>
        <div className="contact-edit-list">
          <div className="contact-edit-row head">
            <span>Email address</span>
            <span>Test</span>
            <span />
          </div>
          {rows.map((value, i) => {
            const addr = (value || "").trim();
            const state = tested[addr];
            const bad = addr && !EMAIL_RE.test(addr);
            return (
              <div className="contact-edit-row" key={i}>
                <input
                  type="email"
                  value={value}
                  onChange={(e) => setRow(i, e.target.value)}
                  placeholder="name@company.com"
                  inputMode="email"
                  style={bad ? { borderColor: "var(--danger)" } : undefined}
                />
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => test(value)}
                  disabled={!addr || bad || testing === addr || smtpOff}
                  title="Send a sample notification to this address"
                >
                  <Icon name="paper-plane" />{" "}
                  {testing === addr
                    ? "Sending…"
                    : state === "ok"
                    ? "Sent ✓"
                    : "Test"}
                </button>
                <button
                  type="button"
                  className="btn sm danger icon-only"
                  onClick={() => removeRow(i)}
                  title="Remove recipient"
                  aria-label="Remove recipient"
                >
                  <Icon name="trash" />
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn sm ghost add-contact" onClick={addRow}>
          <Icon name="plus" /> Add recipient
        </button>

        {invalid.length > 0 && (
          <div className="tiny" style={{ color: "var(--danger)", marginTop: 6 }}>
            Fix before saving: {invalid.join(", ")}
          </div>
        )}
        {!clean.length && data?.fallback_recipient && (
          <div className="tiny muted" style={{ marginTop: 6 }}>
            With the list empty the digest falls back to{" "}
            <b>{data.fallback_recipient}</b> (the server's ENQUIRY_TO).
          </div>
        )}
      </div>

      <h3 className="designer-h" style={{ marginTop: 22 }}>
        Expiry check
      </h3>
      <p className="tiny muted" style={{ marginBottom: 12 }}>
        Scans every employee badge and every training record. Preview shows what
        would be reported without sending anything.
      </p>
      <div className="row">
        <button
          className="btn sm"
          onClick={() => runScan(true)}
          disabled={scanning}
        >
          <Icon name="search" /> {scanning ? "Checking…" : "Preview"}
        </button>
        <button
          className="btn sm primary"
          onClick={() => runScan(false)}
          disabled={scanning || smtpOff}
        >
          <Icon name="paper-plane" /> Run check &amp; send email
        </button>
      </div>

      {report && (
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Badges expired</th>
                <th>Training records expired</th>
                <th>Employees affected</th>
                <th>Checked up to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="pill expired">{report.badge_count}</span>
                </td>
                <td>
                  <span className="pill expiring">
                    {report.training_record_count}
                  </span>
                </td>
                <td>
                  <span className="pill info">
                    {report.affected_employee_count}
                  </span>
                </td>
                <td className="mono">{report.cutoff}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
