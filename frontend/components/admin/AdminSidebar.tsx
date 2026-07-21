'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from './AdminAuth';
import { useLang } from '@/lib/i18n';
import LangSwitcher from '@/components/LangSwitcher';
import {
  LayoutDashboard, Twitter, MessageSquare, Inbox, MessageCircle,
  Users, UserCheck, Mail, Handshake, DollarSign, BarChart3,
  Send, Megaphone, Rss, FileText, Shield, Lock, Settings, Newspaper,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  key: string;
  perm?: string;
  roleOnly?: string;
}

const NAV: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, key: 'admin_overview' },
  { href: '/admin/accounts', icon: Twitter, key: 'admin_accounts', perm: 'accounts' },
  { href: '/admin/tweets', icon: MessageSquare, key: 'admin_tweets', perm: 'tweets' },
  { href: '/admin/news-post', icon: Newspaper, key: 'news_post_title' },
  { href: '/admin/posts-review', icon: Inbox, key: 'admin_posts_review', perm: 'posts_review' },
  { href: '/admin/comments', icon: MessageCircle, key: 'admin_comments_mod', perm: 'posts_review' },
  { href: '/admin/users', icon: Users, key: 'admin_users', perm: 'users', roleOnly: 'superadmin' },
  { href: '/admin/subscribers', icon: UserCheck, key: 'admin_subscribers', perm: 'subscribers' },
  { href: '/admin/contacts', icon: Mail, key: 'admin_contacts', perm: 'contacts' },
  { href: '/admin/collaborations', icon: Handshake, key: 'admin_collabs', perm: 'collaborations' },
  { href: '/admin/payments', icon: DollarSign, key: 'admin_revenue', perm: 'payments', roleOnly: 'superadmin' },
  { href: '/admin/analytics', icon: BarChart3, key: 'admin_analytics', roleOnly: 'superadmin' },
  { href: '/admin/newsletter', icon: Send, key: 'admin_newsletter', perm: 'newsletter' },
  { href: '/admin/newsletter/campaigns', icon: Megaphone, key: 'admin_campaigns', perm: 'newsletter' },
  { href: '/admin/rss', icon: Rss, key: 'admin_news_rss', perm: 'rss' },
  { href: '/admin/cms', icon: FileText, key: 'admin_cms', perm: 'cms' },
  { href: '/admin/audit-log', icon: Shield, key: 'admin_audit', roleOnly: 'superadmin' },
  { href: '/admin/security', icon: Lock, key: 'admin_security' },
  { href: '/admin/settings', icon: Settings, key: 'admin_settings', perm: 'settings' },
];

export default function AdminSidebar() {
  const path = usePathname();
  const { user, hasPerm } = useAdminAuth();
  const { t } = useLang();
  if (!user) return null;

  const visible = NAV.filter(item => {
    if (item.href === '/admin') return true;
    if (item.roleOnly && user.role !== item.roleOnly) return false;
    if (item.perm) return hasPerm(item.perm);
    return true;
  });

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        {/* Brand name — never translated */}
        <Link href="/admin">sosyal-medya.net</Link>
        <span style={{ display: 'block', fontSize: '.7rem', color: 'var(--muted)', marginTop: 4, letterSpacing: '.06em' }}>
          {t.admin_panel}
        </span>
      </div>

      <nav className="admin-nav">
        {visible.map(item => {
          const isActive = item.href === '/admin' ? path === '/admin' : path.startsWith(item.href);
          const label = (t as any)[item.key] || item.key;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`admin-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} strokeWidth={1.8} style={{ marginRight: 10, flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: 14, borderTop: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: '.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
          {t.lang_label}
        </div>
        <LangSwitcher variant="light" />
      </div>
    </aside>
  );
}
