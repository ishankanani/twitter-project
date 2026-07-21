import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolHero from '@/components/tools/ToolHero';
import BioGeneratorClient from '@/components/tools/BioGeneratorClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'Bio Oluşturucu',
  description: 'Ücretsiz X (Twitter) bio oluşturucu. Konularınıza ve tonunuza göre saniyeler içinde etkileyici bio oluşturun.',
  alternates: { canonical: '/tools/bio-generator' },
  openGraph: {
    title: 'Bio Oluşturucu | sosyal-medya.net',
    description: 'Ücretsiz X (Twitter) bio oluşturucu. Konularınıza ve tonunuza göre saniyeler içinde etkileyici bio oluşturun.',
    url: SITE + '/tools/bio-generator',
    type: 'website'
  }
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bio Oluşturucu',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <SiteHeader />
      <ToolHero tag="✨ X Aracı" titleKey="tool_bio_title" descKey="tool_bio_desc" />
      <BioGeneratorClient />
      <SiteFooter />
    </>
  );
}
