'use client';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RevealObserver from '@/components/RevealObserver';
import NewsContent from '@/components/NewsContent';
import { api, NewsItem } from '@/lib/api';

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    api.get('/api/news?limit=80').then(r => setNews(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <NewsContent news={news} />
      <SiteFooter />
    </>
  );
}
