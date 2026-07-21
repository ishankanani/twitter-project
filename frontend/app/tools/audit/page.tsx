import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ProfileAuditClient from '@/components/tools/ProfileAuditClient';
import { LangProvider } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile Audit | sosyal-medya.net',
  description: 'X profilinizin otomatik analiz aracı — profil resmi, bio, gönderi kalitesi ve iyileştirme önerileri.',
  alternates: { canonical: '/tools/audit' }
};

export default function AuditPage() {
  return (
    <LangProvider>
      <SiteHeader />
      <section className="page-hero">
        <p className="section-tag">📊 X Aracı</p>
        <h1>Profile <em>Audit</em></h1>
        <p className="page-hero-desc">
          X profilinizin otomatik analiz aracı. Profil resmi, bio kalitesi, gönderi içeriği ve etkileşim çeşitliliği — hepsi tek raporda.
        </p>
      </section>
      <ProfileAuditClient />
      <SiteFooter />
    </LangProvider>
  );
}
