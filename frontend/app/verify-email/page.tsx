'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

function Inner() {
  const { t } = useLang();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading'|'ok'|'err'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('err'); setMsg(t.verify_invalid); return; }
    (async () => {
      try {
        const r = await api.post('/api/auth/verify-email', { token });
        setStatus('ok'); setMsg(r.message || t.verify_success_desc);
      } catch (e: any) { setStatus('err'); setMsg(e.message); }
    })();
  }, [token, t]);

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div className="tool-spinner" style={{ margin: '0 auto 1.5rem' }} />
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem' }}>{t.verify_loading}</h1>
          </>
        )}
        {status === 'ok' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '0.6rem' }}>{t.verify_success}</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '1.6rem' }}>{msg}</p>
            <Link href="/login" className="btn-primary" style={{ display: 'inline-block' }}>{t.go_to_login}</Link>
          </>
        )}
        {status === 'err' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '0.6rem' }}>{t.verify_error}</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '1.6rem' }}>{msg}</p>
            <Link href="/login" className="btn-ghost" style={{ display: 'inline-block' }}>← {t.login}</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
