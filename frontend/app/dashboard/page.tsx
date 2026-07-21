'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, UserPost } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';
import { SkeletonList } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardHome() {
  const { token, user } = useAuth();
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get('/api/user-posts/mine', token)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const stats = {
    total: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    approved: posts.filter(p => p.status === 'approved').length,
    declined: posts.filter(p => p.status === 'declined').length,
    draft: posts.filter(p => p.status === 'draft').length,
    views: posts.reduce((s, p) => s + (p.viewCount || 0), 0)
  };

  const recent = posts.slice(0, 5);

  return (
    <div>
      {/* Username/full name = personal data, never translated */}
      <h2 className="dash-h2">{t.dash_welcome}, {user?.fullName || user?.username}! 👋</h2>
      <p className="dash-sub">{t.dash_overview}</p>

      <div className="dash-stats">
        <Stat label={t.dash_stat_posts} num={stats.total} color="var(--text)" />
        <Stat label={t.dash_post_status_approved} num={stats.approved} color="#28a745" />
        <Stat label={t.dash_post_status_pending} num={stats.pending} color="#ffc107" />
        <Stat label={t.dash_post_status_declined} num={stats.declined} color="var(--red)" />
        <Stat label={t.dash_post_status_draft} num={stats.draft} color="var(--muted)" />
        <Stat label={t.dash_stat_views} num={stats.views} color="var(--red)" />
      </div>

      <div className="dash-card">
        <div className="dash-card-head">
          <h3>{t.dash_my_posts}</h3>
          <Link href="/dashboard/posts" className="dash-link">{t.view_all} →</Link>
        </div>
        {loading ? (
          <SkeletonList rows={4} />
        ) : recent.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ marginBottom: '1rem' }}>{t.dash_no_posts}</p>
            <Link href="/dashboard/posts/new" className="btn-primary">✏️ {t.dash_create_first}</Link>
          </div>
        ) : (
          <div className="dash-post-list">
            {recent.map(p => (
              <Link href={`/dashboard/posts`} key={p.id} className="dash-post-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Post title is user-entered content, never translated */}
                  <div className="dash-post-title">{p.title}</div>
                  <div className="dash-post-meta">
                    {formatDate(p.createdAt, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{p.viewCount} {t.admin_total_views.toLowerCase()}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, num, color }: { label: string; num: number; color: string }) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-num" style={{ color }}>{num}</div>
      <div className="dash-stat-label">{label}</div>
    </div>
  );
}



