'use client';
import { useState } from 'react';
import { Subscriber, initials } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function SubscribersSection({ subs }: { subs: Subscriber[] }) {
  const { t } = useLang();
  const [q, setQ] = useState('');

  const filtered = q
    ? subs.filter(s => (s.name + ' ' + s.handle).toLowerCase().includes(q.toLowerCase()))
    : subs;

  return (
    <section className="subs-section reveal">
      <div className="subs-header">
        <div>
          <p className="section-tag">{t.subs_tag}</p>
          <h2 className="subs-title">{t.subs_title}<em>.</em></h2>
        </div>
        <span className="subs-total">{String(subs.length).padStart(2, '0')}</span>
      </div>

      <div className="subs-search-wrap">
        <span className="subs-search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input className="subs-search" type="text" placeholder={t.subs_search} value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {q && <p className="subs-result-count">{filtered.length} sonuç</p>}

      <div className="subs-grid">
        {filtered.length === 0 ? (
          <div className="subs-empty">{t.subs_empty}</div>
        ) : filtered.map(s => (
          <a key={s.id} className="sub-card" href={s.xUrl || `https://x.com/${s.handle}`} target="_blank" rel="noopener noreferrer">
            <div className="sub-av">{initials(s.name)}</div>
            <div className="sub-info">
              <div className="sub-name">{s.name}</div>
              <div className="sub-handle">@{s.handle}</div>
            </div>
            <span className="sub-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
