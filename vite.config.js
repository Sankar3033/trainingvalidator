import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const plugins = [react()];

  // Opt-in HTTPS for the dev server (VITE_DEV_HTTPS=true). Phone browsers only
  // expose the camera over HTTPS or localhost, so this is how you test the live
  // scanner on a real device over your LAN. The certificate is self-signed, so
  // the phone shows a warning you have to accept once.
  //
  // Remember: an HTTPS page cannot call an HTTP API (mixed content). Serve the
  // backend over TLS too, e.g.
  //   uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  //     --ssl-keyfile key.pem --ssl-certfile cert.pem
  if (env.VITE_DEV_HTTPS === "true") {
    const { default: basicSsl } = await import("@vitejs/plugin-basic-ssl");
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: {
      port: 5173,
      host: true, // also listen on the LAN IP so a phone can open the app
    },
    preview: { port: 4173, host: true },
    build: { outDir: "dist", sourcemap: false },
  };
});
