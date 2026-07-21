'use strict';
const { Resend } = require('resend');

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'sosyal-medya.net <onboarding@resend.dev>';
const APP_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

let resendClient = null;
if (RESEND_KEY) {
  try { resendClient = new Resend(RESEND_KEY); console.log('[Email] Resend client initialized'); }
  catch (e) { console.warn('[Email] Resend init failed:', e.message); }
} else {
  console.log('[Email] No RESEND_API_KEY — emails will print to console only');
}

async function sendEmail({ to, subject, html, text }) {
  // Always log in dev mode for debugging
  if (!resendClient) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('[Email] WOULD SEND (no Resend configured):');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text:    ${text || '(see HTML)'}`);
    console.log('══════════════════════════════════════════════════\n');
    return { ok: true, mocked: true };
  }
  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text: text || stripTags(html)
    });
    if (result.error) {
      console.error('[Email] send failed:', result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (e) {
    console.error('[Email] exception:', e.message);
    return { ok: false, error: e.message };
  }
}

function stripTags(html) { return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

// ── Templates ──
function wrap(content, preheader = '') {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,Segoe UI,sans-serif;color:#111;">
${preheader ? `<div style="display:none;">${preheader}</div>` : ''}
<div style="max-width:560px;margin:40px auto;padding:0 16px;">
  <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid rgba(209,0,9,0.1);">
    <div style="padding:24px 32px;border-bottom:1px solid rgba(209,0,9,0.1);">
      <div style="font-family:Georgia,serif;font-size:20px;color:#D10009;font-weight:600;">sosyal-medya.net</div>
    </div>
    <div style="padding:32px;line-height:1.6;font-size:15px;">
      ${content}
    </div>
    <div style="padding:18px 32px;background:#fafaf9;border-top:1px solid rgba(0,0,0,0.06);color:#888;font-size:12px;text-align:center;">
      © ${new Date().getFullYear()} Nexify Street — Ishan · sosyal-medya.net
    </div>
  </div>
</div>
</body></html>`;
}

function emailVerifyTemplate({ name, link, isInvite, tempPassword }) {
  const greeting = isInvite
    ? `<h2 style="margin:0 0 16px;font-family:Georgia,serif;">Hesabınız oluşturuldu</h2>
       <p>Merhaba ${escapeHtml(name)},</p>
       <p>Bir yönetici sizin için <strong>sosyal-medya.net</strong> hesabı oluşturdu. Hesabınızı aktive etmek için e-postanızı doğrulayın:</p>
       ${tempPassword ? `<p style="background:#fafaf9;padding:12px;border-radius:8px;font-family:monospace;font-size:13px;">Geçici şifre: <strong>${escapeHtml(tempPassword)}</strong><br/><small style="color:#888;">İlk girişte değiştirmenizi öneririz.</small></p>` : ''}`
    : `<h2 style="margin:0 0 16px;font-family:Georgia,serif;">E-postanızı doğrulayın</h2>
       <p>Merhaba ${escapeHtml(name)},</p>
       <p>Kayıt olduğunuz için teşekkürler! Hesabınızı kullanmaya başlamak için aşağıdaki bağlantıya tıklayarak e-postanızı doğrulayın:</p>`;

  return wrap(`
    ${greeting}
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#D10009;color:white;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;">E-postamı Doğrula</a>
    </p>
    <p style="color:#888;font-size:13px;">Veya bu bağlantıyı tarayıcınıza yapıştırın:</p>
    <p style="color:#888;font-size:12px;word-break:break-all;background:#fafaf9;padding:10px;border-radius:6px;">${link}</p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.</p>
    <p style="color:#888;font-size:13px;">Bu işlemi yapmadıysanız, bu e-postayı yoksayın.</p>
  `, 'E-postanızı doğrulayın');
}

function passwordResetTemplate({ name, link }) {
  return wrap(`
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;">Şifre Sıfırlama</h2>
    <p>Merhaba ${escapeHtml(name)},</p>
    <p>Şifre sıfırlama talebinde bulundunuz. Yeni şifre belirlemek için aşağıdaki bağlantıya tıklayın:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#D10009;color:white;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;">Şifremi Sıfırla</a>
    </p>
    <p style="color:#888;font-size:13px;">Veya bu bağlantıyı tarayıcınıza yapıştırın:</p>
    <p style="color:#888;font-size:12px;word-break:break-all;background:#fafaf9;padding:10px;border-radius:6px;">${link}</p>
    <p style="color:#888;font-size:13px;margin-top:24px;"><strong>Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.</strong></p>
    <p style="color:#888;font-size:13px;">Şifre sıfırlama talebi yapmadıysanız, bu e-postayı yoksayın ve hesabınız güvende kalır.</p>
  `, 'Şifre sıfırlama bağlantınız');
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendVerifyEmail({ to, name, token, isInvite, tempPassword }) {
  const link = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: isInvite ? 'sosyal-medya.net — Hesabınız oluşturuldu' : 'E-postanızı doğrulayın — sosyal-medya.net',
    html: emailVerifyTemplate({ name, link, isInvite, tempPassword })
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: 'Şifre sıfırlama — sosyal-medya.net',
    html: passwordResetTemplate({ name, link })
  });
}

module.exports = { sendEmail, sendVerifyEmail, sendPasswordResetEmail, isConfigured: () => !!resendClient };
