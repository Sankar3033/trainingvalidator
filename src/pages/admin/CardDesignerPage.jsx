import { useEffect, useState } from "react";
import { AssetsCardFront } from "../../components/AssetsCard";
import Icon from "../../components/Icon";
import { Alert, Field, Spinner } from "../../components/ui";
import { api } from "../../lib/api";

// Max emergency-contact rows the card is designed to hold. UI-enforced only.
const MAX_CONTACTS = 4;

export default function CardDesignerPage() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getCardConfig()
      .then((c) => setCfg(normalise(c)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const normalise = (c) => ({
    emergency_title: c.emergency_title ?? "Emergency Contact Numbers",
    emergency_contacts: c.emergency_contacts ?? [
      { label: "Occupational Health Centre", value: "9632134667" },
      { label: "Security", value: "8050021589" },
      { label: "EHS", value: "7558126991" },
    ],
    show_safety_violations: c.show_safety_violations ?? true,
    safety_violation_boxes: c.safety_violation_boxes ?? 3,
    back_checklist: c.back_checklist ?? [
      { label: "Electrical Works", icon: "bolt" },
      { label: "Dock Operations", icon: "warehouse" },
      { label: "A-Frame Crane", icon: "industry" },
      { label: "High Voltage (HV)", icon: "tower" },
      { label: "MHE / Machine Move", icon: "truck" },
      { label: "Fire Fighting", icon: "fire-extinguisher" },
      { label: "Height Work", icon: "stairs" },
      { label: "First Aid", icon: "kit-medical" },
    ],
  });

  const set = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }));

  const setContact = (i, key, value) =>
    setCfg((c) => {
      const emergency_contacts = c.emergency_contacts.map((r, idx) =>
        idx === i ? { ...r, [key]: value } : r
      );
      return { ...c, emergency_contacts };
    });

  const addContact = () =>
    setCfg((c) =>
      c.emergency_contacts.length >= MAX_CONTACTS
        ? c
        : {
            ...c,
            emergency_contacts: [
              ...c.emergency_contacts,
              { label: "New contact", value: "" },
            ],
          }
    );

  const removeContact = (i) =>
    setCfg((c) => ({
      ...c,
      emergency_contacts: c.emergency_contacts.filter((_, idx) => idx !== i),
    }));

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.saveCardConfig(cfg);
      setNotice("Card config saved successfully!");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading card config…" />;
  if (!cfg) return <Alert type="error">{error || "Could not load card config."}</Alert>;

  return (
    <>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>
      <Alert type="ok" onClose={() => setNotice("")}>
        {notice}
      </Alert>

      <div className="designer">
        {/* LEFT SIDE: Live Card Preview */}
        <div className="card designer-preview">
          <div className="designer-box-head">Preview</div>
          <div className="designer-preview-body">
            <div className="preview-card-slot">
              <AssetsCardFront
                data={{
                  name: "RAVI KUMAR",
                  contract: "ABC CONTRACTORS",
                  passport_no: "P1234567",
                  valid_up_to: "31/03/2027",
                }}
                emergencyTitle={cfg.emergency_title}
                emergencyContacts={cfg.emergency_contacts}
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Form Config Editing Components */}
        <div className="card designer-edit">
            <div className="card-head">
              <div className="card-title">
                <span className="title-ico">
                  <Icon name="badge" />
                </span>
                Card Config
              </div>
              <button className="btn primary" onClick={save} disabled={saving}>
                <Icon name="check" /> {saving ? "Saving…" : "Save Config"}
              </button>
            </div>

            {/* SECTION 1: Emergency Contacts (Active & Editable) */}
            <h3 className="designer-h">Emergency Contact Numbers</h3>
            <Field label="Section header title">
              <input value={cfg.emergency_title} onChange={set("emergency_title")} />
            </Field>

            <div className="contacts-editor">
              <label className="lbl">Phone numbers</label>
              <div className="contact-edit-list">
                <div className="contact-edit-row head">
                  <span>Label</span>
                  <span>Number</span>
                  <span />
                </div>
                {cfg.emergency_contacts.map((r, i) => (
                  <div className="contact-edit-row" key={i}>
                    <input
                      value={r.label}
                      onChange={(e) => setContact(i, "label", e.target.value)}
                      placeholder="e.g. Security"
                    />
                    <input
                      value={r.value}
                      onChange={(e) => setContact(i, "value", e.target.value)}
                      placeholder="Phone number"
                      inputMode="tel"
                    />
                    <button
                      className="btn sm danger icon-only"
                      onClick={() => removeContact(i)}
                      title="Delete contact"
                      aria-label="Delete contact"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn sm ghost add-contact"
                onClick={addContact}
                disabled={cfg.emergency_contacts.length >= MAX_CONTACTS}
              >
                <Icon name="plus" /> Add contact
              </button>
              {cfg.emergency_contacts.length >= MAX_CONTACTS && (
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  Maximum {MAX_CONTACTS} contacts — remove one to add another.
                </div>
              )}
            </div>

            {/* SECTION 2: Backside Checklist Config (Hidden for now as requested) */}
            {/*
            <h3 className="designer-h">Backside Card Config — Checklist Items</h3>
            <p className="tiny muted" style={{ marginBottom: 12 }}>
              Configure training checklist items displayed on backside of the card.
            </p>
            */}
        </div>
      </div>
    </>
  );
}
