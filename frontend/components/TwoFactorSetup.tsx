'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function TwoFactorSetup() {
  const { user, token } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setupQr, setSetupQr] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePw, setDisablePw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    try { const r = await api.get('/api/auth/2fa/status', token); setEnabled(r.enabled); }
    catch { setEnabled(false); }
  }
  useEffect(() => { loadStatus(); }, [token]);

  async function startSetup() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const r = await api.post('/api/auth/2fa/setup', {}, token);
      setSetupQr(r.qrDataUrl); setSetupSecret(r.secret);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  async function enable() {
    setErr(''); setBusy(true);
    try {
      const r = await api.post('/api/auth/2fa/enable', { code: setupCode }, token);
      setBackupCodes(r.backupCodes); setEnabled(true);
      setSetupQr(''); setSetupSecret(''); setSetupCode('');
      setMsg('2FA aktif! Yedek kodları güvenli bir yere kaydedin.');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  async function disable() {
    if (!confirm('2FA\'yı devre dışı bırakmak istediğinize emin misiniz?')) return;
    setBusy(true);
    try {
      await api.post('/api/auth/2fa/disable', { password: disablePw }, token);
      setEnabled(false); setDisablePw('');
      setMsg('2FA devre dışı bırakıldı.');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  function downloadBackupCodes() {
    if (!backupCodes) return;
    const text = `sosyal-medya.net — 2FA Yedek Kodları
Hesap: ${user?.username}
Oluşturma tarihi: ${new Date().toLocaleString('tr-TR')}

Her kod yalnızca BİR KEZ kullanılabilir.
Telefonunuz kaybolursa bu kodlardan birini girerek giriş yapabilirsiniz.

${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

ÖNEMLİ: Bu dosyayı güvenli bir yerde saklayın. Bir başkasına vermeyin.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sosyal-medya-2fa-backup-codes.txt';
    a.click();
  }

  if (!user) return null;
  if (user.role === 'creator') {
    return (
      <div className="dash-card">
        <h3 style={{ marginBottom: '1rem' }}>🛡️ İki Adımlı Doğrulama (2FA)</h3>
        <p style={{ color: 'var(--muted)' }}>İki adımlı doğrulama yalnızca yönetici hesapları için kullanılabilir.</p>
      </div>
    );
  }

  return (
    <div className="dash-card">
      <h3 style={{ marginBottom: '1rem' }}>🛡️ İki Adımlı Doğrulama (2FA)</h3>

      {enabled === null && <p style={{ color: 'var(--muted)' }}>Yükleniyor...</p>}

      {backupCodes && (
        <div style={{ background: 'rgba(255,193,7,.12)', border: '1px solid rgba(255,193,7,.4)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>⚠️ Yedek kodlarınızı şimdi kaydedin!</strong>
          <p style={{ fontSize: '.86rem', color: 'var(--mid)', marginBottom: 12 }}>
            Telefonunuza erişiminizi kaybederseniz, bu kodlarla giriş yapabilirsiniz. Her kod yalnızca bir kez kullanılabilir. Bu sayfayı kapattığınızda kodlar bir daha gösterilmeyecek.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12, fontFamily: 'monospace' }}>
            {backupCodes.map((c, i) => (
              <div key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: 6, fontSize: '.92rem' }}>{c}</div>
            ))}
          </div>
          <button onClick={downloadBackupCodes} className="admin-btn">⬇ Kodları İndir (.txt)</button>
        </div>
      )}

      {msg && <div className="form-success" style={{ marginBottom: 12 }}>{msg}</div>}
      {err && <div className="form-error" style={{ marginBottom: 12 }}>{err}</div>}

      {enabled === false && !setupQr && (
        <>
          <p style={{ color: 'var(--mid)', marginBottom: 12, fontSize: '.92rem', lineHeight: 1.55 }}>
            2FA, her girişte telefonunuzdan 6 haneli kod girmenizi gerektirir. Şifreniz ele geçirilse bile hesabınız güvende kalır.
            <br/><strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> veya <strong>Authy</strong> gibi uygulamalar kullanabilirsiniz.
          </p>
          <button onClick={startSetup} disabled={busy} className="btn-primary">🔒 2FA'yı Etkinleştir</button>
        </>
      )}

      {setupQr && (
        <div>
          <ol style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--mid)', fontSize: '.92rem', marginBottom: 16 }}>
            <li>Telefonunuzda <strong>Google Authenticator</strong> veya başka bir TOTP uygulaması açın.</li>
            <li>"+" butonuna basın, "QR kod tara"yı seçin ve aşağıdaki kodu tarayın.</li>
            <li>Uygulamada görünen 6 haneli kodu aşağıya girin.</li>
          </ol>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <img src={setupQr} alt="QR kod" style={{ border: '1px solid var(--border-soft)', borderRadius: 12 }} loading="lazy" decoding="async"/>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 4 }}>QR çalışmazsa manuel kod:</p>
              <code style={{ display: 'block', padding: '10px 12px', background: 'var(--light)', borderRadius: 8, fontSize: '.78rem', wordBreak: 'break-all' }}>{setupSecret}</code>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Uygulamadaki 6 haneli kod</label>
              <input value={setupCode} onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" pattern="\d{6}" maxLength={6} autoFocus />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={enable} disabled={busy || setupCode.length !== 6} className="btn-primary">✓ Etkinleştir</button>
            <button onClick={() => { setSetupQr(''); setSetupSecret(''); setSetupCode(''); }} className="btn-ghost">İptal</button>
          </div>
        </div>
      )}

      {enabled === true && !backupCodes && (
        <>
          <div style={{ background: 'rgba(40,167,69,.08)', border: '1px solid rgba(40,167,69,.3)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <strong style={{ color: '#1e7e34' }}>✓ 2FA aktif</strong>
            <p style={{ fontSize: '.82rem', color: 'var(--mid)', marginTop: 4 }}>Her girişte 6 haneli kodu girmeniz gerekecek.</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: '.95rem', marginBottom: 8 }}>2FA'yı Devre Dışı Bırak</h4>
            <div className="form-row">
              <div className="form-field">
                <label>Mevcut şifre</label>
                <input type="password" value={disablePw} onChange={e => setDisablePw(e.target.value)} />
              </div>
            </div>
            <button onClick={disable} disabled={busy || !disablePw} className="btn-danger-ghost">2FA'yı Kapat</button>
          </div>
        </>
      )}
    </div>
  );
}
