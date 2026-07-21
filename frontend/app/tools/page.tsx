import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ToolsHubClient from '@/components/tools/ToolsHubClient';
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  title: 'Ücretsiz X (Twitter) Araçları',
  description: 'Ücretsiz X (Twitter) araçları: gölge ban kontrolü, profil denetimi, tweet performans analizi, en iyi paylaşım zamanı, bio oluşturucu, hashtag analizi ve hesap yaşı hesaplayıcı.',
  keywords: ['x araçları', 'twitter araçları', 'shadowban checker', 'bio generator', 'hashtag analiz', 'tweet performans'],
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Ücretsiz X (Twitter) Araçları | sosyal-medya.net',
    description: '7 ücretsiz araç ile X profilinizi optimize edin.',
    url: `${SITE}/tools`,
    type: 'website'
  }
};

// JSON-LD: ItemList of tools for rich results
const toolsSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'X (Twitter) Tools',
  itemListElement: [
    'Bio Generator', 'Hashtag Analyzer', 'Shadowban Checker', 'Profile Audit',
    'Tweet Performance Analyzer', 'Best Time to Post', 'Account Age Calculator'
  ].map((name, i) => ({ '@type': 'ListItem', position: i + 1, name }))
};

// JSON-LD: FAQ schema (matches the on-page FAQ) for rich results
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { q: 'Bu araçlar gerçekten ücretsiz mi?', a: 'Evet. Tüm araçlar tamamen ücretsizdir, kayıt veya kredi kartı gerektirmez.' },
    { q: 'Verilerim saklanıyor mu?', a: 'Hayır. Girdiğiniz kullanıcı adı yalnızca analiz için kullanılır ve saklanmaz.' },
    { q: 'Sonuçlar ne kadar doğru?', a: 'Araçlar herkese açık X verisini kullanır. Sonuçlar rehber niteliğindedir; X yalnızca kendi durumunu resmi olarak doğrular.' }
  ].map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
};

export default function ToolsHub() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteHeader />
      <ToolsHubClient />
      <SiteFooter />
    </>
  );
}
