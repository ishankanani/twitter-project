'use client';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast } from '@/components/admin/AdminUI';
import { api, UserPost } from '@/lib/api';
import CoAuthorSelector from '@/components/admin/CoAuthorSelector';
import { useLang } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PostsReviewPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<UserPost[]>([]);
  const [filter, setFilter] = useState('pending');
  const [viewing, setViewing] = useState<UserPost | null>(null);
  const [declining, setDeclining] = useState<UserPost | null>(null);
  const [coAuthoring, setCoAuthoring] = useState<UserPost | null>(null);
  const [reason, setReason] = useState('');
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    try {
      const url = filter === 'all' ? '/api/posts-review' : `/api/posts-review?status=${filter}`;
      setList(await api.get(url, token));
    } catch (e: any) { show(e.message, 'err'); }
  }

  useEffect(() => { load(); }, [token, filter]);

  async function approve(p: UserPost) {
    try { await api.post(`/api/posts-review/${p.id}/approve`, {}, token); show(`"${p.title}" onaylandı`); load(); setViewing(null); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function decline() {
    if (!declining) return;
    try {
      await api.post(`/api/posts-review/${declining.id}/decline`, { reason }, token);
      show('İçerik reddedildi');
      setDeclining(null); setReason(''); setViewing(null); load();
    } catch (e: any) { show(e.message, 'err'); }
  }

  return (
    <div>
      <h1 className="admin-h1">İçerik İnceleme</h1>
      <p className="admin-sub">Üreticilerden gelen içerikleri onaylayın veya reddedin</p>

      <div className="dash-filters">
        {[
          { id: 'pending', label: 'Bekleyen' },
          { id: 'approved', label: 'Onaylı' },
          { id: 'declined', label: 'Reddedildi' },
          { id: 'all', label: 'Tümü' }
        ].map(f => (
          <button key={f.id} className={`dash-filter ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="dash-empty"><p>Bu filtreye uyan içerik yok</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {list.map(p => (
            <div key={p.id} className="review-card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div className="review-author-av">{(p.authorName || p.authorUsername || '').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{p.authorName || p.authorUsername}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>@{p.authorUsername} · {new Date(p.createdAt).toLocaleString('tr-TR')}</div>
                </div>
                <span className={`admin-tag ${p.status === 'pending' ? 'red' : p.status === 'approved' ? 'green' : 'gray'}`}>{p.status}</span>
              </div>
              <h3 className="review-title">{p.title}</h3>
              {p.excerpt && <p className="review-excerpt">{p.excerpt}</p>}
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
                <span className="admin-tag gray">{p.type}</span>
                <span className="admin-tag gray">{p.category}</span>
                {(p.tags || []).slice(0, 4).map(t => <span key={t} className="admin-tag gray">#{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="admin-btn admin-btn-ghost" onClick={() => setViewing(p)}>👁 Görüntüle</button>
                <button className="admin-btn admin-btn-ghost" onClick={() => setCoAuthoring(p)}>👥 Ortak Yazar</button>
                {p.status === 'pending' && (
                  <>
                    <button className="admin-btn" onClick={() => approve(p)} style={{ background: '#28a745' }}>✓ Onayla</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => setDeclining(p)}>✕ Reddet</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <Modal open={true} onClose={() => setViewing(null)} title={viewing.title}>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.8rem' }}>
            {viewing.authorName} · @{viewing.authorUsername} · {viewing.category}
          </div>
          {viewing.coverImage && (
            <img src={viewing.coverImage.startsWith('http') ? viewing.coverImage : `${API_URL}${viewing.coverImage}`} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: '1rem' }} loading="lazy" decoding="async"/>
          )}
          <div dangerouslySetInnerHTML={{ __html: viewing.content }} style={{ fontSize: '.92rem', lineHeight: 1.6 }} />
          {viewing.status === 'pending' && (
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-danger" onClick={() => { setDeclining(viewing); }}>{t.admin_decline}</button>
              <button className="admin-btn" onClick={() => approve(viewing)} style={{ background: '#28a745' }}>{t.admin_approve}</button>
            </div>
          )}
        </Modal>
      )}

      {coAuthoring && (
        <Modal open={true} onClose={() => setCoAuthoring(null)} title={`Ortak Yazarlar — ${coAuthoring.title.slice(0, 40)}`}>
          <CoAuthorSelector
            token={token}
            postId={coAuthoring.id}
            primaryAuthorId={(coAuthoring as any).authorId || 0}
            onClose={() => setCoAuthoring(null)}
          />
        </Modal>
      )}

      {declining && (
        <Modal open={true} onClose={() => setDeclining(null)} title="Red Sebebi">
          <p style={{ fontSize: '.88rem', color: 'var(--mid)', marginBottom: '1rem' }}>Üretici bu açıklamayı görüntüleyebilecek.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} required style={{ width: '100%', padding: '.8rem', border: '1px solid var(--border-soft)', borderRadius: 8 }} placeholder="Örn: Görsel kalitesi düşük, bağlantılar eksik..." />
          <div className="admin-modal-actions">
            <button className="admin-btn admin-btn-ghost" onClick={() => setDeclining(null)}>{t.admin_cancel}</button>
            <button className="admin-btn admin-btn-danger" onClick={decline} disabled={!reason.trim()}>Reddet & Bildir</button>
          </div>
        </Modal>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
