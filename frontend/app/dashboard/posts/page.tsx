'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, UserPost } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { useLang, formatDate } from '@/lib/i18n';

export default function MyPostsPage() {
  const { token } = useAuth();
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    if (!token) return;
    try { setPosts(await api.get('/api/user-posts/mine', token)); } catch {}
  }

  useEffect(() => { load(); }, [token]);

  async function del(id: number) {
    if (!confirm(t.admin_delete_confirm)) return;
    setBusy(id);
    try { await api.del(`/api/user-posts/${id}`, token); await load(); } catch {}
    setBusy(null);
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  const filters = [
    { id: 'all', label: t.cat_all },
    { id: 'pending', label: t.dash_post_status_pending },
    { id: 'approved', label: t.dash_post_status_approved },
    { id: 'declined', label: t.dash_post_status_declined },
    { id: 'draft', label: t.dash_post_status_draft }
  ];

  return (
    <div>
      <div className="dash-page-head">
        <div>
          <h2 className="dash-h2">{t.dash_my_posts}</h2>
          <p className="dash-sub">{t.dash_overview}</p>
        </div>
        <Link href="/dashboard/posts/new" className="btn-primary">✏️ {t.dash_new_post}</Link>
      </div>

      <div className="dash-filters">
        {filters.map(f => (
          <button key={f.id} className={`dash-filter ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} ({f.id === 'all' ? posts.length : posts.filter(p => p.status === f.id).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty">
          <p>{t.dash_no_posts}</p>
          <Link href="/dashboard/posts/new" className="btn-primary">{t.dash_create_first}</Link>
        </div>
      ) : (
        <div className="dash-posts-grid">
          {filtered.map(p => (
            <div key={p.id} className="dash-post-card">
              <div className="dash-post-card-head">
                <span className="dash-post-type">
                  {p.type === 'blog' ? `📰 ${t.blog_title.toUpperCase()}` : p.type === 'news' ? `🗞️ ${t.news_title.toUpperCase()}` : `📝 ${t.posts_label.toUpperCase()}`}
                </span>
                <StatusBadge status={p.status} />
              </div>
              {/* Title + excerpt = user content, never translated */}
              <h3 className="dash-post-card-title">{p.title}</h3>
              {p.excerpt && <p className="dash-post-card-excerpt">{p.excerpt}</p>}
              <div className="dash-post-card-meta">
                <span>{formatDate(p.createdAt, lang)}</span>
                <span>👁 {p.viewCount}</span>
                <span>📂 {p.category}</span>
              </div>

              {p.status === 'declined' && p.declineReason && (
                <div className="dash-decline-box">
                  <strong>❌ {t.admin_decline_reason}:</strong>
                  <p>{p.declineReason}</p>
                </div>
              )}

              <div className="dash-post-card-actions">
                {(p.status === 'draft' || p.status === 'declined' || p.status === 'pending') && (
                  <Link href={`/dashboard/posts/${p.id}/edit`} className="btn-ghost" style={{ padding: '6px 14px', fontSize: '.82rem' }}>
                    ✏️ {t.admin_edit}
                  </Link>
                )}
                {p.status === 'approved' && (
                  <Link href={`/blog/${p.slug}`} target="_blank" className="btn-ghost" style={{ padding: '6px 14px', fontSize: '.82rem' }}>
                    🔗 {t.admin_view}
                  </Link>
                )}
                <button onClick={() => del(p.id)} disabled={busy === p.id} className="btn-danger-ghost">
                  🗑 {t.admin_delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
