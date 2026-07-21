'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/** Hook used by admin pages — returns token + user, enforces role */
export function useAdminAuth() {
  const auth = useAuth();
  return {
    token: auth.token,
    user: auth.user,
    username: auth.user?.username || '',
    role: auth.user?.role,
    permissions: auth.user?.permissions || {},
    logout: auth.logout,
    hasPerm: auth.hasPerm,
    isRole: auth.isRole
  };
}

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (path === '/admin/login') return;
    if (!user) { router.replace('/admin/login?redirect=' + encodeURIComponent(path)); return; }
    if (user.role === 'creator') router.replace('/dashboard');
  }, [user, loading, path, router]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>;
  if (path === '/admin/login') return <>{children}</>;
  if (!user || user.role === 'creator') return null;

  return <>{children}</>;
}
