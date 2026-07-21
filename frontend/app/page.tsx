'use client';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ParticleBg from '@/components/ParticleBg';
import RevealObserver from '@/components/RevealObserver';
import HomeContent from '@/components/HomeContent';
import { api, Account, Subscriber } from '@/lib/api';

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [cms, setCms] = useState<any>({});

  useEffect(() => {
    Promise.all([
      api.get('/api/accounts').catch(() => []),
      api.get('/api/subscribers').catch(() => []),
      api.get('/api/cms').catch(() => ({}))
    ]).then(([a, s, c]) => {
      setAccounts(Array.isArray(a) ? a : []);
      setSubscribers(Array.isArray(s) ? s : []);
      setCms(c || {});
    });
  }, []);

  return (
    <>
      <ParticleBg />
      <RevealObserver />
      <SiteHeader />
      <HomeContent accounts={accounts} subscribers={subscribers} cms={cms} />
      <SiteFooter />
    </>
  );
}
