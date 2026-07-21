'use client';
import Link from 'next/link';
import { Account, Tweet, Subscriber, fmtNum, initials } from '@/lib/api';
import TweetCard from './TweetCard';
import { useLang } from '@/lib/i18n';

export default function AccountDetailContent({
  account, tweets, subscribers
}: { account: Account; tweets: Tweet[]; subscribers: Subscriber[] }) {
  const { t } = useLang();
  const recentSubs = subscribers.slice(0, 6);

  return (
    <main>
      {/* HERO */}
      <section className="acc-detail-hero">
        <Link href="/" className="acc-detail-back">
          ← Ana Sayfa
        </Link>
        <div className="acc-detail-card reveal">
          <div className="acc-detail-av">
            {account.avatar ? <img src={account.avatar} alt={account.displayName} loading="lazy" decoding="async"/> : initials(account.displayName)}
          </div>
          <div className="acc-detail-info">
            <h1 className="acc-detail-name">{account.displayName}</h1>
            <div className="acc-detail-handle">@{account.handle}</div>
            {account.bio && <p className="acc-detail-bio">{account.bio}</p>}

            <div className="acc-detail-stats">
              <div>
                <div className="acc-stat-num">{fmtNum(account.followers)}</div>
                <div className="acc-stat-label">{t.followers_label}</div>
              </div>
              <div>
                <div className="acc-stat-num">{tweets.length}</div>
                <div className="acc-stat-label">{t.posts_label}</div>
              </div>
              <div>
                <div className="acc-stat-num"><span className="admin-tag red">{account.category}</span></div>
                <div className="acc-stat-label">Kategori</div>
              </div>
            </div>

            <div className="acc-detail-actions">
              <a href={account.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622z" /></svg>
                {t.follow}
              </a>
              <Link href="/subscribe" className="btn-ghost">{t.cta_subscribe}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* TWEETS + RECENT SUBSCRIBERS SIDEBAR */}
      <section className="tweets-section">
        <div className="tweets-layout">
          <div>
            <h2 className="tweets-section-title">
              <span className="section-tag" style={{ display: 'block', marginBottom: '.4rem' }}>@{account.handle}</span>
              Son Gönderiler
            </h2>

            {tweets.length === 0 ? (
              <div style={{ background: 'var(--light)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--mid)' }}>
                <p style={{ marginBottom: '.8rem' }}>{t.no_tweets}</p>
                <a href={account.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', fontSize: '.88rem', fontWeight: 600 }}>
                  {t.open_on_x} →
                </a>
              </div>
            ) : (
              <div className="tweets-grid">
                {tweets.map(tw => <TweetCard key={tw.id} tweet={tw} account={account} />)}
              </div>
            )}
          </div>

          {/* SIDEBAR — Recent Subscribers + Promo */}
          <aside className="acc-detail-sidebar">
            <div className="sidebar-card">
              <h3>{t.recent_subs}</h3>
              <p className="sub-meta">Ağımıza katılan en son hesaplar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentSubs.map(s => (
                  <a key={s.id} href={s.xUrl || `https://x.com/${s.handle}`} target="_blank" rel="noopener noreferrer" className="sidebar-sub-link">
                    <div className="sidebar-sub-mini-av">{initials(s.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>@{s.handle}</div>
                    </div>
                  </a>
                ))}
              </div>
              <Link href="/subscribe" className="sidebar-view-all">
                {t.view_all} →
              </Link>
            </div>

            <div className="subscribe-promo">
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{t.cta_subscribe}</strong>
                <span className="subscribe-promo-text">{t.promo_text}</span>
              </div>
              <Link href="/subscribe" className="subscribe-promo-btn">
                {t.promo_btn}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
