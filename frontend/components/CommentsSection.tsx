'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Comment } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CommentsSection({ slug }: { slug: string }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setComments(await api.get(`/api/posts/${slug}/comments`)); } catch {}
  }
  useEffect(() => { load(); }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 2) return;
    setBusy(true); setMsg('');
    try {
      const r = await api.post(`/api/posts/${slug}/comments`, {
        content, parentId: replyTo,
        guestName: user ? undefined : guestName,
        guestEmail: user ? undefined : guestEmail,
        website
      }, token);
      setMsg(r.pending ? 'Yorumunuz inceleme için gönderildi.' : 'Yorumunuz yayınlandı.');
      setContent(''); setReplyTo(null);
      if (!r.pending) load();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  async function deleteComment(id: number) {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;
    try { await api.del(`/api/comments/${id}`, token); load(); } catch {}
  }

  // Build tree (parents + children)
  const tree = comments.filter(c => !c.parentId);
  const repliesOf = (id: number) => comments.filter(c => c.parentId === id);

  return (
    <section className="comments-section">
      <h2 className="comments-heading">💬 Yorumlar ({comments.length})</h2>

      <form onSubmit={submit} className="comment-form">
        {!user && (
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-field">
              <label>Adınız *</label>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} required={!user} maxLength={100} />
            </div>
            <div className="form-field">
              <label>E-posta (opsiyonel, görüntülenmez)</label>
              <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
            </div>
          </div>
        )}
        <div className="form-field">
          <label>{replyTo ? 'Cevap yaz' : 'Yorum yaz'}</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={user ? `${user.fullName || user.username} olarak yorum yapıyorsunuz...` : 'Düşüncelerinizi yazın...'}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--muted)', marginTop: 4 }}>
            <span>{content.length}/2000</span>
            {!user && <Link href="/login" style={{ color: 'var(--red)' }}>Hesabınızla yorum yapın →</Link>}
          </div>
        </div>
        {/* Honeypot */}
        <input type="text" value={website} onChange={e => setWebsite(e.target.value)} autoComplete="off" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true" />
        {msg && <div className={msg.includes('inceleme') || msg.includes('yayınlandı') ? 'form-success' : 'form-error'}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn-primary" disabled={busy || content.trim().length < 2}>
            {busy ? 'Gönderiliyor...' : (replyTo ? 'Cevabı Gönder' : 'Yorum Gönder')}
          </button>
          {replyTo && <button type="button" className="btn-ghost" onClick={() => setReplyTo(null)}>İptal</button>}
        </div>
      </form>

      <div className="comment-list">
        {tree.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>İlk yorumu sen yap!</p>
        ) : tree.map(c => (
          <div key={c.id} className="comment-item">
            <CommentBody c={c} canDelete={!!user && (c.userId === user?.id || user?.role === 'superadmin')} onReply={() => setReplyTo(c.id)} onDelete={() => deleteComment(c.id)} />
            {repliesOf(c.id).length > 0 && (
              <div className="comment-replies">
                {repliesOf(c.id).map(r => (
                  <div key={r.id} className="comment-item reply">
                    <CommentBody c={r} canDelete={!!user && (r.userId === user?.id || user?.role === 'superadmin')} onDelete={() => deleteComment(r.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentBody({ c, canDelete, onReply, onDelete }: { c: Comment; canDelete: boolean; onReply?: () => void; onDelete: () => void }) {
  const displayName = c.fullName || c.username || c.guestName || 'Anonim';
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div className="comment-avatar">{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="comment-head">
          <strong>
            {c.username ? <Link href={`/u/${c.username}`} className="comment-user-link">{displayName}</Link> : displayName}
          </strong>
          <span className="comment-date">{timeAgo(c.createdAt)}</span>
        </div>
        <div className="comment-content">{c.content}</div>
        <div className="comment-actions">
          {onReply && <button onClick={onReply}>↩ Cevapla</button>}
          {canDelete && <button onClick={onDelete} style={{ color: 'var(--red)' }}>Sil</button>}
        </div>
      </div>
    </div>
  );
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff/60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff/3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff/86400)} gün önce`;
  return new Date(d).toLocaleDateString('tr-TR');
}
