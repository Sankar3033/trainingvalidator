import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { api } from "./lib/api";
import "./styles.css";

// Warm up the serverless backend as early as possible. Vercel functions cold-
// start after idling, so the first real request is slow. Firing a cheap,
// unauthenticated /api/health ping the moment the app loads gets the function
// warming in the background while the user reaches the login/scan screen, so
// the first real call lands on an already-warm instance. Fire-and-forget.
api.health().catch(() => {});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
