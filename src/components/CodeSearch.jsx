import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { extractUid } from "../lib/format";

/**
 * A code entry + search box. Works with a handheld/USB barcode scanner (which
 * types the badge URL and presses Enter) or with manual typing of a Badge ID /
 * Employee ID. On submit it opens the verification page for that code.
 */
export default function CodeSearch({ autoFocus = true, big = false }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const uid = extractUid(value);
    if (!uid) {
      setError("Enter or scan a Badge ID / Employee ID.");
      return;
    }
    setValue("");
    setError("");
    navigate(`/getInfo/${encodeURIComponent(uid)}`);
  };

  return (
    <form onSubmit={submit} className="codesearch">
      <div className={`codesearch-row ${big ? "big" : ""}`}>
        <span className="codesearch-icon">
          <Icon name="barcode" />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder="Scan or type Badge ID (e.g. TV-2026-00001)"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
          aria-label="Badge or employee ID"
        />
        <button className="btn primary" type="submit">
          <Icon name="search" /> <span className="btn-label">Search</span>
        </button>
      </div>
      {error && (
        <div className="tiny" style={{ color: "var(--danger)", marginTop: 6 }}>
          {error}
        </div>
      )}
    </form>
  );
}
