'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { api } from '@/lib/api';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import RichEditor from '@/components/admin/RichEditor';
import { useLang } from '@/lib/i18n';

export default function CampaignsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [sendId, setSendId] = useState<number | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    try { setList(await api.get('/api/newsletter/campaigns', token)); }
    catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { load(); }, [token]);

  async function save(data: any) {
    try { await api.post('/api/newsletter/campaigns', data, token); show('Taslak oluşturuldu'); setCreating(false); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function send(id: number) {
    try { const r = await api.post(`/api/newsletter/campaigns/${id}/send`, {}, token); show(`${r.recipients} aboneye gönderiliyor`); setSendId(null); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    try { await api.del(`/api/newsletter/campaigns/${id}`, token); show('Silindi'); load(); setDelId(null); }
    catch (e: any) { show(e.message, 'err'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">📧 Bülten Kampanyaları</h1>
          <p className="admin-sub">Toplu e-posta gönderimleri</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/newsletter" className="admin-btn admin-btn-ghost">← Aboneler</Link>
          <button className="admin-btn" onClick={() => setCreating(true)}>+ Yeni Kampanya</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="dash-empty"><p>Henüz kampanya yok</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {list.map((c: any) => (
            <div key={c.id} className="admin-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', marginBottom: 6 }}>{c.subject}</h3>
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {new Date(c.createdAt).toLocaleString('tr-TR')}
                    {c.sentAt && ` · Gönderim: ${new Date(c.sentAt).toLocaleString('tr-TR')}`}
                  </div>
                  {c.status === 'sent' && (
                    <div style={{ marginTop: 8, fontSize: '.82rem' }}>
                      <span style={{ color: '#28a745' }}>✓ {c.delivered}/{c.recipients} teslim edildi</span>
                      {c.failed > 0 && <span style={{ color: 'var(--red)', marginLeft: 10 }}>⚠ {c.failed} başarısız</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`admin-tag ${c.status === 'sent' ? 'green' : c.status === 'sending' ? 'red' : 'gray'}`}>
                    {c.status === 'draft' ? 'Taslak' : c.status === 'sending' ? 'Gönderiliyor' : c.status === 'sent' ? 'Gönderildi' : c.status}
                  </span>
                  {c.status === 'draft' && (
                    <button className="admin-btn" onClick={() => setSendId(c.id)}>📤 Gönder</button>
                  )}
                  {c.status !== 'sending' && (
                    <button className="admin-btn admin-btn-danger" onClick={() => setDelId(c.id)}>{t.admin_delete}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CampaignModal onClose={() => setCreating(false)} onSave={save} />}
      {sendId && <ConfirmDialog msg="Bu kampanyayı tüm abonelere göndermek istediğinize emin misiniz? Bu işlem geri alınamaz." onYes={() => send(sendId)} onNo={() => setSendId(null)} />}
      {delId && <ConfirmDialog msg="Kampanyayı silmek istediğinize emin misiniz?" onYes={() => del(delId)} onNo={() => setDelId(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}

function CampaignModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const { t } = useLang();
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p>Merhaba,</p><p></p><p>Saygılarımla,<br/>sosyal-medya.net</p>');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return alert('Konu zorunlu');
    onSave({ subject, bodyHtml });
  }

  return (
    <Modal open={true} onClose={onClose} title="Yeni Kampanya">
      <form onSubmit={submit} className="form-grid">
        <div className="form-field">
          <label>Konu *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} required autoFocus maxLength={500} placeholder="örn: Aralık ayı bülten" />
        </div>
        <div className="form-field">
          <label>İçerik *</label>
          <RichEditor value={bodyHtml} onChange={setBodyHtml} />
          <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
            Bu e-posta tüm aboneliklere gönderilecek. Önce taslak olarak kaydedilir, sonra "Gönder" butonuna basarak iletebilirsiniz.
          </small>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>{t.admin_cancel}</button>
          <button type="submit" className="admin-btn">Taslak Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}
