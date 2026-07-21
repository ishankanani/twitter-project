'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Account, Subscriber, fmtNum, initials, api } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function SubscribeContent({ accounts, subscribers }: { accounts: Account[]; subscribers: Subscriber[] }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setStatus('sending'); setErrMsg('');
    try { await api.post('/api/newsletter', { email }); setStatus('sent'); setEmail(''); }
    catch (err: any) { setStatus('error'); setErrMsg(err.message); }
  }

  return (
    <>
      <section className="page-hero">
        <h1>{t.cta_subscribe}<em>.</em></h1>
        <p className="page-hero-desc">Bültenimize katılın ve ağımızdaki tüm hesapları keşfedin.</p>
      </section>

      <section className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', maxWidth: '900px' }}>
          {/* Newsletter form */}
          <div style={{ background: 'linear-gradient(135deg, var(--red), #a00007)', borderRadius: '20px', padding: '2.5rem', color: 'white' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '.4rem' }}>📧 Bültenimize Kayıt Olun</h2>
            <p style={{ fontSize: '.92rem', opacity: .92, marginBottom: '1.5rem' }}>
              Haftalık öne çıkan içerikler, yeni hesaplar ve özel duyurular doğrudan e-posta kutunuza gelsin.
            </p>
            {status === 'sent' ? (
              <p style={{ background: 'rgba(255,255,255,.15)', padding: '1rem', borderRadius: '10px' }}>
                ✓ Teşekkürler! E-posta listemize başarıyla eklediniz.
              </p>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                <input type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ flex: '1 1 200px', minWidth: 0, padding: '.85rem 1.2rem', borderRadius: 10, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: '.95rem', outline: 'none' }} />
                <button type="submit" disabled={status === 'sending'} style={{ background: '#fff', color: 'var(--red)', border: 'none', borderRadius: '10px', padding: '.85rem 1.6rem', fontWeight: 700, fontSize: '.92rem', cursor: 'pointer' }}>
                  {status === 'sending' ? '...' : t.promo_btn}
                </button>
              </form>
            )}
            {errMsg && <p style={{ marginTop: '.6rem', fontSize: '.82rem', opacity: .88 }}>{errMsg}</p>}
          </div>

          {/* All accounts to follow */}
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', marginBottom: '1.4rem' }}>
              <span className="section-tag" style={{ display: 'block', marginBottom: '.4rem' }}>Tüm Hesaplar</span>
              Hesaplarımızı X'te Takip Edin
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
              {accounts.map(a => (
                <div key={a.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.2rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Link href={`/account/${a.handle}`} style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    {initials(a.displayName)}
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/account/${a.handle}`} style={{ display: 'block', fontWeight: 600, fontSize: '.92rem', color: 'var(--text)' }}>
                      {a.displayName}
                    </Link>
                    <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>@{a.handle} · {fmtNum(a.followers)}</div>
                  </div>
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--border)', padding: '.5rem .9rem', borderRadius: '999px', fontSize: '.75rem', fontWeight: 600 }}>
                    {t.follow}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
