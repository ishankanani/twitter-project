'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Toast, useToast } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

export default function AdminSettingsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [settings, setSettings] = useState<any>({});
  const [pwForm, setPwForm] = useState({ current: '', next: '', repeat: '' });
  const [savingS, setSavingS] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    if (!token) return;
    api.get('/api/settings', token).then(setSettings).catch(() => {});
  }, [token]);

  async function saveSettings() {
    setSavingS(true);
    try {
      const payload = { ...settings };
      // Skip masked secrets
      if (typeof payload.callmebot_api_key === 'string' && payload.callmebot_api_key.includes('...')) delete payload.callmebot_api_key;
      await api.put('/api/settings', payload, token);
      show('Ayarlar kaydedildi.');
    } catch (e: any) { show(e.message, 'err'); }
    setSavingS(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.repeat) return show('Şifreler eşleşmiyor.', 'err');
    if (pwForm.next.length < 6) return show('Şifre en az 6 karakter olmalı.', 'err');
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next }, token);
      setPwForm({ current: '', next: '', repeat: '' });
      show('Şifre güncellendi. Tekrar giriş yapın.');
      setTimeout(() => { localStorage.clear(); window.location.href = '/admin/login'; }, 1500);
    } catch (e: any) { show(e.message, 'err'); }
  }

  return (
    <div>
      <h1 className="admin-h1">{t.admin_settings}</h1>
      <p className="admin-sub">Site, WhatsApp ve güvenlik ayarları</p>

      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem' }}>Site Bilgileri</h3>
        <div className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label>Site Adı</label>
              <input value={settings.site_name || ''} onChange={e => setSettings({ ...settings, site_name: e.target.value })} />
            </div>
            <div className="form-field">
              <label>İletişim E-posta</label>
              <input type="email" value={settings.site_email || ''} onChange={e => setSettings({ ...settings, site_email: e.target.value })} />
            </div>
          </div>
          <div className="form-field">
            <label>Şirket Adı (footer)</label>
            <input value={settings.company_name || ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem' }}>📲 WhatsApp Yönlendirme</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>WhatsApp Numarası</label>
            <input value={settings.whatsapp_number || ''} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="+4915203534316" />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              Tüm iş birliği taleplerinde admin panelinden bu numaraya WhatsApp linki oluşturulur.
            </small>
          </div>
          <div className="form-field">
            <label>CallMeBot API Anahtarı (opsiyonel — otomatik göndermek için)</label>
            <input type="password" value={settings.callmebot_api_key || ''} onChange={e => setSettings({ ...settings, callmebot_api_key: e.target.value })} placeholder="Boş bırakılırsa manuel link kullanılır" />
            <small style={{ color: 'var(--muted)', fontSize: '.74rem', marginTop: 4, display: 'block' }}>
              <strong>Otomatik gönderim için:</strong> Önce <code>+34 644 51 95 23</code> numarasına WhatsApp'tan "<em>I allow callmebot to send me messages</em>" yazın.
              Karşılık olarak gelen API anahtarını buraya yapıştırın. Ücretsiz servistir.
            </small>
          </div>
          <div className="form-field">
            <label>Özel RSSHub URL (opsiyonel)</label>
            <input value={settings.custom_rsshub_url || ''} onChange={e => setSettings({ ...settings, custom_rsshub_url: e.target.value })} placeholder="https://rsshub.your-domain.com" />
          </div>
          <button onClick={saveSettings} className="admin-btn" disabled={savingS}>
            {savingS ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem' }}>🔒 Şifre Değiştir</h3>
        <form onSubmit={changePassword} className="form-grid" style={{ maxWidth: 460 }}>
          <div className="form-field"><label>Mevcut Şifre</label><input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} required /></div>
          <div className="form-field"><label>Yeni Şifre</label><input type="password" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} required minLength={6} /></div>
          <div className="form-field"><label>Yeni Şifre (Tekrar)</label><input type="password" value={pwForm.repeat} onChange={e => setPwForm({ ...pwForm, repeat: e.target.value })} required /></div>
          <button type="submit" className="admin-btn">Şifreyi Değiştir</button>
        </form>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
