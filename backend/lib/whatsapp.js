'use strict';
const { query } = require('../lib/db');

/**
 * WhatsApp notification helper.
 *
 * Two modes:
 * 1. DEEP LINK (always works, free): returns a wa.me URL that admin can click
 * 2. AUTO SEND (free, requires one-time setup): uses CallMeBot.com — admin must first
 *    send "I allow callmebot to send me messages" to +34 644 51 95 23 and get an API key.
 *
 * Configure via admin → Settings:
 *   - whatsapp_number  (target, e.g. +4915203534316)
 *   - callmebot_api_key  (optional, for auto-send)
 */

async function getSettings() {
  const r = await query(`SELECT key, value FROM settings WHERE key IN ('whatsapp_number','callmebot_api_key')`);
  const out = {};
  for (const row of r.rows) out[row.key] = typeof row.value === 'string' ? row.value : (row.value || '');
  return out;
}

function buildCollaborationMessage(c) {
  const lines = [
    '🤝 *Yeni İş Birliği Talebi — sosyal-medya.net*',
    '',
    `*Şirket:* ${c.company || '—'}`,
    `*İletişim:* ${c.contactName || c.contact_name || '—'}`,
    `*E-posta:* ${c.email || '—'}`,
    `*Telefon:* ${c.phone || '—'}`,
    `*Tür:* ${c.type || 'advertisement'}`,
    `*Bütçe:* ${c.budget || (c.budgetAmount || c.budget_amount ? `${c.budgetAmount || c.budget_amount} ${c.budgetCurrency || c.budget_currency || 'EUR'}` : '—')}`,
    '',
    '*Mesaj:*',
    (c.message || '').slice(0, 1500),
    ''
  ];
  const mediaCount = (c.media || []).length;
  if (mediaCount > 0) lines.push(`📎 ${mediaCount} medya dosyası eklendi (sitede görüntüleyin)`);
  return lines.join('\n');
}

function buildWaMeLink(number, message) {
  const clean = (number || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

async function sendViaCallMeBot(number, message, apiKey) {
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(number)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Main entry — call after collaboration is saved
 * Returns { waLink, autoSent }
 */
async function notifyCollaboration(collab) {
  const settings = await getSettings();
  const number = settings.whatsapp_number || '+4915203534316';
  const message = buildCollaborationMessage(collab);
  const waLink = buildWaMeLink(number, message);

  let autoSent = false;
  if (settings.callmebot_api_key) {
    const r = await sendViaCallMeBot(number, message, settings.callmebot_api_key);
    autoSent = r.ok;
    if (!r.ok) console.warn('[WA] auto-send failed:', r.error || r.status);
  }
  return { waLink, autoSent, message };
}

module.exports = { notifyCollaboration, buildCollaborationMessage, buildWaMeLink };
