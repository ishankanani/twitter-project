'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import NotificationBell from '@/components/dashboard/NotificationBell';
import LangSwitcher from '@/components/LangSwitcher';
import {
  Home, FileText, PenSquare, Radio, Bookmark, Bell, User, Shield,
  LucideIcon
} from 'lucide-react';

interface NavItem { href: string; icon: LucideIcon; key: string; }

const NAV: NavItem[] = [
  { href: '/dashboard', icon: Home, key: 'dash_overview' },
  { href: '/dashboard/posts', icon: FileText, key: 'dash_my_posts' },
  { href: '/dashboard/posts/new', icon: PenSquare, key: 'dash_new_post' },
  { href: '/dashboard/activity', icon: Radio, key: 'dash_activity' },
  { href: '/dashboard/bookmarks', icon: Bookmark, key: 'dash_bookmarks' },
  { href: '/dashboard/notifications', icon: Bell, key: 'dash_notifications' },
  { href: '/dashboard/profile', icon: User, key: 'dash_profile' },
  { href: '/dashboard/security', icon: Shield, key: 'dash_security' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login?redirect=' + encodeURIComponent(path)); return; }
    if (user.role !== 'creator') {
      router.replace('/admin');
    }
  }, [user, loading, router, path]);

  if (loading || !user || user.role !== 'creator') {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>{t.loading}</div>;
  }

  const currentLabel = (() => {
    const found = NAV.find(n => path.startsWith(n.href) && (n.href !== '/dashboard' || path === '/dashboard'));
    return found ? (t as any)[found.key] : 'Panel';
  })();

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          {/* Brand — never translated */}
          <Link href="/" className="dash-logo">sosyal-medya.net</Link>
          <span className="dash-role-tag">{t.dash_subtitle_creator}</span>
        </div>
        <nav className="dash-nav">
          {NAV.map(item => {
            const active = item.href === '/dashboard' ? path === '/dashboard' : path.startsWith(item.href);
            const label = (t as any)[item.key] || item.key;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`dash-nav-item ${active ? 'active' : ''}`}>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: '.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
            {t.lang_label}
          </div>
          <LangSwitcher variant="light" />
        </div>

        <div className="dash-user-foot">
          <div className="dash-user-row">
            <div className="dash-user-av">{(user.fullName || user.username).slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Username/full name = personal data, never translated */}
              <div className="dash-user-name">{user.fullName || user.username}</div>
              <div className="dash-user-handle">@{user.username}</div>
            </div>
          </div>
          <button onClick={logout} className="dash-logout-btn">{t.logout}</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar-title">{currentLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationBell />
            <Link href="/" className="dash-topbar-link">{t.nav_home} ↗</Link>
          </div>
        </header>
        <div className="dash-content">{children}</div>
      </main>
    </div>
  );
}
