'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useLang, translateError } from '@/lib/i18n';

function LoginForm() {
  const { login, user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [err, setErr] = useState('');
  const [needsVerify, setNeedsVerify] = useState<string>('');
  const [resendMsg, setResendMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const reason = params.get('reason');
  const redirect = params.get('redirect') || '';

  useEffect(() => {
    if (!loading && user) {
      const dest = redirect || (user.role === 'creator' ? '/dashboard' : '/admin');
      router.replace(dest);
    }
  }, [user, loading, redirect, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setNeedsVerify(''); setResendMsg(''); setBusy(true);
    try {
      const u = await login(username, password, website, totpCode);
      const dest = redirect || (u.role === 'creator' ? '/dashboard' : '/admin');
      router.replace(dest);
    } catch (e: any) {
      if (e.needsVerification && e.email) {
        setNeedsVerify(e.email);
      } else if (e.needsTotp) {
        setNeedsTotp(true);
      } else {
        setErr(translateError(e, t));
        // If 2FA was open but wrong code, keep the prompt visible
        if (e.message && (e.message.includes('2FA') || e.message.includes('kod') || e.message.includes('code'))) {
          setNeedsTotp(true);
        }
      }
    }
    setBusy(false);
  }

  async function resendVerify() {
    setResendMsg('');
    try {
      const r = await api.post('/api/auth/resend-verification', { email: needsVerify });
      setResendMsg(r.message || t.verify_email_sent);
    } catch (e: any) { setResendMsg(e.message); }
  }

  function cancelTotp() {
    setNeedsTotp(false);
    setTotpCode('');
    setErr('');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <h1>{t.login}</h1>
          <p>{t.auth_subtitle_login}</p>
        </div>

        {reason === 'session' && (
          <div className="auth-banner warn" style={{ marginBottom: '1rem' }}>
            {t.session_ended}
          </div>
        )}

        {needsVerify ? (
          <div className="auth-banner warn" style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '8px' }}><strong>{t.email_not_verified}</strong></p>
            <p style={{ fontSize: '.85rem', marginBottom: '12px' }}>{needsVerify}</p>
            <button type="button" className="btn-ghost" onClick={resendVerify} style={{ padding: '8px 14px', fontSize: '.84rem' }}>
              {t.resend_verification}
            </button>
            {resendMsg && <p style={{ marginTop: 8, fontSize: '.82rem', color: 'var(--mid)' }}>{resendMsg}</p>}
          </div>
        ) : null}

        {needsTotp ? (
          <form onSubmit={submit} className="auth-form">
            <div className="auth-banner" style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '12px 14px', borderRadius: 10, marginBottom: '1rem' }}>
              <strong>{t.twofa_title}</strong>
              <p style={{ fontSize: '.84rem', marginTop: 4, color: 'var(--mid)' }}>
                {t.twofa_subtitle}
              </p>
            </div>
            <div className="form-field">
              <label>{t.twofa_code_label}</label>
              <input
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\s/g, '').slice(0, 20))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                maxLength={20}
                style={{ fontSize: '1.4rem', letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'monospace' }}
              />
            </div>
            {err && <div className="form-error">{err}</div>}
            <button type="submit" className="btn-primary" disabled={busy || totpCode.length < 6} style={{ width: '100%' }}>
              {busy ? t.twofa_verifying : t.twofa_verify}
            </button>
            <button type="button" className="btn-ghost" onClick={cancelTotp} style={{ width: '100%', marginTop: 8 }}>
              ← {t.back}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <div className="form-field">
              <label>{t.username} / {t.email}</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus disabled={busy} />
            </div>
            <div className="form-field">
              <label>{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} />
            </div>
            {/* Honeypot */}
            <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} autoComplete="off" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
            {err && <div className="form-error">{err}</div>}
            <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
              {busy ? t.logging_in : t.login}
            </button>
          </form>
        )}

        <div className="auth-foot" style={{ flexDirection: 'column', gap: '8px', display: 'flex', marginTop: '1.4rem', textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ color: 'var(--red)' }}>{t.forgot_pw}</Link>
          <span>{t.no_account} <Link href="/register">{t.register}</Link></span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="auth-wrap"><p>...</p></div>}>
        <LoginForm />
      </Suspense>
      <SiteFooter />
    </>
  );
}
