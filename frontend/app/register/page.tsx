'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useLang, translateError } from '@/lib/i18n';

function RegisterForm() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setSuccessMsg('');
    if (password !== confirm) return setErr(t.pw_mismatch);
    if (password.length < 6) return setErr(t.pw_min_len);
    if (!agree) return setErr(t.accept_terms);
    setBusy(true);
    try {
      const r = await api.post('/api/auth/register', { username, email, password, fullName, website });
      setSuccessMsg(r.message || t.verify_email_sent);
    } catch (e: any) { setErr(translateError(e, t)); }
    setBusy(false);
  }

  if (successMsg) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '0.6rem' }}>{t.verify_email_sent}</h1>
          <p style={{ color: 'var(--mid)', marginBottom: '1.4rem', lineHeight: 1.55 }}>{successMsg}</p>
          {/* Email = personal data, never translated */}
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            <strong>{email}</strong>
          </p>
          <Link href="/login" className="btn-ghost" style={{ display: 'inline-block' }}>← {t.login}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <h1>{t.register_title}</h1>
          <p>{t.register_sub}</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="form-field">
            <label>{t.full_name}</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required disabled={busy} />
          </div>
          <div className="form-field">
            <label>{t.username}</label>
            <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} required disabled={busy} minLength={3} maxLength={30} />
          </div>
          <div className="form-field">
            <label>{t.email}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} minLength={6} />
            </div>
            <div className="form-field">
              <label>{t.repeat_pw}</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={busy} />
            </div>
          </div>
          <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} autoComplete="off" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.84rem', color: 'var(--mid)' }}>
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 4 }} />
            <span>
              <Link href="/terms" style={{ color: 'var(--red)' }}>{t.terms}</Link> + <Link href="/gizlilik" style={{ color: 'var(--red)' }}>{t.privacy}</Link>
            </span>
          </label>
          {err && <div className="form-error">{err}</div>}
          <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? t.creating_account : t.register_btn}
          </button>
        </form>

        <div className="auth-foot">
          {t.have_account} <Link href="/login">{t.login}</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <RegisterForm />
      <SiteFooter />
    </>
  );
}
