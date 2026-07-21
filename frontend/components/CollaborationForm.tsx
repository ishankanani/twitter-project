'use client';
import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Media { type: 'photo' | 'video' | 'file'; url: string; name?: string; mime?: string; }

export default function CollaborationForm() {
  const { t } = useLang();
  const [form, setForm] = useState({
    company: '', contactName: '', email: '', phone: '',
    type: 'advertisement', budgetPreset: '', budgetAmount: '', budgetCurrency: 'EUR',
    message: ''
  });
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList) {
    if (media.length + files.length > 4) { alert('En fazla 4 dosya yükleyebilirsiniz'); return; }
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    try {
      const res = await fetch(`${API_URL}/api/upload/public`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
      setMedia([...media, ...data.files]);
    } catch (e: any) { alert(e.message); }
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending'); setErrMsg('');
    try {
      await api.post('/api/collaborations', {
        ...form,
        budget: form.budgetAmount ? `${form.budgetAmount} ${form.budgetCurrency}` : form.budgetPreset,
        budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
        budgetCurrency: form.budgetCurrency,
        media
      });
      setStatus('sent');
      setForm({ company: '', contactName: '', email: '', phone: '', type: 'advertisement', budgetPreset: '', budgetAmount: '', budgetCurrency: 'EUR', message: '' });
      setMedia([]);
    } catch (err: any) { setStatus('error'); setErrMsg(err.message); }
  }

  function removeMedia(i: number) { setMedia(media.filter((_, idx) => idx !== i)); }

  function fullUrl(u: string) { return u.startsWith('http') ? u : `${API_URL}${u}`; }

  return (
    <>
      <section className="page-hero">
        <p className="section-tag">İŞ BİRLİĞİ</p>
        <h1>İş <em>Birliği</em></h1>
        <p className="page-hero-desc">Reklam, sponsorluk veya marka iş birliği talepleriniz için detaylı formu doldurun.</p>
      </section>
      <section className="wrap">
        {status === 'sent' && <div className="form-success" style={{ marginBottom: '1rem' }}>✓ Talebiniz iletildi. En kısa sürede dönüş yapılacaktır.</div>}

        <form onSubmit={submit} className="form-grid" style={{ maxWidth: 720 }}>
          <div className="form-row">
            <div className="form-field"><label>Şirket</label><input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div className="form-field"><label>İletişim Kişisi</label><input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-field"><label>E-posta *</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-field"><label>Telefon</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="form-field">
            <label>İş Birliği Türü</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="advertisement">Reklam</option>
              <option value="sponsorship">Sponsorluk</option>
              <option value="partnership">Stratejik Ortaklık</option>
              <option value="content">İçerik İş Birliği</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div className="form-field">
            <label>Bütçe Aralığı (önerilen)</label>
            <select value={form.budgetPreset} onChange={e => setForm({ ...form, budgetPreset: e.target.value })}>
              <option value="">Seçiniz veya özel tutar girin ↓</option>
              <option value="0-1000 EUR">0–1.000 €</option>
              <option value="1000-5000 EUR">1.000–5.000 €</option>
              <option value="5000-10000 EUR">5.000–10.000 €</option>
              <option value="10000+ EUR">10.000+ €</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-field"><label>Veya Özel Tutar</label>
              <input type="number" step="0.01" placeholder="Örn. 2500" value={form.budgetAmount} onChange={e => setForm({ ...form, budgetAmount: e.target.value })} />
            </div>
            <div className="form-field"><label>Para Birimi</label>
              <select value={form.budgetCurrency} onChange={e => setForm({ ...form, budgetCurrency: e.target.value })}>
                <option>EUR</option><option>USD</option><option>TRY</option><option>GBP</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Mesajınız *</label>
            <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Talebinizi detaylandırın..." />
          </div>

          <div className="form-field">
            <label>Medya Ekle (resim/video — opsiyonel, en fazla 4 dosya, 50 MB)</label>
            <div onClick={() => inputRef.current?.click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '1.2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--light)' }}>
              <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={e => e.target.files && uploadFiles(e.target.files)} style={{ display: 'none' }} />
              {uploading ? '⏳ Yükleniyor...' : '📎 Dosya seçmek için tıklayın'}
            </div>
            {media.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 8, marginTop: 12 }}>
                {media.map((m, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                    {m.type === 'video'
                      ? <video src={fullUrl(m.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={fullUrl(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async"/>}
                    <button type="button" onClick={() => removeMedia(i)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.7)', color: '#fff', border: 'none', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status === 'error' && <div className="form-error">⚠ {errMsg}</div>}

          <button type="submit" className="btn-primary" disabled={status === 'sending' || uploading} style={{ width: '100%' }}>
            {status === 'sending' ? 'Gönderiliyor...' : 'Talebi Gönder'}
          </button>
        </form>
      </section>
    </>
  );
}
