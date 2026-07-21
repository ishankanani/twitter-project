'use client';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import { useLang } from '@/lib/i18n';

export default function AdminSecurityPage() {
  const { t } = useLang();
  return (
    <div>
      <h1 className="admin-h1">{t.admin_sec_title}</h1>
      <p className="admin-sub">{t.admin_sec_sub}</p>
      <TwoFactorSetup />
    </div>
  );
}
