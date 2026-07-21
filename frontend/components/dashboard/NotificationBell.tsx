'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api, Notification } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

export default function NotificationBell() {
  const { token, user } = useAuth();
  const { t } = useLang();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function loadCount() {
    if (!token) return;
    try { const r = await api.get('/api/notifications/unread-count', token); setCount(r.count || 0); }
    catch {}
  }
  async function loadList() {
    if (!token) return;
    try { setItems(await api.get('/api/notifications', token)); } catch {}
  }

  useEffect(() => {
    if (!token) return;
    loadCount();
    const id = setInterval(loadCount, 30000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function markRead(id: number) {
    try { await api.put(`/api/notifications/${id}/read`, {}, token); loadList(); loadCount(); } catch {}
  }
  async function markAll() {
    try { await api.put('/api/notifications/mark-all-read', {}, token); loadList(); loadCount(); } catch {}
  }

  if (!user) return null;

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(!open)} aria-label="Bildirimler">
        🔔
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="notif-menu">
          <div className="notif-menu-head">
            <strong>{t.dash_notifications}</strong>
            {count > 0 && <button onClick={markAll} className="notif-mark-all">{t.mark_all_read}</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">{t.dash_no_notifications}</div>
            ) : items.slice(0, 12).map(n => (
              <Link
                key={n.id}
                href={n.link || '#'}
                onClick={() => markRead(n.id)}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
              >
                <div className="notif-item-title">{n.title}</div>
                {n.body && <div className="notif-item-body">{n.body}</div>}
                <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff/60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff/3600)} sa önce`;
  return `${Math.floor(diff/86400)} g önce`;
}
