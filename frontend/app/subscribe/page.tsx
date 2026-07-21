'use client';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RevealObserver from '@/components/RevealObserver';
import SubscribeContent from '@/components/SubscribeContent';
import { api, Account, Subscriber } from '@/lib/api';

export default function SubscribePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/accounts').catch(() => []),
      api.get('/api/subscribers').catch(() => [])
    ]).then(([a, s]) => {
      setAccounts(Array.isArray(a) ? a : []);
      setSubscribers(Array.isArray(s) ? s : []);
    });
  }, []);

  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <SubscribeContent accounts={accounts} subscribers={subscribers} />
      <SiteFooter />
    </>
  );
}
