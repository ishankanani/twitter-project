'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!username) return;
    document.title = `@${username} | sosyal-medya.net`;
    api.get(`/api/users/${username}/profile`).then(p => {
      setProfile(p);
      return api.get(`/api/users/${username}/posts`);
    }).then(r => setPosts(Array.isArray(r) ? r : r.posts || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  const fullUrl = (u: string) => u && !u.startsWith('http') ? `${API}${u}` : u || '';

  if (loading) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}>Loading...</div><SiteFooter /></>);
  if (!profile) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}><h1>404</h1><p>Kullanıcı bulunamadı</p></div><SiteFooter /></>);

  return (
    <>
      <SiteHeader />
      <section className="wrap" style={{ paddingTop: '2rem' }}>
        <div className="acc-detail-card">
          <div className="acc-detail-av">{(profile.fullName || username).slice(0, 2).toUpperCase()}</div>
          <h1 className="acc-detail-name">{profile.fullName || username}</h1>
          <p className="acc-detail-handle">@{username}</p>
          {profile.bio && <p className="acc-detail-bio">{profile.bio}</p>}
        </div>
        <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.3rem' }}>{t.posts_label}</h2>
        {posts.length === 0 ? <p style={{ color: 'var(--muted)' }}>Henüz gönderi yok.</p> : (
          <div className="news-grid">
            {posts.map((p: any) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="news-card">
                {p.coverImage && <img src={fullUrl(p.coverImage)} alt="" className="news-card-img" loading="lazy" decoding="async" />}
                <div className="news-card-body">
                  <h3 className="news-card-title">{p.title}</h3>
                  <div className="news-card-foot">{formatDate(p.publishedAt, lang, { day: 'numeric', month: 'short' })}</div>
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
