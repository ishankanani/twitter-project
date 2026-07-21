'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useLang, Lang } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface Tool { href: string; icon: string; labelKey: string; descKey: string; }
const TOOLS: Tool[] = [
  { href: '/tools/shadowban', icon: '🚫', labelKey: 'tool_shadowban_title', descKey: 'tool_shadowban_desc' },
  { href: '/tools/audit', icon: '📊', labelKey: 'tool_audit_title', descKey: 'tool_audit_desc' },
  { href: '/tools/tweet-performance', icon: '📈', labelKey: 'tool_perf_title', descKey: 'tool_perf_desc' },
  { href: '/tools/best-time', icon: '⏰', labelKey: 'tool_time_title', descKey: 'tool_time_desc' },
  { href: '/tools/bio-generator', icon: '✨', labelKey: 'tool_bio_title', descKey: 'tool_bio_desc' },
  { href: '/tools/hashtag', icon: '#️⃣', labelKey: 'tool_hashtag_title', descKey: 'tool_hashtag_desc' },
  { href: '/tools/account-age', icon: '📅', labelKey: 'tool_age_title', descKey: 'tool_age_desc' },
];

export default function SiteHeader() {
  const { lang, t, setLang } = useLang();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const path = usePathname();
  const langs: Lang[] = ['tr', 'en', 'de'];
  const toolsRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  useEffect(() => { setOpen(false); setToolsOpen(false); }, [path]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    }
    if (toolsOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [toolsOpen]);

  useEffect(() => {
    function handle() { if (window.innerWidth > 880) setOpen(false); }
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const dashHref = user ? (user.role === 'creator' ? '/dashboard' : '/admin') : '/login';
  const dashLabel = user ? '👤 ' + (user.fullName || user.username) : 'Giriş';

  return (
    <>
      <header className="site">
        <Link href="/" className="logo">sosyal-medya.net</Link>

        <nav className={`h-nav ${open ? 'open' : ''}`}>
          <Link href="/" className={`h-nav-link ${isActive('/') ? 'active' : ''}`}>{t.nav_home}</Link>
          <Link href="/news" className={`h-nav-link ${isActive('/news') ? 'active' : ''}`}>{t.nav_news}</Link>
          <Link href="/blog" className={`h-nav-link ${isActive('/blog') ? 'active' : ''}`}>Blog</Link>

          <div className="h-tools-wrap" ref={toolsRef}>
            <button type="button" className={`h-nav-link h-tools-btn ${path.startsWith('/tools') ? 'active' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} aria-expanded={toolsOpen}>
              {t.nav_tools} <span className="h-tools-caret">▾</span>
            </button>
            {toolsOpen && (
              <div className="h-tools-menu">
                <Link href="/tools" className="h-tools-item h-tools-all" onClick={() => setToolsOpen(false)}>
                  <span className="h-tools-icon">🧰</span>
                  <span><span className="h-tools-label">{t.tools_hub_title}</span><span className="h-tools-desc">{t.tools_hub_desc}</span></span>
                </Link>
                {TOOLS.map(tool => (
                  <Link key={tool.href} href={tool.href} className="h-tools-item" onClick={() => setToolsOpen(false)}>
                    <span className="h-tools-icon">{tool.icon}</span>
                    <span><span className="h-tools-label">{(t as any)[tool.labelKey]}</span><span className="h-tools-desc">{(t as any)[tool.descKey]}</span></span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/about" className={`h-nav-link ${isActive('/about') ? 'active' : ''}`}>{t.nav_about}</Link>
          <Link href="/contact" className={`h-nav-link ${isActive('/contact') ? 'active' : ''}`}>{t.nav_contact}</Link>
          <Link href="/collaboration" className={`h-nav-link ${isActive('/collaboration') ? 'active' : ''}`}>{t.nav_collab}</Link>

          <div className="h-nav-tools-mobile">
            <div className="h-nav-mobile-section-label">{t.nav_tools}</div>
            {TOOLS.map(tool => (
              <Link key={tool.href} href={tool.href} className="h-nav-link" onClick={() => setOpen(false)}>
                <span style={{ marginRight: 8 }}>{tool.icon}</span>{(t as any)[tool.labelKey]}
              </Link>
            ))}
          </div>
        </nav>

        <div className="h-right">
          <Link href="/search" className="h-search-btn" aria-label="Ara">🔍</Link>
          <Link href={dashHref} className="h-login-btn">{dashLabel}</Link>
          <button className="h-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <div className="lang-bar">
        {langs.map(l => (
          <button key={l} className={`lang-btn ${lang === l ? 'on' : ''}`} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  );
}
