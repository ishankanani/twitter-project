'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { api } from '@/lib/api';
import { Toast, useToast } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

const PERIODS = [
  { id: 7, label: 'Son 7 gün' },
  { id: 30, label: 'Son 30 gün' },
  { id: 90, label: 'Son 90 gün' },
  { id: 365, label: 'Son yıl' }
];

const DEVICE_LABELS: Record<string, string> = {
  desktop: '🖥️ Masaüstü',
  mobile: '📱 Mobil',
  tablet: '📟 Tablet',
  bot: '🤖 Bot',
  unknown: '❓ Bilinmeyen'
};

export default function AnalyticsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    setLoading(true);
    try { setData(await api.get(`/api/analytics/summary?days=${days}`, token)); }
    catch (e: any) { show(e.message, 'err'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [token, days]);

  const maxDaily = data?.daily?.length ? Math.max(...data.daily.map((d: any) => d.views), 1) : 1;
  const totalDevices = data?.devices?.reduce((s: number, d: any) => s + d.c, 0) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">📊 Analytics</h1>
          <p className="admin-sub">Site trafiği ve performans</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.id} className={`dash-filter ${days === p.id ? 'on' : ''}`} onClick={() => setDays(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>{t.loading}</p>}

      {data && (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <div className="admin-stat-num">{(data.totals.views || 0).toLocaleString('tr-TR')}</div>
              <div className="admin-stat-label">Görüntüleme</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-num">{(data.totals.unique_visitors || 0).toLocaleString('tr-TR')}</div>
              <div className="admin-stat-label">Tekil Ziyaretçi</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-num">{(data.totals.logged_in_views || 0).toLocaleString('tr-TR')}</div>
              <div className="admin-stat-label">Üye Görüntüleme</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-num">{data.totals.unique_visitors > 0 ? (data.totals.views / data.totals.unique_visitors).toFixed(1) : '0'}</div>
              <div className="admin-stat-label">Ort. Sayfa / Ziyaretçi</div>
            </div>
          </div>

          {/* Daily chart */}
          <div className="admin-card">
            <h3 style={{ marginBottom: '1.2rem' }}>📈 Günlük Trafik</h3>
            {data.daily.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>{t.admin_no_data}</p>
            ) : (
              <div className="chart-bars" style={{ height: 220, gridTemplateColumns: `repeat(${data.daily.length}, 1fr)` }}>
                {data.daily.map((d: any) => {
                  const pct = (d.views / maxDaily) * 100;
                  return (
                    <div key={d.day} className="chart-col" title={`${new Date(d.day).toLocaleDateString('tr-TR')} — ${d.views} görüntüleme`}>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ height: `${pct}%` }} />
                      </div>
                      <span className="chart-bar-label" style={{ fontSize: '.55rem' }}>{new Date(d.day).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1rem' }}>
            {/* Top posts */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '1rem' }}>🔥 En Çok Okunan İçerikler</h3>
              {data.topPosts.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>{t.admin_no_data}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.topPosts.map((p: any, i: number) => (
                    <div key={p.postId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
                      <span style={{ width: 24, fontWeight: 700, color: 'var(--red)' }}>{i + 1}.</span>
                      <Link href={`/blog/${p.slug}`} target="_blank" style={{ flex: 1, fontWeight: 600, fontSize: '.88rem' }}>{p.title}</Link>
                      <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{p.views.toLocaleString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top pages */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '1rem' }}>🌐 En Çok Ziyaret Edilen Sayfalar</h3>
              {data.topPages.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>{t.admin_no_data}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.topPages.slice(0, 10).map((p: any) => (
                    <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                      <code style={{ flex: 1, fontSize: '.78rem', background: 'var(--light)', padding: '3px 8px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</code>
                      <span style={{ color: 'var(--muted)', fontSize: '.78rem', minWidth: 50, textAlign: 'right' }}>{p.views.toLocaleString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Devices */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '1rem' }}>📱 Cihaz Dağılımı</h3>
              {data.devices.map((d: any) => {
                const pct = totalDevices > 0 ? (d.c / totalDevices) * 100 : 0;
                return (
                  <div key={d.device} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', marginBottom: 4 }}>
                      <span>{DEVICE_LABELS[d.device] || d.device}</span>
                      <span style={{ color: 'var(--muted)' }}>{d.c.toLocaleString('tr-TR')} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--light-2)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--red)', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Referers */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '1rem' }}>🔗 Trafik Kaynakları</h3>
              {data.referers.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>{t.admin_no_data}</p>
              ) : data.referers.map((r: any) => (
                <div key={r.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-soft)', fontSize: '.86rem' }}>
                  <span>{r.source}</span>
                  <span style={{ color: 'var(--muted)' }}>{r.c.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
