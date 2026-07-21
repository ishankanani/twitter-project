'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtNum } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { StatCard } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';
import { SkeletonText } from '@/components/Skeleton';
import {
  Inbox, Users, DollarSign, Twitter, MessageSquare, Mail, Handshake, FileText, Settings
} from 'lucide-react';

export default function AdminDashboard() {
  const { token, user, hasPerm, isRole } = useAdminAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get('/api/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const v = (n: any) => loading ? <SkeletonText width={50} height={20} /> : (n ?? '—');

  return (
    <div>
      {/* Username/full name = personal data, never translated */}
      <h1 className="admin-h1">{t.admin_welcome}, {user?.fullName || user?.username}</h1>
      <p className="admin-sub">{t.admin_dashboard}</p>

      <div className="admin-stats">
        <StatCard label={t.admin_stat_users} value={v(stats?.userCount)} />
        <StatCard label={t.admin_stat_pending} value={v(stats?.pendingPosts)} />
        <StatCard label={t.admin_post_approved} value={v(stats?.approvedPosts)} />
        <StatCard label={t.admin_accounts} value={v(stats?.accountCount)} />
        <StatCard label={t.followers_label} value={loading ? <SkeletonText width={60} height={20} /> : fmtNum(stats?.totalFollowers || 0)} />
        <StatCard label={t.admin_stat_subscribers} value={v(stats?.subscriberCount)} />
        <StatCard label={t.admin_tweets} value={v(stats?.tweetCount)} />
        <StatCard label={t.admin_stat_news} value={v(stats?.newsCount)} />
        <StatCard label={t.admin_stat_messages} value={v(stats?.contactCount)} />
        <StatCard label={t.admin_collabs} value={v(stats?.collaborationCount)} />
      </div>

      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem' }}>{t.admin_quick_actions}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {hasPerm('posts_review') && <Link href="/admin/posts-review" className="admin-btn"><Inbox size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_posts_review}{(stats?.pendingPosts > 0) && ` (${stats.pendingPosts})`}</Link>}
          {isRole('superadmin') && <Link href="/admin/users" className="admin-btn admin-btn-ghost"><Users size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_users}</Link>}
          {isRole('superadmin') && <Link href="/admin/payments" className="admin-btn admin-btn-ghost"><DollarSign size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_revenue}</Link>}
          {hasPerm('accounts') && <Link href="/admin/accounts" className="admin-btn admin-btn-ghost"><Twitter size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_accounts}</Link>}
          {hasPerm('tweets') && <Link href="/admin/tweets" className="admin-btn admin-btn-ghost"><MessageSquare size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_tweets}</Link>}
          {hasPerm('contacts') && <Link href="/admin/contacts" className="admin-btn admin-btn-ghost"><Mail size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_contacts}</Link>}
          {hasPerm('collaborations') && <Link href="/admin/collaborations" className="admin-btn admin-btn-ghost"><Handshake size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_collabs}</Link>}
          {hasPerm('cms') && <Link href="/admin/cms" className="admin-btn admin-btn-ghost"><FileText size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_cms}</Link>}
          {hasPerm('settings') && <Link href="/admin/settings" className="admin-btn admin-btn-ghost"><Settings size={14} strokeWidth={2} style={{ marginRight: 6 }} />{t.admin_settings}</Link>}
        </div>
      </div>
    </div>
  );
}
