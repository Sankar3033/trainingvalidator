import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { MAX_ACTIVE_TRAININGS } from "../lib/config";

/* ==========================================================
   SAFETY PASSPORT CARD — exact reference design
   Canvas: 700 x 400 px  (aspect 1.75 : 1)
   Rendered scaled-to-fit; PDF exports at the same ratio.
========================================================== */

const CARD_W = 700;
const CARD_H = 400;
const CARD_RADIUS = 18;

const EMERGENCY_ICONS = ["hospital", "shield-check", "helmet"];

/* ----------------------------------------------------------
   Back-card line-art icons (viewBox 0 0 48 48)
---------------------------------------------------------- */
const BACK_ICON = {
  electrical: (
    <>
      <path fill="currentColor" fillRule="evenodd" d="M24 7c-6.4 0-11 5.2-11 12.6V29h22v-9.4C35 12.2 30.4 7 24 7Zm2.8 4.4L18.4 23.2h4.8L21 30.2l8.4-11.6h-4.8l2.2-7.2Z" />
      <path fill="currentColor" d="M5 31.5h38a2 2 0 0 1 2 2V37a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5a2 2 0 0 1 2-2Z" />
    </>
  ),
  crane: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 11h36" />
      <path d="M13 42 24 11l11 31" />
      <path d="M18 29h12M16 35h16" />
      <path d="M9 42h30" />
      <path d="M35 11v11" />
      <path d="M31.5 22h7" />
      <path d="M35 25v3M32.5 31.5a2.5 2.5 0 1 0 5 0" />
    </g>
  ),
  mhe: (
    <>
      <path fill="currentColor" d="M5 17h15a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2V17Z" />
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17V7h14v10" />
        <path d="M29 7v29M29 36h13" />
        <path d="M22 25h7" />
      </g>
      <circle cx="12" cy="37" r="5.5" fill="currentColor" />
      <circle cx="25" cy="38" r="4.5" fill="currentColor" />
    </>
  ),
  height: (
    <>
      <path fill="currentColor" d="M17.5 11.4a4.5 4.5 0 0 1 9 0V13h-9v-1.6Z" />
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 14.5v6.5" />
        <path d="m22 16.8 8 3.4" />
        <path d="M22 21l-3.6 6M22 21l3.6 6" />
      </g>
      <path fill="currentColor" d="M8 27.5h32v3.6H8z" />
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 31.1v11M36 31.1v11M12 31.1 36 42M36 31.1 12 42M9 42h30" />
      </g>
    </>
  ),
  dock: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 42V9a2 2 0 0 1 2-2h32a2 2 0 0 1 2 2v33" />
      </g>
      <path fill="currentColor" d="M11 11h26v3.2H11zM11 17h26v3.2H11zM11 23h26v3.2H11z" />
      <path fill="currentColor" d="M17 33.5c.6-2.6 1.6-4.5 3.4-4.5h7.2c1.8 0 2.8 1.9 3.4 4.5l1 3.5v3.5a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1V40H18.4v.5a1 1 0 0 1-1 1H16a1 1 0 0 1-1-1V37l2-3.5Z" />
    </>
  ),
  hv: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 42 24 6l10 36" />
      <path d="M9 15h30M7 24h34" />
      <path d="M19.5 24 24 15l4.5 9M17 33h14" />
      <path d="M10 42h28" />
      <path d="M12 15v4M36 15v4M9 24v4M39 24v4" />
    </g>
  ),
  fire: (
    <>
      <path fill="currentColor" d="M14 17h9a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3V20a3 3 0 0 1 3-3Z" />
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 17v-4h5v4" />
        <path d="M21 11h6l2.5 4.5" />
      </g>
      <path fill="currentColor" d="M37 22c-3.4 3.3-5.5 5.9-5.5 9.4a5.5 5.5 0 0 0 11 0c0-3.9-2.8-6.4-5.5-9.4Z" />
    </>
  ),
  firstaid: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" />
      </g>
      <path fill="currentColor" fillRule="evenodd" d="M10 15h28a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V19a4 4 0 0 1 4-4Zm16 6h-4v5h-5v4h5v5h4v-5h5v-4h-5v-5Z" />
    </>
  ),
  violation: (
    <path fill="currentColor" fillRule="evenodd" d="M24 4 8 9.6v12.9C8 32.6 14.6 41 24 44c9.4-3 16-11.4 16-21.5V9.6L24 4Zm2 9h-4v15h4V13Zm0 18h-4v4h4v-4Z" />
  ),
};

/* Training list — column-major so numbers 01-04 run down the left
   column and 05-08 down the right, matching the reference design. */
const DEFAULT_BACK_ITEMS = [
  { label: "Electrical Works" },
  { label: "A-Frame Crane" },
  { label: "MHE / Machine Move" },
  { label: "Height Work" },
  { label: "Dock Operations" },
  { label: "High Voltage (HV)" },
  { label: "Fire Fighting" },
  { label: "First Aid" },
];

/* Max training rows the back card is designed to hold. Shared with the
   trainings admin so the catalog can never exceed what the card can print. */
const MAX_BACK_ITEMS = MAX_ACTIVE_TRAININGS;

/* ----------------------------------------------------------
   "AUTHORIZED FOR" pictograms (viewBox 0 0 48 48).
   Rendered dark line-art in the left panel of the back card.
---------------------------------------------------------- */
const AUTHZ_ICON = {
  induction: (
    <>
      <rect x="19" y="7" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path fill="currentColor" d="M31 11.5l5 1.8v3.3c0 2.7-1.9 4.9-5 5.8-3.1-.9-5-3.1-5-5.8v-3.3l5-1.8Z" />
      <circle cx="9.5" cy="15" r="4.2" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M3.5 41v-9a6 6 0 0 1 12 0v9" />
    </>
  ),
  height: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v39M20 5v39" />
        <path d="M12 12h8M12 20h8M12 28h8M12 36h8" />
      </g>
      <circle cx="31" cy="12" r="3.2" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 15.5v8" />
        <path d="M31 18l-7-2M31 18l6 3" />
        <path d="M31 23.5l-5 6M31 23.5l4 6" />
      </g>
    </>
  ),
  hotwork: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M15 15a7 7 0 0 1 14 0" />
        <path d="M12 15h20" />
      </g>
      <circle cx="22" cy="20.5" r="4.4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M11 41v-6a11 11 0 0 1 22 0v6" />
      <path fill="currentColor" d="M37 22c-2.7 2.5-4.3 4.4-4.3 7a4.3 4.3 0 0 0 8.6 0c0-2.8-2-4.6-4.3-7Z" />
    </>
  ),
  firstaid: BACK_ICON.firstaid,
  material: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" d="M4 21 18 12l14 9" />
      <path fill="none" stroke="currentColor" strokeWidth="2.4" d="M7 21v18h22V21" />
      <path fill="currentColor" d="M11 27h7v7h-7zM19 31h7v8h-7z" />
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" d="M30 31h6l5 5v3H30z" />
      <circle cx="34" cy="41" r="2.3" fill="currentColor" />
      <circle cx="39.5" cy="41" r="2.3" fill="currentColor" />
    </>
  ),
  forklift: BACK_ICON.mhe,
  crane: BACK_ICON.crane,
  electrical: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" d="M24 8 43 40H5L24 8Z" />
      <path fill="currentColor" d="M26 17l-7 11h5l-1.6 7 7.6-11h-5l1.5-7Z" />
    </>
  ),
};

const AUTHZ_ITEMS = [
  { key: "induction", label: "Safety Induction" },
  { key: "height", label: "Work at Height" },
  { key: "hotwork", label: "Hot Work" },
  { key: "firstaid", label: "First Aid" },
  { key: "material", label: "Material Handling" },
  { key: "forklift", label: "Forklift Operation" },
  { key: "crane", label: "Crane Operation" },
  { key: "electrical", label: "Electrical Safety" },
];

/* ----------------------------------------------------------
   Back-card decoration — ONE SVG anchored top-left, drawn in
   absolute 700x400 coordinates (no clip-path, no right/bottom
   offsets, which html2canvas cannot reproduce in the PDF).
   Kept to the single top-left accent: the clean look approved
   from the PDF, so screen and print are identical.
---------------------------------------------------------- */
function BackDeco() {
  const raw = useId();
  const id = raw.replace(/[:]/g, "");
  return (
    <svg
      className="back-deco"
      width={CARD_W}
      height={CARD_H}
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-gb`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#37b357" />
          <stop offset="1" stopColor="#2f9e4b" />
        </linearGradient>
      </defs>

      {/* bottom: two-layer green wave spanning the card */}
      <path
        d="M0,382 C130,364 250,398 400,384 C520,373 620,396 700,380 L700,400 L0,400 Z"
        fill="#2f9e4b"
        opacity="0.45"
      />
      <path
        d="M0,390 C160,380 300,400 460,390 C580,383 640,398 700,388 L700,400 L0,400 Z"
        fill={`url(#${id}-gb)`}
      />
    </svg>
  );
}

/* ----------------------------------------------------------
   Front-card left-panel geometry — also one SVG, drawn in
   panel coordinates (180 x 400) anchored at its top-left.
---------------------------------------------------------- */
function FrontDeco() {
  const raw = useId();
  const id = raw.replace(/[:]/g, "");
  return (
    <svg
      className="front-deco"
      width="180"
      height={CARD_H}
      viewBox={`0 0 180 ${CARD_H}`}
      aria-hidden="true"
    >
      <defs>
        <pattern id={`${id}-fd`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1" fill="rgba(72,190,96,.85)" />
        </pattern>
      </defs>

      {/* navy "V" band across the bottom of the panel */}
      <polygon points="0,282 90,341 180,282 180,400 0,400" fill="#123c4d" />
      {/* green dots over the lower-left wedge */}
      <polygon points="0,293 112,400 0,400" fill={`url(#${id}-fd)`} />
      {/* green triangle rising from the bottom centre */}
      <polygon points="90,299 164,400 16,400" fill="#2f9e4b" />
    </svg>
  );
}

/* ----------------------------------------------------------
   Card CSS — designed at 700 x 400
---------------------------------------------------------- */
const ASSETS_CARD_CSS = `
.assets-card-root * {
    margin:0;
    padding:0;
    box-sizing:border-box;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
}

.assets-card-root .card {
    width: ${CARD_W}px;
    height: ${CARD_H}px;
    aspect-ratio: 7 / 4; /* 1.75 : 1 */
    background: #ffffff;
    border-radius: ${CARD_RADIUS}px;
    border: 1px solid #e4e8e6;
    overflow: hidden;
    display: flex;
    position: relative;
    font-family: 'Inter', system-ui, sans-serif;
}

/* ================= FRONT — LEFT PANEL ================= */
.assets-card-root .left-panel {
    width: 180px;
    flex: 0 0 180px;
    background: #ffffff;
    border-right: 1px solid #e9ecea;
    position: relative;
    overflow: hidden;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
}

.assets-card-root .panel-content {
    position: relative;
    z-index: 5;
    margin-bottom: auto;
}

.assets-card-root .logo {
    width: 112px;
    max-width: 100%;
    display: block;
    user-select: none;
    pointer-events: none;
}

.assets-card-root .rule {
    display: block;
    width: 26px;
    height: 3px;
    background: #2f9e4b;
    margin: 13px 0 0;
}

.assets-card-root .title {
    margin: 9px 0 11px;
}

.assets-card-root .title span {
    display: block;
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 34px;
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: 0.2px;
    text-transform: uppercase;
}

.assets-card-root .title .ink { color: #152a35; }
.assets-card-root .title .green { color: #2f9e4b; }

.assets-card-root .motto {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.assets-card-root .motto .shield {
    width: 25px;
    height: 25px;
    flex: 0 0 auto;
    color: #2f9e4b;
}

.assets-card-root .motto-text span {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #152a35;
    line-height: 1.3;
}

/* left panel bottom geometry: navy V + rising green triangle + dots.
   Drawn as a single SVG so screen and PDF render identically. */
.assets-card-root .front-deco {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    pointer-events: none;
    display: block;
}

/* ================= FRONT — RIGHT PANEL ================= */
.assets-card-root .right-panel {
    flex: 1;
    min-width: 0;
    padding: 20px 22px 16px 20px;
    display: flex;
    flex-direction: column;
}

.assets-card-root .fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 14px;
}

.assets-card-root .field-item {
    display: grid;
    grid-template-columns: 40px 100px 8px 1fr;
    align-items: center;
    column-gap: 10px;
}

.assets-card-root .icon {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    border: 1px solid #e0e7e2;
    background: #f2f8f3;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    color: #2f9e4b;
}

.assets-card-root .label {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
}

.assets-card-root .colon {
    font-size: 15px;
    font-weight: 700;
    color: #152a35;
    text-align: center;
}

.assets-card-root .field-input {
    width: 100%;
    height: 40px;
    border: 1.6px solid #2f9e4b;
    border-radius: 9px;
    padding: 0 12px;
    font: 500 13px/1 'Inter', sans-serif;
    color: #1f1f1f;
    background: #ffffff;
    outline: none;
    display: flex;
    align-items: center;
}

/* ---- bottom: contacts + QR ---- */
.assets-card-root .bottom {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr 152px;
    align-items: stretch;
    border-top: 1px solid #e9ecea;
}

.assets-card-root .contacts {
    min-width: 0;
    padding: 12px 14px 0 0;
}

.assets-card-root .heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.assets-card-root .heading-icon {
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
    border-radius: 7px;
    background: #2f9e4b;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
}

.assets-card-root .heading-text {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 14.5px;
    font-weight: 700;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
}

.assets-card-root .heading-line {
    flex: 1;
    height: 2px;
    background: #2f9e4b;
    position: relative;
    min-width: 16px;
}

.assets-card-root .heading-line::after {
    content: "";
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #2f9e4b;
}

.assets-card-root .contact-table {
    border: 1px solid #dfe4e1;
    border-radius: 9px;
    overflow: hidden;
    background: #ffffff;
}

.assets-card-root .contact-row {
    display: grid;
    grid-template-columns: 34px minmax(0,1fr) 84px;
    min-height: 33px;
    border-bottom: 1px solid #e9ecea;
}

.assets-card-root .contact-row:last-child {
    border-bottom: none;
}

.assets-card-root .row-icon {
    background: #0e3141;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.assets-card-root .row-text {
    display: flex;
    align-items: center;
    padding: 0 10px;
    min-width: 0;
    overflow: hidden;
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    border-right: 1px solid #e9ecea;
}

.assets-card-root .row-number {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 700;
    color: #2f9e4b;
    letter-spacing: 0.3px;
}

/* ---- QR ---- */
.assets-card-root .qr-box {
    border-left: 1px solid #e9ecea;
    padding: 12px 0 0 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.assets-card-root .qr-frame {
    position: relative;
    width: 94px;
    height: 94px;
}

.assets-card-root .qr {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #ffffff;
    border-radius: 6px;
}

.assets-card-root .qr img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain;
}

.assets-card-root .bracket {
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2.5px solid #2f9e4b;
}

.assets-card-root .bracket.tl { top: -7px; left: -7px; border-right: none; border-bottom: none; border-top-left-radius: 6px; }
.assets-card-root .bracket.tr { top: -7px; right: -7px; border-left: none; border-bottom: none; border-top-right-radius: 6px; }
.assets-card-root .bracket.bl { bottom: -7px; left: -7px; border-right: none; border-top: none; border-bottom-left-radius: 6px; }
.assets-card-root .bracket.br { bottom: -7px; right: -7px; border-left: none; border-top: none; border-bottom-right-radius: 6px; }

.assets-card-root .scan {
    width: 100%;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: #2f9e4b;
    color: #ffffff;
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
}

/* ================= BACK — AUTHORIZED FOR / TRAININGS PROVIDED ================= */
.assets-card-root .card.back {
    flex-direction: row;
    padding: 0;
    position: relative;
    background: #ffffff;
}

.assets-card-root .back-deco {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    pointer-events: none;
    display: block;
}

/* ---------- LEFT: Authorized-for panel + safety violations ---------- */
.assets-card-root .authz {
    width: 258px;
    flex: 0 0 258px;
    position: relative;
    z-index: 5;
    border-right: 1px solid #e6ebe8;
    padding: 14px 14px 14px;
    display: flex;
    flex-direction: column;
}

.assets-card-root .authz-heading {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    text-align: center;
    padding-bottom: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid #e6ebe8;
}

.assets-card-root .authz-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    row-gap: 12px;
    column-gap: 4px;
}

.assets-card-root .authz-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    text-align: center;
}

.assets-card-root .authz-tile {
    width: 40px;
    height: 40px;
    border: 1.4px solid #cfe0d4;
    border-radius: 9px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #152a35;
}
.assets-card-root .authz-tile svg { width: 26px; height: 26px; display: block; }

.assets-card-root .authz-label {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 8.2px;
    font-weight: 700;
    line-height: 1.05;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    max-width: 56px;
}

/* safety violations — single row at the bottom of the left column */
.assets-card-root .authz-violations {
    margin-top: auto;
    margin-bottom: 12px;
    background: #f4f7f5;
    border: 1px solid #e6ebe8;
    border-radius: 10px;
    padding: 7px 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
}
.assets-card-root .av-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}
.assets-card-root .av-icon { width: 19px; height: 19px; flex: 0 0 auto; color: #2f9e4b; display: block; }
.assets-card-root .av-label {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    color: #152a35;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
}
.assets-card-root .av-boxes { display: flex; gap: 9px; align-items: center; margin-left: auto; }

/* ---------- RIGHT: Trainings provided ---------- */
.assets-card-root .tp-sheet {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 5;
    padding: 10px 16px 12px;
    display: flex;
    flex-direction: column;
}

.assets-card-root .tp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: 0 0 auto;
}
.assets-card-root .tp-title {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 21px;
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #2f9e4b;
    white-space: nowrap;
    text-align: left;
}
.assets-card-root .tp-head-logo {
    width: 90px;
    max-width: 100%;
    flex: 0 0 auto;
    display: block;
    object-fit: contain;
}

.assets-card-root .tp-grid {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    column-gap: 12px;
    align-content: start;
    row-gap: 0;
}
.assets-card-root .tp-col { display: flex; flex-direction: column; }
.assets-card-root .tp-col-divider { background: #e9ecea; }

.assets-card-root .tp-row {
    position: relative;
    display: grid;
    grid-template-columns: 9px 1fr 17px;
    align-items: center;
    column-gap: 6px;
    padding: 4.5px 0;
}
.assets-card-root .tp-row::after {
    content: "";
    position: absolute;
    left: 15px;
    right: 0;
    bottom: 0;
    height: 1px;
    background: #eef1ef;
}
.assets-card-root .tp-row:last-child::after { display: none; }

.assets-card-root .tp-bullet {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2f9e4b;
    justify-self: center;
}

.assets-card-root .tp-row-label {
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 12.5px;
    font-weight: 500;
    color: #2c3d47;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    line-height: 1;
}

.assets-card-root .tp-check {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    border: 1.8px solid #2f9e4b;
    border-radius: 4px;
    background: #ffffff;
    position: relative;
}
.assets-card-root .tp-check.on { background: #2f9e4b; }
.assets-card-root .tp-check.on::after {
    content: "";
    position: absolute;
    left: 4px;
    top: 3px;
    width: 6px;
    height: 3.5px;
    border-left: 1.8px solid #fff;
    border-bottom: 1.8px solid #fff;
    transform: rotate(-45deg);
}
`;

/* ----------------------------------------------------------
   Scale-to-fit wrapper hook
---------------------------------------------------------- */
function useCardScale(containerRef, setScale) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CARD_W);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, setScale]);
}

function CardShell({ containerRef, scale, children }) {
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: CARD_H * scale,
        position: "relative",
        overflow: "hidden",
        borderRadius: CARD_RADIUS * scale,
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        background: "#ffffff",
      }}
    >
      <style>{ASSETS_CARD_CSS}</style>
      <div
        className="assets-card-root"
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ==========================================================
   FRONT
========================================================== */
export function AssetsCardFront({ data = {}, emergencyTitle, emergencyContacts = [], qrUrl }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  useCardScale(containerRef, setScale);

  const name = (data.name || "").toUpperCase();
  const contract = (data.contract || "").toUpperCase();
  const passportNo = (data.passport_no || "").toUpperCase();
  const validUpTo = data.valid_up_to || "";

  return (
    <CardShell containerRef={containerRef} scale={scale}>
      <div className="card">
        {/* LEFT PANEL */}
        <aside className="left-panel">
          <div className="panel-content">
            <img className="logo" src="/schneider-logo.png" alt="Schneider Electric" />
            <span className="rule"></span>
            <h1 className="title">
              <span className="ink">Safety</span>
              <span className="green">Passport</span>
            </h1>
            <span className="rule"></span>
            <div className="motto">
              <svg className="shield" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2.5 4.5 5.4v5.9c0 4.6 3.1 8.4 7.5 10.2 4.4-1.8 7.5-5.6 7.5-10.2V5.4L12 2.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.6 11.9l2.5 2.5 4.3-4.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="motto-text">
                <span>Safety First.</span>
                <span>Always.</span>
              </div>
            </div>
          </div>

          <FrontDeco />
        </aside>

        {/* RIGHT PANEL */}
        <section className="right-panel">
          <div className="fields">
            <div className="field-item">
              <div className="icon">
                <Icon name="user" />
              </div>
              <div className="label">Name</div>
              <div className="colon">:</div>
              <div className="field-input">{name}</div>
            </div>

            <div className="field-item">
              <div className="icon">
                <Icon name="handshake" />
              </div>
              <div className="label">Contract</div>
              <div className="colon">:</div>
              <div className="field-input">{contract}</div>
            </div>

            <div className="field-item">
              <div className="icon">
                <Icon name="badge" />
              </div>
              <div className="label">Passport No.</div>
              <div className="colon">:</div>
              <div className="field-input">{passportNo}</div>
            </div>

            <div className="field-item">
              <div className="icon">
                <Icon name="calendar" />
              </div>
              <div className="label">Valid Up To</div>
              <div className="colon">:</div>
              <div className="field-input">{validUpTo}</div>
            </div>
          </div>

          <div className="bottom">
            <div className="contacts">
              <div className="heading">
                <span className="heading-icon">
                  <Icon name="phone" />
                </span>
                <span className="heading-text">
                  {emergencyTitle || "Emergency Contact Numbers"}
                </span>
                <span className="heading-line"></span>
              </div>

              <div className="contact-table">
                {(emergencyContacts.length > 0
                  ? emergencyContacts
                  : [
                      { label: "Occupational Health Centre", value: "9632134667" },
                      { label: "Security", value: "8050021589" },
                      { label: "EHS", value: "7558126991" },
                    ]
                ).map((r, i) => (
                  <div className="contact-row" key={i}>
                    <div className="row-icon">
                      <Icon name={EMERGENCY_ICONS[i % EMERGENCY_ICONS.length]} />
                    </div>
                    <div className="row-text">{r.label}</div>
                    <div className="row-number">{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="qr-box">
              <div className="qr-frame">
                <div className="qr">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR Code" />
                  ) : (
                    <Icon name="qrcode" style={{ fontSize: 64, color: "#152a35" }} />
                  )}
                </div>
                <span className="bracket tl"></span>
                <span className="bracket tr"></span>
                <span className="bracket bl"></span>
                <span className="bracket br"></span>
              </div>

              <button className="scan" type="button">
                <Icon name="expand" />
                <span>Scan to Verify</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </CardShell>
  );
}

/* ==========================================================
   BACK
========================================================== */
export function AssetsCardBack({
  checklist = [],
  completedSet = null,
  showSafetyViolations = true,
  safetyViolationBoxes = 3,
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  useCardScale(containerRef, setScale);

  const items = (checklist.length > 0 ? checklist : DEFAULT_BACK_ITEMS).slice(
    0,
    MAX_BACK_ITEMS
  );
  const half = Math.ceil(items.length / 2);
  const col1 = items.slice(0, half);
  const col2 = items.slice(half);

  const renderRow = (item, idx) => {
    const done = completedSet ? completedSet.has(item.label) : false;
    return (
      <div className="tp-row" key={idx}>
        <span className="tp-bullet" />
        <span className="tp-row-label">{item.label}</span>
        <span className={`tp-check ${done ? "on" : ""}`} />
      </div>
    );
  };

  const violationBoxCount = Number(safetyViolationBoxes) || 3;

  return (
    <CardShell containerRef={containerRef} scale={scale}>
      <div className="card back">
        <BackDeco />

        {/* LEFT — Authorized-for panel + safety violations */}
        <aside className="authz">
          <div className="authz-heading">Authorized For</div>

          <div className="authz-grid">
            {AUTHZ_ITEMS.map((it) => (
              <div className="authz-cell" key={it.key}>
                <span className="authz-tile">
                  <svg viewBox="0 0 48 48" aria-hidden="true">{AUTHZ_ICON[it.key]}</svg>
                </span>
                <span className="authz-label">{it.label}</span>
              </div>
            ))}
          </div>

          {showSafetyViolations && (
            <div className="authz-violations">
              <div className="av-head">
                <svg className="av-icon" viewBox="0 0 48 48" aria-hidden="true">
                  {BACK_ICON.violation}
                </svg>
                <span className="av-label">Safety Violations</span>
              </div>
              <div className="av-boxes">
                {Array.from({ length: violationBoxCount }).map((_, i) => (
                  <span className="tp-check" key={i} />
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT — Trainings provided */}
        <div className="tp-sheet">
          {/* Header — title left, logo right */}
          <header className="tp-head">
            <h1 className="tp-title">Trainings Provided</h1>
            <img className="tp-head-logo" src="/schneider-logo.png" alt="Schneider Electric" />
          </header>

          {/* Two-column bulleted training list */}
          <div className="tp-grid">
            <div className="tp-col">{col1.map((item, i) => renderRow(item, i))}</div>
            <div className="tp-col-divider" />
            <div className="tp-col">{col2.map((item, i) => renderRow(item, i + half))}</div>
          </div>
        </div>
      </div>
    </CardShell>
  );
}
