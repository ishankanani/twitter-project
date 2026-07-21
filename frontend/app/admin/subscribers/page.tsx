'use client';
import { useEffect, useState } from 'react';
import { api, Subscriber } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

const EMPTY = { name: '', handle: '', xUrl: '' };

export default function AdminSubscribersPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function load() { try { setList(await api.get('/api/subscribers')); } catch (e: any) { show(e.message, 'err'); } }
  useEffect(() => { if (token) load(); }, [token]);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(s: Subscriber) { setForm({ name: s.name, handle: s.handle, xUrl: s.xUrl || '' }); setEditId(s.id); setModal(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, xUrl: form.xUrl || `https://x.com/${form.handle}` };
    try {
      if (editId) await api.put(`/api/subscribers/${editId}`, payload, token);
      else await api.post('/api/subscribers', payload, token);
      await load(); setModal(false); show(editId ? 'Güncellendi.' : 'Eklendi.');
    } catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    try { await api.del(`/api/subscribers/${id}`, token); await load(); show('Silindi.'); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  const filtered = search ? list.filter(s => (s.name + ' ' + s.handle).toLowerCase().includes(search.toLowerCase())) : list;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">{t.admin_subscribers}</h1>
          <p className="admin-sub">Ana sayfada görüntülenen abone listesi</p>
        </div>
        <button className="admin-btn" onClick={openAdd}>+ Abone Ekle</button>
      </div>

      <div className="admin-card">
        <div className="form-field" style={{ maxWidth: 360 }}>
          <label>Ara</label>
          <input placeholder="İsim veya handle..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Ad</th><th>Handle</th><th>X URL</th><th>Eklenme</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Abone yok</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id}>
                <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                <td><strong>{s.name}</strong></td>
                <td style={{ color: 'var(--red)' }}>@{s.handle}</td>
                <td><a href={s.xUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', fontSize: '.78rem' }}>X'te Gör →</a></td>
                <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{new Date(s.addedAt).toLocaleDateString('tr-TR')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="admin-btn admin-btn-ghost" onClick={() => openEdit(s)}>{t.admin_edit}</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => setConfirm(s.id)}>{t.admin_delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Aboneyi Düzenle' : 'Abone Ekle'}>
        <form onSubmit={save} className="form-grid">
          <div className="form-field"><label>Görünen Ad *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-field"><label>X Handle * (@ olmadan)</label><input value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value.replace(/^@/, '') })} required /></div>
          <div className="form-field"><label>X URL</label><input value={form.xUrl} onChange={e => setForm({ ...form, xUrl: e.target.value })} placeholder={`https://x.com/${form.handle}`} /></div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(false)}>{t.admin_cancel}</button>
            <button type="submit" className="admin-btn">{t.admin_save}</button>
          </div>
        </form>
      </Modal>

      {confirm && <ConfirmDialog msg="Bu aboneyi silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
