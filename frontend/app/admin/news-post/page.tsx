'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { api } from '@/lib/api';
import RichEditor from '@/components/admin/RichEditor';
import MediaUploader, { MediaItem } from '@/components/admin/MediaUploader';
import { useLang } from '@/lib/i18n';
import { Newspaper, Rocket, ExternalLink, PenSquare } from 'lucide-react';

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

export default function NewsPostPage() {
  const { token, user } = useAdminAuth();
  const { t } = useLang();
  const [type, setType] = useState<'news' | 'blog'>('news');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('gundem');
  const [tagsStr, setTagsStr] = useState('');
  const [coverMedia, setCoverMedia] = useState<MediaItem[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [published, setPublished] = useState<{ slug: string; scheduled: boolean } | null>(null);

  const CATEGORIES = [
    { id: 'gundem', label: t.cat_gundem },
    { id: 'spor', label: t.cat_spor },
    { id: 'ekonomi', label: t.cat_ekonomi },
    { id: 'teknoloji', label: t.cat_teknoloji },
    { id: 'kultur', label: t.cat_kultur },
    { id: 'dunya', label: t.cat_dunya },
    { id: 'yasam', label: t.cat_yasam }
  ];

  // Role guard — creators shouldn't see this page (sidebar hides it, but guard anyway)
  if (user && user.role !== 'superadmin' && user.role !== 'publisher') {
    return (
      <div className="dash-empty">
        <p>{t.err_UNAUTHORIZED}</p>
      </div>
    );
  }

  async function publish() {
    setErr('');
    if (!title.trim()) return setErr(t.err_TITLE_CONTENT_REQUIRED);
    if (!stripHtml(content)) return setErr(t.err_TITLE_CONTENT_REQUIRED);
    setBusy(true);
    try {
      const r = await api.post('/api/admin/publish-post', {
        type, title, content, excerpt,
        coverImage: coverMedia[0]?.url || '',
        media,
        category,
        tags: tagsStr.split(',').map(x => x.trim()).filter(Boolean),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
      }, token);
      setPublished({ slug: r.slug, scheduled: !r.publishedAt });
    } catch (e: any) {
      // Translate error code if backend provided one
      setErr(e.code && (t as any)[`err_${e.code}`] ? (t as any)[`err_${e.code}`] : e.message);
    }
    setBusy(false);
  }

  function resetForm() {
    setTitle(''); setContent(''); setExcerpt(''); setTagsStr('');
    setCoverMedia([]); setMedia([]); setScheduledAt(''); setPublished(null); setErr('');
  }

  if (published) {
    return (
      <div>
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(40,167,69,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem' }}>
            <Rocket size={26} color="#28a745" strokeWidth={1.8} />
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', marginBottom: '.5rem' }}>
            {published.scheduled ? t.published_scheduled : t.published_success}
          </h2>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: '1.6rem', flexWrap: 'wrap' }}>
            {!published.scheduled && (
              <Link href={`/blog/${published.slug}`} target="_blank" className="admin-btn">
                <ExternalLink size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.view_on_site}
              </Link>
            )}
            <button onClick={resetForm} className="admin-btn admin-btn-ghost">
              <PenSquare size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.write_another}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Newspaper size={22} strokeWidth={1.8} />{t.news_post_title}
      </h1>
      <p className="admin-sub">{t.news_post_sub}</p>

      <div className="admin-card">
        <div className="form-grid">
          <div className="form-field">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { id: 'news', label: t.news_title },
                { id: 'blog', label: t.blog_title }
              ] as const).map(opt => (
                <button key={opt.id} type="button"
                  onClick={() => setType(opt.id)}
                  className={`type-pick ${type === opt.id ? 'on' : ''}`}>
                  <strong>{opt.label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>{t.dash_post_title} *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={500} autoFocus />
          </div>

          <div className="form-field">
            <label>{t.dash_post_content} *</label>
            <RichEditor value={content} onChange={setContent} placeholder="" />
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
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              {t.dash_post_schedule_hint}
            </small>
          </div>

          {err && <div className="form-error">{err}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '.6rem' }}>
            <button onClick={publish} disabled={busy} className="btn-primary">
              {busy ? t.publishing : t.publish_now}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
