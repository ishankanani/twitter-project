'use client';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { api, Collaboration } from '@/lib/api';
import { useLang } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUSES = [
  { id: 'new', label: 'Yeni', cls: 'red' },
  { id: 'reviewing', label: 'İncelemede', cls: 'gray' },
  { id: 'accepted', label: 'Kabul edildi', cls: 'green' },
  { id: 'declined', label: 'Reddedildi', cls: 'gray' },
  { id: 'completed', label: 'Tamamlandı', cls: 'green' }
];

export default function CollaborationsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<Collaboration[]>([]);
  const [filter, setFilter] = useState('');
  const [viewing, setViewing] = useState<Collaboration | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    try {
      const url = filter ? `/api/collaborations?status=${filter}` : '/api/collaborations';
      setList(await api.get(url, token));
    } catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { load(); }, [token, filter]);

  async function update(id: number, patch: any) {
    try { await api.put(`/api/collaborations/${id}`, patch, token); show('Güncellendi'); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    try { await api.del(`/api/collaborations/${id}`, token); show('Silindi'); load(); }
    catch (e: any) { show(e.message, 'err'); }
    setDelId(null);
  }

  async function getWa(id: number) {
    try {
      const r = await api.get(`/api/collaborations/${id}/whatsapp`, token);
      if (r.waLink) window.open(r.waLink, '_blank');
    } catch (e: any) { show(e.message, 'err'); }
  }

  return (
    <div>
      <h1 className="admin-h1">🤝 İş Birliği Talepleri</h1>
      <p className="admin-sub">Gelen reklam ve iş birliği talepleri</p>

      <div className="dash-filters">
        <button className={`dash-filter ${!filter ? 'on' : ''}`} onClick={() => setFilter('')}>Tümü ({list.length})</button>
        {STATUSES.map(s => (
          <button key={s.id} className={`dash-filter ${filter === s.id ? 'on' : ''}`} onClick={() => setFilter(s.id)}>{s.label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="dash-empty"><p>Bu filtreye uyan talep yok</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {list.map(c => (
            <div key={c.id} className="collab-card">
              <div className="collab-card-head">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{c.company || c.contactName || c.email}</div>
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{new Date(c.createdAt).toLocaleString('tr-TR')}</div>
                </div>
                <span className={`admin-tag ${STATUSES.find(s => s.id === c.status)?.cls || 'gray'}`}>{STATUSES.find(s => s.id === c.status)?.label || c.status}</span>
              </div>
              <div className="collab-meta">
                <div><strong>E-posta:</strong> <a href={`mailto:${c.email}`} style={{ color: 'var(--red)' }}>{c.email}</a></div>
                {c.phone && <div><strong>Telefon:</strong> {c.phone}</div>}
                <div><strong>Tür:</strong> {c.type}</div>
                <div><strong>Bütçe:</strong> {c.budgetAmount ? `${c.budgetAmount} ${c.budgetCurrency}` : (c.budget || '—')}</div>
              </div>
              <p className="collab-msg">{c.message}</p>

              {c.media && c.media.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '.8rem' }}>
                  {c.media.map((m, i) => (
                    <a key={i} href={m.url.startsWith('http') ? m.url : `${API_URL}${m.url}`} target="_blank" rel="noopener noreferrer"
                      style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', background: 'var(--light)', display: 'block' }}>
                      {m.type === 'video' ? (
                        <video src={m.url.startsWith('http') ? m.url : `${API_URL}${m.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={m.url.startsWith('http') ? m.url : `${API_URL}${m.url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async"/>
                      )}
                    </a>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
                <select value={c.status} onChange={e => update(c.id, { status: e.target.value })} style={{ padding: '6px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, fontSize: '.82rem' }}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="admin-btn admin-btn-ghost" onClick={() => setViewing(c)}>📝 Notlar</button>
                <button className="admin-btn" onClick={() => getWa(c.id)} style={{ background: '#25D366' }}>💬 WhatsApp</button>
                <button className="admin-btn admin-btn-danger" onClick={() => setDelId(c.id)}>🗑 Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <RemarksModal collab={viewing} onClose={() => setViewing(null)} onSave={(remarks) => { update(viewing.id, { adminRemarks: remarks }); setViewing(null); }} />}
      {delId && <ConfirmDialog msg="Bu talebi silmek istediğinize emin misiniz?" onYes={() => del(delId)} onNo={() => setDelId(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}

function RemarksModal({ collab, onClose, onSave }: { collab: Collaboration; onClose: () => void; onSave: (r: string) => void }) {
  const { t } = useLang();
  const [remarks, setRemarks] = useState(collab.adminRemarks || '');
  return (
    <Modal open={true} onClose={onClose} title={`Notlar — ${collab.company || collab.email}`}>
      <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={6} style={{ width: '100%', padding: '.8rem', border: '1px solid var(--border-soft)', borderRadius: 8 }} placeholder="Bu talep hakkında dahili notlar..." />
      <div className="admin-modal-actions">
        <button className="admin-btn admin-btn-ghost" onClick={onClose}>{t.admin_cancel}</button>
        <button className="admin-btn" onClick={() => onSave(remarks)}>{t.admin_save}</button>
      </div>
    </Modal>
  );
}
