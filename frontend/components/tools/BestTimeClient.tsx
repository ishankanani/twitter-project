'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import ToolSourceDown from '@/components/tools/ToolSourceDown';
import { useLang } from '@/lib/i18n';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

const DAY_KEYS = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'];

export default function BestTimeClient() {
  const { t } = useLang();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceDown, setSourceDown] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    if (!handle.trim()) return;
    setError(''); setSourceDown(false); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/best-time', { handle: handle.trim() });
      setResult(r);
    } catch (e: any) {
      if (e.code === 'SOURCE_UNAVAILABLE') {
        setSourceDown(true);
      } else {
        setError((e.code && (t as any)[`err_${e.code}`]) || e.message || t.tools_error_generic);
      }
    }
    setLoading(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run();
  }

  const dayName = (d: number) => (t as any)[DAY_KEYS[d]] || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d];
  const hourLabel = (h: number) => `${String(h).padStart(2, '0')}${t.time_oclock}`;

  // Max for bar scaling
  const maxHour = result ? Math.max(...result.hourScores.map((h: any) => h.avgEngagement), 1) : 1;

  return (
    <div className="tool-shell">
      <form onSubmit={submit} className="tool-input-row">
        <div className="tool-input-wrap">
          <span className="tool-input-at">@</span>
          <input value={handle} onChange={e => setHandle(e.target.value.replace(/^@/, ''))}
            placeholder={t.tools_handle_ph} required disabled={loading} autoComplete="off" />
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !handle.trim()}>
          {loading ? t.tools_analyzing : t.tools_analyze}
        </button>
      </form>

      {sourceDown && <ToolSourceDown onRetry={run} />}
      {error && <div className="tool-error">{error}</div>}
      {loading && <div className="tool-loading"><div className="tool-spinner" /><p>{t.tools_analyzing}</p></div>}

      {result && !loading && (
        <div className="tool-result">
          {result.note === 'low_data' && (
            <div className="tool-warn-banner"><AlertCircle size={16} /> {t.time_low_data}</div>
          )}

          {/* Top hours */}
          <div className="tool-section">
            <h3 className="tool-section-title"><Clock size={16} /> {t.time_top_hours}</h3>
            <div className="tool-chip-row">
              {result.topHours.map((h: any, i: number) => (
                <div key={i} className={`tool-chip ${i === 0 ? 'best' : ''}`}>
                  <span className="tool-chip-main">{hourLabel(h.hour)}</span>
                  <span className="tool-chip-sub">{h.avgEngagement} · {h.posts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top days */}
          <div className="tool-section">
            <h3 className="tool-section-title"><Calendar size={16} /> {t.time_top_days}</h3>
            <div className="tool-chip-row">
              {result.topDays.map((d: any, i: number) => (
                <div key={i} className={`tool-chip ${i === 0 ? 'best' : ''}`}>
                  <span className="tool-chip-main">{dayName(d.day)}</span>
                  <span className="tool-chip-sub">{d.avgEngagement} · {d.posts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hour heatmap bars */}
          <div className="tool-section">
            <div className="tool-hour-bars">
              {result.hourScores.map((h: any) => (
                <div key={h.hour} className="tool-hour-bar-col" title={`${hourLabel(h.hour)} · ${h.avgEngagement}`}>
                  <div className="tool-hour-bar" style={{ height: `${Math.max((h.avgEngagement / maxHour) * 100, 3)}%`, opacity: h.posts ? 1 : 0.15 }} />
                  {h.hour % 6 === 0 && <span className="tool-hour-lbl">{h.hour}</span>}
                </div>
              ))}
            </div>
          </div>

          <p className="tool-data-note">{t.tool_disclaimer_data}</p>
          <button onClick={() => { setResult(null); setHandle(''); }} className="btn-ghost tool-reset">
            {t.tools_try_another}
          </button>
        </div>
      )}
    </div>
  );
}
