'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function AccountPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useLang();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!handle) return;
    document.title = `@${handle} | sosyal-medya.net`;
    api.get(`/api/x-accounts/${handle}`).then(a => setAccount(a))
      .catch(() => {}).finally(() => setLoading(false));
  }, [handle]);

  const fullUrl = (u: string) => u && !u.startsWith('http') ? `${API}${u}` : u || '';

  if (loading) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}>Loading...</div><SiteFooter /></>);
  if (!account) return (<><SiteHeader /><div className="wrap" style={{ padding: '4rem 1rem', textAlign: 'center' }}><h1>404</h1><p>Hesap bulunamadı</p><Link href="/">← Ana Sayfa</Link></div><SiteFooter /></>);

  return (
    <>
      <SiteHeader />
      <section className="wrap" style={{ paddingTop: '2rem' }}>
        <Link href="/" className="acc-detail-back">← Geri</Link>
        <div className="acc-detail-card">
          {account.avatar && <img src={fullUrl(account.avatar)} alt="" className="acc-detail-av-img" loading="lazy" decoding="async" />}
          <h1 className="acc-detail-name">{account.displayName || handle}</h1>
          <p className="acc-detail-handle">@{handle}</p>
          {account.bio && <p className="acc-detail-bio">{account.bio}</p>}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
