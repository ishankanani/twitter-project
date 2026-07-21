'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, Notification } from '@/lib/api';
import { useLang, formatDate, Lang } from '@/lib/i18n';

export default function NotificationsPage() {
  const { token } = useAuth();
  const { t, lang } = useLang();
  const [list, setList] = useState<Notification[]>([]);

  async function load() {
    if (!token) return;
    try { setList(await api.get('/api/notifications', token)); } catch {}
  }
  useEffect(() => { load(); }, [token]);

  async function markRead(id: number) { await api.put(`/api/notifications/${id}/read`, {}, token); load(); }
  async function markAll() { await api.put('/api/notifications/mark-all-read', {}, token); load(); }

  return (
    <div>
      <div className="dash-page-head">
        <div>
          <h2 className="dash-h2">🔔 {t.dash_notifications}</h2>
          <p className="dash-sub">{t.dash_overview}</p>
        </div>
        {list.some(n => !n.read) && (
          <button onClick={markAll} className="btn-ghost">{t.mark_all_read}</button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="dash-empty"><p>{t.dash_no_notifications}</p></div>
      ) : (
        <div className="notif-page-list">
          {list.map(n => (
            <Link key={n.id} href={n.link || '#'} onClick={() => !n.read && markRead(n.id)}
              className={`notif-page-item ${!n.read ? 'unread' : ''}`}>
              {!n.read && <span className="notif-page-dot" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Notification title/body = backend-generated content, kept as-is */}
                <div className="notif-page-title">{n.title}</div>
                {n.body && <div className="notif-page-body">{n.body}</div>}
                <div className="notif-page-time">{formatDate(n.createdAt, lang as Lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
