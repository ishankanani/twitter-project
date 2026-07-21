import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolHero from '@/components/tools/ToolHero';
import HashtagClient from '@/components/tools/HashtagClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'Hashtag Analizi',
  description: 'Ücretsiz hashtag analiz aracı. Bir hashtagin sağlığını, formatını ve spam riskini kontrol edin.',
  alternates: { canonical: '/tools/hashtag' },
  openGraph: {
    title: 'Hashtag Analizi | sosyal-medya.net',
    description: 'Ücretsiz hashtag analiz aracı. Bir hashtagin sağlığını, formatını ve spam riskini kontrol edin.',
    url: SITE + '/tools/hashtag',
    type: 'website'
  }
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Hashtag Analizi',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <SiteHeader />
      <ToolHero tag="# X Aracı" titleKey="tool_hashtag_title" descKey="tool_hashtag_desc" />
      <HashtagClient />
      <SiteFooter />
    </>
  );
}
