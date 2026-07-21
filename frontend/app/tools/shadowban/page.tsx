import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ShadowbanCheckerClient from '@/components/tools/ShadowbanCheckerClient';
import { LangProvider } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shadowban Checker | sosyal-medya.net',
  description: 'X (Twitter) gölge ban kontrol aracı. Hesabınızın görünürlük durumunu ücretsiz kontrol edin.',
  alternates: { canonical: '/tools/shadowban' }
};

export default function ShadowbanPage() {
  return (
    <LangProvider>
      <SiteHeader />
      <section className="page-hero">
        <p className="section-tag">🚫 X Aracı</p>
        <h1>Shadowban <em>Checker</em></h1>
        <p className="page-hero-desc">
          X hesabınız gölge ban'da mı? Arama görünürlüğü, gönderi sıklığı, hesap yaşı ve daha fazlasını saniyeler içinde test edin.
        </p>
      </section>
      <ShadowbanCheckerClient />
      <SiteFooter />
    </LangProvider>
  );
}
