'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, Activity } from '@/lib/api';
import { useLang, formatDate, Lang } from '@/lib/i18n';

const ICONS: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  bookmark: '🔖',
  post_approved: '✅',
  post_declined: '❌',
  view: '👁',
  default: '📌'
};

function getText(a: Activity, t: any): string {
  // Actor name = user-entered, never translated (kept verbatim)
  const who = a.actorName || a.actorUsername || '';
  // Post title = user content, never translated
  const title = a.postTitle ? `"${a.postTitle.slice(0, 40)}"` : '';
  switch (a.type) {
    case 'like': return `${who} ${title} — ${t.activity_liked}`;
    case 'comment': return `${who} ${title} — ${t.activity_commented}`;
    case 'post_approved': return `${title} — ${t.activity_post_approved}`;
    case 'post_declined': return `${title} — ${t.activity_post_declined}${a.data?.reason ? ' (' + a.data.reason + ')' : ''}`;
    default: return a.type;
  }
}

export default function ActivityPage() {
  const { token } = useAuth();
  const { t, lang } = useLang();
  const [list, setList] = useState<Activity[]>([]);

  useEffect(() => {
    if (token) api.get('/api/me/activity', token).then(setList).catch(() => {});
  }, [token]);

  return (
    <div>
      <h2 className="dash-h2">📡 {t.dash_activity}</h2>
      <p className="dash-sub">{t.dash_overview}</p>

      {list.length === 0 ? (
        <div className="dash-empty"><p>{t.dash_no_activity}</p></div>
      ) : (
        <div className="activity-list">
          {list.map(a => (
            <div key={a.id} className="activity-item">
              <span className="activity-icon">{ICONS[a.type] || ICONS.default}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="activity-text">{getText(a, t)}</div>
                <div className="activity-time">{formatDate(a.createdAt, lang as Lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              {a.postSlug && (
                <Link href={`/blog/${a.postSlug}`} className="btn-ghost" style={{ padding: '5px 12px', fontSize: '.78rem' }}>
                  {t.admin_view} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
