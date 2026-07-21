import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import { LangProvider } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'İletişim | sosyal-medya.net',
  description: 'Bizimle iletişime geçin. Sorularınız için form veya e-posta.',
  alternates: { canonical: '/contact' }
};

export default function ContactPage() {
  return (
    <LangProvider>
      <SiteHeader />
      <ContactForm />
      <SiteFooter />
    </LangProvider>
  );
}
