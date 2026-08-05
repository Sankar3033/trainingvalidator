import { useState } from "react";

/**
 * Schneider Electric logo (rectangular wordmark).
 * Prefers /schneider-logo.png (the official file in public/); falls back to
 * the bundled SVG. `height` sets the rendered height; width scales with it.
 */
export default function Logo({ height = 36, className = "", style = {} }) {
  const [src, setSrc] = useState("/schneider-logo.png");
  return (
    <img
      src={src}
      onError={() => {
        if (src.endsWith(".png")) setSrc("/schneider-logo.svg");
      }}
      alt="Schneider Electric"
      className={className}
      style={{
        height,
        width: "auto",
        display: "block",
        objectFit: "contain",
        flex: "0 0 auto",
        ...style,
      }}
    />
  );
}
