'use client';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import { useLang } from '@/lib/i18n';

export default function CreatorSecurityPage() {
  const { t } = useLang();
  return (
    <div>
      <h2 className="dash-h2">🛡️ {t.admin_security}</h2>
      <p className="dash-sub">{t.admin_sec_sub}</p>
      <TwoFactorSetup />
    </div>
  );
}
