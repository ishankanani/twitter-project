'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip admin/dashboard pages — only track public traffic
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/dashboard') ||
        pathname.startsWith('/login') || pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') ||
        pathname.startsWith('/verify-email')) return;

    const token = (() => { try { return localStorage.getItem('sm_token'); } catch { return null; } })();
    const referer = typeof document !== 'undefined' ? document.referrer : '';

    // Fire and forget
    fetch(`${API_URL}/api/analytics/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ path: pathname, referer })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
