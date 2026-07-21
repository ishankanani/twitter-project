'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, UserPost } from '@/lib/api';
import RichEditor from '@/components/admin/RichEditor';
import MediaUploader, { MediaItem } from '@/components/admin/MediaUploader';
import { useLang } from '@/lib/i18n';

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

export default function EditPostPage() {

  const { t } = useLang();  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [post, setPost] = useState<UserPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('gundem');
  const [tagsStr, setTagsStr] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [coverMedia, setCoverMedia] = useState<MediaItem[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get('/api/user-posts/mine', token).then((list: UserPost[]) => {
      const p = list.find(x => String(x.id) === String(id));
      if (p) {
        setPost(p);
        setTitle(p.title); setContent(p.content); setExcerpt(p.excerpt);
        setCategory(p.category); setTagsStr((p.tags || []).join(', '));
        setMedia((p.media || []) as MediaItem[]);
        if (p.coverImage) setCoverMedia([{ type: 'photo', url: p.coverImage }]);
        if ((p as any).scheduledAt) setScheduledAt(new Date((p as any).scheduledAt).toISOString().slice(0, 16));
      }
    }).catch(() => {});
  }, [token, id]);

  async function save() {
    setErr('');
    if (!title.trim()) return setErr('Başlık zorunlu');
    if (!stripHtml(content)) return setErr('İçerik zorunlu');
    setBusy(true);
    try {
      const finalCover = coverMedia[0]?.url || '';
      await api.put(`/api/user-posts/${id}`, {
        title, content, excerpt, coverImage: finalCover, media,
        category, tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
      }, token);
      router.push('/dashboard/posts');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  if (!post) return <p style={{ color: 'var(--muted)' }}>{t.loading}</p>;

  return (
    <div>
      <h2 className="dash-h2">İçeriği Düzenle</h2>
      {post.status === 'declined' && (
        <div className="dash-decline-box" style={{ marginBottom: '1rem' }}>
          <strong>❌ Bu içerik reddedildi:</strong>
          <p>{post.declineReason}</p>
          <small>Değişiklik yaptığınızda otomatik olarak tekrar incelemeye gönderilecek.</small>
        </div>
      )}

      <div className="dash-card">
        <div className="form-grid">
          <div className="form-field">
            <label>Başlık</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={500} />
          </div>
          <div className="form-field">
            <label>İçerik</label>
            <RichEditor value={content} onChange={setContent} />
          </div>
          <div className="form-field">
            <label>Özet</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="gundem">Gündem</option>
                <option value="spor">Spor</option>
                <option value="ekonomi">Ekonomi</option>
                <option value="teknoloji">Teknoloji</option>
                <option value="kultur">Kültür-Sanat</option>
                <option value="dunya">Dünya</option>
                <option value="eglence">Eğlence</option>
              </select>
            </div>
            <div className="form-field">
              <label>Etiketler</label>
              <input value={tagsStr} onChange={e => setTagsStr(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label>Kapak Resmi</label>
            <MediaUploader media={coverMedia} onChange={setCoverMedia} token={token} maxFiles={1} />
          </div>
          <div className="form-field">
            <label>Medya</label>
            <MediaUploader media={media} onChange={setMedia} token={token} maxFiles={4} />
          </div>
          <div className="form-field">
            <label>⏰ Zamanlama (opsiyonel)</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              Boş bırakırsanız onay sonrası anında yayınlanır.
            </small>
          </div>
          {err && <div className="form-error">{err}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={save} disabled={busy} className="btn-primary">
              {busy ? 'Kaydediliyor...' : '💾 Kaydet ve Tekrar Gönder'}
            </button>
            <button onClick={() => router.back()} className="btn-ghost">{t.admin_cancel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
