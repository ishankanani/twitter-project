'use client';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { api } from '@/lib/api';
import { useLang, formatDate } from '@/lib/i18n';

export default function AuditLogPage() {
  const { token } = useAdminAuth();
  const { t, lang } = useLang();
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { if (token) api.get('/api/audit-log?limit=200', token).then(setList).catch(() => {}); }, [token]);

  return (
    <div>
      <h1 className="admin-h1">{t.admin_audit_title}</h1>
      <p className="admin-sub">{t.admin_audit_sub}</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead><tr><th>{t.admin_date}</th><th>{t.audit_actor}</th><th>{t.audit_action}</th><th>{t.audit_target}</th><th>{t.audit_ip}</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>{t.admin_no_data}</td></tr>
            ) : list.map(a => (
              <tr key={a.id}>
                <td style={{ fontSize: '.78rem', fontFamily: 'monospace' }}>{formatDate(a.createdAt, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                {/* username/action/ip are technical data — never translated */}
                <td>@{a.username || '—'}</td>
                <td><code style={{ background: 'var(--light)', padding: '2px 6px', borderRadius: 4, fontSize: '.78rem' }}>{a.action}</code></td>
                <td style={{ fontSize: '.82rem' }}>{a.entity ? `${a.entity}#${a.entityId || '—'}` : '—'}</td>
                <td style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{a.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
