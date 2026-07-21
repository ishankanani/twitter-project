'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

interface Contact {
  id: number; name: string; email: string; subject: string; message: string; type: string; read: boolean; createdAt: string;
}

export default function AdminContactsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<Contact[]>([]);
  const [view, setView] = useState<Contact | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function load() {
    try { setList(await api.get('/api/contacts', token)); }
    catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { if (token) load(); }, [token]);

  async function openMsg(c: Contact) {
    setView(c);
    if (!c.read) { try { await api.put(`/api/contacts/${c.id}/read`, {}, token); load(); } catch {} }
  }
  async function del(id: number) {
    try { await api.del(`/api/contacts/${id}`, token); await load(); show('Mesaj silindi.'); setView(null); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  const unread = list.filter(c => !c.read).length;

  return (
    <div>
      <h1 className="admin-h1">İletişim Mesajları</h1>
      <p className="admin-sub">{unread} okunmamış · {list.length} toplam</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th></th><th>Ad</th><th>E-posta</th><th>Konu</th><th>Tarih</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Henüz mesaj yok</td></tr>
            ) : list.map(c => (
              <tr key={c.id} onClick={() => openMsg(c)} style={{ cursor: 'pointer' }}>
                <td>{!c.read && <span className="admin-tag red">YENİ</span>}</td>
                <td><strong>{c.name || '—'}</strong></td>
                <td>{c.email}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject || c.message.slice(0, 60)}</td>
                <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</td>
                <td>
                  <button className="admin-btn admin-btn-danger" onClick={e => { e.stopPropagation(); setConfirm(c.id); }}>{t.admin_delete}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view && (
        <Modal open={!!view} onClose={() => setView(null)} title="Mesaj Detayı">
          <div style={{ fontSize: '.92rem', lineHeight: 1.6 }}>
            <p><strong>Ad:</strong> {view.name || '—'}</p>
            <p><strong>E-posta:</strong> <a href={`mailto:${view.email}`} style={{ color: 'var(--red)' }}>{view.email}</a></p>
            <p><strong>Konu:</strong> {view.subject || '—'}</p>
            <p><strong>Tarih:</strong> {new Date(view.createdAt).toLocaleString('tr-TR')}</p>
            <p style={{ marginTop: '1rem', padding: '1rem', background: 'var(--light)', borderRadius: '10px', whiteSpace: 'pre-wrap' }}>{view.message}</p>
          </div>
          <div className="admin-modal-actions">
            <button className="admin-btn admin-btn-danger" onClick={() => setConfirm(view.id)}>{t.admin_delete}</button>
            <a href={`mailto:${view.email}`} className="admin-btn">Yanıtla</a>
          </div>
        </Modal>
      )}

      {confirm && <ConfirmDialog msg="Bu mesajı silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
