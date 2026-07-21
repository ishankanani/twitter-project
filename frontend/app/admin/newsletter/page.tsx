'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

interface NL { id: number; email: string; subscribedAt: string; }

export default function AdminNewsletterPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<NL[]>([]);
  const [confirm, setConfirm] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function load() { try { setList(await api.get('/api/newsletter', token)); } catch (e: any) { show(e.message, 'err'); } }
  useEffect(() => { if (token) load(); }, [token]);

  async function del(id: number) {
    try { await api.del(`/api/newsletter/${id}`, token); await load(); show('Silindi.'); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  function exportCsv() {
    const csv = 'E-posta,Tarih\n' + list.map(n => `${n.email},${n.subscribedAt}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'newsletter.csv'; a.click();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">Bülten Aboneleri</h1>
          <p className="admin-sub">{list.length} kayıtlı e-posta</p>
        </div>
        <button className="admin-btn admin-btn-ghost" onClick={exportCsv}>📥 CSV İndir</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>#</th><th>E-posta</th><th>Kayıt Tarihi</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Henüz abone yok</td></tr>
            ) : list.map((n, i) => (
              <tr key={n.id}>
                <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                <td>{n.email}</td>
                <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{new Date(n.subscribedAt).toLocaleString('tr-TR')}</td>
                <td><button className="admin-btn admin-btn-danger" onClick={() => setConfirm(n.id)}>{t.admin_delete}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirm && <ConfirmDialog msg="Bu kaydı silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
