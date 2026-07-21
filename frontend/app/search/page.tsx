'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, SearchResults } from '@/lib/api';
import { LangProvider } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
function fullUrl(url: string) { return url?.startsWith('http') ? url : `${PUBLIC_API}${url || ''}`; }

function Inner() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    api.get(`/api/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => setResults(null)).finally(() => setLoading(false));
  }, [q]);

  const totalResults = (results?.posts.length || 0) + (results?.accounts.length || 0) + (results?.news.length || 0);

  return (
    <>
      <section className="page-hero">
        <p className="section-tag">ARAMA</p>
        <h1>"{q}"<em>.</em></h1>
        <p className="page-hero-desc">{loading ? 'Aranıyor...' : `${totalResults} sonuç`}</p>
      </section>

      <section className="wrap">
        <SearchBox initial={q} />

        {loading && <div className="tool-loading"><div className="tool-spinner" /></div>}

        {!loading && results && (
          <>
            {results.posts.length > 0 && (
              <>
                <h2 className="search-h2">📰 İçerikler ({results.posts.length})</h2>
                <div className="blog-grid" style={{ marginBottom: '2rem' }}>
                  {results.posts.map((p: any) => (
                    <Link key={p.id} href={`/blog/${p.slug}`} className="blog-card">
                      {p.coverImage && <div className="blog-card-img"><img src={fullUrl(p.coverImage)} alt="" loading="lazy" decoding="async"/></div>}
                      <div className="blog-card-body">
                        <span className="news-cat">{p.category}</span>
                        <h3 className="news-title">{p.title}</h3>
                        {p.excerpt && <p style={{ fontSize: '.86rem', color: 'var(--mid)' }}>{p.excerpt}</p>}
                        <div className="blog-card-meta">
                          <span>{p.authorName || p.authorUsername}</span>
                          <span>{new Date(p.publishedAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {results.accounts.length > 0 && (
              <>
                <h2 className="search-h2">𝕏 Hesaplar ({results.accounts.length})</h2>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', marginBottom: '2rem' }}>
                  {results.accounts.map((a: any) => (
                    <Link key={a.id} href={`/account/${a.handle}`} className="search-account-card">
                      <div className="av" style={{ width: 50, height: 50 }}>
                        {a.avatar ? <img src={a.avatar} alt="" loading="lazy" decoding="async"/> : (a.displayName || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.displayName}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>@{a.handle} · {a.followers.toLocaleString('tr-TR')} takipçi</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {results.news.length > 0 && (
              <>
                <h2 className="search-h2">🗞️ Haberler ({results.news.length})</h2>
                <div className="news-grid" style={{ marginBottom: '2rem' }}>
                  {results.news.map((n: any) => (
                    <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="news-card">
                      {n.image && <img src={n.image} alt={n.title} className="news-img" loading="lazy" decoding="async"/>}
                      <div className="news-body">
                        <span className="news-cat">{n.sourceName}</span>
                        <h3 className="news-title">{n.title}</h3>
                        <div className="news-meta">{new Date(n.publishedAt).toLocaleDateString('tr-TR')}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}

            {totalResults === 0 && q && (
              <div className="dash-empty">
                <p>"{q}" için sonuç bulunamadı</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function SearchBox({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  return (
    <form action="/search" method="get" style={{ marginBottom: '2rem' }}>
      <div className="tool-form-row">
        <span className="tool-form-prefix">🔍</span>
        <input type="text" name="q" value={q} onChange={e => setQ(e.target.value)} placeholder="İçerik, hesap, haber ara..." autoFocus />
        <button type="submit" className="btn-primary">Ara</button>
      </div>
    </form>
  );
}

export default function SearchPage() {
  return (
    <LangProvider>
      <SiteHeader />
      <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Yükleniyor...</div>}>
        <Inner />
      </Suspense>
      <SiteFooter />
    </LangProvider>
  );
}
