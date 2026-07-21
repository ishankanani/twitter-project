'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('./db');

const SECRET = process.env.JWT_SECRET || 'change-this-in-production-please-use-long-random-string';
const TOKEN_TTL = '24h';

function newSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

function verify(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}

/**
 * authMiddleware — verifies JWT + validates current_session_id (single concurrent login)
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const token = header.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli' });
    const payload = verify(token);
    if (!payload) return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum' });

    // Fetch user + verify session_id matches what's in DB
    const r = await query(
      `SELECT id, username, email, full_name, avatar, role, permissions, active, current_session_id
       FROM users WHERE id=$1 LIMIT 1`,
      [payload.id]
    );
    if (!r.rows.length) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    const u = r.rows[0];
    if (!u.active) return res.status(403).json({ error: 'Hesap pasif' });

    // Enforce single concurrent session
    if (payload.sid && u.current_session_id && payload.sid !== u.current_session_id) {
      return res.status(401).json({ error: 'Başka bir cihazdan giriş yapıldı. Lütfen tekrar giriş yapın.' });
    }

    req.user = {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.full_name,
      avatar: u.avatar,
      role: u.role,
      permissions: u.permissions || {}
    };
    next();
  } catch (e) {
    console.error('[auth] error:', e.message);
    res.status(500).json({ error: 'Yetkilendirme hatası' });
  }
}

/** Restrict to specific roles */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Oturum yok' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    next();
  };
}

/** Require specific permission key */
function requirePerm(permKey) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Oturum yok' });
    if (req.user.role === 'superadmin') return next(); // superadmin bypasses
    const perms = req.user.permissions || {};
    if (!perms[permKey]) return res.status(403).json({ error: `Eksik yetki: ${permKey}` });
    next();
  };
}

async function recordLoginAttempt(ip, username, success) {
  try {
    await query(
      `INSERT INTO login_attempts (ip, username, success) VALUES ($1,$2,$3)`,
      [ip || '', username || '', !!success]
    );
  } catch {}
}

async function isIpThrottled(ip) {
  // Block IP if 10+ failed attempts in last 10 minutes
  try {
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM login_attempts
       WHERE ip=$1 AND success=FALSE AND attempted_at > NOW() - INTERVAL '10 minutes'`,
      [ip || '']
    );
    return r.rows[0].c >= 10;
  } catch { return false; }
}

async function auditLog(userId, action, entity, entityId, details, ip) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, entity || null, entityId || null, JSON.stringify(details || {}), ip || '']
    );
  } catch (e) { console.error('[audit] failed:', e.message); }
}

module.exports = {
  sign, verify, authMiddleware, requireRole, requirePerm,
  recordLoginAttempt, isIpThrottled, auditLog, newSessionId
};
