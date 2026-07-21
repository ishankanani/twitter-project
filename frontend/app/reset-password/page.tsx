'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useLang, translateError } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

function Inner() {
  const { t } = useLang();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (pw1 !== pw2) return setErr(t.pw_mismatch);
    if (pw1.length < 6) return setErr(t.pw_min_len);
    setBusy(true);
    try {
      const r = await api.post('/api/auth/reset-password', { token, newPassword: pw1 });
      setMsg(r.message || t.pw_reset_success);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: any) { setErr(translateError(e, t)); }
    setBusy(false);
  }

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--serif)' }}>{t.reset_invalid}</h1>
          <Link href="/forgot-password">← {t.forgot_pw_title}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <h1>{t.reset_pw_title}</h1>
          <p>{t.reset_intro}</p>
        </div>
        {msg ? (
          <div className="form-success">{msg}</div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <div className="form-field">
              <label>{t.new_pw}</label>
              <input type="password" value={pw1} onChange={e => setPw1(e.target.value)} required minLength={6} autoFocus />
            </div>
            <div className="form-field">
              <label>{t.repeat_pw}</label>
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={6} />
            </div>
            {err && <div className="form-error">{err}</div>}
            <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
              {busy ? t.saving : t.reset_pw_btn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="auth-wrap"><p>...</p></div>}>
        <Inner />
      </Suspense>
      <SiteFooter />
    </>
  );
}
