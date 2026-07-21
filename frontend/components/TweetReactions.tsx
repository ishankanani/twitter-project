'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Beğen' },
  { id: 'love', emoji: '❤️', label: 'Sev' },
  { id: 'laugh', emoji: '😂', label: 'Gül' },
  { id: 'wow', emoji: '😮', label: 'Vay' },
  { id: 'sad', emoji: '😢', label: 'Üzül' },
  { id: 'angry', emoji: '😡', label: 'Kız' }
];

export default function TweetReactions({ tweetId }: { tweetId: number }) {
  const { token } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api.get(`/api/tweets/${tweetId}/reactions`, token);
      setCounts(r.counts || {});
      setActive(r.userReactions || []);
    } catch {}
  }
  useEffect(() => { load(); }, [tweetId, token]);

  async function react(reaction: string) {
    setBusy(true);
    try {
      const res = await api.post(`/api/tweets/${tweetId}/react`, { reaction }, token);
      setCounts(res.counts || {});
      setActive(prev => res.active ? (prev.includes(reaction) ? prev : [...prev, reaction]) : prev.filter(x => x !== reaction));
    } catch {}
    setBusy(false);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Compact view — clickable icons only
    return (
      <div className="tweet-reactions compact">
        {REACTIONS.map(r => (
          <button
            key={r.id}
            onClick={() => react(r.id)}
            disabled={busy}
            className={`react-btn ${active.includes(r.id) ? 'on' : ''}`}
            title={r.label}
          >
            <span>{r.emoji}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="tweet-reactions">
      {REACTIONS.map(r => {
        const count = counts[r.id] || 0;
        if (count === 0 && !active.includes(r.id)) {
          return (
            <button key={r.id} onClick={() => react(r.id)} disabled={busy}
              className={`react-btn ${active.includes(r.id) ? 'on' : ''}`} title={r.label}>
              <span>{r.emoji}</span>
            </button>
          );
        }
        return (
          <button key={r.id} onClick={() => react(r.id)} disabled={busy}
            className={`react-btn pill ${active.includes(r.id) ? 'on' : ''}`} title={r.label}>
            <span>{r.emoji}</span>
            <span style={{ fontSize: '.78rem', fontWeight: 600 }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
