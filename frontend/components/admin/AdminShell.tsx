'use client';
import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminAuthGuard, useAdminAuth } from './AdminAuth';
import AdminSidebar from './AdminSidebar';
import NotificationBell from '../dashboard/NotificationBell';
import { useLang } from '@/lib/i18n';
import { Menu, X } from 'lucide-react';

export default function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  if (path === '/admin/login') return <>{children}</>;

  return (
    <AdminAuthGuard>
      <InnerShell>{children}</InnerShell>
    </AdminAuthGuard>
  );
}

function InnerShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const { t } = useLang();
  const path = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer whenever the route changes (user tapped a nav item)
  useEffect(() => { setDrawerOpen(false); }, [path]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  if (!user) return null;

  const roleLabel = user.role === 'superadmin' ? t.admin_role_superadmin
    : user.role === 'publisher' ? t.admin_role_publisher
    : t.admin_role_creator;

  return (
    <div className="admin-shell">
      {/* Mobile drawer backdrop */}
      {drawerOpen && <div className="admin-drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <div className={`admin-sidebar-wrap ${drawerOpen ? 'drawer-open' : ''}`}>
        <AdminSidebar />
      </div>

      <main className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            {/* Hamburger — only visible on mobile via CSS */}
            <button
              className="admin-burger"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label={t.admin_panel}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
            </button>
            <span className={`admin-role-tag role-${user.role}`}>
              {roleLabel.toUpperCase()}
            </span>
            {/* Username = personal data, never translated */}
            <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>{user.fullName || user.username}</span>
          </div>
          <div className="admin-topbar-right">
            <NotificationBell />
            <Link href="/" className="dash-topbar-link">{t.nav_home} ↗</Link>
            <button onClick={logout} className="admin-btn admin-btn-ghost" style={{ fontSize: '.78rem' }}>{t.logout}</button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
