'use client';
import Link from 'next/link';
import { Account, fmtNum, initials } from '@/lib/api';
import { useLang } from '@/lib/i18n';

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622z" />
  </svg>
);

export default function AccountRow({ acc }: { acc: Account }) {
  const { t } = useLang();
  return (
    <Link className="acc-row reveal" href={`/account/${acc.handle}`}>
      <div className="av">
        {acc.avatar ? <img src={acc.avatar} alt={acc.displayName} loading="lazy" decoding="async"/> : initials(acc.displayName)}
      </div>
      <div className="acc-info">
        <div className="acc-name">{acc.displayName}</div>
        <div className="acc-handle">@{acc.handle}</div>
        <div className="acc-meta">{fmtNum(acc.followers)} {t.followers_label.toLowerCase()}</div>
      </div>
      <span className="acc-btn" onClick={e => e.stopPropagation()}>
        <XIcon />
        <span>{t.view_posts}</span>
      </span>
    </Link>
  );
}
