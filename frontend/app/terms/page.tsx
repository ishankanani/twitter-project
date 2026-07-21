'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function TermsPage() {
  const [cms, setCms] = useState<any>({});
  useEffect(() => { api.get('/api/cms').then(r => setCms(r || {})).catch(() => {}); }, []);
  return (
    <>
      <SiteHeader />
      <section className="page-hero"><h1>Kullanım Koşulları<em>.</em></h1></section>
      <section className="wrap">
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: cms.terms || 'Kullanım koşulları yakında yayınlanacaktır.' }} />
      </section>
      <SiteFooter />
    </>
  );
}
