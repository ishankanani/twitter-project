'use strict';
const OTPAuth = require('otpauth');
const QRCode = require('qrcode');
const crypto = require('crypto');

const ISSUER = 'sosyal-medya.net';

function generateSecret() {
  // 32-character base32 secret
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

function buildTotp(username, secretBase32) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32)
  });
}

async function getProvisioningUri(username, secretBase32) {
  const totp = buildTotp(username, secretBase32);
  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 240, margin: 1 });
  return { uri, qrDataUrl };
}

function verifyToken(secretBase32, token) {
  if (!secretBase32 || !token) return false;
  // Allow drift of 1 (30s before/after)
  const totp = buildTotp('user', secretBase32);
  const delta = totp.validate({ token: String(token).replace(/\s/g, ''), window: 1 });
  return delta !== null;
}

function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(5).toString('hex').toUpperCase());
  }
  return codes;
}

function verifyBackupCode(stored, input) {
  if (!Array.isArray(stored)) return null;
  const clean = String(input).toUpperCase().replace(/\s/g, '');
  const idx = stored.indexOf(clean);
  if (idx === -1) return null;
  // Return remaining codes (consumes the used one)
  return stored.filter((_, i) => i !== idx);
}

module.exports = {
  generateSecret, getProvisioningUri, verifyToken,
  generateBackupCodes, verifyBackupCode
};
