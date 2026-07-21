# 🛡️ Production Security Guide

This guide covers what you **must** do before going live with sosyal-medya.net.

---

## 1. Generate a Strong JWT Secret

In your `.env`, replace `JWT_SECRET` with a long random string:

```bash
# Linux/Mac:
openssl rand -base64 64

# Windows PowerShell:
[Convert]::ToBase64String((1..48 | %{ Get-Random -Maximum 256 }))
```

Paste the output as `JWT_SECRET=<long-string>`.

**Why:** A weak JWT secret lets attackers forge admin tokens.

---

## 2. Set Up Resend Email

1. Go to **https://resend.com** → sign up free
2. Dashboard → API Keys → Create
3. In `.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=sosyal-medya.net <onboarding@resend.dev>
   ```
4. **For your custom domain** (recommended for production):
   - In Resend → Domains → Add your domain
   - Add the DNS records they show you (SPF, DKIM)
   - Wait for verification (~5 min)
   - Update `EMAIL_FROM=sosyal-medya.net <noreply@your-domain.com>`

**Free tier:** 3,000 emails/month, 100/day. Enough for most small sites.

---

## 3. Restrict CORS

In production `.env`:
```env
CORS_ORIGIN=https://your-domain.com
```

**Don't leave** `CORS_ORIGIN=*` in production — that lets any website call your API.

---

## 4. Set Public URL

```env
PUBLIC_URL=https://your-domain.com
```

This is used in email verification links and password reset links.

---

## 5. Enable HTTPS (Let's Encrypt — free)

On your Hostinger VPS:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot auto-installs the SSL certificate + sets up auto-renewal.

---

## 6. Nginx Production Config

Place at `/etc/nginx/sites-available/sosyalag`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # Auto-redirect to HTTPS handled by certbot

    client_max_body_size 60M;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:3001;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/sosyalag /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Change Default Passwords (CRITICAL)

After first login, immediately change all 3 default passwords:
- `admin / admin123` → change to your own
- `publisher / publisher123` → delete or change
- `creator / creator123` → delete or change

Use the user management page at `/admin/users`.

---

## 8. PM2 Process Manager

```bash
npm install -g pm2

# Backend
cd backend
pm2 start server.js --name sosyalag-api

# Frontend (after build)
cd ../frontend
npm run build
pm2 start npm --name sosyalag-web -- start

# Save and auto-restart on reboot
pm2 save
pm2 startup
```

---

## 9. Database Backups

Add a daily cron job:

```bash
sudo crontab -e
```

Add:
```
0 3 * * * pg_dump -U postgres sosyalag | gzip > /var/backups/sosyalag-$(date +\%Y\%m\%d).sql.gz
0 4 * * 0 find /var/backups -name "sosyalag-*.sql.gz" -mtime +30 -delete
```

This backs up daily at 3 AM and removes backups older than 30 days.

---

## 10. Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

This blocks all ports except SSH (22), HTTP (80), HTTPS (443).

---

## ⚠️ What's Still Risky

Even with all this set up, you should still:
- ✅ Keep Node.js + PostgreSQL + npm packages updated monthly
- ✅ Monitor `/admin/audit-log` for suspicious activity
- ✅ Use strong unique passwords (not from any other site)
- ✅ Add 2FA for the superadmin account (planned in Batch 3)
- ✅ Test backup restore at least once

**No system is unhackable.** But following this guide puts you in the top 5% of small sites in terms of security.

---

## 🚨 If You Get Hacked

1. **Immediately rotate** `JWT_SECRET` in `.env` and restart — invalidates all sessions
2. Force-logout all users via SuperAdmin panel
3. Check `audit-log` for what was accessed
4. Restore from last good backup
5. Update all dependencies (`npm audit fix`)
6. Reset all admin passwords
