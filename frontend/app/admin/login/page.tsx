'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang, translateError } from '@/lib/i18n';

function AdminLoginInner() {
  const { t } = useLang();
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason');
  const redirect = params.get('redirect') || '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [needsVerify, setNeedsVerify] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'creator' ? '/dashboard' : redirect);
    }
  }, [user, loading, redirect, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(username, password, website, totpCode);
      router.replace(u.role === 'creator' ? '/dashboard' : redirect);
    } catch (e: any) {
      if (e.needsVerification && e.email) {
        setNeedsVerify(e.email);
      } else if (e.needsTotp) {
        setNeedsTotp(true);
      } else {
        setErr(translateError(e, t));
        if (e.message && (e.message.includes('2FA') || e.message.includes('kod'))) {
          setNeedsTotp(true);
        }
      }
    }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2>🔒 Admin Paneli</h2>
        <p>Yönetici / Yayıncı hesabınızla giriş yapın</p>

        {reason === 'session' && (
          <div className="auth-banner warn" style={{ marginBottom: '1rem' }}>
            ⚠ Oturum başka bir cihazda açıldı
          </div>
        )}

        {needsVerify && (
          <div className="auth-banner warn" style={{ marginBottom: '1rem' }}>
            <strong>📧 E-postanız doğrulanmadı</strong>
            <p style={{ fontSize: '.84rem' }}>{needsVerify} adresini kontrol edin</p>
          </div>
        )}

        {needsTotp ? (
          <form onSubmit={submit} className="form-grid">
            <div className="auth-banner" style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '12px 14px', borderRadius: 10, marginBottom: '.6rem' }}>
              <strong>🛡️ İki Adımlı Doğrulama</strong>
              <p style={{ fontSize: '.84rem', marginTop: 4, color: 'var(--mid)' }}>
                Kimlik doğrulama uygulamasından 6 haneli kodu veya yedek kodu girin.
              </p>
            </div>
            <div className="form-field">
              <label>2FA Kodu</label>
              <input value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\s/g, '').slice(0, 20))}
                placeholder="123456" inputMode="numeric" autoFocus
                style={{ fontSize: '1.4rem', letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'monospace' }} />
            </div>
            {err && <div className="form-error">{err}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={busy || totpCode.length < 6}>
              {busy ? 'Doğrulanıyor...' : 'Doğrula ve Giriş'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setNeedsTotp(false); setTotpCode(''); setErr(''); }} style={{ width: '100%' }}>
              ← Geri
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="form-grid">
            <div className="form-field">
              <label>Kullanıcı Adı</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div className="form-field">
              <label>Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <input type="text" value={website} onChange={e => setWebsite(e.target.value)} autoComplete="off" tabIndex={-1} aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} />
            {err && <div className="form-error">{err}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Giriş yapılıyor...' : 'Giriş'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.4rem', fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center' }}>
          İçerik üretici misiniz? <Link href="/login" style={{ color: 'var(--red)' }}>Buradan giriş yapın</Link>
          <br/>
          <Link href="/forgot-password" style={{ color: 'var(--red)' }}>Şifremi unuttum</Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {

  const { t } = useLang();  return (
    <Suspense fallback={<div className="login-wrap"><p>{t.loading}</p></div>}>
      <AdminLoginInner />
    </Suspense>
  );
}
