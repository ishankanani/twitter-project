import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolHero from '@/components/tools/ToolHero';
import BestTimeClient from '@/components/tools/BestTimeClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'En İyi Paylaşım Zamanı',
  description: 'X (Twitter) için en iyi paylaşım zamanını bulun. Geçmiş gönderilerinize göre en etkili saatleri ve günleri ücretsiz keşfedin.',
  alternates: { canonical: '/tools/best-time' },
  openGraph: {
    title: 'En İyi Paylaşım Zamanı | sosyal-medya.net',
    description: 'X (Twitter) için en iyi paylaşım zamanını bulun. Geçmiş gönderilerinize göre en etkili saatleri ve günleri ücretsiz keşfedin.',
    url: SITE + '/tools/best-time',
    type: 'website'
  }
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'En İyi Paylaşım Zamanı',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <SiteHeader />
      <ToolHero tag="⏰ X Aracı" titleKey="tool_time_title" descKey="tool_time_desc" />
      <BestTimeClient />
      <SiteFooter />
    </>
  );
}
