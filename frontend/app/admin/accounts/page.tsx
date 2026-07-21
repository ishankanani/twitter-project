'use client';
import { useEffect, useState } from 'react';
import { api, Account, fmtNum } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

const EMPTY: Partial<Account> = {
  displayName: '', handle: '', url: '', bio: '', category: 'gundem', followers: 0, avatar: '', enabled: true
};

export default function AdminAccountsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<Account[]>([]);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Account>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  async function load() { try { setList(await api.get('/api/accounts')); } catch (e: any) { show(e.message, 'err'); } }
  useEffect(() => { if (token) load(); }, [token]);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(a: Account) { setForm({ ...a }); setEditId(a.id); setModal(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/api/accounts/${editId}`, form, token);
      else await api.post('/api/accounts', form, token);
      await load(); setModal(false);
      show(editId ? 'Hesap güncellendi.' : 'Hesap eklendi — yeni sayfa otomatik oluşturuldu.');
    } catch (e: any) { show(e.message, 'err'); }
    setSaving(false);
  }

  async function del(id: number) {
    try { await api.del(`/api/accounts/${id}`, token); await load(); show('Hesap silindi.'); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">X Hesap Yönetimi</h1>
          <p className="admin-sub">Hesap eklediğinizde otomatik bir sayfa oluşturulur ve X gönderileri senkronize edilir.</p>
        </div>
        <button className="admin-btn" onClick={openAdd}>+ Hesap Ekle</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Görünen Ad</th><th>Handle</th><th>Kategori</th><th>Takipçi</th><th>Durum</th><th>Sayfa</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Hesap yok</td></tr>
            ) : list.map(a => (
              <tr key={a.id}>
                <td><strong>{a.displayName}</strong></td>
                <td style={{ color: 'var(--red)', fontFamily: 'monospace' }}>@{a.handle}</td>
                <td><span className="admin-tag red">{a.category}</span></td>
                <td>{fmtNum(a.followers)}</td>
                <td>
                  {a.enabled
                    ? <span className="admin-tag green">{t.active_label}</span>
                    : <span className="admin-tag gray">{t.inactive_label}</span>}
                </td>
                <td>
                  <a href={`/account/${a.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', fontSize: '.78rem', fontWeight: 600 }}>
                    /account/{a.handle} →
                  </a>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="admin-btn admin-btn-ghost" onClick={() => openEdit(a)}>{t.admin_edit}</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => setConfirm(a.id)}>{t.admin_delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}>
        <form onSubmit={save} className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label>Görünen Ad *</label>
              <input value={form.displayName || ''} onChange={e => setForm({ ...form, displayName: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>X Handle * (@ olmadan)</label>
              <input value={form.handle || ''} onChange={e => setForm({ ...form, handle: e.target.value.replace(/^@/, '') })} placeholder="kullaniciadi" required />
            </div>
          </div>
          <div className="form-field">
            <label>X URL</label>
            <input type="url" value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} placeholder={`https://x.com/${form.handle || 'kullaniciadi'}`} />
          </div>
          <div className="form-field">
            <label>Bio</label>
            <textarea rows={3} value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Kategori</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="gundem">Gündem</option>
                <option value="spor">Spor</option>
                <option value="ekonomi">Ekonomi</option>
                <option value="eglence">Eğlence</option>
                <option value="dunya">Dünya</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div className="form-field">
              <label>Takipçi Sayısı</label>
              <input type="number" min="0" value={form.followers ?? 0} onChange={e => setForm({ ...form, followers: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-field">
            <label>Avatar URL (opsiyonel)</label>
            <input value={form.avatar || ''} onChange={e => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.9rem', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>
              <input type="checkbox" checked={form.enabled !== false} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
              Aktif (sitede göster)
            </label>
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(false)}>{t.admin_cancel}</button>
            <button type="submit" className="admin-btn" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {confirm && <ConfirmDialog msg="Bu hesabı ve tüm gönderilerini silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
