'use strict';
const Parser = require('rss-parser');
const { query } = require('../lib/db');

const parser = new Parser({ timeout: 12000 });

function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.url) return item['media:content'].url;
  if (item['media:thumbnail']?.url) return item['media:thumbnail'].url;
  const html = item.content || item['content:encoded'] || '';
  const m = html.match(/<img[^>]+src="([^">]+)"/i);
  return m ? m[1] : '';
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    let added = 0;
    for (const item of (feed.items || []).slice(0, 30)) {
      try {
        const r = await query(
          `INSERT INTO news_items (rss_source_id, guid, title, url, description, image, category, source_name, published_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (guid) DO NOTHING
           RETURNING id`,
          [
            source.id,
            item.guid || item.link || `${source.id}_${item.title}`,
            (item.title || '').slice(0, 500),
            item.link || '',
            (item.contentSnippet || item.content || '').slice(0, 280),
            extractImage(item),
            source.category,
            source.name,
            item.pubDate || item.isoDate || new Date().toISOString()
          ]
        );
        if (r.rowCount > 0) added++;
      } catch {}
    }
    return added;
  } catch (err) {
    console.error(`[RSS] ${source.name} failed:`, err.message);
    return 0;
  }
}

async function fetchAll() {
  const r = await query(`SELECT id, name, url, category FROM rss_sources WHERE enabled=TRUE`);
  let total = 0;
  for (const src of r.rows) total += await fetchSource(src);
  // Trim cache: keep last 500 most recent
  await query(`DELETE FROM news_items WHERE id NOT IN (SELECT id FROM news_items ORDER BY published_at DESC LIMIT 500)`);
  console.log(`[RSS] +${total} new items from ${r.rows.length} sources`);
  return total;
}

function startAutoFetch(intervalMin = 30) {
  console.log(`[RSS] auto-fetch every ${intervalMin}min`);
  setTimeout(() => fetchAll().catch(e => console.error('[RSS] init error:', e.message)), 8000);
  setInterval(() => fetchAll().catch(e => console.error('[RSS] error:', e.message)), intervalMin * 60 * 1000);
}

module.exports = { fetchAll, fetchSource, startAutoFetch };
