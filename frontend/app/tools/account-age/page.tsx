import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolHero from '@/components/tools/ToolHero';
import AccountAgeClient from '@/components/tools/AccountAgeClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'Hesap Yaşı Hesaplayıcı',
  description: 'X (Twitter) hesap yaşı hesaplayıcı. Bir hesabın ne kadar süredir aktif olduğunu, günlük tweet ve yıllık takipçi oranını görün.',
  alternates: { canonical: '/tools/account-age' },
  openGraph: {
    title: 'Hesap Yaşı Hesaplayıcı | sosyal-medya.net',
    description: 'X (Twitter) hesap yaşı hesaplayıcı. Bir hesabın ne kadar süredir aktif olduğunu, günlük tweet ve yıllık takipçi oranını görün.',
    url: SITE + '/tools/account-age',
    type: 'website'
  }
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Hesap Yaşı Hesaplayıcı',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <SiteHeader />
      <ToolHero tag="📅 X Aracı" titleKey="tool_age_title" descKey="tool_age_desc" />
      <AccountAgeClient />
      <SiteFooter />
    </>
  );
}
