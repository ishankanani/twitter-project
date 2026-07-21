'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Engagement } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PostEngagementBar({ slug }: { slug: string }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [eng, setEng] = useState<Engagement>({ likes: 0, comments: 0, hasLiked: false, hasBookmarked: false });
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setEng(await api.get(`/api/posts/${slug}/engagement`, token)); } catch {}
  }
  useEffect(() => { load(); }, [slug, token]);

  async function toggleLike() {
    if (!user) { router.push('/login?redirect=/blog/' + slug); return; }
    setBusy(true);
    try {
      const r = await api.post(`/api/posts/${slug}/like`, {}, token);
      setEng(prev => ({ ...prev, hasLiked: r.liked, likes: r.count }));
    } catch {}
    setBusy(false);
  }

  async function toggleBookmark() {
    if (!user) { router.push('/login?redirect=/blog/' + slug); return; }
    setBusy(true);
    try {
      const r = await api.post(`/api/posts/${slug}/bookmark`, {}, token);
      setEng(prev => ({ ...prev, hasBookmarked: r.bookmarked }));
    } catch {}
    setBusy(false);
  }

  function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      alert('Link kopyalandı!');
    }
  }

  return (
    <div className="engagement-bar">
      <button onClick={toggleLike} disabled={busy} className={`eng-btn ${eng.hasLiked ? 'active' : ''}`}>
        <span style={{ fontSize: '1.15rem' }}>{eng.hasLiked ? '❤️' : '🤍'}</span>
        <span>{eng.likes} Beğeni</span>
      </button>
      <button onClick={toggleBookmark} disabled={busy} className={`eng-btn ${eng.hasBookmarked ? 'active' : ''}`}>
        <span style={{ fontSize: '1.15rem' }}>{eng.hasBookmarked ? '🔖' : '📑'}</span>
        <span>Kaydet</span>
      </button>
      <button onClick={share} className="eng-btn">
        <span style={{ fontSize: '1.05rem' }}>🔗</span>
        <span>Paylaş</span>
      </button>
      <span className="eng-comments">💬 {eng.comments} yorum</span>
    </div>
  );
}
