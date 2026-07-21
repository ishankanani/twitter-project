'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function ImpressumPage() {
  const [cms, setCms] = useState<any>({});
  useEffect(() => { api.get('/api/cms').then(r => setCms(r || {})).catch(() => {}); }, []);
  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>Impressum<em>.</em></h1></section>
      <section className="wrap">
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: cms.impressum || 'Impressum bilgileri yakında yayınlanacaktır.' }} />
      </section>
      <SiteFooter />
    </>
  );
}
