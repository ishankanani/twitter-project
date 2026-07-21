'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const { query, pool } = require('./lib/db');
const {
  sign, authMiddleware, requireRole, requirePerm,
  recordLoginAttempt, isIpThrottled, auditLog, newSessionId
} = require('./lib/auth');
const { upload, processUpload, UPLOAD_DIR, fileType, deleteUploadedFile } = require('./lib/uploads');
const wa = require('./lib/whatsapp');
const notif = require('./lib/notifications');
const email = require('./lib/email');
const totp = require('./lib/totp');
const xSync = require('./services/xSync');
const rss = require('./services/rssFetch');
const profileInspector = require('./services/xProfileInspect');
const groq = require('./services/groq');
const { init: initSchema, DEFAULT_PERMISSIONS } = require('./lib/initDb');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

// ── Security middleware ──
app.use(helmet({
  contentSecurityPolicy: false, // disabled for media URLs
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const publicLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// ── HTML sanitizer for rich text ──
const sanitizeConfig = {
  allowedTags: ['p','br','strong','b','em','i','u','s','strike','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','a','span','mark','code','pre','img','figure'],
  allowedAttributes: {
    a: ['href','target','rel'],
    img: ['src','alt','width','height'],
    span: ['style'], p: ['style'],
    h1: ['style'], h2: ['style'], h3: ['style'],
    strong: ['style'], em: ['style'], u: ['style']
  },
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/, /^[a-z]+$/i],
      'font-size': [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      'font-weight': [/^(normal|bold|\d+)$/],
      'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^(none|underline|line-through)$/],
      'text-align': [/^(left|right|center|justify)$/],
      'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/]
    }
  },
  allowedSchemes: ['http','https','mailto','tel','data'],
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } })
  }
};

// ── Helpers ──
function camelize(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}
const camelizeAll = rows => rows.map(camelize);

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 80);
}

// ── HEALTH ──
app.get('/api/health', async (req, res) => {
  try { await query('SELECT 1'); res.json({ ok: true, db: 'connected' }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ═══════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════
// Helper — generates secure random tokens
function genToken() { return require('crypto').randomBytes(32).toString('hex'); }

app.post('/api/auth/login', authLimit, async (req, res) => {
  const ip = req.ip || '';
  const { username, password, website, totpCode } = req.body || {};
  // Honeypot — bots fill hidden fields
  if (website) return res.status(400).json({ error: 'Bot algılandı', code: 'BOT_DETECTED' });
  if (!username || !password) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });

  if (await isIpThrottled(ip)) {
    return res.status(429).json({ error: 'Çok fazla başarısız deneme. 10 dakika sonra tekrar deneyin.', code: 'TOO_MANY_ATTEMPTS' });
  }

  const r = await query(
    `SELECT id, username, email, full_name, avatar, password_hash, role, permissions, active, email_verified, totp_enabled, totp_secret, totp_backup_codes
     FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($1) LIMIT 1`,
    [username]
  );
  if (!r.rows.length) {
    await recordLoginAttempt(ip, username, false);
    return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre.', code: 'WRONG_CREDENTIALS' });
  }
  const u = r.rows[0];
  if (!u.active) {
    await recordLoginAttempt(ip, username, false);
    return res.status(403).json({ error: 'Hesap pasif. Yöneticinizle iletişime geçin.', code: 'ACCOUNT_INACTIVE' });
  }
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) {
    await recordLoginAttempt(ip, username, false);
    return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre.', code: 'WRONG_CREDENTIALS' });
  }

  // BLOCK login if email not verified
  if (!u.email_verified) {
    await recordLoginAttempt(ip, username, false);
    return res.status(403).json({
      error: 'E-postanız henüz doğrulanmadı. Lütfen e-posta adresinizi kontrol edin veya yeni bir doğrulama bağlantısı isteyin.',
      needsVerification: true,
      email: u.email
    });
  }

  // 2FA check
  if (u.totp_enabled) {
    if (!totpCode) {
      // Don't count as failed attempt — they have the password right
      return res.status(200).json({ needsTotp: true });
    }
    const code = String(totpCode).replace(/\s/g, '');
    let totpValid = false;
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      totpValid = totp.verifyToken(u.totp_secret, code);
    }
    // If TOTP failed, try as backup code
    if (!totpValid && Array.isArray(u.totp_backup_codes) && u.totp_backup_codes.length > 0) {
      const remaining = totp.verifyBackupCode(u.totp_backup_codes, code);
      if (remaining !== null) {
        totpValid = true;
        // Consume the backup code
        await query(`UPDATE users SET totp_backup_codes=$1 WHERE id=$2`, [JSON.stringify(remaining), u.id]);
      }
    }
    if (!totpValid) {
      await recordLoginAttempt(ip, username, false);
      return res.status(401).json({ error: 'Geçersiz 2FA kodu', code: 'INVALID_2FA', needsTotp: true });
    }
  }

  const sid = newSessionId();
  await query(
    `UPDATE users SET current_session_id=$1, last_login_at=NOW(), last_login_ip=$2 WHERE id=$3`,
    [sid, ip, u.id]
  );
  await recordLoginAttempt(ip, username, true);
  await auditLog(u.id, 'login', 'user', u.id, { username }, ip);

  const token = sign({ id: u.id, username: u.username, role: u.role, sid });
  res.json({
    token,
    user: {
      id: u.id, username: u.username, email: u.email, fullName: u.full_name,
      avatar: u.avatar, role: u.role, permissions: u.permissions || {}, emailVerified: true
    }
  });
});

app.post('/api/auth/register', authLimit, async (req, res) => {
  const { username, email, password, fullName, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Bot algılandı', code: 'BOT_DETECTED' });
  if (!username || !email || !password) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'Geçersiz kullanıcı adı (3-30 karakter, harf/rakam/_)' });
  if (!/^.+@.+\..+$/.test(email)) return res.status(400).json({ error: 'Geçerli e-posta gerekli' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, permissions, active, email_verified)
       VALUES ($1, $2, $3, $4, 'creator', $5, TRUE, FALSE)
       RETURNING id, username, email, full_name, role`,
      [username, email, hash, fullName || username, JSON.stringify(DEFAULT_PERMISSIONS.creator)]
    );
    const u = r.rows[0];

    // Generate verification token + email
    const vToken = genToken();
    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [u.id, vToken]
    );
    await email.sendVerifyEmail({ to: u.email, name: u.full_name || u.username, token: vToken, isInvite: false });

    res.status(201).json({
      ok: true,
      needsVerification: true,
      message: 'Kayıt başarılı! E-postanıza gelen doğrulama bağlantısına tıklayarak hesabınızı aktif edin.'
    });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Kullanıcı adı veya e-posta kayıtlı' });
    res.status(500).json({ error: e.message });
  }
});

// Verify email via token
app.post('/api/auth/verify-email', authLimit, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token gerekli' });

  const r = await query(
    `SELECT * FROM email_verifications WHERE token=$1 AND used=FALSE AND expires_at > NOW() LIMIT 1`,
    [token]
  );
  if (!r.rows.length) return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı.' });

  const v = r.rows[0];
  // If new_email is set, this is an email change verification
  if (v.new_email) {
    await query(`UPDATE users SET email=$1, email_verified=TRUE WHERE id=$2`, [v.new_email, v.user_id]);
  } else {
    await query(`UPDATE users SET email_verified=TRUE WHERE id=$1`, [v.user_id]);
  }
  await query(`UPDATE email_verifications SET used=TRUE WHERE id=$1`, [v.id]);
  await auditLog(v.user_id, 'email.verified', 'user', v.user_id, {}, req.ip);

  res.json({ ok: true, message: 'E-posta doğrulandı. Şimdi giriş yapabilirsiniz.' });
});

// Resend verification email
app.post('/api/auth/resend-verification', authLimit, async (req, res) => {
  const { email: emailAddr, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Bot' });
  if (!emailAddr) return res.status(400).json({ error: 'E-posta gerekli' });

  const r = await query(`SELECT id, email, full_name, username, email_verified FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [emailAddr]);
  // Always respond same way to prevent email enumeration
  if (!r.rows.length || r.rows[0].email_verified) {
    return res.json({ ok: true, message: 'Eğer hesap mevcutsa, doğrulama e-postası gönderildi.' });
  }
  const u = r.rows[0];
  const vToken = genToken();
  await query(
    `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
    [u.id, vToken]
  );
  await email.sendVerifyEmail({ to: u.email, name: u.full_name || u.username, token: vToken, isInvite: false });
  res.json({ ok: true, message: 'Eğer hesap mevcutsa, doğrulama e-postası gönderildi.' });
});

// Forgot password
app.post('/api/auth/forgot-password', authLimit, async (req, res) => {
  const { email: emailAddr, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Bot' });
  if (!emailAddr) return res.status(400).json({ error: 'E-posta gerekli' });

  const r = await query(`SELECT id, email, full_name, username FROM users WHERE LOWER(email)=LOWER($1) AND active=TRUE LIMIT 1`, [emailAddr]);
  // Always succeed to prevent email enumeration
  if (r.rows.length) {
    const u = r.rows[0];
    const pToken = genToken();
    await query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [u.id, pToken]
    );
    await email.sendPasswordResetEmail({ to: u.email, name: u.full_name || u.username, token: pToken });
    await auditLog(u.id, 'password.reset_requested', 'user', u.id, {}, req.ip);
  }
  res.json({ ok: true, message: 'Eğer hesap mevcutsa, şifre sıfırlama bağlantısı gönderildi.' });
});

// Reset password via token
app.post('/api/auth/reset-password', authLimit, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

  const r = await query(
    `SELECT * FROM password_resets WHERE token=$1 AND used=FALSE AND expires_at > NOW() LIMIT 1`,
    [token]
  );
  if (!r.rows.length) return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı.' });
  const p = r.rows[0];
  const hash = await bcrypt.hash(newPassword, 10);
  // Reset password + invalidate all sessions
  await query(`UPDATE users SET password_hash=$1, current_session_id=NULL WHERE id=$2`, [hash, p.user_id]);
  await query(`UPDATE password_resets SET used=TRUE WHERE id=$1`, [p.id]);
  await auditLog(p.user_id, 'password.reset', 'user', p.user_id, {}, req.ip);
  res.json({ ok: true, message: 'Şifre sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' });
});

// Change email (logged-in user) — requires re-verification
app.post('/api/auth/change-email', authMiddleware, async (req, res) => {
  const { newEmail, currentPassword } = req.body || {};
  if (!newEmail || !currentPassword) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  if (!/^.+@.+\..+$/.test(newEmail)) return res.status(400).json({ error: 'Geçerli e-posta gerekli' });

  const r = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
  if (!ok) return res.status(400).json({ error: 'Mevcut şifre yanlış' });

  // Check email not taken
  const exists = await query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND id<>$2 LIMIT 1`, [newEmail, req.user.id]);
  if (exists.rows.length) return res.status(409).json({ error: 'Bu e-posta zaten kullanılıyor' });

  const vToken = genToken();
  await query(
    `INSERT INTO email_verifications (user_id, token, new_email, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
    [req.user.id, vToken, newEmail]
  );
  await email.sendVerifyEmail({ to: newEmail, name: req.user.fullName || req.user.username, token: vToken, isInvite: false });
  res.json({ ok: true, message: 'Doğrulama bağlantısı yeni e-posta adresinize gönderildi.' });
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  await query(`UPDATE users SET current_session_id=NULL WHERE id=$1`, [req.user.id]);
  await auditLog(req.user.id, 'logout', 'user', req.user.id, {}, req.ip);
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => res.json({ user: req.user }));

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
  const r = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  const ok = await bcrypt.compare(currentPassword || '', r.rows[0].password_hash);
  if (!ok) return res.status(400).json({ error: 'Mevcut şifre yanlış' });
  const newHash = await bcrypt.hash(newPassword, 10);
  // Reset session — forces re-login on all devices
  const sid = newSessionId();
  await query(`UPDATE users SET password_hash=$1, current_session_id=$2 WHERE id=$3`, [newHash, sid, req.user.id]);
  const token = sign({ id: req.user.id, username: req.user.username, role: req.user.role, sid });
  res.json({ ok: true, token });
});

// ═══════════════════════════════════════════════════
// USER MANAGEMENT (superadmin only)
// ═══════════════════════════════════════════════════
app.get('/api/users', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const r = await query(
    `SELECT id, username, email, full_name, avatar, role, permissions, active, email_verified, last_login_at, created_at
     FROM users ORDER BY created_at DESC`
  );
  res.json(camelizeAll(r.rows));
});

app.post('/api/users', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { username, email: userEmail, password, fullName, role, permissions, active, emailVerified, sendInvite } = req.body || {};
  if (!username || !userEmail || !password) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  if (!['superadmin', 'publisher', 'creator'].includes(role)) return res.status(400).json({ error: 'Geçersiz rol' });
  const hash = await bcrypt.hash(password, 10);
  // Default: SuperAdmin-created users are NOT pre-verified (must verify via email)
  // SuperAdmin can override by setting emailVerified=true
  const isVerified = emailVerified === true;
  try {
    const r = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, permissions, active, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, username, email, full_name, role, permissions, active, email_verified`,
      [username, userEmail, hash, fullName || username, role,
       JSON.stringify(permissions || DEFAULT_PERMISSIONS[role] || {}), active !== false, isVerified]
    );
    const newUser = r.rows[0];

    // If not pre-verified, send invite/verification email
    if (!isVerified && sendInvite !== false) {
      const vToken = genToken();
      await query(
        `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [newUser.id, vToken]
      );
      await email.sendVerifyEmail({
        to: newUser.email,
        name: newUser.full_name || newUser.username,
        token: vToken,
        isInvite: true,
        tempPassword: password
      });
    }

    await auditLog(req.user.id, 'user.create', 'user', newUser.id, { username, role }, req.ip);
    res.status(201).json(camelize(newUser));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Kullanıcı adı veya e-posta kayıtlı' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { fullName, email: userEmail, role, permissions, active, emailVerified } = req.body || {};
  if (role && !['superadmin', 'publisher', 'creator'].includes(role)) return res.status(400).json({ error: 'Geçersiz rol' });
  const r = await query(
    `UPDATE users SET
       full_name=COALESCE($1, full_name),
       email=COALESCE($2, email),
       role=COALESCE($3, role),
       permissions=COALESCE($4::jsonb, permissions),
       active=COALESCE($5, active),
       email_verified=COALESCE($6, email_verified),
       updated_at=NOW()
     WHERE id=$7 RETURNING id, username, email, full_name, role, permissions, active, email_verified`,
    [fullName, userEmail, role, permissions ? JSON.stringify(permissions) : null, active, emailVerified, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  await auditLog(req.user.id, 'user.update', 'user', req.params.id, req.body, req.ip);
  res.json(camelize(r.rows[0]));
});

// SuperAdmin manual verify/unverify override
app.post('/api/users/:id/verify', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { verified } = req.body || {};
  await query(`UPDATE users SET email_verified=$1 WHERE id=$2`, [verified !== false, req.params.id]);
  await auditLog(req.user.id, 'user.verify_override', 'user', req.params.id, { verified }, req.ip);
  res.json({ ok: true });
});

// SuperAdmin manually resend verification to a user
app.post('/api/users/:id/resend-verification', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const r = await query(`SELECT id, email, full_name, username, email_verified FROM users WHERE id=$1`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  if (r.rows[0].email_verified) return res.status(400).json({ error: 'Zaten doğrulanmış' });
  const u = r.rows[0];
  const vToken = genToken();
  await query(
    `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
    [u.id, vToken]
  );
  await email.sendVerifyEmail({ to: u.email, name: u.full_name || u.username, token: vToken, isInvite: false });
  res.json({ ok: true, message: 'Doğrulama e-postası gönderildi' });
});

app.put('/api/users/:id/password', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Kendi şifrenizi buradan değil, profil sayfasından değiştirin' });
  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password_hash=$1, current_session_id=NULL WHERE id=$2`, [hash, req.params.id]);
  await auditLog(req.user.id, 'user.reset_password', 'user', req.params.id, {}, req.ip);
  res.json({ ok: true });
});

app.delete('/api/users/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
  await query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  await auditLog(req.user.id, 'user.delete', 'user', req.params.id, {}, req.ip);
  res.json({ ok: true });
});

app.post('/api/users/:id/force-logout', authMiddleware, requireRole('superadmin'), async (req, res) => {
  await query(`UPDATE users SET current_session_id=NULL WHERE id=$1`, [req.params.id]);
  await auditLog(req.user.id, 'user.force_logout', 'user', req.params.id, {}, req.ip);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// USER POSTS (creator submissions + publisher review)
// ═══════════════════════════════════════════════════

// Creator submits a post
app.post('/api/user-posts', authMiddleware, async (req, res) => {
  const { type, title, content, excerpt, coverImage, media, category, tags, status, scheduledAt } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Başlık ve içerik zorunlu' });
  const clean = sanitizeHtml(content, sanitizeConfig);
  const finalStatus = status === 'draft' ? 'draft' : 'pending';
  let slug = slugify(title) + '-' + Date.now().toString(36);

  const r = await query(
    `INSERT INTO user_posts (author_id, type, title, slug, content, excerpt, cover_image, media, category, tags, status, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [req.user.id, type || 'post', title.slice(0, 500), slug, clean, (excerpt || '').slice(0, 500),
     coverImage || '', JSON.stringify(media || []), category || 'gundem', JSON.stringify(tags || []), finalStatus,
     scheduledAt || null]
  );

  // Notify all superadmins of new submission
  if (finalStatus === 'pending') {
    await notif.notifyRole('superadmin', {
      type: 'post_submitted',
      title: '📥 Yeni içerik incelemede',
      body: `${req.user.username} yeni bir ${type || 'post'} gönderdi: ${title.slice(0, 60)}`,
      link: '/admin/posts-review'
    });
  }

  await auditLog(req.user.id, 'post.submit', 'user_post', r.rows[0].id, { title, type }, req.ip);
  res.status(201).json(camelize(r.rows[0]));
});

// Instant publish — publisher + superadmin only. No approval loop: they ARE the approvers.
// Published immediately (or at scheduledAt if provided).
app.post('/api/admin/publish-post', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'publisher') {
    return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  }
  const { type, title, content, excerpt, coverImage, media, category, tags, scheduledAt } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Başlık ve içerik zorunlu', code: 'TITLE_CONTENT_REQUIRED' });
  const clean = sanitizeHtml(content, sanitizeConfig);
  const slug = slugify(title) + '-' + Date.now().toString(36);
  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  const r = await query(
    `INSERT INTO user_posts (author_id, type, title, slug, content, excerpt, cover_image, media, category, tags,
        status, scheduled_at, reviewed_by, reviewed_at, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',$11,$1,NOW(), CASE WHEN $12::boolean THEN NULL ELSE NOW() END)
     RETURNING *`,
    [req.user.id, type || 'news', title.slice(0, 500), slug, clean, (excerpt || '').slice(0, 500),
     coverImage || '', JSON.stringify(media || []), category || 'gundem', JSON.stringify(tags || []),
     scheduledAt || null, !!isScheduled]
  );

  await auditLog(req.user.id, 'post.publish_direct', 'user_post', r.rows[0].id, { title, type: type || 'news', scheduled: !!isScheduled }, req.ip);
  res.status(201).json(camelize(r.rows[0]));
});

// Creator views own posts
app.get('/api/user-posts/mine', authMiddleware, async (req, res) => {
  const r = await query(
    `SELECT up.*, u.username as reviewer_username FROM user_posts up
     LEFT JOIN users u ON u.id = up.reviewed_by
     WHERE up.author_id=$1 ORDER BY up.created_at DESC`,
    [req.user.id]
  );
  res.json(camelizeAll(r.rows));
});

// Creator edits draft / pending
app.put('/api/user-posts/:id', authMiddleware, async (req, res) => {
  const p = await query(`SELECT * FROM user_posts WHERE id=$1 LIMIT 1`, [req.params.id]);
  if (!p.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const post = p.rows[0];
  const isOwner = post.author_id === req.user.id;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'publisher';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  if (isOwner && !isAdmin && post.status === 'approved') return res.status(403).json({ error: 'Onaylı içerik düzenlenemez' });

  const { title, content, excerpt, coverImage, media, category, tags, status, scheduledAt } = req.body || {};
  const clean = content ? sanitizeHtml(content, sanitizeConfig) : null;
  // If creator edits a declined post, set status back to pending
  const newStatus = (isOwner && post.status === 'declined') ? 'pending' :
                    (status && isAdmin) ? status : post.status;

  const r = await query(
    `UPDATE user_posts SET
       title=COALESCE($1, title),
       content=COALESCE($2, content),
       excerpt=COALESCE($3, excerpt),
       cover_image=COALESCE($4, cover_image),
       media=COALESCE($5::jsonb, media),
       category=COALESCE($6, category),
       tags=COALESCE($7::jsonb, tags),
       status=$8,
       scheduled_at=$9,
       updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [title, clean, excerpt, coverImage, media ? JSON.stringify(media) : null,
     category, tags ? JSON.stringify(tags) : null, newStatus,
     scheduledAt !== undefined ? scheduledAt : post.scheduled_at,
     req.params.id]
  );
  res.json(camelize(r.rows[0]));
});

app.delete('/api/user-posts/:id', authMiddleware, async (req, res) => {
  const p = await query(`SELECT author_id FROM user_posts WHERE id=$1 LIMIT 1`, [req.params.id]);
  if (!p.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const isOwner = p.rows[0].author_id === req.user.id;
  const isAdmin = req.user.role === 'superadmin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  await query(`DELETE FROM user_posts WHERE id=$1`, [req.params.id]);
  await auditLog(req.user.id, 'post.delete', 'user_post', req.params.id, {}, req.ip);
  res.json({ ok: true });
});

// Public list of approved posts
app.get('/api/posts', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  let r;
  if (req.query.category) {
    r = await query(
      `SELECT up.id, up.type, up.title, up.slug, up.excerpt, up.cover_image, up.category, up.tags, up.published_at, up.view_count,
              u.username as author_username, u.full_name as author_name, u.avatar as author_avatar
       FROM user_posts up JOIN users u ON u.id=up.author_id
       WHERE up.status='approved' AND up.published_at IS NOT NULL AND up.category=$1
       ORDER BY up.published_at DESC LIMIT $2`,
      [req.query.category, limit]
    );
  } else {
    r = await query(
      `SELECT up.id, up.type, up.title, up.slug, up.excerpt, up.cover_image, up.category, up.tags, up.published_at, up.view_count,
              u.username as author_username, u.full_name as author_name, u.avatar as author_avatar
       FROM user_posts up JOIN users u ON u.id=up.author_id
       WHERE up.status='approved' AND up.published_at IS NOT NULL
       ORDER BY up.published_at DESC LIMIT $1`,
      [limit]
    );
  }
  res.json(camelizeAll(r.rows));
});

// Public single post by slug
app.get('/api/posts/:slug', async (req, res) => {
  const r = await query(
    `SELECT up.*, u.username as author_username, u.full_name as author_name, u.avatar as author_avatar, u.bio as author_bio
     FROM user_posts up JOIN users u ON u.id=up.author_id
     WHERE up.slug=$1 AND up.status='approved' AND up.published_at IS NOT NULL LIMIT 1`,
    [req.params.slug]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  await query(`UPDATE user_posts SET view_count=view_count+1 WHERE id=$1`, [r.rows[0].id]);
  res.json(camelize(r.rows[0]));
});

// Review queue (superadmin / publisher with permission)
app.get('/api/posts-review', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.posts_review) {
    return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  }
  let r;
  if (req.query.status && req.query.status !== 'all') {
    r = await query(
      `SELECT up.*, u.username as author_username, u.full_name as author_name, u.avatar as author_avatar
       FROM user_posts up JOIN users u ON u.id=up.author_id
       WHERE up.status=$1 ORDER BY up.created_at DESC LIMIT 100`,
      [req.query.status]
    );
  } else {
    r = await query(
      `SELECT up.*, u.username as author_username, u.full_name as author_name, u.avatar as author_avatar
       FROM user_posts up JOIN users u ON u.id=up.author_id
       ORDER BY CASE WHEN up.status='pending' THEN 0 ELSE 1 END, up.created_at DESC LIMIT 100`
    );
  }
  res.json(camelizeAll(r.rows));
});

// Approve / decline
app.post('/api/posts-review/:id/approve', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.posts_review) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const r = await query(
    `UPDATE user_posts SET status='approved', reviewed_by=$1, reviewed_at=NOW(),
       published_at = CASE WHEN scheduled_at IS NULL OR scheduled_at <= NOW() THEN NOW() ELSE NULL END,
       decline_reason=''
     WHERE id=$2 RETURNING author_id, title, scheduled_at, published_at`,
    [req.user.id, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const isScheduled = r.rows[0].published_at === null;
  await notif.createNotification({
    userId: r.rows[0].author_id, type: 'post_approved',
    title: isScheduled ? '✅ İçeriğiniz onaylandı (zamanlandı)' : '✅ İçeriğiniz onaylandı',
    body: isScheduled
      ? `"${r.rows[0].title.slice(0, 50)}" — ${new Date(r.rows[0].scheduled_at).toLocaleString('tr-TR')} tarihinde yayına girecek.`
      : `"${r.rows[0].title.slice(0, 50)}" sitede yayında.`,
    link: '/dashboard/posts'
  });
  await query(
    `INSERT INTO activities (user_id, type, post_id, actor_id) VALUES ($1,'post_approved',$2,$3)`,
    [r.rows[0].author_id, req.params.id, req.user.id]
  ).catch(() => {});
  await auditLog(req.user.id, 'post.approve', 'user_post', req.params.id, {}, req.ip);
  res.json({ ok: true, scheduled: isScheduled });
});

app.post('/api/posts-review/:id/decline', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.posts_review) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const { reason } = req.body || {};
  const r = await query(
    `UPDATE user_posts SET status='declined', reviewed_by=$1, reviewed_at=NOW(), decline_reason=$2
     WHERE id=$3 RETURNING author_id, title`,
    [req.user.id, reason || 'Sebep belirtilmedi', req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  await notif.createNotification({
    userId: r.rows[0].author_id, type: 'post_declined',
    title: '❌ İçeriğiniz reddedildi',
    body: `"${r.rows[0].title.slice(0, 50)}" — Sebep: ${reason || 'Belirtilmedi'}`,
    link: '/dashboard/posts'
  });
  await query(
    `INSERT INTO activities (user_id, type, post_id, actor_id, data) VALUES ($1,'post_declined',$2,$3,$4)`,
    [r.rows[0].author_id, req.params.id, req.user.id, JSON.stringify({ reason })]
  ).catch(() => {});
  await auditLog(req.user.id, 'post.decline', 'user_post', req.params.id, { reason }, req.ip);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const r = await query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(camelizeAll(r.rows));
});

app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
  const r = await query(`SELECT COUNT(*)::int AS c FROM notifications WHERE user_id=$1 AND read=FALSE`, [req.user.id]);
  res.json({ count: r.rows[0].c });
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  await query(`UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.put('/api/notifications/mark-all-read', authMiddleware, async (req, res) => {
  await query(`UPDATE notifications SET read=TRUE WHERE user_id=$1`, [req.user.id]);
  res.json({ ok: true });
});

// Superadmin sends notification to specific user or all of a role
app.post('/api/notifications/send', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { userId, role, title, body, link } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Başlık zorunlu' });
  if (userId) {
    await notif.createNotification({ userId, type: 'admin_message', title, body, link });
  } else if (role) {
    await notif.notifyRole(role, { type: 'admin_message', title, body, link });
  } else {
    return res.status(400).json({ error: 'userId veya role gerekli' });
  }
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// COLLABORATIONS (with WhatsApp + media + status)
// ═══════════════════════════════════════════════════
app.post('/api/collaborations', publicLimit, async (req, res) => {
  const { company, contactName, email, phone, type, budget, budgetAmount, budgetCurrency, message, media } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: 'E-posta ve mesaj zorunlu' });
  const amt = budgetAmount ? parseFloat(budgetAmount) : null;
  const r = await query(
    `INSERT INTO collaborations (company, contact_name, email, phone, type, budget, budget_amount, budget_currency, message, media)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [company || '', contactName || '', email, phone || '', type || 'advertisement',
     budget || (amt ? `${amt} ${budgetCurrency || 'EUR'}` : ''),
     amt, budgetCurrency || 'EUR', message, JSON.stringify(media || [])]
  );

  const collab = camelize(r.rows[0]);

  // Build WhatsApp link + optionally auto-send
  let waResult = null;
  try { waResult = await wa.notifyCollaboration(collab); }
  catch (e) { console.warn('[WA] notify failed:', e.message); }

  // Notify all superadmins
  await notif.notifyRole('superadmin', {
    type: 'collaboration',
    title: '🤝 Yeni iş birliği talebi',
    body: `${company || contactName || email} — ${(message || '').slice(0, 60)}`,
    link: '/admin/collaborations'
  });

  res.status(201).json({ ok: true, id: collab.id, whatsappLink: waResult?.waLink, autoSent: waResult?.autoSent });
});

app.get('/api/collaborations', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.collaborations) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  let r;
  if (req.query.status) {
    r = await query(`SELECT * FROM collaborations WHERE status=$1 ORDER BY created_at DESC`, [req.query.status]);
  } else {
    r = await query(`SELECT * FROM collaborations ORDER BY created_at DESC`);
  }
  res.json(camelizeAll(r.rows));
});

app.put('/api/collaborations/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.collaborations) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const { status, adminRemarks, assignedTo } = req.body || {};
  const r = await query(
    `UPDATE collaborations SET
       status=COALESCE($1, status),
       admin_remarks=COALESCE($2, admin_remarks),
       assigned_to=COALESCE($3, assigned_to),
       read=TRUE,
       updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [status, adminRemarks, assignedTo, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  await auditLog(req.user.id, 'collab.update', 'collaboration', req.params.id, req.body, req.ip);
  res.json(camelize(r.rows[0]));
});

app.delete('/api/collaborations/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  // Delete attached media files
  const c = await query(`SELECT media FROM collaborations WHERE id=$1`, [req.params.id]);
  if (c.rows.length) {
    const media = c.rows[0].media || [];
    for (const m of media) if (m.url) deleteUploadedFile(m.url);
  }
  await query(`DELETE FROM collaborations WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Get fresh WhatsApp link for an existing collaboration
app.get('/api/collaborations/:id/whatsapp', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.collaborations) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const r = await query(`SELECT * FROM collaborations WHERE id=$1`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const c = camelize(r.rows[0]);
  const waResult = await wa.notifyCollaboration(c);
  res.json(waResult);
});

// ═══════════════════════════════════════════════════
// PAYMENTS / REVENUE (superadmin)
// ═══════════════════════════════════════════════════
app.get('/api/payments', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { from, to, month, year } = req.query;
  const conds = [];
  const params = [];
  let idx = 1;
  if (year) { conds.push(`EXTRACT(YEAR FROM received_at)=$${idx++}`); params.push(parseInt(year)); }
  if (month) { conds.push(`EXTRACT(MONTH FROM received_at)=$${idx++}`); params.push(parseInt(month)); }
  if (from) { conds.push(`received_at >= $${idx++}`); params.push(from); }
  if (to) { conds.push(`received_at <= $${idx++}`); params.push(to); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const r = await query(`SELECT * FROM payments ${where} ORDER BY received_at DESC LIMIT 500`, params);
  res.json(camelizeAll(r.rows));
});

app.post('/api/payments', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { collaborationId, amount, currency, source, description, status, receivedAt } = req.body || {};
  if (!amount) return res.status(400).json({ error: 'Tutar zorunlu' });
  const r = await query(
    `INSERT INTO payments (collaboration_id, amount, currency, source, description, status, received_at, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [collaborationId || null, parseFloat(amount), currency || 'EUR', source || '', description || '',
     status || 'received', receivedAt || new Date().toISOString(), req.user.id]
  );
  await auditLog(req.user.id, 'payment.create', 'payment', r.rows[0].id, { amount }, req.ip);
  res.status(201).json(camelize(r.rows[0]));
});

app.put('/api/payments/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const { amount, currency, source, description, status, receivedAt } = req.body || {};
  const r = await query(
    `UPDATE payments SET
       amount=COALESCE($1, amount),
       currency=COALESCE($2, currency),
       source=COALESCE($3, source),
       description=COALESCE($4, description),
       status=COALESCE($5, status),
       received_at=COALESCE($6, received_at)
     WHERE id=$7 RETURNING *`,
    [amount ? parseFloat(amount) : null, currency, source, description, status, receivedAt, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});

app.delete('/api/payments/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  await query(`DELETE FROM payments WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Revenue analytics
app.get('/api/payments/analytics/summary', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const [total, byMonth, bySource, recent] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount),0)::float AS total, COUNT(*)::int AS count FROM payments WHERE EXTRACT(YEAR FROM received_at)=$1`, [year]),
    query(
      `SELECT EXTRACT(MONTH FROM received_at)::int AS month, COALESCE(SUM(amount),0)::float AS total, COUNT(*)::int AS count
       FROM payments WHERE EXTRACT(YEAR FROM received_at)=$1 GROUP BY month ORDER BY month`,
      [year]
    ),
    query(
      `SELECT COALESCE(source,'Diğer') AS source, COALESCE(SUM(amount),0)::float AS total, COUNT(*)::int AS count
       FROM payments WHERE EXTRACT(YEAR FROM received_at)=$1 GROUP BY source ORDER BY total DESC LIMIT 10`,
      [year]
    ),
    query(`SELECT * FROM payments ORDER BY received_at DESC LIMIT 5`)
  ]);
  res.json({
    year, total: total.rows[0],
    byMonth: byMonth.rows,
    bySource: bySource.rows,
    recent: camelizeAll(recent.rows)
  });
});

// ═══════════════════════════════════════════════════
// STATS (mixed)
// ═══════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  const [accs, subs, tweets, news, contacts, collabs, newsletter, posts, users] = await Promise.all([
    query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(followers),0)::int AS f FROM accounts WHERE enabled=TRUE`),
    query(`SELECT COUNT(*)::int AS c FROM subscribers`),
    query(`SELECT COUNT(*)::int AS c FROM tweets`),
    query(`SELECT COUNT(*)::int AS c FROM news_items`),
    query(`SELECT COUNT(*)::int AS c FROM contacts WHERE read=FALSE`),
    query(`SELECT COUNT(*)::int AS c FROM collaborations WHERE read=FALSE`),
    query(`SELECT COUNT(*)::int AS c FROM newsletter`),
    query(`SELECT
            COUNT(*) FILTER (WHERE status='pending')::int AS pending,
            COUNT(*) FILTER (WHERE status='approved')::int AS approved
          FROM user_posts`),
    query(`SELECT COUNT(*)::int AS c FROM users WHERE active=TRUE`)
  ]);
  res.json({
    accountCount: accs.rows[0].c, totalFollowers: accs.rows[0].f,
    subscriberCount: subs.rows[0].c, tweetCount: tweets.rows[0].c,
    newsCount: news.rows[0].c, contactCount: contacts.rows[0].c,
    collaborationCount: collabs.rows[0].c, newsletterCount: newsletter.rows[0].c,
    pendingPosts: posts.rows[0].pending, approvedPosts: posts.rows[0].approved,
    userCount: users.rows[0].c
  });
});

// ═══════════════════════════════════════════════════
// ACCOUNTS / TWEETS / SUBSCRIBERS / CONTACTS / NEWSLETTER / RSS / CMS
// (carried over from v2 with permission checks)
// ═══════════════════════════════════════════════════
app.get('/api/accounts', async (req, res) => {
  const r = await query(`SELECT * FROM accounts WHERE enabled=TRUE ORDER BY followers DESC, id`);
  res.json(camelizeAll(r.rows));
});
app.get('/api/accounts/handle/:handle', async (req, res) => {
  const h = req.params.handle.replace(/^@/, '');
  const r = await query(`SELECT * FROM accounts WHERE LOWER(handle)=LOWER($1)`, [h]);
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});
app.post('/api/accounts', authMiddleware, requirePerm('accounts'), async (req, res) => {
  const { displayName, handle, url, bio, category, followers, avatar } = req.body || {};
  const h = (handle || '').replace(/^@/, '').trim();
  if (!h || !displayName) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  try {
    const r = await query(
      `INSERT INTO accounts (display_name, handle, url, bio, category, followers, avatar)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [displayName, h, url || `https://x.com/${h}`, bio || '', category || 'gundem', parseInt(followers) || 0, avatar || '']
    );
    xSync.syncAllAccounts().catch(() => {});
    res.status(201).json(camelize(r.rows[0]));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Zaten ekli' });
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/accounts/:id', authMiddleware, requirePerm('accounts'), async (req, res) => {
  const { displayName, handle, url, bio, category, followers, avatar, enabled } = req.body || {};
  const h = handle ? handle.replace(/^@/, '').trim() : undefined;
  const r = await query(
    `UPDATE accounts SET
       display_name=COALESCE($1, display_name), handle=COALESCE($2, handle),
       url=COALESCE($3, url), bio=COALESCE($4, bio), category=COALESCE($5, category),
       followers=COALESCE($6, followers), avatar=COALESCE($7, avatar), enabled=COALESCE($8, enabled),
       updated_at=NOW() WHERE id=$9 RETURNING *`,
    [displayName, h, url, bio, category, followers !== undefined ? parseInt(followers) : null, avatar, enabled, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});
app.delete('/api/accounts/:id', authMiddleware, requirePerm('accounts'), async (req, res) => {
  const r = await query(`DELETE FROM accounts WHERE id=$1 RETURNING handle`, [req.params.id]);
  if (r.rows.length) await query(`DELETE FROM tweets WHERE LOWER(account_handle)=LOWER($1)`, [r.rows[0].handle]);
  res.json({ ok: true });
});

// Tweets
app.get('/api/tweets', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  let r;
  if (req.query.handle) {
    r = await query(`SELECT * FROM tweets WHERE LOWER(account_handle)=LOWER($1) ORDER BY created_at DESC LIMIT $2`, [req.query.handle.replace(/^@/, ''), limit]);
  } else {
    r = await query(`SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1`, [limit]);
  }
  res.json(camelizeAll(r.rows));
});
app.post('/api/tweets', authMiddleware, requirePerm('tweets'), async (req, res) => {
  const { accountHandle, text, richText, media, likes, retweets, replies, createdAt, xUrl } = req.body || {};
  const h = (accountHandle || '').replace(/^@/, '');
  if (!h || !text) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  const cleanRich = richText ? sanitizeHtml(richText, sanitizeConfig) : null;
  const r = await query(
    `INSERT INTO tweets (x_id, account_handle, text, rich_text, media, likes, retweets, replies, created_at, x_url, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'manual') RETURNING *`,
    [`manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, h, text, cleanRich, JSON.stringify(media || []),
     likes || 0, retweets || 0, replies || 0, createdAt || new Date().toISOString(), xUrl || '']
  );
  res.status(201).json(camelize(r.rows[0]));
});
app.put('/api/tweets/:id', authMiddleware, requirePerm('tweets'), async (req, res) => {
  const { text, richText, media, xUrl } = req.body || {};
  const cleanRich = richText ? sanitizeHtml(richText, sanitizeConfig) : null;
  const r = await query(
    `UPDATE tweets SET text=COALESCE($1, text), rich_text=COALESCE($2, rich_text),
       media=COALESCE($3, media), x_url=COALESCE($4, x_url) WHERE id=$5 RETURNING *`,
    [text, cleanRich, media ? JSON.stringify(media) : null, xUrl, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});
app.delete('/api/tweets/:id', authMiddleware, requirePerm('tweets'), async (req, res) => {
  const t = await query(`SELECT media FROM tweets WHERE id=$1`, [req.params.id]);
  if (t.rows.length) for (const m of (t.rows[0].media || [])) if (m.url) deleteUploadedFile(m.url);
  await query(`DELETE FROM tweets WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});
app.post('/api/tweets/sync-now', authMiddleware, requirePerm('tweets'), async (req, res) => {
  try { const r = await xSync.syncAllAccounts(); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// File upload (auto-optimizes images via sharp)
app.post('/api/upload', authMiddleware, upload.array('files', 4), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Dosya yok' });
  try {
    const files = await Promise.all(req.files.map(f => processUpload(f)));
    res.json({ files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public upload (for collaboration form attachments)
app.post('/api/upload/public', publicLimit, upload.array('files', 4), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Dosya yok' });
  try {
    const files = await Promise.all(req.files.map(f => processUpload(f)));
    res.json({ files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Templates
app.get('/api/templates', authMiddleware, requirePerm('tweets'), async (req, res) => {
  const r = await query(`SELECT * FROM tweet_templates ORDER BY updated_at DESC`);
  res.json(camelizeAll(r.rows));
});
app.post('/api/templates', authMiddleware, requirePerm('tweets'), async (req, res) => {
  const { name, category, richText, previewText } = req.body || {};
  if (!name || !richText) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  const clean = sanitizeHtml(richText, sanitizeConfig);
  const r = await query(
    `INSERT INTO tweet_templates (name, category, rich_text, preview_text) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, category || 'general', clean, previewText || '']
  );
  res.status(201).json(camelize(r.rows[0]));
});
app.delete('/api/templates/:id', authMiddleware, requirePerm('tweets'), async (req, res) => {
  await query(`DELETE FROM tweet_templates WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Subscribers
app.get('/api/subscribers', async (req, res) => {
  const r = await query(`SELECT * FROM subscribers ORDER BY added_at DESC`);
  res.json(camelizeAll(r.rows));
});
app.post('/api/subscribers', authMiddleware, requirePerm('subscribers'), async (req, res) => {
  const { name, handle, xUrl } = req.body || {};
  const h = (handle || '').replace(/^@/, '');
  if (!name || !h) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  const r = await query(`INSERT INTO subscribers (name, handle, x_url) VALUES ($1,$2,$3) RETURNING *`, [name, h, xUrl || `https://x.com/${h}`]);
  res.status(201).json(camelize(r.rows[0]));
});
app.put('/api/subscribers/:id', authMiddleware, requirePerm('subscribers'), async (req, res) => {
  const { name, handle, xUrl } = req.body || {};
  const r = await query(
    `UPDATE subscribers SET name=COALESCE($1,name), handle=COALESCE($2,handle), x_url=COALESCE($3,x_url) WHERE id=$4 RETURNING *`,
    [name, handle ? handle.replace(/^@/, '') : null, xUrl, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});
app.delete('/api/subscribers/:id', authMiddleware, requirePerm('subscribers'), async (req, res) => {
  await query(`DELETE FROM subscribers WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Contacts
app.post('/api/contacts', publicLimit, async (req, res) => {
  const { name, email, subject, message, type } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  const r = await query(
    `INSERT INTO contacts (name, email, subject, message, type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [name || '', email, subject || '', message, type || 'general']
  );
  await notif.notifyRole('superadmin', {
    type: 'contact', title: '✉️ Yeni iletişim mesajı',
    body: `${name || email}: ${(message || '').slice(0, 60)}`, link: '/admin/contacts'
  });
  res.status(201).json({ ok: true, id: r.rows[0].id });
});
app.get('/api/contacts', authMiddleware, requirePerm('contacts'), async (req, res) => {
  const r = await query(`SELECT * FROM contacts ORDER BY created_at DESC`);
  res.json(camelizeAll(r.rows));
});
app.put('/api/contacts/:id/read', authMiddleware, requirePerm('contacts'), async (req, res) => {
  await query(`UPDATE contacts SET read=TRUE WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/contacts/:id', authMiddleware, requirePerm('contacts'), async (req, res) => {
  await query(`DELETE FROM contacts WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Newsletter
app.post('/api/newsletter', publicLimit, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^.+@.+\..+$/.test(email)) return res.status(400).json({ error: 'Geçerli e-posta gerekli' });
  try { await query(`INSERT INTO newsletter (email) VALUES ($1)`, [email]); res.status(201).json({ ok: true }); }
  catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Zaten kayıtlı' }); throw e; }
});
app.get('/api/newsletter', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  const r = await query(`SELECT * FROM newsletter ORDER BY subscribed_at DESC`);
  res.json(camelizeAll(r.rows));
});
app.delete('/api/newsletter/:id', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  await query(`DELETE FROM newsletter WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// RSS
app.get('/api/rss', authMiddleware, requirePerm('rss'), async (req, res) => {
  const r = await query(`SELECT * FROM rss_sources ORDER BY id`);
  res.json(camelizeAll(r.rows));
});
app.post('/api/rss', authMiddleware, requirePerm('rss'), async (req, res) => {
  const { name, url, category, enabled } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'Eksik alan', code: 'MISSING_FIELDS' });
  const r = await query(`INSERT INTO rss_sources (name, url, category, enabled) VALUES ($1,$2,$3,$4) RETURNING *`, [name, url, category || 'gundem', enabled !== false]);
  res.status(201).json(camelize(r.rows[0]));
});
app.put('/api/rss/:id', authMiddleware, requirePerm('rss'), async (req, res) => {
  const { name, url, category, enabled } = req.body || {};
  const r = await query(
    `UPDATE rss_sources SET name=COALESCE($1,name), url=COALESCE($2,url), category=COALESCE($3,category), enabled=COALESCE($4,enabled) WHERE id=$5 RETURNING *`,
    [name, url, category, enabled, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  res.json(camelize(r.rows[0]));
});
app.delete('/api/rss/:id', authMiddleware, requirePerm('rss'), async (req, res) => {
  await query(`DELETE FROM rss_sources WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});
app.post('/api/rss/fetch-now', authMiddleware, requirePerm('rss'), async (req, res) => {
  try { const c = await rss.fetchAll(); res.json({ count: c }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Public news
app.get('/api/news', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  let r;
  if (req.query.category) r = await query(`SELECT * FROM news_items WHERE category=$1 ORDER BY published_at DESC LIMIT $2`, [req.query.category, limit]);
  else r = await query(`SELECT * FROM news_items ORDER BY published_at DESC LIMIT $1`, [limit]);
  res.json(camelizeAll(r.rows));
});

// CMS
app.get('/api/cms', async (req, res) => {
  const r = await query(`SELECT key, value FROM cms_blocks`);
  const out = {};
  for (const row of r.rows) out[row.key] = row.value;
  res.json(out);
});
app.put('/api/cms', authMiddleware, requirePerm('cms'), async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    await query(`INSERT INTO cms_blocks (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`, [k, String(v)]);
  }
  res.json({ ok: true });
});

// Settings
app.get('/api/settings', authMiddleware, requirePerm('settings'), async (req, res) => {
  const r = await query(`SELECT key, value FROM settings`);
  const out = {};
  for (const row of r.rows) {
    out[row.key] = row.value;
    if ((row.key === 'callmebot_api_key' || row.key === 'x_bearer_token') && typeof row.value === 'string' && row.value) {
      out[row.key] = row.value.slice(0, 6) + '...';
    }
  }
  res.json(out);
});
app.put('/api/settings', authMiddleware, requirePerm('settings'), async (req, res) => {
  for (let [k, v] of Object.entries(req.body || {})) {
    if ((k === 'callmebot_api_key' || k === 'x_bearer_token') && typeof v === 'string' && v.includes('...')) continue;
    await query(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`, [k, JSON.stringify(v)]);
  }
  res.json({ ok: true });
});

// Public site info (no auth)
app.get('/api/site-info', async (req, res) => {
  const r = await query(`SELECT key, value FROM settings WHERE key IN ('site_name','company_name','site_email')`);
  const out = {};
  for (const row of r.rows) out[row.key] = row.value;
  res.json(out);
});

// Tools (shadowban + audit) - kept from v2
const toolsLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });
const inspectCache = new Map();

app.post('/api/tools/shadowban', toolsLimit, async (req, res) => {
  const handle = String(req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) return res.status(400).json({ error: 'Handle gerekli' });
  let data = inspectCache.get(handle);
  if (!data || Date.now() - data._t > 600000) {
    data = await profileInspector.inspectProfile(handle);
    if (!data.error) { data._t = Date.now(); inspectCache.set(handle, data); }
  }
  if (data.error) return res.status(400).json({ error: data.error, code: data.errorCode || 'NOT_FOUND' });
  if (data.suspended) return res.json({ handle: data.handle, overall: 'suspended', score: 0, message: 'Hesap askıda', checks: [] });

  const p = data.profile, tweets = data.tweets || [];
  const checks = [];
  checks.push(data.searchVisible === true
    ? { id: 'search', label: 'Arama Görünürlüğü', status: 'pass', message: 'Profil aramada görünüyor.' }
    : data.searchVisible === false
      ? { id: 'search', label: 'Arama Görünürlüğü', status: 'fail', message: 'Aramada bulunamadı — olası search ban.' }
      : { id: 'search', label: 'Arama Görünürlüğü', status: 'warn', message: 'Doğrulanamadı.' });
  checks.push(tweets.length >= 10
    ? { id: 'frequency', label: 'Gönderi Sıklığı', status: 'pass', message: `${tweets.length} gönderi alınabildi.` }
    : tweets.length >= 3 ? { id: 'frequency', label: 'Gönderi Sıklığı', status: 'warn', message: `Yalnızca ${tweets.length} gönderi.` }
    : { id: 'frequency', label: 'Gönderi Sıklığı', status: 'fail', message: 'Çok az gönderi.' });
  const yearsOld = Math.max(0, new Date().getFullYear() - parseInt(((p.joinDate || '').match(/\d{4}/) || ['2024'])[0]));
  checks.push(yearsOld >= 2
    ? { id: 'age', label: 'Hesap Yaşı', status: 'pass', message: `${yearsOld} yaşında.` }
    : { id: 'age', label: 'Hesap Yaşı', status: 'warn', message: 'Hesap yeni.' });
  if (p.statsFollowers > 0) {
    const ratio = p.statsFollowing / p.statsFollowers;
    checks.push(ratio <= 3
      ? { id: 'ratio', label: 'Takip Oranı', status: 'pass', message: 'Oran makul.' }
      : { id: 'ratio', label: 'Takip Oranı', status: 'warn', message: 'Takip ettiği fazla.' });
  }
  if (p.isVerified) checks.push({ id: 'verified', label: 'Doğrulama', status: 'pass', message: 'Doğrulanmış.' });
  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 100 : c.status === 'warn' ? 60 : 20), 0) / checks.length);
  const overall = score >= 80 ? 'healthy' : score >= 50 ? 'partial' : 'banned';
  res.json({
    handle: data.handle, overall, score,
    message: overall === 'healthy' ? 'Gölge ban belirtisi yok.' : overall === 'partial' ? 'Bazı uyarı sinyalleri.' : 'Olası gölge ban.',
    profile: { displayName: p.displayName, bio: p.bio, avatar: p.avatar, followers: p.statsFollowers, following: p.statsFollowing, tweets: p.statsTweets, joinDate: p.joinDate, verified: p.isVerified },
    checks,
    disclaimer: 'Yalnızca X resmi olarak doğrular.'
  });
});

app.post('/api/tools/audit', toolsLimit, async (req, res) => {
  const handle = String(req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) return res.status(400).json({ error: 'Handle gerekli' });
  let data = inspectCache.get(handle);
  if (!data || Date.now() - data._t > 600000) {
    data = await profileInspector.inspectProfile(handle);
    if (!data.error) { data._t = Date.now(); inspectCache.set(handle, data); }
  }
  if (data.error) return res.status(400).json({ error: data.error, code: data.errorCode || 'NOT_FOUND' });
  if (data.suspended) return res.status(400).json({ error: 'Hesap askıda' });
  const p = data.profile, tweets = data.tweets || [];
  const audit = {};
  audit.profilePicture = p.avatar && !p.avatar.includes('default')
    ? { score: 100, status: 'pass', tip: 'Profil resmi mevcut.' } : { score: 0, status: 'fail', tip: 'Profil resmi ekleyin.' };
  audit.bio = p.bio ? { score: 100, status: 'pass', tip: 'Bio mevcut.' } : { score: 0, status: 'fail', tip: 'Bio ekleyin.' };
  const bl = (p.bio || '').length;
  audit.bioLength = bl >= 80 && bl <= 160 ? { score: 100, status: 'pass', tip: `${bl}/160 — ideal.` }
    : bl >= 40 ? { score: 70, status: 'warn', tip: `${bl}/160 — biraz kısa.` }
    : bl > 0 ? { score: 30, status: 'fail', tip: `Çok kısa (${bl}).` } : { score: 0, status: 'fail', tip: 'Bio boş.' };
  const bio = (p.bio || '').toLowerCase();
  const kws = ['founder','ceo','kurucu','yazar','editör','haber','medya','dijital','içerik','sosyal','gazeteci','@','http'];
  const m = kws.filter(k => bio.includes(k)).length;
  audit.bioKeywords = m >= 2 ? { score: 100, status: 'pass', tip: 'İyi anahtar kelimeler.' } : m === 1 ? { score: 60, status: 'warn', tip: 'Daha fazla bağlam ekleyin.' } : { score: 30, status: 'fail', tip: 'Anahtar kelimeler ekleyin.' };
  audit.location = p.location ? { score: 100, status: 'pass', tip: 'Konum var.' } : { score: 0, status: 'warn', tip: 'Konum ekleyin.' };
  audit.website = p.website ? { score: 100, status: 'pass', tip: 'Link var.' } : { score: 0, status: 'warn', tip: 'Web sitesi ekleyin.' };
  audit.verified = p.isVerified ? { score: 100, status: 'pass', tip: 'Doğrulanmış.' } : { score: 60, status: 'warn', tip: 'Doğrulama isteğe bağlı.' };
  const lens = tweets.map(t => (t.text || '').length).filter(x => x > 0);
  const avgLen = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0;
  audit.postQuality = avgLen >= 80 ? { score: 100, status: 'pass', tip: `Ortalama ${avgLen} karakter.`, avgLength: avgLen }
    : avgLen >= 40 ? { score: 70, status: 'warn', tip: `Ortalama ${avgLen}.`, avgLength: avgLen }
    : avgLen > 0 ? { score: 30, status: 'fail', tip: `Kısa gönderiler.`, avgLength: avgLen } : { score: 0, status: 'fail', tip: 'Analiz edilemedi.', avgLength: 0 };
  audit.postFrequency = tweets.length >= 15 ? { score: 100, status: 'pass', tip: 'Aktif.' } : tweets.length >= 5 ? { score: 70, status: 'warn', tip: 'Daha sık paylaşın.' } : { score: 30, status: 'fail', tip: 'Az aktif.' };
  const starts = new Set(tweets.map(t => (t.text || '').slice(0, 12).toLowerCase()));
  audit.diversity = tweets.length > 0 ? (starts.size / tweets.length >= 0.7
    ? { score: 100, status: 'pass', tip: 'İyi çeşitlilik.' }
    : starts.size / tweets.length >= 0.4 ? { score: 60, status: 'warn', tip: 'Benzer içerikler.' }
    : { score: 30, status: 'fail', tip: 'Çok tekrar.' }) : { score: 0, status: 'fail', tip: '—' };
  const items = Object.values(audit);
  const total = Math.round(items.reduce((s, x) => s + (x.score || 0), 0) / items.length);
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';
  res.json({
    handle: data.handle, score: total, grade,
    profile: { displayName: p.displayName, bio: p.bio, avatar: p.avatar, followers: p.statsFollowers, following: p.statsFollowing, tweets: p.statsTweets, verified: p.isVerified, location: p.location, website: p.website },
    sections: audit,
    sampleTweets: tweets.slice(0, 5)
  });
});

// ── TOOL 3: Tweet Performance Analyzer ──
// Analyzes recent tweets of a handle and computes engagement stats.
app.post('/api/tools/tweet-performance', toolsLimit, async (req, res) => {
  const handle = String(req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) return res.status(400).json({ error: 'Handle gerekli', code: 'MISSING_FIELDS' });
  let data = inspectCache.get(handle);
  if (!data || Date.now() - data._t > 600000) {
    data = await profileInspector.inspectProfile(handle);
    if (!data.error) { data._t = Date.now(); inspectCache.set(handle, data); }
  }
  if (data.error) return res.status(400).json({ error: data.error, code: data.errorCode || 'NOT_FOUND' });
  if (data.suspended) return res.status(400).json({ error: 'Hesap askıda', code: 'NOT_FOUND' });

  const p = data.profile, tweets = data.tweets || [];
  if (!tweets.length) return res.status(400).json({ error: 'Gönderi bulunamadı', code: 'NOT_FOUND' });

  const followers = p.statsFollowers || 0;
  const analyzed = tweets.map(tw => {
    const likes = tw.likes || 0, retweets = tw.retweets || 0, replies = tw.replies || 0;
    const totalEng = likes + retweets + replies;
    const engRate = followers > 0 ? (totalEng / followers) * 100 : 0;
    return {
      text: (tw.text || '').slice(0, 200),
      url: tw.link || tw.url || '',
      date: tw.date || '',
      likes, retweets, replies,
      totalEngagement: totalEng,
      engagementRate: Math.round(engRate * 100) / 100,
      hasMedia: !!tw.hasMedia,
      length: (tw.text || '').length
    };
  });

  const avgEng = analyzed.reduce((s, t) => s + t.totalEngagement, 0) / analyzed.length;
  const avgRate = analyzed.reduce((s, t) => s + t.engagementRate, 0) / analyzed.length;
  const best = [...analyzed].sort((a, b) => b.totalEngagement - a.totalEngagement)[0];
  const withMedia = analyzed.filter(t => t.hasMedia);
  const withoutMedia = analyzed.filter(t => !t.hasMedia);
  const mediaAvg = withMedia.length ? withMedia.reduce((s, t) => s + t.totalEngagement, 0) / withMedia.length : 0;
  const noMediaAvg = withoutMedia.length ? withoutMedia.reduce((s, t) => s + t.totalEngagement, 0) / withoutMedia.length : 0;

  res.json({
    handle: data.handle,
    profile: { displayName: p.displayName, avatar: p.avatar, followers },
    stats: {
      tweetsAnalyzed: analyzed.length,
      avgEngagement: Math.round(avgEng),
      avgEngagementRate: Math.round(avgRate * 100) / 100,
      mediaBoost: noMediaAvg > 0 ? Math.round(((mediaAvg - noMediaAvg) / noMediaAvg) * 100) : 0
    },
    bestTweet: best,
    tweets: analyzed.slice(0, 12)
  });
});

// ── TOOL 4: Best Time to Post ──
// Derives posting-time patterns from the handle's recent tweets' timestamps.
app.post('/api/tools/best-time', toolsLimit, async (req, res) => {
  const handle = String(req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) return res.status(400).json({ error: 'Handle gerekli', code: 'MISSING_FIELDS' });
  let data = inspectCache.get(handle);
  if (!data || Date.now() - data._t > 600000) {
    data = await profileInspector.inspectProfile(handle);
    if (!data.error) { data._t = Date.now(); inspectCache.set(handle, data); }
  }
  if (data.error) return res.status(400).json({ error: data.error, code: data.errorCode || 'NOT_FOUND' });

  const tweets = (data.tweets || []).filter(t => t.date);
  const hourBuckets = new Array(24).fill(0);
  const hourEng = new Array(24).fill(0);
  const dayBuckets = new Array(7).fill(0);
  const dayEng = new Array(7).fill(0);

  tweets.forEach(tw => {
    const d = new Date(tw.date);
    if (isNaN(d.getTime())) return;
    const h = d.getHours(), day = d.getDay();
    const eng = (tw.likes || 0) + (tw.retweets || 0) + (tw.replies || 0);
    hourBuckets[h]++; hourEng[h] += eng;
    dayBuckets[day]++; dayEng[day] += eng;
  });

  // Best hours = highest avg engagement among hours that have posts
  const hourScores = hourBuckets.map((count, h) => ({
    hour: h,
    posts: count,
    avgEngagement: count > 0 ? Math.round(hourEng[h] / count) : 0
  }));
  const dayScores = dayBuckets.map((count, d) => ({
    day: d,
    posts: count,
    avgEngagement: count > 0 ? Math.round(dayEng[d] / count) : 0
  }));

  const topHours = [...hourScores].filter(h => h.posts > 0).sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 3);
  const topDays = [...dayScores].filter(d => d.posts > 0).sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 3);

  res.json({
    handle: data.handle,
    tweetsAnalyzed: tweets.length,
    hourScores,
    dayScores,
    topHours,
    topDays,
    note: tweets.length < 10 ? 'low_data' : 'ok'
  });
});

// ── TOOL 5: Hashtag Analyzer ──
// Checks a hashtag's health: format validity, length, banned-pattern heuristics.
app.post('/api/tools/hashtag', toolsLimit, async (req, res) => {
  const raw = String(req.body?.hashtag || '').replace(/^#/, '').trim();
  if (!raw) return res.status(400).json({ error: 'Hashtag gerekli', code: 'MISSING_FIELDS' });

  const checks = [];
  // Format
  const validFormat = /^[A-Za-z0-9_]+$/.test(raw);
  checks.push(validFormat
    ? { id: 'format', status: 'pass', message: 'Geçerli format (harf, rakam, alt çizgi).' }
    : { id: 'format', status: 'fail', message: 'Geçersiz karakter. Sadece harf, rakam ve _ kullanın.' });
  // Length
  checks.push(raw.length <= 24
    ? { id: 'length', status: raw.length <= 15 ? 'pass' : 'warn', message: `${raw.length} karakter.` }
    : { id: 'length', status: 'fail', message: 'Çok uzun — 24 karakterden kısa tutun.' });
  // Numbers only
  checks.push(/^\d+$/.test(raw)
    ? { id: 'numbers', status: 'fail', message: 'Sadece rakamdan oluşan hashtag çalışmaz.' }
    : { id: 'numbers', status: 'pass', message: 'Sadece rakam değil — iyi.' });
  // Readability (camelCase for multi-word)
  const hasCaps = /[A-Z]/.test(raw.slice(1));
  checks.push({ id: 'readability', status: hasCaps || raw.length <= 8 ? 'pass' : 'warn',
    message: hasCaps ? 'CamelCase okunabilirliği artırıyor.' : 'Çok kelimeliyse CamelCase kullanın (örn: #SosyalMedya).' });
  // Known spam/banned heuristic list (small sample — not exhaustive)
  const flagged = ['follow4follow', 'followback', 'f4f', 'l4l', 'like4like', 'teamfollowback', 'instafollow'];
  checks.push(flagged.includes(raw.toLowerCase())
    ? { id: 'banned', status: 'fail', message: 'Bu etiket spam olarak işaretlenmiş olabilir.' }
    : { id: 'banned', status: 'pass', message: 'Bilinen spam listesinde değil.' });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 100 : c.status === 'warn' ? 60 : 15), 0) / checks.length);
  res.json({
    hashtag: raw,
    score,
    verdict: score >= 80 ? 'good' : score >= 50 ? 'ok' : 'poor',
    checks,
    disclaimer: 'Bu bir sezgisel analizdir; X resmi ban durumunu göstermez.'
  });
});

// ── TOOL 6: Account Age Calculator ──
app.post('/api/tools/account-age', toolsLimit, async (req, res) => {
  const handle = String(req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) return res.status(400).json({ error: 'Handle gerekli', code: 'MISSING_FIELDS' });
  let data = inspectCache.get(handle);
  if (!data || Date.now() - data._t > 600000) {
    data = await profileInspector.inspectProfile(handle);
    if (!data.error) { data._t = Date.now(); inspectCache.set(handle, data); }
  }
  if (data.error) return res.status(400).json({ error: data.error, code: data.errorCode || 'NOT_FOUND' });

  const p = data.profile;
  const joinRaw = p.joinDate || '';
  const yearMatch = joinRaw.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  if (!year) return res.status(400).json({ error: 'Katılım tarihi bulunamadı', code: 'NOT_FOUND' });

  // Try to parse a full date; fall back to Jan 1 of the year
  let joinDate = new Date(joinRaw);
  if (isNaN(joinDate.getTime())) joinDate = new Date(year, 0, 1);
  const now = new Date();
  const ms = now.getTime() - joinDate.getTime();
  const days = Math.floor(ms / 86400000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const tweets = p.statsTweets || 0;
  const tweetsPerDay = days > 0 ? Math.round((tweets / days) * 10) / 10 : 0;

  res.json({
    handle: data.handle,
    profile: { displayName: p.displayName, avatar: p.avatar, followers: p.statsFollowers, tweets },
    joinDate: joinDate.toISOString(),
    joinYear: year,
    ageDays: days,
    ageYears: years,
    ageMonths: months,
    tweetsPerDay,
    followersPerYear: years > 0 ? Math.round(p.statsFollowers / years) : p.statsFollowers
  });
});

// ── TOOL 7: Bio Generator ──
// Uses Groq free API when GROQ_API_KEY is set (better quality), and always
// falls back to a deterministic template engine so it works with zero config.

function bioTemplates(kw, name, tone) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const joinAmp = arr => arr.map(cap).join(' & ');
  const joinPipe = arr => arr.map(cap).join(' | ');
  const emojiFor = { professional: '', casual: '✨', creative: '🎨', bold: '🔥', friendly: '😊' };
  const e = emojiFor[tone] || '';
  const templates = {
    professional: [
      `${joinPipe(kw)}. ${name ? name + '. ' : ''}Sharing insights and building in public.`,
      `Focused on ${joinAmp(kw.slice(0, 2))}. Helping others grow. DM open for collaboration.`,
      `${cap(kw[0])} enthusiast. Writing about ${kw.slice(1).map(x => x.toLowerCase()).join(', ') || kw[0].toLowerCase()}.`
    ],
    casual: [
      `just here for the ${kw.map(x => x.toLowerCase()).join(', ')} ${e}`,
      `${name ? name + ' • ' : ''}${joinPipe(kw)} ${e} probably overthinking something rn`,
      `talking ${kw.map(x => x.toLowerCase()).join(' + ')} and vibing ${e}`
    ],
    creative: [
      `${e} ${joinPipe(kw)} ${e} turning ideas into things`,
      `Curator of ${joinAmp(kw.slice(0, 2))}. Chasing curiosity, one post at a time.`,
      `${cap(kw[0])} • storyteller • ${kw.slice(1).map(cap).join(' • ') || 'dreamer'}`
    ],
    bold: [
      `${e} ${joinPipe(kw)}. No fluff. Just results.`,
      `Building the future of ${cap(kw[0])}. ${kw.slice(1).map(cap).join('. ')}. Watch this space ${e}`,
      `${joinAmp(kw)} — done differently. ${e}`
    ],
    friendly: [
      `Hi! ${name ? "I'm " + name + ". " : ''}I love ${kw.map(x => x.toLowerCase()).join(', ')} ${e}`,
      `${joinPipe(kw)} ${e} Always happy to connect & chat!`,
      `Passionate about ${joinAmp(kw.slice(0, 2))}. Let's grow together ${e}`
    ]
  };
  return templates[tone] || templates.professional;
}

async function bioFromGroq(kw, name, tone) {
  const sys = 'You are an expert social media copywriter. You write short, punchy X (Twitter) bios. ' +
    'Return ONLY a JSON array of exactly 3 strings, no markdown, no preamble. Each string is a complete bio ' +
    'under 160 characters. No hashtags unless natural. Match the requested tone precisely.';
  const user = `Write 3 X bios.\nTone: ${tone}\n${name ? `Name/brand: ${name}\n` : ''}Topics: ${kw.join(', ')}\n` +
    'Return JSON array only, e.g. ["bio one","bio two","bio three"].';
  const raw = await groq.chat(
    [{ role: 'system', content: sys }, { role: 'user', content: user }],
    { temperature: 0.95, maxTokens: 400 }
  );
  if (!raw) return null;
  // Strip code fences if the model added them, then parse
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr) && arr.length) {
      return arr.filter(x => typeof x === 'string' && x.trim()).slice(0, 3).map(s => s.trim());
    }
  } catch {
    // Fallback: split into lines if it wasn't valid JSON
    const lines = cleaned.split('\n').map(l => l.replace(/^[-*\d.]+\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean);
    if (lines.length) return lines.slice(0, 3);
  }
  return null;
}

app.post('/api/tools/bio-generator', toolsLimit, async (req, res) => {
  const name = String(req.body?.name || '').slice(0, 50).trim();
  const topics = String(req.body?.topics || '').slice(0, 200).trim();
  const tone = String(req.body?.tone || 'professional');
  if (!topics) return res.status(400).json({ error: 'En az bir konu girin', code: 'MISSING_FIELDS' });

  const kw = topics.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
  if (!kw.length) return res.status(400).json({ error: 'En az bir konu girin', code: 'MISSING_FIELDS' });

  let texts = null;
  let source = 'template';
  if (groq.isEnabled()) {
    texts = await bioFromGroq(kw, name, tone);
    if (texts && texts.length) source = 'ai';
  }
  if (!texts || !texts.length) texts = bioTemplates(kw, name, tone);

  const bios = texts.map(b => ({ text: b, length: b.length, valid: b.length <= 160 }));
  res.json({ bios, tone, topics: kw, source });
});

// Audit log (superadmin)
app.get('/api/audit-log', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const r = await query(
    `SELECT al.*, u.username FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json(camelizeAll(r.rows));
});

// ═══════════════════════════════════════════════════
// COMMENTS (Batch 2)
// ═══════════════════════════════════════════════════
app.get('/api/posts/:slug/comments', async (req, res) => {
  const p = await query(`SELECT id FROM user_posts WHERE slug=$1 AND status='approved' LIMIT 1`, [req.params.slug]);
  if (!p.rows.length) return res.json([]);
  const r = await query(
    `SELECT c.id, c.post_id, c.user_id, c.guest_name, c.content, c.parent_id, c.created_at,
            u.username, u.full_name, u.avatar
     FROM comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id=$1 AND c.status='approved'
     ORDER BY c.created_at ASC LIMIT 200`,
    [p.rows[0].id]
  );
  res.json(camelizeAll(r.rows));
});

app.post('/api/posts/:slug/comments', publicLimit, async (req, res) => {
  const { content, parentId, guestName, guestEmail, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Bot' });
  if (!content || content.trim().length < 2) return res.status(400).json({ error: 'Yorum çok kısa' });
  if (content.length > 2000) return res.status(400).json({ error: 'Yorum çok uzun (max 2000 karakter)' });

  const p = await query(`SELECT id, author_id, title FROM user_posts WHERE slug=$1 AND status='approved' LIMIT 1`, [req.params.slug]);
  if (!p.rows.length) return res.status(404).json({ error: 'Yazı bulunamadı' });

  // Try to detect logged-in user
  let userId = null;
  const token = (req.headers['authorization'] || req.headers['x-admin-token'] || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
      const payload = jwt.verify(token, SECRET);
      if (payload?.id) userId = payload.id;
    } catch {}
  }

  if (!userId && !guestName) return res.status(400).json({ error: 'İsim gerekli' });

  // Basic spam check
  const lowered = content.toLowerCase();
  const spamWords = ['viagra', 'casino', 'bet365', 'crypto pump', 'http://', 'https://'];
  const linkCount = (content.match(/https?:\/\//g) || []).length;
  const initialStatus = linkCount >= 3 || spamWords.filter(w => lowered.includes(w)).length >= 2 ? 'pending' : 'approved';

  const cleanContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });

  const r = await query(
    `INSERT INTO comments (post_id, user_id, guest_name, guest_email, content, parent_id, status, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [p.rows[0].id, userId, userId ? null : guestName, userId ? null : (guestEmail || null), cleanContent, parentId || null, initialStatus, req.ip || '']
  );

  // Notify post author
  if (p.rows[0].author_id && userId !== p.rows[0].author_id) {
    await notif.createNotification({
      userId: p.rows[0].author_id, type: 'comment',
      title: '💬 İçeriğinize yorum yapıldı',
      body: `"${p.rows[0].title.slice(0, 50)}" — ${cleanContent.slice(0, 60)}`,
      link: `/blog/${req.params.slug}`
    });
    await query(
      `INSERT INTO activities (user_id, type, post_id, actor_id, data) VALUES ($1,'comment',$2,$3,$4)`,
      [p.rows[0].author_id, p.rows[0].id, userId, JSON.stringify({ excerpt: cleanContent.slice(0, 80) })]
    );
  }

  res.status(201).json({
    ok: true,
    pending: initialStatus === 'pending',
    comment: camelize(r.rows[0])
  });
});

app.delete('/api/comments/:id', authMiddleware, async (req, res) => {
  // User can delete own comment, admin can delete any
  const c = await query(`SELECT user_id FROM comments WHERE id=$1`, [req.params.id]);
  if (!c.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  if (c.rows[0].user_id !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'publisher') {
    return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  }
  await query(`DELETE FROM comments WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// Admin comments queue
app.get('/api/comments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'publisher') return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const status = req.query.status || 'pending';
  const r = await query(
    `SELECT c.*, p.title AS post_title, p.slug AS post_slug, u.username
     FROM comments c
     LEFT JOIN user_posts p ON p.id = c.post_id
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.status=$1 ORDER BY c.created_at DESC LIMIT 100`,
    [status]
  );
  res.json(camelizeAll(r.rows));
});

app.post('/api/comments/:id/approve', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'publisher') return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  await query(`UPDATE comments SET status='approved' WHERE id=$1`, [req.params.id]);
  await auditLog(req.user.id, 'comment.approve', 'comment', req.params.id, {}, req.ip);
  res.json({ ok: true });
});

app.post('/api/comments/:id/spam', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'publisher') return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  await query(`UPDATE comments SET status='spam' WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// LIKES + BOOKMARKS (Batch 2)
// ═══════════════════════════════════════════════════
async function postLikeCount(postId) {
  const r = await query(`SELECT COUNT(*)::int AS c FROM post_likes WHERE post_id=$1`, [postId]);
  return r.rows[0].c;
}

app.get('/api/posts/:slug/engagement', async (req, res) => {
  const p = await query(`SELECT id FROM user_posts WHERE slug=$1 LIMIT 1`, [req.params.slug]);
  if (!p.rows.length) return res.json({ likes: 0, comments: 0, hasLiked: false, hasBookmarked: false });
  const postId = p.rows[0].id;

  // Detect user
  let userId = null;
  const token = (req.headers['authorization'] || req.headers['x-admin-token'] || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
      const payload = jwt.verify(token, SECRET);
      if (payload?.id) userId = payload.id;
    } catch {}
  }

  const [likes, comments, userLike, userBookmark] = await Promise.all([
    query(`SELECT COUNT(*)::int AS c FROM post_likes WHERE post_id=$1`, [postId]),
    query(`SELECT COUNT(*)::int AS c FROM comments WHERE post_id=$1 AND status='approved'`, [postId]),
    userId ? query(`SELECT 1 FROM post_likes WHERE post_id=$1 AND user_id=$2 LIMIT 1`, [postId, userId]) : { rows: [] },
    userId ? query(`SELECT 1 FROM post_bookmarks WHERE post_id=$1 AND user_id=$2 LIMIT 1`, [postId, userId]) : { rows: [] }
  ]);

  res.json({
    likes: likes.rows[0].c,
    comments: comments.rows[0].c,
    hasLiked: userLike.rows.length > 0,
    hasBookmarked: userBookmark.rows.length > 0
  });
});

app.post('/api/posts/:slug/like', authMiddleware, async (req, res) => {
  const p = await query(`SELECT id, author_id, title FROM user_posts WHERE slug=$1 AND status='approved' LIMIT 1`, [req.params.slug]);
  if (!p.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const postId = p.rows[0].id;

  const exists = await query(`SELECT id FROM post_likes WHERE post_id=$1 AND user_id=$2`, [postId, req.user.id]);
  let liked;
  if (exists.rows.length) {
    await query(`DELETE FROM post_likes WHERE id=$1`, [exists.rows[0].id]);
    liked = false;
  } else {
    await query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)`, [postId, req.user.id]);
    liked = true;
    // Notify author + activity feed
    if (p.rows[0].author_id !== req.user.id) {
      await query(
        `INSERT INTO activities (user_id, type, post_id, actor_id) VALUES ($1,'like',$2,$3)`,
        [p.rows[0].author_id, postId, req.user.id]
      );
    }
  }

  const count = await postLikeCount(postId);
  res.json({ liked, count });
});

app.post('/api/posts/:slug/bookmark', authMiddleware, async (req, res) => {
  const p = await query(`SELECT id FROM user_posts WHERE slug=$1 AND status='approved' LIMIT 1`, [req.params.slug]);
  if (!p.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const postId = p.rows[0].id;

  const exists = await query(`SELECT id FROM post_bookmarks WHERE post_id=$1 AND user_id=$2`, [postId, req.user.id]);
  let bookmarked;
  if (exists.rows.length) {
    await query(`DELETE FROM post_bookmarks WHERE id=$1`, [exists.rows[0].id]);
    bookmarked = false;
  } else {
    await query(`INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1,$2)`, [postId, req.user.id]);
    bookmarked = true;
  }
  res.json({ bookmarked });
});

// Get user's bookmarks
app.get('/api/me/bookmarks', authMiddleware, async (req, res) => {
  const r = await query(
    `SELECT up.id, up.type, up.title, up.slug, up.excerpt, up.cover_image, up.category, up.published_at,
            u.username AS author_username, u.full_name AS author_name, u.avatar AS author_avatar,
            pb.created_at AS bookmarked_at
     FROM post_bookmarks pb
     JOIN user_posts up ON up.id = pb.post_id
     JOIN users u ON u.id = up.author_id
     WHERE pb.user_id=$1 AND up.status='approved'
     ORDER BY pb.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json(camelizeAll(r.rows));
});

// ═══════════════════════════════════════════════════
// TWEET REACTIONS (Batch 2)
// ═══════════════════════════════════════════════════
function hashIp(ip) {
  return require('crypto').createHash('sha256').update(String(ip || '') + (process.env.JWT_SECRET || '')).digest('hex').slice(0, 32);
}

app.get('/api/tweets/:id/reactions', async (req, res) => {
  const r = await query(
    `SELECT reaction, COUNT(*)::int AS c FROM tweet_reactions WHERE tweet_id=$1 GROUP BY reaction`,
    [req.params.id]
  );
  const counts = {};
  r.rows.forEach(row => { counts[row.reaction] = row.c; });

  // User's reactions
  let userReactions = [];
  const token = (req.headers['authorization'] || req.headers['x-admin-token'] || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
      const payload = jwt.verify(token, SECRET);
      if (payload?.id) {
        const m = await query(`SELECT reaction FROM tweet_reactions WHERE tweet_id=$1 AND user_id=$2`, [req.params.id, payload.id]);
        userReactions = m.rows.map(x => x.reaction);
      }
    } catch {}
  } else {
    const m = await query(`SELECT reaction FROM tweet_reactions WHERE tweet_id=$1 AND ip_hash=$2`, [req.params.id, hashIp(req.ip)]);
    userReactions = m.rows.map(x => x.reaction);
  }

  res.json({ counts, userReactions });
});

app.post('/api/tweets/:id/react', publicLimit, async (req, res) => {
  const { reaction } = req.body || {};
  const allowed = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
  if (!allowed.includes(reaction)) return res.status(400).json({ error: 'Geçersiz reaksiyon' });

  const t = await query(`SELECT id FROM tweets WHERE id=$1`, [req.params.id]);
  if (!t.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });

  // Detect user
  let userId = null;
  const token = (req.headers['authorization'] || req.headers['x-admin-token'] || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
      const payload = jwt.verify(token, SECRET);
      if (payload?.id) userId = payload.id;
    } catch {}
  }
  const ipHash = userId ? null : hashIp(req.ip);

  // Toggle: if same reaction exists, remove it; otherwise add
  const existing = userId
    ? await query(`SELECT id FROM tweet_reactions WHERE tweet_id=$1 AND user_id=$2 AND reaction=$3`, [req.params.id, userId, reaction])
    : await query(`SELECT id FROM tweet_reactions WHERE tweet_id=$1 AND ip_hash=$2 AND reaction=$3`, [req.params.id, ipHash, reaction]);

  let active;
  if (existing.rows.length) {
    await query(`DELETE FROM tweet_reactions WHERE id=$1`, [existing.rows[0].id]);
    active = false;
  } else {
    await query(
      `INSERT INTO tweet_reactions (tweet_id, reaction, user_id, ip_hash) VALUES ($1,$2,$3,$4)`,
      [req.params.id, reaction, userId, ipHash]
    );
    active = true;
  }

  const counts = await query(
    `SELECT reaction, COUNT(*)::int AS c FROM tweet_reactions WHERE tweet_id=$1 GROUP BY reaction`,
    [req.params.id]
  );
  const out = {};
  counts.rows.forEach(row => { out[row.reaction] = row.c; });
  res.json({ active, counts: out });
});

// ═══════════════════════════════════════════════════
// CATEGORIES (Batch 2)
// ═══════════════════════════════════════════════════
app.get('/api/categories', async (req, res) => {
  // Returns categories with post counts
  const r = await query(
    `SELECT category, COUNT(*)::int AS post_count
     FROM user_posts WHERE status='approved'
     GROUP BY category ORDER BY post_count DESC`
  );
  res.json(r.rows);
});

app.get('/api/categories/:slug/posts', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const r = await query(
    `SELECT up.id, up.type, up.title, up.slug, up.excerpt, up.cover_image, up.category, up.tags, up.published_at, up.view_count,
            u.username AS author_username, u.full_name AS author_name, u.avatar AS author_avatar
     FROM user_posts up JOIN users u ON u.id=up.author_id
     WHERE up.status='approved' AND up.category=$1
     ORDER BY up.published_at DESC LIMIT $2`,
    [req.params.slug, limit]
  );
  res.json(camelizeAll(r.rows));
});

// ═══════════════════════════════════════════════════
// SEARCH (Batch 2)
// ═══════════════════════════════════════════════════
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ posts: [], accounts: [], news: [] });

  // Sanitize for tsquery: replace special chars with space, then create prefix matches
  const tsqClean = q.replace(/[^\w\sÀ-ÿĞŞÇİÖÜğşçıöü]/g, ' ').trim();
  const words = tsqClean.split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return res.json({ posts: [], accounts: [], news: [] });
  const tsq = words.map(w => `${w}:*`).join(' & ');

  const [posts, accounts, news] = await Promise.all([
    query(
      `SELECT up.id, up.title, up.slug, up.excerpt, up.cover_image, up.category, up.published_at,
              u.username AS author_username, u.full_name AS author_name,
              ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
       FROM user_posts up JOIN users u ON u.id=up.author_id
       WHERE up.status='approved' AND search_vector @@ to_tsquery('simple', $1)
       ORDER BY rank DESC LIMIT 20`,
      [tsq]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, display_name, handle, bio, category, followers, avatar,
              ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
       FROM accounts WHERE enabled=TRUE AND search_vector @@ to_tsquery('simple', $1)
       ORDER BY rank DESC LIMIT 10`,
      [tsq]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, title, url, image, category, published_at, source_name
       FROM news_items
       WHERE LOWER(title) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1)
       ORDER BY published_at DESC LIMIT 10`,
      [`%${q}%`]
    ).catch(() => ({ rows: [] }))
  ]);

  res.json({
    posts: camelizeAll(posts.rows),
    accounts: camelizeAll(accounts.rows),
    news: camelizeAll(news.rows),
    query: q
  });
});

// ═══════════════════════════════════════════════════
// AUTHOR PUBLIC PROFILES (Batch 2)
// ═══════════════════════════════════════════════════
app.get('/api/u/:username', async (req, res) => {
  const r = await query(
    `SELECT id, username, full_name, avatar, bio, role, created_at
     FROM users WHERE LOWER(username)=LOWER($1) AND active=TRUE LIMIT 1`,
    [req.params.username]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  const user = r.rows[0];

  // Stats
  const [posts, totalLikes, totalViews] = await Promise.all([
    query(
      `SELECT id, type, title, slug, excerpt, cover_image, category, published_at, view_count
       FROM user_posts WHERE author_id=$1 AND status='approved'
       ORDER BY published_at DESC LIMIT 50`,
      [user.id]
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM post_likes pl
       JOIN user_posts p ON p.id = pl.post_id
       WHERE p.author_id=$1`,
      [user.id]
    ),
    query(`SELECT COALESCE(SUM(view_count),0)::int AS c FROM user_posts WHERE author_id=$1 AND status='approved'`, [user.id])
  ]);

  res.json({
    user: camelize(user),
    posts: camelizeAll(posts.rows),
    stats: {
      postCount: posts.rows.length,
      totalLikes: totalLikes.rows[0].c,
      totalViews: totalViews.rows[0].c
    }
  });
});

// Update own bio + avatar (any logged-in user)
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  const { fullName, bio, avatar } = req.body || {};
  const clean = bio ? sanitizeHtml(bio, { allowedTags: [], allowedAttributes: {} }).slice(0, 500) : null;
  const r = await query(
    `UPDATE users SET
       full_name=COALESCE($1, full_name),
       bio=COALESCE($2, bio),
       avatar=COALESCE($3, avatar),
       updated_at=NOW()
     WHERE id=$4 RETURNING id, username, email, full_name, avatar, bio, role, permissions`,
    [fullName, clean, avatar, req.user.id]
  );
  res.json(camelize(r.rows[0]));
});

// ═══════════════════════════════════════════════════
// ACTIVITY FEED (Batch 2)
// ═══════════════════════════════════════════════════
app.get('/api/me/activity', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const r = await query(
    `SELECT a.*, p.title AS post_title, p.slug AS post_slug, u.username AS actor_username, u.full_name AS actor_name
     FROM activities a
     LEFT JOIN user_posts p ON p.id = a.post_id
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.user_id=$1
     ORDER BY a.created_at DESC LIMIT $2`,
    [req.user.id, limit]
  );
  res.json(camelizeAll(r.rows));
});

// ═══════════════════════════════════════════════════
// 2FA (Batch 3) — admins only
// ═══════════════════════════════════════════════════

app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
  if (req.user.role === 'creator') return res.status(403).json({ error: '2FA yalnızca admin hesapları için kullanılabilir' });
  const secret = totp.generateSecret();
  const { qrDataUrl, uri } = await totp.getProvisioningUri(req.user.username, secret);
  // Store secret pending — don't enable until they verify a code
  await query(`UPDATE users SET totp_secret=$1 WHERE id=$2`, [secret, req.user.id]);
  res.json({ secret, qrDataUrl, uri });
});

app.post('/api/auth/2fa/enable', authMiddleware, async (req, res) => {
  const { code } = req.body || {};
  const r = await query(`SELECT totp_secret FROM users WHERE id=$1`, [req.user.id]);
  if (!r.rows[0]?.totp_secret) return res.status(400).json({ error: 'Önce setup yapın' });
  if (!totp.verifyToken(r.rows[0].totp_secret, code)) return res.status(400).json({ error: 'Geçersiz kod' });

  const backupCodes = totp.generateBackupCodes(10);
  await query(
    `UPDATE users SET totp_enabled=TRUE, totp_backup_codes=$1 WHERE id=$2`,
    [JSON.stringify(backupCodes), req.user.id]
  );
  await auditLog(req.user.id, '2fa.enabled', 'user', req.user.id, {}, req.ip);
  res.json({ ok: true, backupCodes });
});

app.post('/api/auth/2fa/disable', authMiddleware, async (req, res) => {
  const { password } = req.body || {};
  const r = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  if (!await bcrypt.compare(password || '', r.rows[0].password_hash)) return res.status(400).json({ error: 'Şifre yanlış' });
  await query(`UPDATE users SET totp_enabled=FALSE, totp_secret=NULL, totp_backup_codes='[]' WHERE id=$1`, [req.user.id]);
  await auditLog(req.user.id, '2fa.disabled', 'user', req.user.id, {}, req.ip);
  res.json({ ok: true });
});

app.get('/api/auth/2fa/status', authMiddleware, async (req, res) => {
  const r = await query(`SELECT totp_enabled FROM users WHERE id=$1`, [req.user.id]);
  res.json({ enabled: !!r.rows[0]?.totp_enabled });
});

// ═══════════════════════════════════════════════════
// ANALYTICS (Batch 3)
// ═══════════════════════════════════════════════════
function hashAnonymous(data) {
  return require('crypto').createHash('sha256').update(String(data || '') + (process.env.JWT_SECRET || '')).digest('hex').slice(0, 32);
}

function detectDevice(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (/bot|crawl|spider|slurp/i.test(lower)) return 'bot';
  if (/tablet|ipad/i.test(lower)) return 'tablet';
  if (/mobile|android|iphone/i.test(lower)) return 'mobile';
  return 'desktop';
}

app.post('/api/analytics/pageview', publicLimit, async (req, res) => {
  const { path: pathStr, postId, referer } = req.body || {};
  if (!pathStr) return res.status(400).json({ error: 'Eksik path' });

  const ua = req.headers['user-agent'] || '';
  const device = detectDevice(ua);
  if (device === 'bot') return res.json({ ok: true }); // Skip bots

  // Detect logged-in user
  let userId = null;
  const token = (req.headers['authorization'] || req.headers['x-admin-token'] || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
      const payload = jwt.verify(token, SECRET);
      if (payload?.id) userId = payload.id;
    } catch {}
  }

  await query(
    `INSERT INTO page_views (path, post_id, user_id, ip_hash, user_agent_hash, referer, device)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [pathStr.slice(0, 500), postId || null, userId, hashAnonymous(req.ip), hashAnonymous(ua),
     (referer || '').slice(0, 500), device]
  );
  res.json({ ok: true });
});

app.get('/api/analytics/summary', authMiddleware, requireRole('superadmin'), async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);

  const [totals, daily, topPages, topPosts, devices, referers] = await Promise.all([
    query(
      `SELECT
        COUNT(*)::int AS views,
        COUNT(DISTINCT ip_hash)::int AS unique_visitors,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS logged_in_views
       FROM page_views WHERE created_at > NOW() - INTERVAL '${days} days'`
    ),
    query(
      `SELECT DATE_TRUNC('day', created_at)::date AS day,
              COUNT(*)::int AS views,
              COUNT(DISTINCT ip_hash)::int AS uniques
       FROM page_views
       WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY day ORDER BY day`
    ),
    query(
      `SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT ip_hash)::int AS uniques
       FROM page_views
       WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY path ORDER BY views DESC LIMIT 20`
    ),
    query(
      `SELECT pv.post_id, p.title, p.slug, COUNT(*)::int AS views, COUNT(DISTINCT pv.ip_hash)::int AS uniques
       FROM page_views pv JOIN user_posts p ON p.id = pv.post_id
       WHERE pv.created_at > NOW() - INTERVAL '${days} days' AND pv.post_id IS NOT NULL
       GROUP BY pv.post_id, p.title, p.slug ORDER BY views DESC LIMIT 10`
    ),
    query(
      `SELECT device, COUNT(*)::int AS c
       FROM page_views WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY device ORDER BY c DESC`
    ),
    query(
      `SELECT CASE WHEN referer = '' OR referer IS NULL THEN 'Doğrudan'
                   ELSE regexp_replace(referer, 'https?://([^/]+).*', '\\1') END AS source,
              COUNT(*)::int AS c
       FROM page_views WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY source ORDER BY c DESC LIMIT 10`
    )
  ]);

  res.json({
    days,
    totals: totals.rows[0],
    daily: daily.rows,
    topPages: topPages.rows,
    topPosts: camelizeAll(topPosts.rows),
    devices: devices.rows,
    referers: referers.rows
  });
});

// ═══════════════════════════════════════════════════
// NEWSLETTER CAMPAIGNS (Batch 3)
// ═══════════════════════════════════════════════════
app.get('/api/newsletter/campaigns', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  const r = await query(`SELECT * FROM newsletter_campaigns ORDER BY created_at DESC LIMIT 100`);
  res.json(camelizeAll(r.rows));
});

app.post('/api/newsletter/campaigns', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  const { subject, bodyHtml, scheduledAt } = req.body || {};
  if (!subject || !bodyHtml) return res.status(400).json({ error: 'Konu ve içerik zorunlu' });
  const cleanHtml = sanitizeHtml(bodyHtml, sanitizeConfig);
  const r = await query(
    `INSERT INTO newsletter_campaigns (subject, body_html, sent_by, scheduled_at, status)
     VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
    [subject, cleanHtml, req.user.id, scheduledAt || null]
  );
  res.status(201).json(camelize(r.rows[0]));
});

app.post('/api/newsletter/campaigns/:id/send', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  const c = await query(`SELECT * FROM newsletter_campaigns WHERE id=$1`, [req.params.id]);
  if (!c.rows.length) return res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
  const campaign = c.rows[0];
  if (campaign.status === 'sent') return res.status(400).json({ error: 'Zaten gönderildi' });

  const subs = await query(`SELECT email FROM newsletter`);
  const total = subs.rows.length;
  await query(`UPDATE newsletter_campaigns SET status='sending', recipients=$1 WHERE id=$2`, [total, req.params.id]);

  // Send in background (don't await — respond immediately)
  (async () => {
    let delivered = 0, failed = 0;
    for (const sub of subs.rows) {
      try {
        const r = await email.sendEmail({
          to: sub.email,
          subject: campaign.subject,
          html: campaign.body_html
        });
        if (r.ok) delivered++; else failed++;
      } catch { failed++; }
    }
    await query(
      `UPDATE newsletter_campaigns SET status='sent', delivered=$1, failed=$2, sent_at=NOW() WHERE id=$3`,
      [delivered, failed, req.params.id]
    );
    console.log(`[Newsletter] Campaign ${req.params.id} sent: ${delivered}/${total} delivered`);
  })().catch(e => console.error('[Newsletter] send error:', e.message));

  await auditLog(req.user.id, 'newsletter.send', 'campaign', req.params.id, { recipients: total }, req.ip);
  res.json({ ok: true, recipients: total, message: 'Arka planda gönderiliyor...' });
});

app.delete('/api/newsletter/campaigns/:id', authMiddleware, requirePerm('newsletter'), async (req, res) => {
  await query(`DELETE FROM newsletter_campaigns WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// SCHEDULED POSTS (Batch 3)
// ═══════════════════════════════════════════════════
async function publishScheduledPosts() {
  try {
    const r = await query(
      `UPDATE user_posts SET published_at=NOW(), scheduled_at=NULL
       WHERE status='approved' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
       RETURNING id, author_id, title`
    );
    for (const p of r.rows) {
      await notif.createNotification({
        userId: p.author_id, type: 'post_published',
        title: '🚀 İçeriğiniz yayında!',
        body: `Zamanlanmış "${p.title.slice(0, 50)}" şimdi sitede.`,
        link: '/dashboard/posts'
      });
    }
    if (r.rows.length > 0) console.log(`[Scheduler] published ${r.rows.length} scheduled posts`);
  } catch (e) { console.error('[Scheduler] error:', e.message); }
}

// Check every minute
setInterval(publishScheduledPosts, 60 * 1000);
setTimeout(publishScheduledPosts, 5000);

// ═══════════════════════════════════════════════════
// CO-AUTHORS (Batch 3)
// ═══════════════════════════════════════════════════
app.put('/api/posts-review/:id/co-authors', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.posts_review) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const { userIds } = req.body || {};
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds dizisi gerekli' });
  await query(`DELETE FROM post_co_authors WHERE post_id=$1`, [req.params.id]);
  for (let i = 0; i < userIds.length; i++) {
    await query(
      `INSERT INTO post_co_authors (post_id, user_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [req.params.id, userIds[i], i]
    );
  }
  res.json({ ok: true });
});

app.get('/api/posts/:slug/co-authors', async (req, res) => {
  const p = await query(`SELECT id FROM user_posts WHERE slug=$1`, [req.params.slug]);
  if (!p.rows.length) return res.json([]);
  const r = await query(
    `SELECT u.id, u.username, u.full_name, u.avatar, ca.position
     FROM post_co_authors ca JOIN users u ON u.id = ca.user_id
     WHERE ca.post_id=$1 ORDER BY ca.position`,
    [p.rows[0].id]
  );
  res.json(camelizeAll(r.rows));
});

// Admin: get co-authors by post ID directly (used by selector)
app.get('/api/posts-review/:id/co-authors', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin' && !req.user.permissions?.posts_review) return res.status(403).json({ error: 'Yetkisiz', code: 'UNAUTHORIZED' });
  const r = await query(
    `SELECT u.id, u.username, u.full_name, u.avatar, ca.position
     FROM post_co_authors ca JOIN users u ON u.id = ca.user_id
     WHERE ca.post_id=$1 ORDER BY ca.position`,
    [req.params.id]
  );
  res.json(camelizeAll(r.rows));
});

// ═══════════════════════════════════════════════════
// RSS FEED (Batch 3)
// ═══════════════════════════════════════════════════
app.get('/api/feed.xml', async (req, res) => {
  try {
    const posts = await query(
      `SELECT up.title, up.slug, up.excerpt, up.content, up.published_at, up.category,
              u.full_name, u.username
       FROM user_posts up JOIN users u ON u.id=up.author_id
       WHERE up.status='approved' ORDER BY up.published_at DESC LIMIT 30`
    );
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    const items = posts.rows.map(p => {
      const link = `${baseUrl}/blog/${p.slug}`;
      const desc = (p.excerpt || '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
      return `<item>
        <title><![CDATA[${p.title}]]></title>
        <link>${link}</link>
        <guid>${link}</guid>
        <description><![CDATA[${desc}]]></description>
        <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
        <category>${p.category || ''}</category>
        <dc:creator><![CDATA[${p.full_name || p.username}]]></dc:creator>
      </item>`;
    }).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>sosyal-medya.net Blog</title>
  <link>${baseUrl}/blog</link>
  <description>İçerik üreticilerimizin son paylaşımları</description>
  <language>tr-TR</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(xml);
  } catch (e) {
    res.status(500).set('Content-Type', 'text/plain').send('RSS error: ' + e.message);
  }
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Dosya çok büyük (maks 50 MB)' });
  if (err?.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Maks 4 dosya' });
  if (err?.message?.includes('Desteklenmeyen')) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

// ── START ──
async function start() {
  try { await initSchema(); }
  catch (e) { console.error('[Init] schema failed:', e.message); }

  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   sosyal-medya.net  Backend v3.0  ✓            ║');
    console.log(`║   API:    http://localhost:${PORT}                  ║`);
    console.log('║   Login:                                       ║');
    console.log('║   • admin / admin123       (superadmin)        ║');
    console.log('║   • publisher / publisher123                   ║');
    console.log('║   • creator / creator123                       ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    xSync.startAutoSync(parseInt(process.env.X_SYNC_INTERVAL_MIN) || 30);
    rss.startAutoFetch(parseInt(process.env.RSS_FETCH_INTERVAL_MIN) || 30);
  });
}

// When imported by root server.js, don't auto-listen (root handles it).
// When run directly (`node server.js`), start normally.
async function prepare() {
  try { await initSchema(); }
  catch (e) { console.error('[Init] schema failed:', e.message); }
}

function startBackgroundJobs() {
  xSync.startAutoSync(parseInt(process.env.X_SYNC_INTERVAL_MIN) || 30);
  rss.startAutoFetch(parseInt(process.env.RSS_FETCH_INTERVAL_MIN) || 30);
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.prepare = prepare;
module.exports.startBackgroundJobs = startBackgroundJobs;
