'use client';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { api, Payment } from '@/lib/api';
import { useLang } from '@/lib/i18n';

const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

export default function PaymentsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<any>(null);
  const [list, setList] = useState<Payment[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const { toast, show } = useToast();

  async function loadSummary() {
    if (!token) return;
    try { setSummary(await api.get(`/api/payments/analytics/summary?year=${year}`, token)); }
    catch (e: any) { show(e.message, 'err'); }
  }
  async function loadList() {
    if (!token) return;
    try {
      let url = `/api/payments?year=${year}`;
      if (filterMonth) url += `&month=${filterMonth}`;
      setList(await api.get(url, token));
    } catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { loadSummary(); loadList(); }, [token, year, filterMonth]);

  async function save(payload: any) {
    try {
      if (editing) { await api.put(`/api/payments/${editing.id}`, payload, token); show('Güncellendi'); }
      else { await api.post('/api/payments', payload, token); show('Eklendi'); }
      setCreating(false); setEditing(null);
      loadList(); loadSummary();
    } catch (e: any) { show(e.message, 'err'); }
  }

  async function del(id: number) {
    try { await api.del(`/api/payments/${id}`, token); show('Silindi'); loadList(); loadSummary(); }
    catch (e: any) { show(e.message, 'err'); }
    setDelId(null);
  }

  const maxMonth = summary?.byMonth ? Math.max(...summary.byMonth.map((m: any) => m.total), 1) : 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">💰 Gelir Yönetimi</h1>
          <p className="admin-sub">Tüm ödemeler ve aylık gelir analizi</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ padding: '8px 12px', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
            {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="admin-btn" onClick={() => setCreating(true)}>+ Ödeme Ekle</button>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat-num">{(summary.total.total || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} €</div>
            <div className="admin-stat-label">{year} Toplam Gelir</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-num">{summary.total.count}</div>
            <div className="admin-stat-label">{year} Ödeme Sayısı</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-num">{((summary.total.total || 0) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} €</div>
            <div className="admin-stat-label">Aylık Ortalama</div>
          </div>
        </div>
      )}

      {/* Monthly bar chart */}
      {summary?.byMonth && (
        <div className="admin-card">
          <h3 style={{ marginBottom: '1.2rem' }}>📊 Aylık Gelir — {year}</h3>
          <div className="chart-bars">
            {Array.from({ length: 12 }, (_, i) => {
              const m = summary.byMonth.find((x: any) => x.month === i + 1);
              const t = m ? m.total : 0;
              const pct = (t / maxMonth) * 100;
              return (
                <button key={i} className="chart-col" onClick={() => setFilterMonth(filterMonth == String(i+1) ? '' : String(i+1))}>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ height: `${pct}%`, background: filterMonth === String(i+1) ? 'var(--red-dark)' : 'var(--red)' }} />
                  </div>
                  <span className="chart-bar-value">{t > 0 ? t.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : ''}</span>
                  <span className="chart-bar-label">{MONTHS[i]}</span>
                </button>
              );
            })}
          </div>
          {filterMonth && <p style={{ marginTop: '.8rem', fontSize: '.8rem', color: 'var(--muted)' }}>Filtre: {MONTHS[parseInt(filterMonth)-1]} · <button onClick={() => setFilterMonth('')} style={{ color: 'var(--red)' }}>Temizle</button></p>}
        </div>
      )}

      {/* By source */}
      {summary?.bySource?.length > 0 && (
        <div className="admin-card">
          <h3 style={{ marginBottom: '1rem' }}>Kaynak Dağılımı</h3>
          {summary.bySource.map((s: any) => (
            <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.5rem 0' }}>
              <span style={{ flex: 1, fontSize: '.86rem' }}>{s.source || 'Belirtilmedi'}</span>
              <div style={{ flex: 2, height: 8, background: 'var(--light-2)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--red)', width: `${(s.total / summary.total.total) * 100}%` }} />
              </div>
              <span style={{ fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{s.total.toLocaleString('tr-TR')} €</span>
            </div>
          ))}
        </div>
      )}

      {/* Payments table */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem' }}>Tüm Ödemeler</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>Tarih</th><th>Tutar</th><th>Kaynak</th><th>Açıklama</th><th>Durum</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Kayıt yok</td></tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: '.82rem' }}>{new Date(p.receivedAt).toLocaleDateString('tr-TR')}</td>
                  <td style={{ fontWeight: 600 }}>{(+p.amount).toLocaleString('tr-TR')} {p.currency}</td>
                  <td>{p.source || '—'}</td>
                  <td style={{ fontSize: '.82rem' }}>{p.description || '—'}</td>
                  <td><span className="admin-tag green">{p.status}</span></td>
                  <td>
                    <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 10px' }} onClick={() => setEditing(p)}>{t.admin_edit}</button>
                    <button className="admin-btn admin-btn-danger" style={{ fontSize: '.72rem', padding: '4px 10px', marginLeft: 4 }} onClick={() => setDelId(p.id)}>{t.admin_delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && <PaymentModal payment={editing} onSave={save} onClose={() => { setCreating(false); setEditing(null); }} />}
      {delId && <ConfirmDialog msg="Ödemeyi silmek istediğinize emin misiniz?" onYes={() => del(delId)} onNo={() => setDelId(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}

function PaymentModal({ payment, onSave, onClose }: { payment: Payment | null; onSave: (d: any) => void; onClose: () => void }) {
  const { t } = useLang();
  const [amount, setAmount] = useState(payment?.amount?.toString() || '');
  const [currency, setCurrency] = useState(payment?.currency || 'EUR');
  const [source, setSource] = useState(payment?.source || '');
  const [description, setDescription] = useState(payment?.description || '');
  const [status, setStatus] = useState(payment?.status || 'received');
  const [receivedAt, setReceivedAt] = useState(
    payment?.receivedAt ? payment.receivedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ amount: parseFloat(amount), currency, source, description, status, receivedAt: new Date(receivedAt).toISOString() });
  }

  return (
    <Modal open={true} onClose={onClose} title={payment ? 'Ödemeyi Düzenle' : 'Yeni Ödeme'}>
      <form onSubmit={submit} className="form-grid">
        <div className="form-row">
          <div className="form-field"><label>Tutar *</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus /></div>
          <div className="form-field">
            <label>Para Birimi</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option>EUR</option><option>USD</option><option>TRY</option><option>GBP</option>
            </select>
          </div>
        </div>
        <div className="form-field"><label>Kaynak (sponsor adı, müşteri vb.)</label><input value={source} onChange={e => setSource(e.target.value)} placeholder="örn. ABC Şirketi" /></div>
        <div className="form-field"><label>Açıklama</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Aralık reklam paketi" /></div>
        <div className="form-row">
          <div className="form-field"><label>Alınma Tarihi</label><input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} /></div>
          <div className="form-field">
            <label>Durum</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="received">Alındı</option><option value="pending">Beklemede</option><option value="cancelled">{t.admin_cancel}</option>
            </select>
          </div>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>{t.admin_cancel}</button>
          <button type="submit" className="admin-btn">{t.admin_save}</button>
        </div>
      </form>
    </Modal>
  );
}
