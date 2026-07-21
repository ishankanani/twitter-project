'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { api } from '@/lib/api';
import { Toast, useToast } from '@/components/admin/AdminUI';
import { useLang, formatDate } from '@/lib/i18n';

export default function CommentsModerationPage() {
  const { token } = useAdminAuth();
  const { t, lang } = useLang();
  const [list, setList] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    try { setList(await api.get(`/api/comments?status=${status}`, token)); } catch (e: any) { show(e.message, 'err'); }
  }

  useEffect(() => { load(); }, [token, status]);

  async function approve(id: number) {
    try { await api.post(`/api/comments/${id}/approve`, {}, token); show(t.comment_approved); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function markSpam(id: number) {
    try { await api.post(`/api/comments/${id}/spam`, {}, token); show(t.comment_spam_marked); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    if (!confirm(t.comment_delete_confirm)) return;
    try { await api.del(`/api/comments/${id}`, token); show(t.admin_deleted); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  const filters = [
    { id: 'pending', label: t.admin_pending },
    { id: 'approved', label: t.admin_approved },
    { id: 'spam', label: t.spam_status }
  ];

  return (
    <div>
      <h1 className="admin-h1">{t.comments_title}</h1>
      <p className="admin-sub">{t.comments_sub}</p>

      <div className="dash-filters">
        {filters.map(f => (
          <button key={f.id} className={`dash-filter ${status === f.id ? 'on' : ''}`} onClick={() => setStatus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="dash-empty"><p>{t.admin_no_data}</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {list.map((c: any) => (
            <div key={c.id} className="review-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.6rem', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  {/* username/guestName = user-entered, never translated */}
                  <strong>{c.username ? '@' + c.username : c.guestName + ' (Guest)'}</strong>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)', marginLeft: 8 }}>{formatDate(c.createdAt, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className={`admin-tag ${c.status === 'pending' ? 'red' : c.status === 'approved' ? 'green' : 'gray'}`}>{c.status}</span>
              </div>
              {/* Comment content = user-entered, never translated */}
              <p style={{ background: 'var(--light)', padding: '12px 14px', borderRadius: 10, fontSize: '.92rem', marginBottom: '.8rem' }}>{c.content}</p>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.8rem' }}>
                {t.comment_post}: <Link href={`/blog/${c.postSlug}`} target="_blank" style={{ color: 'var(--red)' }}>{c.postTitle}</Link>
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {c.status !== 'approved' && <button className="admin-btn" onClick={() => approve(c.id)} style={{ background: '#28a745' }}>✓ {t.mark_approve}</button>}
                {c.status !== 'spam' && <button className="admin-btn admin-btn-ghost" onClick={() => markSpam(c.id)}>🚫 {t.mark_spam}</button>}
                <button className="admin-btn admin-btn-danger" onClick={() => del(c.id)}>🗑 {t.admin_delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
