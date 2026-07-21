'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./db');

const SCHEMA = `
-- ─────────── USERS / ROLES / SESSIONS ───────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  bio TEXT DEFAULT '',
  role VARCHAR(30) NOT NULL DEFAULT 'creator',
  -- roles: superadmin | publisher | creator
  permissions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  current_session_id VARCHAR(100),
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  new_email VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verif_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_resets(token);

-- Login attempt log for brute-force protection
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(50),
  username VARCHAR(100),
  success BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attempts_ip_time ON login_attempts(ip, attempted_at DESC);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id INTEGER,
  details JSONB DEFAULT '{}',
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);

-- ─────────── EXISTING TABLES (X accounts, tweets, RSS) ───────────
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(200) NOT NULL,
  handle VARCHAR(100) UNIQUE NOT NULL,
  url VARCHAR(500) NOT NULL,
  bio TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT 'gundem',
  followers INTEGER DEFAULT 0,
  avatar VARCHAR(500) DEFAULT '',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_handle ON accounts(LOWER(handle));

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  handle VARCHAR(100) NOT NULL,
  x_url VARCHAR(500) DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tweets (
  id BIGSERIAL PRIMARY KEY,
  x_id VARCHAR(50) UNIQUE,
  account_handle VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  rich_text TEXT,
  media JSONB DEFAULT '[]',
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  x_url VARCHAR(500) DEFAULT '',
  source VARCHAR(20) DEFAULT 'manual',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tweets_handle ON tweets(LOWER(account_handle));
CREATE INDEX IF NOT EXISTS idx_tweets_created ON tweets(created_at DESC);

CREATE TABLE IF NOT EXISTS tweet_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  rich_text TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rss_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(50) DEFAULT 'gundem',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_items (
  id BIGSERIAL PRIMARY KEY,
  rss_source_id INTEGER REFERENCES rss_sources(id) ON DELETE CASCADE,
  guid VARCHAR(500) UNIQUE,
  title VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  description TEXT DEFAULT '',
  image VARCHAR(1000) DEFAULT '',
  category VARCHAR(50) DEFAULT 'gundem',
  source_name VARCHAR(200),
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_items(category);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) DEFAULT '',
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) DEFAULT '',
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaborations (
  id SERIAL PRIMARY KEY,
  company VARCHAR(200) DEFAULT '',
  contact_name VARCHAR(200) DEFAULT '',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  type VARCHAR(50) DEFAULT 'advertisement',
  budget VARCHAR(100) DEFAULT '',
  budget_amount NUMERIC(12,2),
  budget_currency VARCHAR(10) DEFAULT 'EUR',
  message TEXT NOT NULL,
  media JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'new',
  -- statuses: new | reviewing | accepted | declined | completed
  admin_remarks TEXT DEFAULT '',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON collaborations(status);

CREATE TABLE IF NOT EXISTS newsletter (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────── USER POSTS (content creator submissions) ───────────
CREATE TABLE IF NOT EXISTS user_posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'post',
  -- types: post | blog | news
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  cover_image VARCHAR(1000) DEFAULT '',
  media JSONB DEFAULT '[]',
  category VARCHAR(50) DEFAULT 'gundem',
  tags JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending',
  -- statuses: pending | approved | declined | draft
  decline_reason TEXT DEFAULT '',
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_posts_author ON user_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_status ON user_posts(status);
CREATE INDEX IF NOT EXISTS idx_user_posts_published ON user_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_posts_slug ON user_posts(slug);

-- ─────────── NOTIFICATIONS ───────────
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT DEFAULT '',
  link VARCHAR(500) DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read=FALSE;

-- ─────────── PAYMENTS / REVENUE ───────────
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  source VARCHAR(100) DEFAULT '',
  description TEXT DEFAULT '',
  status VARCHAR(30) DEFAULT 'received',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_received ON payments(received_at DESC);

-- ─────────── CMS ───────────
CREATE TABLE IF NOT EXISTS cms_blocks (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────── ENGAGEMENT (Batch 2) ───────────

-- Comments on user posts
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name VARCHAR(100),
  guest_email VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'approved',
  -- statuses: pending | approved | spam
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- Post likes (one row per user per post)
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- Post bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON post_bookmarks(user_id);

-- Tweet reactions (anonymous + logged-in via IP fingerprint)
CREATE TABLE IF NOT EXISTS tweet_reactions (
  id SERIAL PRIMARY KEY,
  tweet_id BIGINT REFERENCES tweets(id) ON DELETE CASCADE,
  reaction VARCHAR(20) NOT NULL,
  -- types: like | love | laugh | wow | sad | angry
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tweet_react_user ON tweet_reactions(tweet_id, user_id, reaction) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tweet_react_ip ON tweet_reactions(tweet_id, ip_hash, reaction) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tweet_react_tweet ON tweet_reactions(tweet_id);

-- Activity feed (per creator)
CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  -- types: view | like | bookmark | comment | post_approved | post_declined
  post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);

-- Full-text search support (added via ALTER on user_posts + accounts)
DO $$ BEGIN
  ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS search_vector tsvector;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_posts_search ON user_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_accounts_search ON accounts USING GIN(search_vector);

-- Update search vectors on insert/update
CREATE OR REPLACE FUNCTION user_posts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.excerpt,'')), 'B') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW.content,''), '<[^>]+>', ' ', 'g')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_posts_search ON user_posts;
CREATE TRIGGER trg_user_posts_search BEFORE INSERT OR UPDATE OF title, excerpt, content
  ON user_posts FOR EACH ROW EXECUTE FUNCTION user_posts_search_trigger();

CREATE OR REPLACE FUNCTION accounts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.display_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.handle,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.bio,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category,'')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_search ON accounts;
CREATE TRIGGER trg_accounts_search BEFORE INSERT OR UPDATE OF display_name, handle, bio, category
  ON accounts FOR EACH ROW EXECUTE FUNCTION accounts_search_trigger();

-- One-time populate existing rows
UPDATE user_posts SET title = title WHERE search_vector IS NULL;
UPDATE accounts SET display_name = display_name WHERE search_vector IS NULL;

-- ─────────── BATCH 3 — GROWTH ───────────

-- Page views log (analytics)
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  post_id INTEGER REFERENCES user_posts(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  referer VARCHAR(500),
  device VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path, created_at DESC);

-- Co-authors
CREATE TABLE IF NOT EXISTS post_co_authors (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_co_authors_post ON post_co_authors(post_id);

-- Newsletter campaigns
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  recipients INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON newsletter_campaigns(status);

-- 2FA + scheduling columns
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB DEFAULT '[]';
  ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON user_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Backwards-compat: ensure new columns exist when upgrading from v2
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(10) DEFAULT 'EUR'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'new'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS admin_remarks TEXT DEFAULT ''; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS assigned_to INTEGER; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN others THEN NULL; END $$;
`;

// ─────────── DEFAULT PERMISSIONS PER ROLE ───────────
const DEFAULT_PERMISSIONS = {
  superadmin: {
    accounts: true, tweets: true, subscribers: true, contacts: true,
    collaborations: true, newsletter: true, rss: true, cms: true,
    settings: true, users: true, payments: true, posts_review: true,
    role_management: true, audit_log: true
  },
  publisher: {
    accounts: false, tweets: true, subscribers: false, contacts: false,
    collaborations: false, newsletter: false, rss: false, cms: false,
    settings: false, users: false, payments: false, posts_review: true,
    role_management: false, audit_log: false
  },
  creator: {
    own_posts: true, notifications: true
  }
};

const SEED_ACCOUNTS = [
  ['OHA OHA | DİJİTAL', 'OHADIJITAL', 'https://x.com/OHADIJITAL', 'Dijital medya, güncel haberler ve analizler.', 'gundem', 142000],
  ['Twit Bakanı', 'TwitBakani', 'https://x.com/TwitBakani', 'Twitter gündemi ve viral içerikler.', 'gundem', 89500],
  ['AnkaRapor', 'AnkaRapor', 'https://x.com/AnkaRapor', 'Ankara merkezli haber ve siyaset analizleri.', 'gundem', 210000],
  ['Yeniden Paylaşım', 'yenidenpaylasim', 'https://x.com/yenidenpaylasim', 'Önemli içerikleri yeniden gündeme taşıyoruz.', 'eglence', 67000],
  ['King GS', 'KingGS', 'https://x.com/KingGS', 'Galatasaray ve Türk futbolu haberleri.', 'spor', 310000]
];

const SEED_SUBSCRIBERS = [
  ['Pamuk Prenses', 'seda_su7'],
  ['Viewra', 'Viewra_x'],
  ['Eksik Bir Satır', 'heybecoolforum'],
  ['OHA', 'ohastok'],
  ['Akif Polat', 'yorumcuakif'],
  ['OHA Video', 'OHA_VIDEO']
];

const SEED_RSS = [
  ['Hürriyet', 'https://www.hurriyet.com.tr/rss/anasayfa', 'gundem'],
  ['Habertürk', 'https://www.haberturk.com/rss', 'gundem'],
  ['BBC Türkçe', 'https://feeds.bbci.co.uk/turkce/rss.xml', 'dunya'],
  ['Bloomberg HT', 'https://www.bloomberght.com/rss', 'ekonomi']
];

async function init() {
  console.log('[Init] running schema migration...');
  await query(SCHEMA);

  // ─── Seed default superadmin ──
  const adminExists = await query(`SELECT id FROM users WHERE username='admin' LIMIT 1`);
  if (adminExists.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, permissions, active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
      ['admin', 'admin@sosyal-medya.net', hash, 'Super Admin', 'superadmin', JSON.stringify(DEFAULT_PERMISSIONS.superadmin)]
    );
    console.log('[Init] superadmin user created (admin / admin123)');
  }

  // Seed example publisher + creator if none exist
  const pubExists = await query(`SELECT id FROM users WHERE role='publisher' LIMIT 1`);
  if (pubExists.rows.length === 0) {
    const hash = await bcrypt.hash('publisher123', 10);
    await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, permissions, active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
      ['publisher', 'publisher@sosyal-medya.net', hash, 'Demo Publisher', 'publisher', JSON.stringify(DEFAULT_PERMISSIONS.publisher)]
    );
    console.log('[Init] publisher user created (publisher / publisher123)');
  }

  const crExists = await query(`SELECT id FROM users WHERE role='creator' LIMIT 1`);
  if (crExists.rows.length === 0) {
    const hash = await bcrypt.hash('creator123', 10);
    await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, permissions, active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
      ['creator', 'creator@sosyal-medya.net', hash, 'Demo Creator', 'creator', JSON.stringify(DEFAULT_PERMISSIONS.creator)]
    );
    console.log('[Init] creator user created (creator / creator123)');
  }

  // Seed accounts, subscribers, RSS
  for (const a of SEED_ACCOUNTS) {
    await query(
      `INSERT INTO accounts (display_name, handle, url, bio, category, followers)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (handle) DO NOTHING`,
      a
    );
  }
  for (const s of SEED_SUBSCRIBERS) {
    await query(
      `INSERT INTO subscribers (name, handle, x_url) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [s[0], s[1], `https://x.com/${s[1]}`]
    );
  }
  for (const r of SEED_RSS) {
    await query(
      `INSERT INTO rss_sources (name, url, category) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      r
    );
  }

  // Sample tweets
  const tCount = await query('SELECT COUNT(*)::int AS c FROM tweets');
  if (tCount.rows[0].c === 0) {
    const samples = {
      OHADIJITAL: ['Türkiye gündeminde önemli gelişmeler yaşanıyor.', 'Son dakika: Ekonomi alanında kritik açıklama.', 'Dijital dünyadaki son trendler.', 'Bugünkü gündem özetimiz hazır.'],
      TwitBakani: ['Bugün Twitter gündeminde neler oldu?', 'Sosyal medyanın gücü bir kez daha kanıtlandı.', 'Bu hafta en çok konuşulan konular.'],
      AnkaRapor: ['Ankara kulislerinden son haberler.', 'Siyaset gündemi yoğun.', "Başkent Ankara'dan günün en kritik gelişmesi."],
      yenidenpaylasim: ['Önemli olduğunu düşündüğümüz bir içeriği tekrar paylaşıyoruz.', 'Geçmişten günümüze unutulmayan anlar.', 'Bu paylaşımı kaçırmamalısınız.'],
      KingGS: ['Galatasaray bu akşam Avrupa kupasında!', 'Transfer dönemi açıldı.', "Cimbom'un son maç performansı analizi.", 'Galatasaray taraftarı için özel içerik.']
    };
    let id = 1000;
    for (const handle of Object.keys(samples)) {
      for (let i = 0; i < samples[handle].length; i++) {
        const created = new Date(Date.now() - (i * 3 + Math.random() * 5) * 3600 * 1000);
        await query(
          `INSERT INTO tweets (x_id, account_handle, text, likes, retweets, replies, created_at, x_url, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'sample') ON CONFLICT (x_id) DO NOTHING`,
          [`seed_${handle}_${id++}`, handle, samples[handle][i],
           Math.floor(Math.random() * 5000) + 100, Math.floor(Math.random() * 1500) + 50, Math.floor(Math.random() * 400) + 10,
           created.toISOString(), `https://x.com/${handle}`]
        );
      }
    }
  }

  // CMS blocks
  const defaultCms = {
    hero_title: 'Dijital ekosistemimiz.',
    hero_sub: "Türkiye'nin kaliteli ve bağımsız dijital yayın ağlarından biriyiz.",
    about_p1: 'sosyal-medya.net, farklı alanlarda faaliyet gösteren ancak aynı yüksek standartları benimseyen hesapların oluşturduğu bir dijital ağdır.',
    about_p2: 'Her hesap kendi özgün içeriğini üretirken, ağın genel kalite ve şeffaflık ilkelerine bağlı kalır.',
    privacy: '<h2>Gizlilik Politikası</h2><p>Nexify Street tarafından işletilen sosyal-medya.net, kullanıcılarının gizliliğini en üst düzeyde korur. KVKK ve GDPR uyumlu çalışılır.</p><h3>Toplanan Veriler</h3><p>Kayıt için ad, e-posta ve kullanıcı adı toplanır. Şifreler bcrypt ile hash\'lenir.</p><h3>Çerezler</h3><p>Yalnızca oturum yönetimi için zorunlu çerezler kullanılır.</p>',
    impressum: '<h2>Impressum / Yasal Bilgi</h2><p><strong>Nexify Street</strong><br>Sahibi: Ishan<br>E-Mail: info@sosyal-medya.net</p><h3>Sorumluluk</h3><p>Sitedeki içerikler büyük özenle hazırlanır. Yine de hatalar olabilir.</p>',
    terms: '<h2>Kullanım Şartları</h2><p>Bu siteyi kullanarak, içerik üretiminin kanunlara uygun olacağını kabul edersiniz. İhlal durumunda hesabınız askıya alınabilir.</p>',
    cookies: '<h2>Çerez Politikası</h2><p>Yalnızca oturum yönetimi için zorunlu çerezler kullanılır.</p>'
  };
  for (const [k, v] of Object.entries(defaultCms)) {
    await query('INSERT INTO cms_blocks (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  // Default settings
  const defaultSettings = {
    site_name: 'sosyal-medya.net',
    site_email: 'info@sosyal-medya.net',
    whatsapp_number: '+4915203534316',
    company_name: 'Nexify Street - Ishan',
    last_tweet_sync: null
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    await query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, JSON.stringify(v)]);
  }

  // Tweet templates
  const tplCount = await query('SELECT COUNT(*)::int AS c FROM tweet_templates');
  if (tplCount.rows[0].c === 0) {
    const templates = [
      ['📰 Haber Duyurusu', 'haber', '<p><strong>SON DAKİKA:</strong> [başlık]</p><p>[detay]</p>', 'Son dakika haber'],
      ['🏆 Spor Sonucu', 'spor', '<p><strong>MAÇ SONA ERDİ ⚽</strong></p><p>[A] X-X [B]</p>', 'Maç sonucu'],
      ['💰 Ekonomi', 'ekonomi', '<p><strong>📊 Piyasalar</strong></p><p>USD: [değer]</p>', 'Günlük ekonomi'],
      ['📢 Genel Duyuru', 'duyuru', '<p><strong>📢 DUYURU</strong></p><p>[metin]</p>', 'Duyuru']
    ];
    for (const t of templates) {
      await query(
        `INSERT INTO tweet_templates (name, category, rich_text, preview_text) VALUES ($1,$2,$3,$4)`,
        t
      );
    }
  }

  console.log('[Init] ✓ database ready');
  console.log('[Init] login → admin/admin123 (superadmin), publisher/publisher123, creator/creator123');
}

if (require.main === module) {
  init().then(() => pool.end()).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { init, DEFAULT_PERMISSIONS };
