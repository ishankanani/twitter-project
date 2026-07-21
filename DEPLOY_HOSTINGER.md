# Deploying sosyal-medya.net to Hostinger Business

Your app is two separate Node.js services + an external Postgres database:

| Piece | What it is | Where it goes |
|---|---|---|
| **Frontend** | Next.js (this is `frontend/`) | Hostinger Node.js app #1 |
| **Backend** | Express API (this is `backend/`) | Hostinger Node.js app #2 |
| **Database** | PostgreSQL | Your existing **Neon** project (Hostinger doesn't provide Postgres) |

The Business plan allows up to 5 Node.js apps, so using 2 is fine.

---

## Before you start

1. Have your **Neon** connection string ready. It looks like:
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require`
2. Push this project to a **GitHub repo** (two folders: `frontend/` and `backend/`).
   GitHub deploy is the smoothest path — Hostinger auto-redeploys on every push.
3. Decide your two subdomains, e.g.
   - Frontend: `sosyal-medya.net` (and `www`)
   - Backend: `api.sosyal-medya.net`

---

## Step 1 — Deploy the BACKEND first

The frontend needs the backend's URL, so deploy the API first.

1. hPanel → **Websites → Add Website → Node.js app**.
2. Source: connect **GitHub**, pick your repo.
3. **Root/base directory:** `backend`
4. **Framework:** Express (or "Other" if not auto-detected).
5. **Build command:** `npm install`
6. **Start command:** `npm start`  (this runs `node server.js`)
7. **Node version:** 20 LTS or newer.
8. Map it to your backend domain, e.g. `api.sosyal-medya.net`.
9. Add the **environment variables** below, then deploy.

### Backend environment variables

```
NODE_ENV=production
# PORT is assigned automatically by Hostinger — do NOT hardcode it.

# Database — your Neon connection string (must include ?sslmode=require)
DATABASE_URL=postgresql://USER:PASS@ep-xxx.aws.neon.tech/DBNAME?sslmode=require

# Auth — generate a long random secret: openssl rand -base64 64
JWT_SECRET=replace-with-a-64-char-random-string

# CORS — must be your FRONTEND origin (no trailing slash)
CORS_ORIGIN=https://sosyal-medya.net

# Public URL of the backend (used in emails/links)
PUBLIC_URL=https://api.sosyal-medya.net

# Email (Resend — free 3000/mo). Without it, emails print to logs only.
RESEND_API_KEY=
EMAIL_FROM=sosyal-medya.net <noreply@sosyal-medya.net>

# X Tools — Bio Generator (optional). Free key: https://console.groq.com
GROQ_API_KEY=

# X Tools — Nitter data source (optional override; blank = built-in list)
NITTER_INSTANCES=

# Background job intervals (minutes)
X_SYNC_INTERVAL_MIN=30
RSS_FETCH_INTERVAL_MIN=30
```

### Initialize the database (one time)

Your Neon DB needs the tables created. Two options:

- **Easiest:** run `npm run db:init` locally with `DATABASE_URL` pointed at Neon
  (from your machine: `DATABASE_URL="postgres://...neon..." npm run db:init` inside `backend/`).
- Or if Hostinger gives you a one-off run/console for the app, run the same command there.

Do this **once**, before first real use.

---

## Step 2 — Deploy the FRONTEND

1. hPanel → **Add Website → Node.js app** again.
2. Source: same GitHub repo.
3. **Root/base directory:** `frontend`
4. **Framework:** Next.js (auto-detected).
5. **Build command:** `npm install && npm run build`
6. **Start command:** `npm start`  (runs `next start`)
7. **Node version:** 20 LTS or newer.
8. Map it to `sosyal-medya.net` + `www`.
9. Add the env vars below, then deploy.

### Frontend environment variables

```
# Public backend URL the browser will call (no trailing slash)
NEXT_PUBLIC_API_URL=https://api.sosyal-medya.net

# Same backend URL for server-side rendering calls
INTERNAL_API_URL=https://api.sosyal-medya.net

# Your public site URL (used for SEO canonical/OG tags + sitemap)
NEXT_PUBLIC_SITE_URL=https://sosyal-medya.net
```

---

## Step 3 — Point DNS + SSL

1. In hPanel, attach your domain/subdomains to each app.
2. Enable the **free managed SSL** for both (auto on Business plan).
3. Wait for DNS to propagate, then load `https://sosyal-medya.net`.

---

## Step 4 — Verify

- Visit `https://sosyal-medya.net/tools` → the tools hub should load.
- Try the **Bio Generator** and **Hashtag Analyzer** first — they don't need
  external data, so they prove the frontend↔backend wiring works.
- Log in with your admin account and load the dashboard.
- Check the backend logs in hPanel if anything 500s.

---

## Known limitations on managed hosting (read this)

1. **Image uploads are NOT persistent.** The app currently saves uploaded post
   images to local disk (`backend/uploads/`). Managed Node hosting has no
   persistent disk, so **these files are wiped on every redeploy.** Text, posts,
   users, and all the X tools are unaffected (they're in Postgres / stateless).
   → Fix: migrate uploads to **Cloudinary** (you already have an account). Ask
   and I'll rewrite `backend/lib/uploads.js` to push to Cloudinary instead.

2. **Geo-IP language detection** relies on Vercel/Cloudflare headers that
   Hostinger doesn't send. The code already falls back to browser language,
   so TR/EN/DE still auto-selects correctly — just via the browser, not IP.

3. **Background jobs** (tweet sync, RSS fetch) run inside the backend process.
   They work as long as the app stays warm. If Hostinger ever idles the app,
   they pause until the next request wakes it.

4. **X data tools** depend on public Nitter instances, which are volatile. If
   they're all down, those 5 tools show the honest "source unavailable" state.
   For reliability, self-host Nitter and set `NITTER_INSTANCES`.

---

## Quick checklist

- [ ] Backend deployed at `api.sosyal-medya.net`, env vars set
- [ ] `DATABASE_URL` points at Neon with `?sslmode=require`
- [ ] Ran `db:init` once against Neon
- [ ] `CORS_ORIGIN` = frontend origin exactly
- [ ] Frontend deployed at `sosyal-medya.net`, `NEXT_PUBLIC_API_URL` set
- [ ] SSL enabled on both
- [ ] Tools hub loads; Bio Generator returns results
- [ ] (Optional) Cloudinary migration for persistent images
- [ ] (Optional) `GROQ_API_KEY` for AI bios
