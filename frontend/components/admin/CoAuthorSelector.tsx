'use client';
import { useEffect, useState } from 'react';
import { api, User } from '@/lib/api';

export default function CoAuthorSelector({
  token, postId, primaryAuthorId, onClose
}: {
  token: string;
  postId: number;
  primaryAuthorId: number;
  onClose: () => void;
}) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadUsers() {
    try { setAllUsers(await api.get('/api/users', token)); } catch {}
  }
  async function loadCurrent() {
    try {
      const cas = await api.get(`/api/posts-review/${postId}/co-authors`, token);
      setSelected(cas.map((c: any) => c.id));
    } catch {}
  }

  useEffect(() => { loadUsers(); loadCurrent(); }, [postId, token]);

  function toggle(id: number) {
    if (id === primaryAuthorId) return; // can't co-author with self
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function save() {
    setBusy(true); setMsg('');
    try {
      await api.put(`/api/posts-review/${postId}/co-authors`, { userIds: selected }, token);
      setMsg('Ortak yazarlar kaydedildi.');
      setTimeout(onClose, 800);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const visible = allUsers
    .filter(u => u.id !== primaryAuthorId && u.active)
    .filter(u => !filter || u.username.toLowerCase().includes(filter.toLowerCase()) ||
                            (u.fullName || '').toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <p style={{ fontSize: '.86rem', color: 'var(--mid)', marginBottom: '1rem' }}>
        Bu içeriğe ek yazarlar ekleyin. Ana yazar her zaman korunur; seçilen kullanıcılar yazar listesine eklenir.
      </p>

      <div className="form-field">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Kullanıcı ara..." autoFocus />
      </div>

      {selected.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <strong style={{ fontSize: '.85rem' }}>Seçili ortak yazarlar ({selected.length}):</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {selected.map(id => {
              const u = allUsers.find(x => x.id === id);
              if (!u) return null;
              return (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 100, fontSize: '.8rem' }}>
                  @{u.username}
                  <button onClick={() => toggle(id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 10 }}>
        {visible.length === 0 ? (
          <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>Kullanıcı bulunamadı</p>
        ) : visible.map(u => (
          <label key={u.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700 }}>
              {(u.fullName || u.username).slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{u.fullName || u.username}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>@{u.username} · {u.role}</div>
            </div>
          </label>
        ))}
      </div>

      {msg && <div style={{ marginTop: 10, padding: '8px 12px', background: msg.includes('kaydedildi') ? 'rgba(40,167,69,.08)' : 'rgba(209,0,9,.08)', color: msg.includes('kaydedildi') ? '#28a745' : 'var(--red)', borderRadius: 8, fontSize: '.84rem' }}>{msg}</div>}

      <div className="admin-modal-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Kapat</button>
        <button type="button" className="admin-btn" onClick={save} disabled={busy}>
          {busy ? 'Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>
    </div>
  );
}
