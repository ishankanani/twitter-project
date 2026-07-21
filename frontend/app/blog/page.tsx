'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const CATEGORY_LABELS: Record<string, string> = {
  gundem: '🌍 Gündem', spor: '⚽ Spor', ekonomi: '💰 Ekonomi',
  teknoloji: '💻 Teknoloji', kultur: '🎭 Kültür-Sanat',
  dunya: '🌐 Dünya', eglence: '🎉 Eğlence'
};

export default function BlogPage() {
  const { lang } = useLang();
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || '';
  const fullUrl = (u: string) => u?.startsWith('http') ? u : `${API}${u || ''}`;

  useEffect(() => {
    Promise.all([
      api.get('/api/posts?limit=30').catch(() => []),
      api.get('/api/categories').catch(() => [])
    ]).then(([p, c]) => {
      setPosts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SiteHeader />
      <section className="page-hero">
        <p className="section-tag">📰 Topluluk</p>
        <h1>Blog<em>.</em></h1>
        <p className="page-hero-desc">İçerik üreticilerimizin paylaşımları</p>
      </section>

      <section className="wrap">
        {categories.length > 0 && (
          <div className="category-tabs">
            <Link href="/blog" className="category-tab on">Tümü ({posts.length})</Link>
            {categories.map((c: any) => (
              <Link key={c.category} href={`/category/${c.category}`} className="category-tab">
                {CATEGORY_LABELS[c.category] || c.category} <span>({c.postCount})</span>
              </Link>
            ))}
          </div>
        )}

        {loading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p> : posts.length === 0 ? (
          <div className="dash-empty"><p>Henüz yayımlanmış içerik yok.</p></div>
        ) : (
          <div className="blog-grid">
            {posts.map((p: any) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="blog-card">
                {p.coverImage && (
                  <div className="blog-card-img">
                    <img src={fullUrl(p.coverImage)} alt={p.title} loading="lazy" decoding="async"/>
                  </div>
                )}
                <div className="blog-card-body">
                  <span className="news-cat">{p.type === 'blog' ? 'BLOG' : p.type === 'news' ? 'HABER' : 'GÖNDERİ'} · {p.category}</span>
                  <h3 className="news-title">{p.title}</h3>
                  {p.excerpt && <p style={{ fontSize: '.86rem', color: 'var(--mid)', lineHeight: 1.55 }}>{p.excerpt}</p>}
                  <div className="blog-card-meta">
                    <div className="blog-author">
                      <div className="blog-author-av">{(p.authorName || p.authorUsername || '').slice(0, 2).toUpperCase()}</div>
                      <span>{p.authorName || p.authorUsername}</span>
                    </div>
                    <span>{formatDate(p.publishedAt, lang)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
