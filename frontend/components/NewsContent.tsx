'use client';
import { useState, useMemo } from 'react';
import { NewsItem, timeAgo } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function NewsContent({ news }: { news: NewsItem[] }) {
  const { t } = useLang();
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => {
    if (cat === 'all') return news;
    return news.filter(n => n.category === cat);
  }, [news, cat]);

  const cats = [
    { id: 'all', label: t.cat_all },
    { id: 'gundem', label: t.cat_gundem },
    { id: 'spor', label: t.cat_spor },
    { id: 'ekonomi', label: t.cat_ekonomi },
    { id: 'dunya', label: t.cat_dunya }
  ];

  return (
    <>
      <section className="page-hero">
        <h1>{t.news_title}<em>.</em></h1>
        <p className="page-hero-desc">{t.page_news_desc}</p>
      </section>
      <section className="wrap">
        <div className="news-filters">
          {cats.map(c => (
            <button key={c.id} className={`news-filter ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--muted)', padding: '3rem 0', textAlign: 'center' }}>
            Bu kategoride haber bulunamadı. Yöneticinin RSS kaynaklarını yapılandırması gerekiyor.
          </p>
        ) : (
          <div className="news-grid">
            {filtered.map(n => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="news-card">
                {n.image && <img src={n.image} alt={n.title} className="news-img" loading="lazy" />}
                <div className="news-body">
                  <span className="news-cat">{n.category}</span>
                  <h3 className="news-title">{n.title}</h3>
                  <div className="news-meta">
                    <span>{n.sourceName}</span>
                    <span>·</span>
                    <span>{timeAgo(n.publishedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
