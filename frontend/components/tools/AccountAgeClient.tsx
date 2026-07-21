'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import ToolSourceDown from '@/components/tools/ToolSourceDown';
import { useLang, formatNumber, formatDate } from '@/lib/i18n';
import { CalendarClock } from 'lucide-react';

export default function AccountAgeClient() {
  const { t, lang } = useLang();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceDown, setSourceDown] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    if (!handle.trim()) return;
    setError(''); setSourceDown(false); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/account-age', { handle: handle.trim() });
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

  const fmt = (n: number) => formatNumber(n || 0, lang);

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
          <div className="tool-profile-head">
            {result.profile?.avatar && <img src={result.profile.avatar} alt="" className="tool-avatar" loading="lazy" decoding="async" />}
            <div>
              <div className="tool-profile-name">{result.profile?.displayName || result.handle}</div>
              <div className="tool-profile-handle">@{result.handle}</div>
            </div>
          </div>

          {/* Big age display */}
          <div className="tool-age-hero">
            <CalendarClock size={28} className="tool-age-icon" />
            <div className="tool-age-big">
              <span><b>{result.ageYears}</b> {t.age_years}</span>
              <span><b>{result.ageMonths}</b> {t.age_months}</span>
            </div>
            <div className="tool-age-days">{fmt(result.ageDays)} {t.age_days}</div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat-box">
              <div className="tool-stat-num">{formatDate(result.joinDate, lang, { year: 'numeric', month: 'short' })}</div>
              <div className="tool-stat-lbl">{t.age_joined}</div>
            </div>
            <div className="tool-stat-box">
              <div className="tool-stat-num">{result.tweetsPerDay}</div>
              <div className="tool-stat-lbl">{t.age_tweets_per_day}</div>
            </div>
            <div className="tool-stat-box">
              <div className="tool-stat-num">{fmt(result.followersPerYear)}</div>
              <div className="tool-stat-lbl">{t.age_followers_per_year}</div>
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
