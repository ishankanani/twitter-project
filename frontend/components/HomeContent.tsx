'use client';
import { useState } from 'react';
import Link from 'next/link';
import AccountRow from './AccountRow';
import SubscribersSection from './SubscribersSection';
import { Account, Subscriber, fmtNum, api } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function HomeContent({
  accounts,
  subscribers,
  cms
}: { accounts: Account[]; subscribers: Subscriber[]; cms: any }) {
  const { t } = useLang();
  const [emailRevealed, setEmailRevealed] = useState(false);
  const [siteEmail] = useState('info@sosyal-medya.net');
  const [newsletter, setNewsletter] = useState({ email: '', sent: false, error: '' });

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);

  async function submitNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setNewsletter(n => ({ ...n, error: '' }));
    try {
      await api.post('/api/newsletter', { email: newsletter.email });
      setNewsletter({ email: '', sent: true, error: '' });
    } catch (err: any) {
      setNewsletter(n => ({ ...n, error: err.message }));
    }
  }

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">
            {t.hero_title}<br />
            <em>{t.hero_em}</em>{t.hero_punc}
          </h1>
          <p className="hero-desc">{t.hero_desc}</p>
          <div className="hero-cta">
            <Link href="#accounts" className="btn-primary">{t.cta_explore}</Link>
            <Link href="/subscribe" className="btn-ghost">{t.cta_subscribe}</Link>
          </div>

          <div className="hero-stats">
            <div>
              <div className="hero-stat-num">{fmtNum(totalFollowers)}</div>
              <div className="hero-stat-label">{t.followers_label}</div>
            </div>
            <div>
              <div className="hero-stat-num">{accounts.length}</div>
              <div className="hero-stat-label">{t.accounts_label}</div>
            </div>
            <div>
              <div className="hero-stat-num">{subscribers.length}</div>
              <div className="hero-stat-label">{t.subs_title}</div>
            </div>
          </div>
        </div>

        <div className="hero-divider" />

        <div className="hero-right" id="accounts">
          <div className="acc-head">
            <span className="acc-head-label">{t.accounts_label}</span>
            <span className="acc-head-count">{String(accounts.length).padStart(2, '0')}</span>
          </div>
          {accounts.map(acc => <AccountRow key={acc.id} acc={acc} />)}
          {accounts.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', padding: '2rem 0' }}>
              Henüz hesap eklenmedi.
            </p>
          )}
        </div>
      </section>

      {/* SUBSCRIBERS */}
      <SubscribersSection subs={subscribers} />

      {/* ABOUT + CONTACT */}
      <div className="bottom">
        <div className="about-box reveal">
          <p className="box-label">{t.about_label}</p>
          <h2 className="box-title">{t.about_title_a}<br /><em>{t.about_title_b}</em></h2>
          <p className="box-text">{cms.about_p1 || t.about_p1}</p>
          <p className="box-text">{cms.about_p2 || t.about_p2}</p>
        </div>

        <div className="contact-box reveal">
          <p className="box-label">{t.contact_label}</p>
          <h2 className="box-title">{t.contact_title_a}<br /><em>{t.contact_title_b}</em></h2>
          <p className="box-text">{t.contact_desc}</p>

          {!emailRevealed ? (
            <button className="mail-btn" onClick={() => setEmailRevealed(true)}>{t.contact_btn}</button>
          ) : (
            <a href={`mailto:${siteEmail}`} className="mail-btn" style={{ display: 'inline-block', textAlign: 'center' }}>
              {siteEmail}
            </a>
          )}

          <div className="contact-form-fields">
            <p style={{ fontSize: '.85rem', opacity: .9, marginBottom: '.8rem', position: 'relative', zIndex: 1 }}>
              {t.promo_text}
            </p>
            {newsletter.sent ? (
              <p style={{ fontSize: '.9rem', opacity: .95, padding: '.8rem 1rem', background: 'rgba(255,255,255,.15)', borderRadius: 10, position: 'relative', zIndex: 1 }}>
                ✓ Teşekkürler, başarıyla kayıt oldunuz!
              </p>
            ) : (
              <form onSubmit={submitNewsletter} style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={newsletter.email}
                  onChange={e => setNewsletter({ ...newsletter, email: e.target.value })}
                  style={{ flex: '1 1 200px', minWidth: 0, padding: '.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '.9rem', outline: 'none' }}
                />
                <button type="submit" className="mail-btn" style={{ marginTop: 0, maxWidth: 'unset', width: 'auto', padding: '.75rem 1.4rem', flexShrink: 0 }}>
                  {t.promo_btn}
                </button>
              </form>
            )}
            {newsletter.error && <p style={{ fontSize: '.8rem', marginTop: '.6rem', opacity: .9, position: 'relative', zIndex: 1 }}>{newsletter.error}</p>}
          </div>
        </div>
      </div>

      {/* PRIVACY */}
      <div className="priv reveal">
        <span className="priv-tag">{t.priv_tag}</span>
        <p className="priv-text">{t.priv_text}</p>
      </div>
    </main>
  );
}
