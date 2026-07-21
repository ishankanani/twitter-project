'use client';
import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site">
      <div className="foot-col foot-brand-col">
        <Link href="/" className="foot-logo">sosyal-medya.net</Link>
        <p className="foot-tagline">Türkiye'nin bağımsız dijital yayın ağı</p>
        <p className="foot-company">Nexify Street — Ishan</p>
      </div>

      <div className="foot-col">
        <h4 className="foot-h">Keşfet</h4>
        <Link href="/" className="foot-link">Ana Sayfa</Link>
        <Link href="/news" className="foot-link">Haberler</Link>
        <Link href="/blog" className="foot-link">Blog</Link>
        <Link href="/tools" className="foot-link">Araçlar</Link>
        <a href={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/feed.xml'} target="_blank" rel="noopener" className="foot-link">📡 RSS</a>
      </div>

      <div className="foot-col">
        <h4 className="foot-h">Kurumsal</h4>
        <Link href="/about" className="foot-link">Hakkımızda</Link>
        <Link href="/contact" className="foot-link">İletişim</Link>
        <Link href="/collaboration" className="foot-link">İş Birliği</Link>
        <Link href="/subscribe" className="foot-link">Abonelik</Link>
      </div>

      <div className="foot-col">
        <h4 className="foot-h">Yasal</h4>
        <Link href="/gizlilik" className="foot-link">Gizlilik Politikası</Link>
        <Link href="/cookies" className="foot-link">Çerez Politikası</Link>
        <Link href="/terms" className="foot-link">Kullanım Şartları</Link>
        <Link href="/impressum" className="foot-link">Impressum</Link>
      </div>

      <div className="foot-bottom">
        © {year} Nexify Street — Ishan · Tüm hakları saklıdır
      </div>
    </footer>
  );
}
