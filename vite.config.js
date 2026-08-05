import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In the shipped build the FastAPI backend serves these files, so the API is
// same-origin. For split local dev (vite :5173 + backend :8000) this proxy
// forwards /api and /getInfo to the backend so relative URLs keep working.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  preview: { port: 4173, host: true },
  build: { outDir: "dist", sourcemap: false },
});
