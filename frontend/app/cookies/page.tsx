'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function CookiesPage() {
  const [cms, setCms] = useState<any>({});
  useEffect(() => { api.get('/api/cms').then(r => setCms(r || {})).catch(() => {}); }, []);
  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>Çerez Politikası<em>.</em></h1></section>
      <section className="wrap">
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: cms.cookies || 'Çerez politikası yakında yayınlanacaktır.' }} />
      </section>
      <SiteFooter />
    </>
  );
}
