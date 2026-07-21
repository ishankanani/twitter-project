# sosyal-medya.net — v3.2

**Built by Nexify Street — Ishan**

A full-featured Turkish digital media network platform with role-based admin, content workflows, X (Twitter) sync, news aggregation, engagement features, analytics, and integrated tools.

---

## 🚀 v3.2 — Complete Feature List

### Batch 1 — Foundation (v3.1)
- 📧 Email verification (all roles)
- 🔑 Forgot password & secure reset
- ✉️ Email change with re-verification
- 🍪 Cookie consent banner (GDPR)
- 🤖 Honeypot spam protection
- 🛡️ Production security guide
- 📬 Resend email integration

### Batch 2 — Engagement (v3.1)
- 💬 Comments with moderation
- ❤️ Like / bookmark system
- 😀 Tweet reactions (6 types)
- 👤 Author public profiles (`/u/username`)
- 🔍 Site-wide search (PostgreSQL FTS)
- 📂 Category pages
- 📡 Activity feed for creators

### Batch 3 — Growth (v3.2)
- 📊 **Analytics dashboard** (page views, top posts, devices, referers)
- 📧 **Newsletter campaigns** (compose + send to all subscribers)
- 🛡️ **2FA for admins** (Google Authenticator + backup codes)
- 🖼️ **Image optimization** (auto WebP via sharp, ~70% size reduction)
- 🤝 **Multi-author posts** (co-authors)
- ⏰ **Content scheduling** (auto-publish at a date/time)
- 📡 **RSS feed** at `/api/feed.xml`
- 🎨 **SEO improvements** (OG images, JSON-LD article schema)

### Core (v3.0)
- 3 user roles (SuperAdmin / Publisher / Creator)
- Content submission & approval workflow
- Notification system
- Single concurrent session enforcement
- Revenue dashboard
- WhatsApp collaboration forwarding
- X (Twitter) tweet sync via free Nitter/RSSHub
- RSS news aggregation
- Tools (Shadowban checker, Profile audit)
- TR/EN/DE multi-language UI

---

## 🎓 Default Logins

| Role | Username | Password | Access |
|---|---|---|---|
| 🛡️ **Süper Admin** | `admin` | `admin123` | Everything |
| 📰 **Yayıncı** | `publisher` | `publisher123` | Tweets + content review |
| ✍️ **İçerik Üretici** | `creator` | `creator123` | Submit posts, dashboard |

**⚠️ Change immediately after first login!** All 3 are pre-verified so login works out of the box.

---

## 📋 Quick Start

```bash
# Backend
cd backend
npm install
# Create backend/.env (see backend/.env.example for all keys):
#   PORT=3001
#   DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/sosyalag
#   JWT_SECRET=any-long-random-string
#   RESEND_API_KEY=re_xxx          # optional, for real emails
#   PUBLIC_URL=http://localhost:3000
npm run dev

# Frontend (new terminal)
cd frontend
npm install
# Create frontend/.env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

Open http://localhost:3000

---

## 🆕 New in v3.2

### Analytics (`/admin/analytics`)
SuperAdmin only. Shows:
- Daily traffic chart (7/30/90/365 days)
- Total views, unique visitors, member views
- Top 10 most-read posts
- Top 20 visited pages
- Device breakdown (desktop/mobile/tablet)
- Traffic sources (referers)

Bot traffic is automatically excluded. No external service needed — runs on your own PostgreSQL.

### Newsletter Campaigns (`/admin/newsletter/campaigns`)
- Compose with rich text editor
- Save as draft → send when ready
- Background email blast to all subscribers
- Track delivered/failed counts
- Uses Resend (3000/mo free)

### 2FA (`/admin/security` or `/dashboard/security`)
- Available for SuperAdmin + Publisher (not creators)
- Scan QR with Google Authenticator / Authy / Microsoft Authenticator
- 10 one-time backup codes generated (downloadable .txt)
- Can disable with current password

### Scheduled Posts
In `/dashboard/posts/new` or edit page, set a future date/time. After admin approval, the post stays hidden until the scheduled time. The scheduler runs every 60 seconds in the background.

### Image Optimization
All uploaded images are automatically converted to WebP and resized if larger than 2000px wide. Quality: 85. Result: typical 60-80% file size reduction.

### RSS Feed
Available at `/api/feed.xml` — auto-includes last 30 approved blog posts. Linked in the footer.

### SEO
- Blog posts now include OpenGraph metadata
- JSON-LD `Article` schema for Google rich results
- Sitemap auto-includes new posts

---

## 🔒 Security

- **bcrypt** password hashing (10 rounds)
- **JWT** with 24h expiry
- **2FA** TOTP for admins (Batch 3)
- **Email verification** required for all roles
- **Single concurrent session** enforcement
- **Brute-force protection** — 10 failed logins/10min = IP block
- **Rate limiting** — login 20/15min, public forms 30/min
- **Helmet** HTTP headers
- **XSS protection** via sanitize-html
- **SQL injection protection** via parameterized queries
- **Honeypot spam protection** on all forms
- **Audit log** of all admin actions
- **Cookie consent** for GDPR (essential cookies only by default)

See `PRODUCTION-SECURITY.md` for the full hardening guide.

---

## 📱 WhatsApp

Configured: **+49 15203534316**

**Two modes:**
1. **Manual** — Click 💬 WhatsApp button in admin panel → opens WhatsApp pre-filled
2. **Automatic** — Configure CallMeBot API key in Settings → auto-sends every new collaboration

---

## 🛠 Tech Stack

- Frontend: Next.js 14 (App Router) + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL (with full-text search, triggers)
- Auth: JWT + bcrypt + TOTP
- Email: Resend
- Images: Sharp (WebP optimization)
- Security: Helmet, express-rate-limit, sanitize-html
- Tweet sync: Free Nitter + RSSHub fallback

---

## 📂 File Count

~111 source files across:
- 25+ React pages
- 30+ components
- 7 backend lib modules
- Full TR/EN/DE i18n
- ~3000 lines of responsive CSS

---

## 🚀 Deploy

See `PRODUCTION-SECURITY.md` for the full Hostinger VPS + Nginx + Let's Encrypt + PM2 deployment guide.

---

## 📞 Support

Built by **Nexify Street — Ishan**, Heilbronn, Germany.
