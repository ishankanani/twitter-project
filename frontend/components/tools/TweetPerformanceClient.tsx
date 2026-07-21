'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import ToolSourceDown from '@/components/tools/ToolSourceDown';
import { useLang, formatNumber } from '@/lib/i18n';
import { TrendingUp, Heart, Repeat2, MessageCircle, Image as ImageIcon, ExternalLink } from 'lucide-react';

export default function TweetPerformanceClient() {
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
      const r = await api.post('/api/tools/tweet-performance', { handle: handle.trim() });
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
          {/* Profile header */}
          <div className="tool-profile-head">
            {result.profile?.avatar && <img src={result.profile.avatar} alt="" className="tool-avatar" loading="lazy" decoding="async" />}
            <div>
              <div className="tool-profile-name">{result.profile?.displayName || result.handle}</div>
              <div className="tool-profile-handle">@{result.handle} · {fmt(result.profile?.followers)} {t.followers_label}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="tool-stat-grid">
            <div className="tool-stat-box">
              <div className="tool-stat-num">{fmt(result.stats.avgEngagement)}</div>
              <div className="tool-stat-lbl">{t.perf_avg_eng}</div>
            </div>
            <div className="tool-stat-box">
              <div className="tool-stat-num">{result.stats.avgEngagementRate}%</div>
              <div className="tool-stat-lbl">{t.perf_avg_rate}</div>
            </div>
            <div className="tool-stat-box">
              <div className="tool-stat-num" style={{ color: result.stats.mediaBoost >= 0 ? '#16a34a' : '#D10009' }}>
                {result.stats.mediaBoost >= 0 ? '+' : ''}{result.stats.mediaBoost}%
              </div>
              <div className="tool-stat-lbl">{t.perf_media_boost}</div>
            </div>
            <div className="tool-stat-box">
              <div className="tool-stat-num">{result.stats.tweetsAnalyzed}</div>
              <div className="tool-stat-lbl">{t.perf_tweets_analyzed}</div>
            </div>
          </div>

          {/* Best tweet */}
          {result.bestTweet && (
            <div className="tool-section">
              <h3 className="tool-section-title"><TrendingUp size={16} /> {t.perf_best_tweet}</h3>
              <div className="tool-tweet-card featured">
                <p className="tool-tweet-text">{result.bestTweet.text}</p>
                <div className="tool-tweet-stats">
                  <span><Heart size={14} /> {fmt(result.bestTweet.likes)}</span>
                  <span><Repeat2 size={14} /> {fmt(result.bestTweet.retweets)}</span>
                  <span><MessageCircle size={14} /> {fmt(result.bestTweet.replies)}</span>
                  {result.bestTweet.url && <a href={result.bestTweet.url} target="_blank" rel="noopener noreferrer" className="tool-tweet-link"><ExternalLink size={14} /></a>}
                </div>
              </div>
            </div>
          )}

          {/* Tweet list */}
          {result.tweets?.length > 0 && (
            <div className="tool-section">
              <div className="tool-tweet-list">
                {result.tweets.map((tw: any, i: number) => (
                  <div key={i} className="tool-tweet-card">
                    <p className="tool-tweet-text">{tw.text}</p>
                    <div className="tool-tweet-stats">
                      <span><Heart size={13} /> {fmt(tw.likes)}</span>
                      <span><Repeat2 size={13} /> {fmt(tw.retweets)}</span>
                      <span><MessageCircle size={13} /> {fmt(tw.replies)}</span>
                      {tw.hasMedia && <span className="tool-media-tag"><ImageIcon size={13} /></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="tool-data-note">{t.tool_disclaimer_data}</p>
          <button onClick={() => { setResult(null); setHandle(''); }} className="btn-ghost tool-reset">
            {t.tools_try_another}
          </button>
        </div>
      )}
    </div>
  );
}
