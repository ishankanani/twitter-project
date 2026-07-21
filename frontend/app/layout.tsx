import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { LangProvider } from '@/lib/i18n';
import CookieConsent from '@/components/CookieConsent';
import PageViewTracker from '@/components/PageViewTracker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'sosyal-medya.net | Dijital Ekosistemimiz',
    template: '%s | sosyal-medya.net'
  },
  description: "Türkiye'nin kaliteli ve bağımsız dijital yayın ağlarından biriyiz. X hesapları, canlı içerik ve Türkiye haberleri.",
  applicationName: 'sosyal-medya.net',
  authors: [{ name: 'Nexify Street', url: SITE_URL }],
  generator: 'Next.js',
  keywords: ['sosyal medya', 'türkiye', 'haberler', 'blog', 'X hesapları', 'twitter', 'dijital yayın'],
  referrer: 'origin-when-cross-origin',
  creator: 'Nexify Street',
  publisher: 'sosyal-medya.net',
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: ['en_US', 'de_DE'],
    url: SITE_URL,
    siteName: 'sosyal-medya.net',
    title: 'sosyal-medya.net | Bağımsız Kalite',
    description: "Türkiye'nin kaliteli ve bağımsız dijital yayın ağı. X hesapları, blog, haberler.",
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'sosyal-medya.net'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'sosyal-medya.net | Bağımsız Kalite',
    description: 'Kaliteli ve şeffaf dijital yayın ağımız.',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'tr-TR': SITE_URL,
      'en-US': SITE_URL,
      'de-DE': SITE_URL,
      'x-default': SITE_URL
    }
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#D10009'
};

// JSON-LD structured data — tells Google what this site is
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'sosyal-medya.net',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: "Türkiye'nin kaliteli ve bağımsız dijital yayın ağı",
  sameAs: [
    'https://twitter.com/sosyalmedyanet',
    'https://t.me/sosyalmedyanet'
  ]
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'sosyal-medya.net',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <LangProvider>
          <AuthProvider>
            {children}
            <CookieConsent />
            <PageViewTracker />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
