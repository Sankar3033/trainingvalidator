/**
 * Client-side cache + a staged warm-up for the admin console.
 *
 * The console needs the same handful of lists on nearly every screen (the
 * training catalog, departments, the card template). Fetching them per page
 * made every navigation wait on the network. Instead:
 *
 *   1. the employees list loads FIRST, on its own, and paints;
 *   2. it opens the gate;
 *   3. everything else is fetched one at a time, in the background, yielding
 *      to the UI between each request.
 *
 * By the time the admin clicks through to another screen its data is already
 * in the cache and renders without a spinner. Nothing here blocks the first
 * paint, and every warm-up failure is swallowed — it is only ever an optimisation.
 */

import { api } from "./api";

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/** Cache keys. Prefixes matter: invalidate() matches on them. */
export const KEYS = {
  departments: "departments",
  trainings: "trainings:list",
  trainingCounts: "trainings:counts",
  trainingImages: "trainings:images:active",
  cardConfig: "card-config",
};

const entries = new Map(); // key -> { value, at }
const inflight = new Map(); // key -> Promise

/**
 * Fetch through the cache. Concurrent callers for the same key share one
 * request, so a warm-up and a page mount racing each other cost one round trip.
 */
export function cached(key, fetcher, ttl = DEFAULT_TTL) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      entries.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Read without fetching — for rendering stale data while a refresh runs. */
export function peek(key) {
  return entries.get(key)?.value;
}

/** Drop every key starting with `prefix`. Call after a mutation. */
export function invalidate(prefix) {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

// ---------------------------------------------------------------- warm-up --

let openGate;
let gate = new Promise((resolve) => {
  openGate = resolve;
});
let started = false;

/**
 * Release the warm-up queue. Called by the employees list once it has its
 * data, and by AdminLayout on a timer so a deep link to another admin page
 * still warms up.
 */
export function signalFirstPaint() {
  openGate();
}

/** Wipe everything on sign-out so the next account starts clean. */
export function resetPrefetch() {
  entries.clear();
  inflight.clear();
  started = false;
  gate = new Promise((resolve) => {
    openGate = resolve;
  });
}

const yieldToUi = () =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: 300 });
    } else {
      setTimeout(resolve, 0);
    }
  });

/**
 * Ordered by how likely the admin is to need it next. Each entry runs only
 * after the previous one settles, so the warm-up never floods the connection
 * while the employees list is still rendering.
 */
const WARM_UP = [
  // Filter dropdown on the page that just loaded.
  [KEYS.departments, () => api.departments()],
  // Employee form + trainings admin. Light: no images.
  [KEYS.trainings, () => api.listTrainings()],
  // The "n / 16 active" badge on the trainings admin.
  [KEYS.trainingCounts, () => api.trainingCounts()],
  // Badge page.
  [KEYS.cardConfig, () => api.getCardConfig()],
  // Heaviest, and needed by exactly one screen — so it goes last.
  [KEYS.trainingImages, () => api.trainingImages({ active_only: true })],
];

/** Runs once per session. Safe to call from several places. */
export async function warmAdminCache() {
  if (started) return;
  started = true;
  await gate;
  for (const [key, fetcher] of WARM_UP) {
    await yieldToUi();
    try {
      await cached(key, fetcher);
    } catch {
      // Best-effort: the owning page will fetch it again for real.
    }
  }
}
