import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CollaborationForm from '@/components/CollaborationForm';
import { LangProvider } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'İş Birliği | sosyal-medya.net',
  description: 'Reklam, iş birliği ve ticari teklifleriniz için bize ulaşın.',
  alternates: { canonical: '/collaboration' }
};

export default function CollaborationPage() {
  return (
    <LangProvider>
      <SiteHeader />
      <CollaborationForm />
      <SiteFooter />
    </LangProvider>
  );
}
