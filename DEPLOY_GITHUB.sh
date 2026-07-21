# ══════════════════════════════════════════════════════
# DEPLOY sosyal-medya.net — GitHub → Hostinger Business
# ══════════════════════════════════════════════════════

# ── STEP 1: Create private GitHub repo ──
# Go to https://github.com/new
#   Name:       sosyalag-v2   (or sosyal-medya)
#   Visibility: Private
#   Don't initialize with README (you'll push existing code)

# ── STEP 2: Push your code ──
cd /path/to/sosyalag-v2        # ← your local project folder
git init
git add .
git commit -m "initial: full platform with 7 X tools"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sosyalag-v2.git
git push -u origin main

# ── STEP 3: Initialize the database (one time only) ──
# Make sure your Neon project exists at https://console.neon.tech
# Copy the connection string, then run:
cd backend
npm install
DATABASE_URL="postgresql://USER:PASS@ep-xxx.aws.neon.tech/dbname?sslmode=require" npm run db:init
cd ..

# ── STEP 4: Deploy BACKEND on Hostinger ──
# hPanel → Websites → Add Website → Node.js
#
#   Source:          GitHub → pick your repo
#   Root directory:  backend
#   Framework:       Express (or "Other")
#   Build command:   npm install
#   Start command:   npm start
#   Node version:    20 (or latest LTS)
#   Domain:          api.sosyal-medya.net
#
#   Environment variables (add ALL of these):
#
#     NODE_ENV              = production
#     DATABASE_URL          = postgresql://USER:PASS@ep-xxx.aws.neon.tech/dbname?sslmode=require
#     JWT_SECRET            = (run: openssl rand -base64 64)
#     CORS_ORIGIN           = https://sosyal-medya.net
#     PUBLIC_URL            = https://api.sosyal-medya.net
#     RESEND_API_KEY        = (your Resend key, or leave blank for dev)
#     EMAIL_FROM            = sosyal-medya.net <noreply@sosyal-medya.net>
#     GROQ_API_KEY          = (free key from https://console.groq.com — optional)
#
#   Click Deploy. Wait for build to finish. Check logs.

# ── STEP 5: Deploy FRONTEND on Hostinger ──
# hPanel → Websites → Add Website → Node.js (again)
#
#   Source:          GitHub → same repo
#   Root directory:  frontend
#   Framework:       Next.js (auto-detected)
#   Build command:   npm install && npm run build
#   Start command:   npm start
#   Node version:    20 (or latest LTS)
#   Domain:          sosyal-medya.net (+ www.sosyal-medya.net)
#
#   Environment variables:
#
#     NEXT_PUBLIC_API_URL   = https://api.sosyal-medya.net
#     INTERNAL_API_URL      = https://api.sosyal-medya.net
#     NEXT_PUBLIC_SITE_URL  = https://sosyal-medya.net
#
#   Click Deploy.

# ── STEP 6: SSL ──
# hPanel → each app → SSL → Enable (free, auto-managed)

# ── STEP 7: Verify ──
# Visit https://sosyal-medya.net/tools
# Try Bio Generator → should return 3 bios
# Try Hashtag Analyzer → should return a score
# Log in at /login with admin/admin123
# If anything 500s → check backend runtime logs in hPanel

# ── After this, every git push auto-redeploys both apps ──
