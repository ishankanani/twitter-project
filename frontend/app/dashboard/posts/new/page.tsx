'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import RichEditor from '@/components/admin/RichEditor';
import MediaUploader, { MediaItem } from '@/components/admin/MediaUploader';
import { useLang } from '@/lib/i18n';

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

export default function NewPostPage() {
  const { token } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [type, setType] = useState<'post' | 'blog' | 'news'>('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('gundem');
  const [tagsStr, setTagsStr] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [coverMedia, setCoverMedia] = useState<MediaItem[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const CATEGORIES = [
    { id: 'gundem', label: '🌍 ' + t.cat_gundem },
    { id: 'spor', label: '⚽ ' + t.cat_spor },
    { id: 'ekonomi', label: '💰 ' + t.cat_ekonomi },
    { id: 'teknoloji', label: '💻 ' + t.cat_teknoloji },
    { id: 'kultur', label: '🎭 ' + t.cat_kultur },
    { id: 'dunya', label: '🌐 ' + t.cat_dunya },
    { id: 'eglence', label: '🎉 ' + t.cat_yasam }
  ];

  async function submit(status: 'pending' | 'draft') {
    setErr('');
    if (!title.trim()) return setErr(t.dash_post_title + ' ' + t.admin_required);
    if (!stripHtml(content)) return setErr(t.dash_post_content + ' ' + t.admin_required);
    setBusy(true);
    try {
      const finalCover = coverMedia[0]?.url || coverImage;
      await api.post('/api/user-posts', {
        type, title, content, excerpt,
        coverImage: finalCover,
        media,
        category,
        tags: tagsStr.split(',').map(x => x.trim()).filter(Boolean),
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
      }, token);
      router.push('/dashboard/posts');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <h2 className="dash-h2">✏️ {t.dash_new_post}</h2>
      <p className="dash-sub">{t.dash_post_schedule_hint}</p>

      <div className="dash-card">
        <div className="form-grid">
          <div className="form-field">
            <label>{t.title}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'post', label: '📝 ' + t.posts_label },
                { id: 'blog', label: '📰 ' + t.blog_title },
                { id: 'news', label: '🗞️ ' + t.news_title }
              ].map(opt => (
                <button key={opt.id} type="button"
                  onClick={() => setType(opt.id as any)}
                  className={`type-pick ${type === opt.id ? 'on' : ''}`}>
                  <strong>{opt.label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>{t.dash_post_title} *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={500} />
          </div>

          <div className="form-field">
            <label>{t.dash_post_content} *</label>
            <RichEditor value={content} onChange={setContent} placeholder="" />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              {stripHtml(content).length}
            </small>
          </div>

          <div className="form-field">
            <label>{t.dash_post_excerpt} ({t.admin_optional})</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} maxLength={500} rows={3} />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>{t.dash_post_category} *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>{t.dash_post_tags}</label>
              <input value={tagsStr} onChange={e => setTagsStr(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>{t.dash_post_cover}</label>
            <MediaUploader media={coverMedia} onChange={setCoverMedia} token={token} maxFiles={1} />
          </div>

          <div className="form-field">
            <label>{t.dash_post_media}</label>
            <MediaUploader media={media} onChange={setMedia} token={token} maxFiles={4} />
          </div>

          <div className="form-field">
            <label>{t.dash_post_schedule}</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              {t.dash_post_schedule_hint}
            </small>
          </div>

          {err && <div className="form-error">{err}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '1rem' }}>
            <button onClick={() => submit('pending')} disabled={busy} className="btn-primary">
              {busy ? t.saving : t.dash_post_submit}
            </button>
            <button onClick={() => submit('draft')} disabled={busy} className="btn-ghost">
              💾 {t.dash_post_save_draft}
            </button>
            <button onClick={() => router.back()} disabled={busy} className="btn-danger-ghost">
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
