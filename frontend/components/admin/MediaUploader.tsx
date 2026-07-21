'use client';
import { useState, useRef } from 'react';
import { useLang } from '@/lib/i18n';

export interface MediaItem {
  type: 'photo' | 'video' | 'file';
  url: string;
  name?: string;
  size?: number;
  mime?: string;
}

interface Props {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  token: string;
  maxFiles?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MediaUploader({ media, onChange, token, maxFiles = 4 }: Props) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    if (!files.length) return;
    if (media.length + files.length > maxFiles) {
      setError(`En fazla ${maxFiles} dosya yükleyebilirsiniz.`);
      return;
    }
    setUploading(true); setError('');

    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: fd,
        headers: { 'x-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.upload_failed);
      // Convert relative URLs to absolute for preview
      const newMedia: MediaItem[] = data.files.map((f: any) => ({ ...f, url: f.url }));
      onChange([...media, ...newMedia]);
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function remove(i: number) {
    onChange(media.filter((_, idx) => idx !== i));
  }

  function getFullUrl(url: string) {
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${drag ? 'var(--red)' : 'var(--border)'}`,
          background: drag ? 'var(--red-soft)' : '#fafaf9',
          borderRadius: 10, padding: '20px 16px', textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all .2s'
        }}
      >
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={onPick} style={{ display: 'none' }} />
        {uploading ? (
          <p style={{ color: 'var(--mid)', fontSize: '.9rem' }}>⏳ {t.loading}</p>
        ) : (
          <>
            <p style={{ fontSize: '1.1rem', marginBottom: 4 }}>📎</p>
            <p style={{ color: 'var(--mid)', fontSize: '.9rem', marginBottom: 4 }}>
              {t.upload_dropzone}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem' }}>
              {t.upload_limits.replace('{n}', String(maxFiles))}
            </p>
          </>
        )}
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: '.82rem', marginTop: 8 }}>{error}</p>}

      {media.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
          {media.map((m, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1' }}>
              {m.type === 'photo' ? (
                <img src={getFullUrl(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async"/>
              ) : m.type === 'video' ? (
                <video src={getFullUrl(m.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '.78rem', color: 'var(--muted)' }}>
                  📄 {m.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(0,0,0,.7)', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1
                }}
                title={t.admin_delete}
              >
                ×
              </button>
              {m.type === 'video' && (
                <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,.7)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                  ▶ VIDEO
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
