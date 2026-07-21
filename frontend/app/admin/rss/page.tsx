'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

interface RssSrc { id: number; name: string; url: string; category: string; enabled: boolean; }

const EMPTY: Partial<RssSrc> = { name: '', url: '', category: 'gundem', enabled: true };

export default function AdminRssPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<RssSrc[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<RssSrc>>(EMPTY);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const { toast, show } = useToast();

  async function load() { try { setList(await api.get('/api/rss', token)); } catch (e: any) { show(e.message, 'err'); } }
  useEffect(() => { if (token) load(); }, [token]);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(r: RssSrc) { setForm({ ...r }); setEditId(r.id); setModal(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) await api.put(`/api/rss/${editId}`, form, token);
      else await api.post('/api/rss', form, token);
      await load(); setModal(false); show(editId ? 'Güncellendi.' : 'Eklendi.');
    } catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    try { await api.del(`/api/rss/${id}`, token); await load(); show('Silindi.'); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  async function fetchNow() {
    setFetching(true);
    try { const r = await api.post('/api/rss/fetch-now', {}, token); show(`${r.count} yeni haber alındı.`); }
    catch (e: any) { show(e.message, 'err'); }
    setFetching(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">RSS Kaynakları</h1>
          <p className="admin-sub">Haber sayfasında gösterilecek RSS feed'leri yönetin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn-ghost" onClick={fetchNow} disabled={fetching}>
            {fetching ? '⟳ İndiriliyor...' : '⟳ Şimdi İndir'}
          </button>
          <button className="admin-btn" onClick={openAdd}>+ RSS Ekle</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>İsim</th><th>URL</th><th>Kategori</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Kaynak yok</td></tr>
            ) : list.map(r => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td style={{ fontSize: '.76rem', color: 'var(--muted)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</td>
                <td><span className="admin-tag red">{r.category}</span></td>
                <td>{r.enabled ? <span className="admin-tag green">{t.active_label}</span> : <span className="admin-tag gray">{t.inactive_label}</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="admin-btn admin-btn-ghost" onClick={() => openEdit(r)}>{t.admin_edit}</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => setConfirm(r.id)}>{t.admin_delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'RSS Düzenle' : 'RSS Ekle'}>
        <form onSubmit={save} className="form-grid">
          <div className="form-field"><label>İsim *</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-field"><label>RSS URL *</label><input type="url" value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} required /></div>
          <div className="form-field">
            <label>Kategori</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="gundem">Gündem</option>
              <option value="spor">Spor</option>
              <option value="ekonomi">Ekonomi</option>
              <option value="dunya">Dünya</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>
              <input type="checkbox" checked={form.enabled !== false} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(false)}>{t.admin_cancel}</button>
            <button type="submit" className="admin-btn">{t.admin_save}</button>
          </div>
        </form>
      </Modal>

      {confirm && <ConfirmDialog msg="Bu RSS kaynağını silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
