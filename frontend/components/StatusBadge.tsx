'use client';

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#f3f4f6', color: '#6b7280', label: 'Taslak' },
    pending: { bg: '#fef3c7', color: '#d97706', label: 'Beklemede' },
    approved: { bg: '#d1fae5', color: '#059669', label: 'Onaylı' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Reddedildi' },
    scheduled: { bg: '#dbeafe', color: '#2563eb', label: 'Zamanlanmış' }
  };
  const c = colors[status] || colors.draft;
  return <span style={{ display: 'inline-block', padding: '.2rem .6rem', borderRadius: 999, fontSize: '.75rem', fontWeight: 700, background: c.bg, color: c.color }}>{c.label}</span>;
}
