'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useLang, formatDate, Lang } from '@/lib/i18n';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BookmarksPage() {
  const { token } = useAuth();
  const { t, lang } = useLang();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (token) api.get('/api/me/bookmarks', token).then(setList).catch(() => {});
  }, [token]);

  return (
    <div>
      <h2 className="dash-h2">🔖 {t.dash_bookmarks}</h2>
      <p className="dash-sub">{t.dash_overview}</p>

      {list.length === 0 ? (
        <div className="dash-empty">
          <p>{t.dash_no_bookmarks}</p>
          <Link href="/blog" className="btn-primary">{t.cta_explore}</Link>
        </div>
      ) : (
        <div className="blog-grid">
          {list.map(p => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="blog-card">
              {p.coverImage && (
                <div className="blog-card-img">
                  <img src={p.coverImage.startsWith('http') ? p.coverImage : `${PUBLIC_API}${p.coverImage}`} alt="" loading="lazy" decoding="async"/>
                </div>
              )}
              <div className="blog-card-body">
                {/* Category/title/author = content data, never translated */}
                <span className="news-cat">{p.category}</span>
                <h3 className="news-title">{p.title}</h3>
                {p.excerpt && <p style={{ fontSize: '.86rem', color: 'var(--mid)' }}>{p.excerpt}</p>}
                <div className="blog-card-meta">
                  <span>{p.authorName || p.authorUsername}</span>
                  <span>📌 {formatDate(p.bookmarkedAt, lang as Lang)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
