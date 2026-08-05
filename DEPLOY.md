# Deploying Training Validator

Two separate deployments: the **API on Vercel** and the **frontend on Cloudflare Pages**.
Deploy the backend first — you need its URL for the frontend build.

---

## 1. Backend → Vercel

**Root directory:** `backend`

The repo already contains what Vercel needs:
- `api/index.py` — exposes the FastAPI ASGI app
- `vercel.json` — routes every request to that entrypoint
- `requirements.txt` — Python dependencies
- `.vercelignore` — keeps `.venv/` out of the upload

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | your Atlas connection string | **Required.** Not in the repo. |
| `MONGODB_DB` | `training_validator` | |
| `JWT_SECRET` | long random string | Generate: `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `PUBLIC_APP_BASE_URL` | `https://<your-app>.pages.dev` | **The frontend URL** — this is what badge QR codes point to. Set it after step 2, then redeploy. |
| `CORS_ORIGINS` | `https://<your-app>.pages.dev` | Or `*` while testing. |
| `BOOTSTRAP_ADMIN_USERNAME` | `admin` | Only used when the database is empty. |
| `BOOTSTRAP_ADMIN_PASSWORD` | a strong password | Change from the default. |

### MongoDB Atlas
Under **Network Access**, allow `0.0.0.0/0` — Vercel functions have no fixed IP.

### Verify
```bash
curl https://<your-api>.vercel.app/api/health
```
Expect `{"status":"ok","database":"connected",...}`.

---

## 2. Frontend → Cloudflare

**Root directory:** `frontend` · **Build command:** `npm run build` · **Output:** `dist`

Deployed as a Worker with static assets (`npx wrangler deploy`).

### Build environment variable
| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-api>.vercel.app` |

Vite inlines this at build time, so change it → rebuild.

### SPA routing — do NOT add a `_redirects` file
This app relies on client-side routes (`/getInfo/<uid>`, `/admin/...`), so the host
must serve `index.html` for unknown paths or every scanned QR code 404s.

Wrangler handles that with `not_found_handling: "single-page-application"` in its
generated config. A `public/_redirects` file containing `/* /index.html 200` is
**rejected** by the Workers asset validator — it reports
`Invalid _redirects configuration: Infinite loop detected in this rule`, because
`/index.html` itself matches `/*`, and the deploy fails.

After deploying, confirm a deep link loads directly, e.g.
`https://<your-app>/getInfo/TV-2026-00001`.

### After the first deploy
Go back to Vercel and set `PUBLIC_APP_BASE_URL` to the frontend URL, then redeploy
the API. Badge QR codes are generated from that value, so if it is wrong the QR
codes point at the wrong host.

The camera QR scanner needs a secure context — Cloudflare serves https, so it works.
It will not work over plain `http://` on a LAN IP.

---

## Local development
```bash
start.bat
```
Backend on `:8000`, frontend on `:5173`. Requires `backend/.env` (copy from
`.env.example` and fill in `MONGODB_URI`).

---

## Secrets
`.env` files are gitignored and must never be committed. `.env.example` holds
placeholders only. If a credential is ever pushed, rotate it in Atlas immediately.
