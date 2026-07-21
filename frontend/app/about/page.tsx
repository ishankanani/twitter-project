'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function AboutPage() {
  const [cms, setCms] = useState<any>({});
  useEffect(() => { api.get('/api/cms').then(r => setCms(r || {})).catch(() => {}); }, []);
  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>Hakkımızda<em>.</em></h1></section>
      <section className="wrap">
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: cms.about || 'Hakkımızda bilgileri yakında yayınlanacaktır.' }} />
      </section>
      <SiteFooter />
    </>
  );
}
