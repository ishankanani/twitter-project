'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function ContactForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending'); setErrMsg('');
    try {
      await api.post('/api/contacts', { ...form, type: 'general' });
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('error'); setErrMsg(err.message || 'Hata');
    }
  }

  return (
    <>
      <section className="page-hero">
        <h1>{t.contact_us}<em>.</em></h1>
        <p className="page-hero-desc">{t.page_contact_desc}</p>
      </section>

      <section className="wrap">
        <form onSubmit={submit} className="form-grid">
          {status === 'sent' && (
            <div className="form-success">✓ Mesajınız iletildi. En kısa sürede size dönüş yapacağız.</div>
          )}
          {status === 'error' && (
            <div className="form-error">⚠ {errMsg || 'Mesaj gönderilemedi.'}</div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label>Ad Soyad</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Adınız" />
            </div>
            <div className="form-field">
              <label>E-posta *</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
          </div>

          <div className="form-field">
            <label>Konu</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Mesaj konusu" />
          </div>

          <div className="form-field">
            <label>Mesaj *</label>
            <textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Mesajınızı yazın..." rows={6} />
          </div>

          <button type="submit" disabled={status === 'sending'} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            {status === 'sending' ? 'Gönderiliyor...' : 'Mesajı Gönder'}
          </button>
        </form>
      </section>
    </>
  );
}
