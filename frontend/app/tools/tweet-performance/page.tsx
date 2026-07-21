import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolHero from '@/components/tools/ToolHero';
import TweetPerformanceClient from '@/components/tools/TweetPerformanceClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'Tweet Performans Analizi',
  description: 'X (Twitter) tweet performans analiz aracı. Son gönderilerinizin etkileşim oranını, en iyi tweetinizi ve medya etkisini ücretsiz görün.',
  alternates: { canonical: '/tools/tweet-performance' },
  openGraph: {
    title: 'Tweet Performans Analizi | sosyal-medya.net',
    description: 'X (Twitter) tweet performans analiz aracı. Son gönderilerinizin etkileşim oranını, en iyi tweetinizi ve medya etkisini ücretsiz görün.',
    url: SITE + '/tools/tweet-performance',
    type: 'website'
  }
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Tweet Performans Analizi',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <SiteHeader />
      <ToolHero tag="📈 X Aracı" titleKey="tool_perf_title" descKey="tool_perf_desc" />
      <TweetPerformanceClient />
      <SiteFooter />
    </>
  );
}
