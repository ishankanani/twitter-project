'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang, translateError } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr(''); setBusy(true);
    try {
      const r = await api.post('/api/auth/forgot-password', { email, website });
      setMsg(r.message || t.pw_reset_sent);
    } catch (e: any) { setErr(translateError(e, t)); }
    setBusy(false);
  }

  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-head">
            <h1>{t.forgot_pw_title}</h1>
            <p>{t.forgot_pw_desc}</p>
          </div>
          {msg ? (
            <div className="form-success">{msg}</div>
          ) : (
            <form onSubmit={submit} className="auth-form">
              <div className="form-field">
                <label>{t.email}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} autoComplete="off" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
              {err && <div className="form-error">{err}</div>}
              <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
                {busy ? t.saving : t.send_reset_link}
              </button>
            </form>
          )}
          <div className="auth-foot">
            <Link href="/login">← {t.login}</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
