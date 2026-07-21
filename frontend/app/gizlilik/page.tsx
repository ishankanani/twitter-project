'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function PrivacyPage() {
  const [cms, setCms] = useState<any>({});
  useEffect(() => { api.get('/api/cms').then(r => setCms(r || {})).catch(() => {}); }, []);
  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>Gizlilik Politikası<em>.</em></h1></section>
      <section className="wrap">
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: cms.privacy || 'Gizlilik politikası yakında yayınlanacaktır.' }} />
      </section>
      <SiteFooter />
    </>
  );
}
