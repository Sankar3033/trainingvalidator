/**
 * Badge capture + PDF assembly, shared by the single-badge page and the bulk
 * editor so both produce byte-identical output.
 *
 * The card is a 700x400 DOM node scaled to fit its container. For capture the
 * scale is removed and the corners squared, otherwise the PDF picks up the
 * preview's transform and shows white rounded-corner gaps on the page.
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Card canvas is 700 x 400 => 1.75 : 1 => 87.5 x 50 mm page.
export const PAGE_W = 87.5;
export const PAGE_H = 50;

const CARD_W = 700;
const CARD_H = 400;

/** Resolve once every <img> inside `root` has finished loading (or failed). */
export async function waitForImages(root, timeoutMs = 8000) {
  const imgs = [...root.querySelectorAll("img")];
  const pending = imgs.filter((i) => !i.complete || i.naturalWidth === 0);
  if (!pending.length) return;
  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Capture the two `.assets-card-root` nodes inside `root` at print resolution.
 * Returns [frontJpegDataUrl, backJpegDataUrl], or null if both aren't present.
 */
export async function captureCards(root) {
  const cards = root.querySelectorAll(".assets-card-root");
  if (cards.length < 2) return null;

  await waitForImages(root);

  const images = [];
  for (let i = 0; i < 2; i++) {
    const wrapper = cards[i].parentElement;
    const cardEl = cards[i].querySelector(".card");
    const orig = {
      transform: cards[i].style.transform,
      height: wrapper.style.height,
      overflow: wrapper.style.overflow,
      radius: cardEl ? cardEl.style.borderRadius : "",
    };
    cards[i].style.transform = "none";
    wrapper.style.height = `${CARD_H}px`;
    wrapper.style.overflow = "visible";
    if (cardEl) cardEl.style.borderRadius = "0px";

    const canvas = await html2canvas(cards[i], {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: CARD_W,
      height: CARD_H,
    });

    cards[i].style.transform = orig.transform;
    wrapper.style.height = orig.height;
    wrapper.style.overflow = orig.overflow;
    if (cardEl) cardEl.style.borderRadius = orig.radius;
    images.push(canvas.toDataURL("image/jpeg", 1.0));
  }
  return images;
}

/** Two captured images -> a 2-page landscape PDF at exact card size. */
export function buildBadgePdf(images) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
  });
  images.forEach((img, i) => {
    if (i) pdf.addPage([PAGE_W, PAGE_H], "landscape");
    pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
  });
  return pdf;
}

/** Filename used for both the single download and the entries inside the zip. */
export function badgeFileName(emp) {
  const base = (emp?.employee_id || emp?.uid || "badge")
    .toString()
    .replace(/[^A-Za-z0-9._-]+/g, "_");
  return `Safety_Passport_${base}.pdf`;
}
