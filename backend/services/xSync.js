'use strict';
const Parser = require('rss-parser');
const { query } = require('../lib/db');

/**
 * X (Twitter) sync via free public RSS sources (no API key required).
 *
 * Tries each provider in order until one returns tweets:
 *  1. User-configured RSSHub instance (admin can set in settings)
 *  2. Public Nitter instances (multiple fallbacks)
 *  3. xcancel.com with custom user agent
 *
 * Falls back gracefully if all sources fail. Manual tweet entry from admin
 * panel always works as a last resort.
 */

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.cz',
  'https://nitter.unixfox.eu',
  'https://nitter.kavin.rocks',
  'https://nitter.it',
  'https://nitter.fdn.fr'
];

const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rsshub.rssforever.com',
  'https://rss.shab.fun'
];

// Custom User-Agent helps with bot challenges on some instances
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const parser = new Parser({
  timeout: 12000,
  headers: FETCH_HEADERS
});

async function getCustomRssHub() {
  try {
    const r = await query(`SELECT value FROM settings WHERE key='custom_rsshub_url'`);
    if (!r.rows.length) return '';
    return typeof r.rows[0].value === 'string' ? r.rows[0].value.replace(/\/$/, '') : '';
  } catch { return ''; }
}

async function tryFetch(url) {
  try {
    const feed = await parser.parseURL(url);
    if (!feed?.items?.length) return null;
    return feed.items;
  } catch (err) {
    return null;
  }
}

async function fetchTweetsFromX(handle) {
  // Try custom RSSHub first if configured
  const customRsshub = await getCustomRssHub();
  if (customRsshub) {
    const items = await tryFetch(`${customRsshub}/twitter/user/${handle}`);
    if (items) return parseItems(items, handle, 'rsshub-custom');
  }

  // Try public RSSHub instances
  for (const inst of RSSHUB_INSTANCES) {
    const items = await tryFetch(`${inst}/twitter/user/${handle}`);
    if (items) return parseItems(items, handle, 'rsshub');
  }

  // Try Nitter instances
  for (const inst of NITTER_INSTANCES) {
    const items = await tryFetch(`${inst}/${handle}/rss`);
    if (items) return parseItems(items, handle, 'nitter');
  }

  return null;
}

function parseItems(items, handle, source) {
  return items.slice(0, 20).map(item => {
    const link = item.link || '';
    const idMatch = link.match(/status\/(\d+)/);
    return {
      x_id: idMatch ? idMatch[1] : `${handle}_${item.guid || item.title?.slice(0, 50)}`,
      account_handle: handle,
      text: cleanText(item.contentSnippet || item.title || ''),
      media: extractImages(item),
      likes: 0,    // Not available via RSS
      retweets: 0,
      replies: 0,
      created_at: item.pubDate || item.isoDate || new Date().toISOString(),
      x_url: link.replace(/https:\/\/(nitter|xcancel)[^/]+/, 'https://x.com'),
      source
    };
  });
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractImages(item) {
  const html = item.content || item['content:encoded'] || '';
  const matches = [...html.matchAll(/<img[^>]+src="([^">]+)"/gi)];
  return matches.slice(0, 4).map(m => ({ type: 'photo', url: m[1] }));
}

async function syncAllAccounts() {
  const accs = await query(`SELECT handle FROM accounts WHERE enabled=TRUE`);
  let totalNew = 0;
  let processed = 0;
  let failed = [];

  for (const row of accs.rows) {
    const fetched = await fetchTweetsFromX(row.handle);
    if (!fetched) {
      failed.push(row.handle);
      continue;
    }
    processed++;

    for (const t of fetched) {
      try {
        const r = await query(
          `INSERT INTO tweets (x_id, account_handle, text, media, likes, retweets, replies, created_at, x_url, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (x_id) DO NOTHING
           RETURNING id`,
          [t.x_id, t.account_handle, t.text, JSON.stringify(t.media), t.likes, t.retweets, t.replies, t.created_at, t.x_url, t.source]
        );
        if (r.rowCount > 0) totalNew++;
      } catch (e) {
        // Skip dup/error individual tweets
      }
    }
  }

  await query(
    `INSERT INTO settings (key, value) VALUES ('last_tweet_sync', $1)
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
    [JSON.stringify(new Date().toISOString())]
  );

  if (failed.length) {
    console.log(`[X Sync] ⚠ ${failed.length} accounts failed (all free instances down): ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}`);
  }
  console.log(`[X Sync] +${totalNew} new tweets from ${processed}/${accs.rows.length} accounts`);
  return { synced: totalNew, accounts: processed, failed: failed.length };
}

function startAutoSync(intervalMin = 30) {
  console.log(`[X Sync] using free RSS sources (Nitter + RSSHub fallback) every ${intervalMin}min`);
  setTimeout(() => syncAllAccounts().catch(e => console.error('[X Sync] init error:', e.message)), 8000);
  setInterval(() => syncAllAccounts().catch(e => console.error('[X Sync] error:', e.message)), intervalMin * 60 * 1000);
}

module.exports = { syncAllAccounts, fetchTweetsFromX, startAutoSync };
