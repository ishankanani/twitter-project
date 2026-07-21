'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!slug) return;
    document.title = `${slug} | sosyal-medya.net`;
    api.get(`/api/posts?category=${slug}`).then(r => {
      setPosts(Array.isArray(r) ? r : r.posts || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  const fullUrl = (u: string) => u && !u.startsWith('http') ? `${API}${u}` : u || '';

  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>{slug}<em>.</em></h1></section>
      <section className="wrap">
        {loading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p> : (
          posts.length === 0 ? <p style={{ textAlign: 'center', padding: '2rem' }}>Bu kategoride henüz içerik yok.</p> : (
            <div className="news-grid">
              {posts.map((p: any) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="news-card">
                  {p.coverImage && <img src={fullUrl(p.coverImage)} alt="" className="news-card-img" loading="lazy" decoding="async" />}
                  <div className="news-card-body">
                    <span className="news-cat">{p.type === 'blog' ? 'BLOG' : 'HABER'} · {p.category}</span>
                    <h3 className="news-card-title">{p.title}</h3>
                    {p.excerpt && <p className="news-card-excerpt">{p.excerpt}</p>}
                    <div className="news-card-foot">{formatDate(p.publishedAt, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · 👁 {p.viewCount}</div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </section>
      <SiteFooter />
    </>
  );
}
