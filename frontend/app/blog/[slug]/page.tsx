'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PostEngagementBar from '@/components/PostEngagementBar';
import CommentsSection from '@/components/CommentsSection';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLang();
  const [post, setPost] = useState<any>(null);
  const [coAuthors, setCoAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/posts/${slug}`).catch(() => null),
      api.get(`/api/posts/${slug}/co-authors`).catch(() => [])
    ]).then(([p, ca]) => {
      if (!p) { setNotFound(true); } else { setPost(p); setCoAuthors(ca || []); }
      setLoading(false);
    });
  }, [slug]);

  const fullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API}${url}`;
  };

  useEffect(() => {
    if (post) document.title = `${post.title} | sosyal-medya.net`;
  }, [post]);

  if (loading) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}>Loading...</div><SiteFooter /></>);
  if (notFound) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}><h1>404</h1><p>İçerik bulunamadı</p><Link href="/blog">← Blog</Link></div><SiteFooter /></>);

  return (
    <>
      <SiteHeader />
      <article className="blog-post">
        <div className="blog-post-head">
          <Link href="/blog" className="acc-detail-back">← Tüm İçerikler</Link>
          <span className="news-cat" style={{ marginBottom: '.6rem', display: 'inline-block' }}>
            <Link href={`/category/${post.category}`} style={{ color: 'var(--red)' }}>
              {post.type === 'blog' ? 'BLOG' : post.type === 'news' ? 'HABER' : 'GÖNDERİ'} · {post.category}
            </Link>
          </span>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="blog-post-excerpt">{post.excerpt}</p>}
          <div className="blog-post-author-row">
            <Link href={`/u/${post.authorUsername}`} className="blog-author-link">
              <div className="blog-author-av big">{(post.authorName || post.authorUsername || '').slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="blog-author-name">{post.authorName || post.authorUsername}</div>
                <div className="blog-author-meta">
                  @{post.authorUsername} · {formatDate(post.publishedAt, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
                  · 👁 {post.viewCount}
                </div>
              </div>
            </Link>
            {coAuthors.length > 0 && (
              <div className="co-authors">
                <span className="co-authors-label">Ortak yazarlar:</span>
                {coAuthors.map((ca: any) => (
                  <Link key={ca.id} href={`/u/${ca.username}`} className="co-author-chip">
                    <span className="co-author-av">{(ca.fullName || ca.username).slice(0, 2).toUpperCase()}</span>
                    <span>{ca.fullName || ca.username}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {post.coverImage && (
          <div className="blog-post-cover">
            <img src={fullUrl(post.coverImage)} alt={post.title} loading="lazy" decoding="async"/>
          </div>
        )}

        <PostEngagementBar slug={slug} />
        <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />

        {Array.isArray(post.media) && post.media.length > 0 && (
          <div className="blog-post-media">
            <h3>Medya</h3>
            <div className={`tweet-media-grid count-${Math.min(post.media.length, 4)}`}>
              {post.media.slice(0, 4).map((m: any, i: number) => (
                <div key={i} className="tweet-media-item">
                  {m.type === 'video'
                    ? <video src={fullUrl(m.url)} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={fullUrl(m.url)} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="blog-tags">
            {post.tags.map((tag: string) => <span key={tag} className="blog-tag">#{tag}</span>)}
          </div>
        )}

        <PostEngagementBar slug={slug} />
        <CommentsSection slug={slug} />
      </article>
      <SiteFooter />
    </>
  );
}
