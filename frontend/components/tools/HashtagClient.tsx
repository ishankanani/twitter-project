'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Hash, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function HashtagClient() {
  const { t } = useLang();
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/hashtag', { hashtag: tag.trim() });
      setResult(r);
    } catch (e: any) {
      setError((e.code && (t as any)[`err_${e.code}`]) || e.message || t.tools_error_generic);
    }
    setLoading(false);
  }

  const icon = (s: string) => s === 'pass'
    ? <CheckCircle2 size={18} className="tool-check-pass" />
    : s === 'warn'
      ? <AlertTriangle size={18} className="tool-check-warn" />
      : <XCircle size={18} className="tool-check-fail" />;

  const verdictLabel = (v: string) => v === 'good' ? t.hashtag_good : v === 'ok' ? t.hashtag_ok : t.hashtag_poor;
  const verdictColor = (v: string) => v === 'good' ? '#16a34a' : v === 'ok' ? '#ea580c' : '#D10009';

  return (
    <div className="tool-shell">
      <form onSubmit={submit} className="tool-input-row">
        <div className="tool-input-wrap">
          <span className="tool-input-at">#</span>
          <input value={tag} onChange={e => setTag(e.target.value.replace(/^#/, ''))}
            placeholder={t.hashtag_ph} required disabled={loading} autoComplete="off" />
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !tag.trim()}>
          {loading ? t.tools_analyzing : t.hashtag_check}
        </button>
      </form>

      {error && <div className="tool-error">{error}</div>}
      {loading && <div className="tool-loading"><div className="tool-spinner" /><p>{t.tools_analyzing}</p></div>}

      {result && !loading && (
        <div className="tool-result">
          <div className="tool-score-head">
            <div className="tool-score-ring" style={{ '--c': verdictColor(result.verdict) } as any}>
              <span className="tool-score-num">{result.score}</span>
            </div>
            <div>
              <div className="tool-hashtag-name"><Hash size={18} />{result.hashtag}</div>
              <div className="tool-verdict" style={{ color: verdictColor(result.verdict) }}>
                {verdictLabel(result.verdict)}
              </div>
            </div>
          </div>

          <div className="tool-check-list">
            {result.checks.map((c: any, i: number) => (
              <div key={i} className="tool-check-item">
                {icon(c.status)}
                <span>{c.message}</span>
              </div>
            ))}
          </div>

          <p className="tool-disclaimer">{result.disclaimer}</p>

          <button onClick={() => { setResult(null); setTag(''); }} className="btn-ghost tool-reset">
            {t.tools_try_another}
          </button>
        </div>
      )}
    </div>
  );
}
