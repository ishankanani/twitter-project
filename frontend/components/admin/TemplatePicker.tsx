'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Template {
  id: number;
  name: string;
  category: string;
  richText: string;
  previewText: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (tpl: Template) => void;
  token: string;
  currentRichText?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'haber', label: '📰 Haber' },
  { id: 'spor', label: '⚽ Spor' },
  { id: 'ekonomi', label: '💰 Ekonomi' },
  { id: 'tanitim', label: '🎬 Tanıtım' },
  { id: 'duyuru', label: '📢 Duyuru' },
  { id: 'etkilesim', label: '❓ Etkileşim' },
  { id: 'general', label: '📋 Genel' }
];

export default function TemplatePicker({ open, onClose, onPick, token, currentRichText }: Props) {
  const [list, setList] = useState<Template[]>([]);
  const [filter, setFilter] = useState('all');
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('general');
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  async function load() {
    try { setList(await api.get('/api/templates', token)); } catch {}
  }
  useEffect(() => { if (open && token) load(); }, [open, token]);

  if (!open) return null;

  const filtered = filter === 'all' ? list : list.filter(t => t.category === filter);

  async function saveCurrent(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim() || !currentRichText) return;
    try {
      await api.post('/api/templates', {
        name: saveName,
        category: saveCategory,
        richText: currentRichText,
        previewText: stripHtml(currentRichText).slice(0, 80)
      }, token);
      setShowSave(false); setSaveName(''); setSaveCategory('general');
      load();
    } catch {}
  }

  async function del(id: number) {
    try { await api.del(`/api/templates/${id}`, token); load(); } catch {}
    setConfirmDel(null);
  }

  return (
    <div className="admin-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '1.2rem' }}>📚 Şablon Kütüphanesi</h3>
          {currentRichText && (
            <button className="admin-btn admin-btn-ghost" onClick={() => setShowSave(true)} style={{ fontSize: '.78rem', padding: '6px 12px' }}>
              💾 Mevcut metni kaydet
            </button>
          )}
        </div>

        {/* Save current as template */}
        {showSave && (
          <form onSubmit={saveCurrent} style={{ background: 'var(--red-soft)', padding: 14, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Şablon Adı</label>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.88rem' }}
                  placeholder="Örn: Galatasaray maç sonucu" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Kategori</label>
                <select value={saveCategory} onChange={e => setSaveCategory(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.88rem' }}>
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <button type="submit" className="admin-btn">Kaydet</button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowSave(false)}>İptal</button>
            </div>
          </form>
        )}

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: '.76rem', fontWeight: 600,
                background: filter === c.id ? 'var(--red)' : 'white',
                color: filter === c.id ? 'white' : 'var(--mid)',
                border: '1px solid var(--border)', cursor: 'pointer'
              }}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Templates list */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Şablon yok</p>
          ) : filtered.map(t => (
            <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{t.name}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>{CATEGORIES.find(c => c.id === t.category)?.label || t.category}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="admin-btn" onClick={() => { onPick(t); onClose(); }}
                    style={{ fontSize: '.74rem', padding: '4px 12px' }}>
                    Kullan
                  </button>
                  <button className="admin-btn admin-btn-danger" onClick={() => setConfirmDel(t.id)}
                    style={{ fontSize: '.74rem', padding: '4px 10px' }}>
                    Sil
                  </button>
                </div>
              </div>
              <div
                style={{ fontSize: '.82rem', color: 'var(--mid)', lineHeight: 1.5, padding: 10, background: '#fafaf9', borderRadius: 6, maxHeight: 80, overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: t.richText }}
              />
            </div>
          ))}
        </div>

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-ghost" onClick={onClose}>Kapat</button>
        </div>

        {confirmDel && (
          <div className="admin-modal-bg" onClick={() => setConfirmDel(null)}>
            <div className="admin-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
              <h3>Onayla</h3>
              <p style={{ color: 'var(--mid)', marginBottom: 16 }}>Bu şablonu silmek istediğinizden emin misiniz?</p>
              <div className="admin-modal-actions">
                <button className="admin-btn admin-btn-ghost" onClick={() => setConfirmDel(null)}>İptal</button>
                <button className="admin-btn admin-btn-danger" onClick={() => del(confirmDel)}>Sil</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
