'use strict';
const Parser = require('rss-parser');
const { query } = require('../lib/db');

/**
 * Public X profile inspector — uses free Nitter / RSSHub sources
 * Returns profile metadata + recent posts for shadowban + audit tools.
 * No API key required.
 */

// Live instances as of 2026-07 (from the official nitter status page).
// Public instances are volatile — set NITTER_INSTANCES env (comma-separated)
// to override with your own self-hosted instance for real reliability.
const NITTER_INSTANCES = (process.env.NITTER_INSTANCES
  ? process.env.NITTER_INSTANCES.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'https://xcancel.com',
      'https://nitter.poast.org',
      'https://nitter.privacyredirect.com',
      'https://lightbrd.com',
      'https://nitter.space',
      'https://nitter.tiekoetter.com',
      'https://nuku.trabun.org',
      'https://nitter.catsarch.com',
      'https://nitter.kareem.one'
    ]);

const RSSHUB_INSTANCES = (process.env.RSSHUB_INSTANCES
  ? process.env.RSSHUB_INSTANCES.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'https://rsshub.app',
      'https://rsshub.rssforever.com'
    ]);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

const parser = new Parser({ timeout: 12000, headers: HEADERS });

async function getCustomRssHub() {
  try {
    const r = await query(`SELECT value FROM settings WHERE key='custom_rsshub_url'`);
    if (!r.rows.length) return '';
    return typeof r.rows[0].value === 'string' ? r.rows[0].value.replace(/\/$/, '') : '';
  } catch { return ''; }
}

async function fetchProfileHtml(handle) {
  for (const inst of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${inst}/${handle}`, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length < 1000 || html.includes('User not found') || html.includes('Account suspended')) continue;
      return { html, source: inst };
    } catch {}
  }
  return null;
}

function parseProfile(html) {
  const get = (re) => {
    const m = html.match(re);
    return m ? m[1].trim() : '';
  };

  return {
    displayName: decodeHtml(get(/<a class="profile-card-fullname"[^>]*>([^<]+)<\/a>/)),
    bio: decodeHtml(get(/<div class="profile-bio"[^>]*>([\s\S]*?)<\/div>/).replace(/<[^>]+>/g, '').trim()),
    avatar: get(/<a class="profile-card-avatar"[^>]*href="([^"]+)"/)
            || get(/<img[^>]*class="[^"]*avatar[^"]*"[^>]*src="([^"]+)"/),
    banner: get(/<div class="profile-banner"[^>]*><a[^>]*href="([^"]+)"/),
    location: decodeHtml(get(/<div class="profile-location"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/)),
    website: get(/<div class="profile-website"[^>]*>[\s\S]*?href="([^"]+)"/),
    joinDate: decodeHtml(get(/<div class="profile-joindate"[^>]*>[\s\S]*?title="([^"]+)"/)),
    statsTweets: parseInt(get(/<li class="posts">[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/).replace(/[,.]/g, ''), 10) || 0,
    statsFollowing: parseInt(get(/<li class="following">[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/).replace(/[,.]/g, ''), 10) || 0,
    statsFollowers: parseInt(get(/<li class="followers">[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/).replace(/[,.]/g, ''), 10) || 0,
    statsLikes: parseInt(get(/<li class="likes">[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/).replace(/[,.]/g, ''), 10) || 0,
    isVerified: /<div class="profile-card-fullname"[\s\S]*?verified-icon/.test(html),
    isProtected: /This account's tweets are protected/.test(html),
    isSuspended: /Account suspended/.test(html)
  };
}

function decodeHtml(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&[#\w]+;/g, '');
}

async function fetchRecentTweetsRss(handle) {
  const custom = await getCustomRssHub();
  if (custom) {
    try {
      const f = await parser.parseURL(`${custom}/twitter/user/${handle}`);
      if (f?.items?.length) return f.items.slice(0, 20);
    } catch {}
  }
  for (const inst of RSSHUB_INSTANCES) {
    try {
      const f = await parser.parseURL(`${inst}/twitter/user/${handle}`);
      if (f?.items?.length) return f.items.slice(0, 20);
    } catch {}
  }
  for (const inst of NITTER_INSTANCES) {
    try {
      const f = await parser.parseURL(`${inst}/${handle}/rss`);
      if (f?.items?.length) return f.items.slice(0, 20);
    } catch {}
  }
  return [];
}

/**
 * Parse tweets WITH engagement stats from the Nitter profile HTML.
 * Nitter renders like/retweet/reply counts as icon-container spans.
 * This gives us engagement data that RSS feeds lack.
 * Returns [] if the HTML structure doesn't match (graceful degradation).
 */
function parseTweetsFromHtml(html) {
  if (!html) return [];
  const tweets = [];
  const itemRegex = /<div class="timeline-item[^"]*"[\s\S]*?(?=<div class="timeline-item|<div class="show-more|<div class="timeline-none|$)/g;
  const items = html.match(itemRegex) || [];

  for (const item of items.slice(0, 20)) {
    const textMatch = item.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = textMatch ? decodeHtml(textMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

    const dateMatch = item.match(/<span class="tweet-date"><a[^>]*title="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : '';

    const linkMatch = item.match(/<a class="tweet-link" href="([^"]+)"/);
    let link = linkMatch ? linkMatch[1] : '';
    // Normalize Nitter relative/absolute links to canonical x.com URLs
    if (link) {
      link = link.replace(/#m$/, '').replace(/^https?:\/\/[^/]+/, '');
      if (link.startsWith('/')) link = 'https://x.com' + link;
    }

    const statNum = (iconClass) => {
      const re = new RegExp('<span class="tweet-stat"><div class="icon-container"><span class="[^"]*' + iconClass + '[^"]*"[^>]*><\\/span>([\\s\\S]*?)<\\/div>');
      const m = item.match(re);
      if (!m) return 0;
      const n = m[1].replace(/[^\d]/g, '');
      return n ? parseInt(n, 10) : 0;
    };

    const replies = statNum('icon-comment');
    const retweets = statNum('icon-retweet');
    const quotes = statNum('icon-quote');
    const likes = statNum('icon-heart');
    const hasMedia = /class="attachment|class="still-image|class="video-container|class="gallery/.test(item);

    if (text || link) {
      tweets.push({ text: text.slice(0, 280), date, link, likes, retweets, replies: replies + quotes, hasMedia });
    }
  }
  return tweets;
}

async function searchAppearsInResults(handle) {
  // Check if profile appears in search by trying to find it via Nitter search
  for (const inst of NITTER_INSTANCES) {
    try {
      const res = await fetch(inst + '/search?f=users&q=' + encodeURIComponent(handle), { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = await res.text();
      const lowerHtml = html.toLowerCase();
      const lowerHandle = handle.toLowerCase();
      if (lowerHtml.includes('@' + lowerHandle) || lowerHtml.includes('/' + lowerHandle + '"') || lowerHtml.includes('href="/' + lowerHandle + '/"')) {
        return { found: true, source: inst };
      }
      return { found: false, source: inst };
    } catch {}
  }
  return { found: null, source: null };
}

async function inspectProfile(rawHandle) {
  const handle = rawHandle.replace(/^@/, '').trim().toLowerCase();
  if (!handle || !/^[a-z0-9_]{1,15}$/i.test(handle)) {
    return { error: 'Geçersiz X kullanıcı adı (1–15 karakter, sadece harf/rakam/_)' };
  }

  const fetched = await fetchProfileHtml(handle);
  if (!fetched) {
    return { error: 'Profile erişilemiyor. Tüm ücretsiz kaynaklar şu anda çalışmıyor olabilir. Lütfen birkaç dakika sonra tekrar deneyin.', errorCode: 'SOURCE_UNAVAILABLE' };
  }

  const profile = parseProfile(fetched.html);
  if (profile.isSuspended) {
    return { handle, profile, suspended: true, fetchedFrom: fetched.source };
  }

  const [tweets, searchResult] = await Promise.all([
    fetchRecentTweetsRss(handle),
    searchAppearsInResults(handle)
  ]);

  // Parse tweets WITH engagement from the profile HTML we already fetched
  const htmlTweets = parseTweetsFromHtml(fetched.html);

  // Prefer HTML tweets (they have engagement stats); fall back to RSS (text only)
  let finalTweets;
  if (htmlTweets.length >= 3) {
    finalTweets = htmlTweets.map(t => ({
      title: t.text,
      text: t.text,
      date: t.date,
      link: t.link,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      hasMedia: t.hasMedia
    }));
  } else {
    finalTweets = tweets.map(t => ({
      title: t.title,
      text: (t.contentSnippet || t.title || '').slice(0, 280),
      date: t.pubDate || t.isoDate,
      link: (t.link || '').replace(/#m$/, '').replace(/^https?:\/\/(nitter|rsshub|rss)[^/]*/i, 'https://x.com'),
      likes: 0, retweets: 0, replies: 0, hasMedia: false
    }));
  }

  return {
    handle,
    profile,
    tweets: finalTweets,
    engagementAvailable: htmlTweets.length >= 3,
    searchVisible: searchResult.found,
    fetchedFrom: fetched.source
  };
}

module.exports = { inspectProfile };
