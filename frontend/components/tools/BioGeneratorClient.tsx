'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { Sparkles, Copy, Check } from 'lucide-react';

const TONES = ['professional', 'casual', 'creative', 'bold', 'friendly'];

export default function BioGeneratorClient() {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [topics, setTopics] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/bio-generator', { name: name.trim(), topics: topics.trim(), tone });
      setResult(r);
    } catch (e: any) {
      setError((e.code && (t as any)[`err_${e.code}`]) || e.message || t.tools_error_generic);
    }
    setLoading(false);
  }

  function copy(text: string, i: number) {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="tool-shell">
      <form onSubmit={submit} className="tool-form">
        <div className="tool-field">
          <label>{t.bio_name_label}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="" maxLength={50} disabled={loading} />
        </div>
        <div className="tool-field">
          <label>{t.bio_topics_label}</label>
          <input value={topics} onChange={e => setTopics(e.target.value)} placeholder={t.bio_topics_ph} maxLength={200} required disabled={loading} />
        </div>
        <div className="tool-field">
          <label>{t.bio_tone_label}</label>
          <div className="tool-tone-row">
            {TONES.map(tn => (
              <button key={tn} type="button" onClick={() => setTone(tn)}
                className={`tool-tone-btn ${tone === tn ? 'on' : ''}`} disabled={loading}>
                {(t as any)[`bio_tone_${tn}`]}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary tool-submit-wide" disabled={loading || !topics.trim()}>
          <Sparkles size={16} /> {loading ? t.tools_analyzing : t.bio_generate}
        </button>
      </form>

      {error && <div className="tool-error">{error}</div>}
      {loading && <div className="tool-loading"><div className="tool-spinner" /><p>{t.tools_analyzing}</p></div>}

      {result && !loading && (
        <div className="tool-result">
          {result.source === 'ai' ? (
            <span className="tool-source-badge ai"><Sparkles size={12} /> {t.tool_ai_badge}</span>
          ) : (
            <span className="tool-source-badge template">{t.tool_template_badge}</span>
          )}
          <div className="tool-bio-list">
            {result.bios.map((b: any, i: number) => (
              <div key={i} className="tool-bio-card">
                <p className="tool-bio-text">{b.text}</p>
                <div className="tool-bio-foot">
                  <span className={`tool-bio-len ${b.valid ? '' : 'over'}`}>{b.length} / 160 {t.bio_chars}</span>
                  <button onClick={() => copy(b.text, i)} className="tool-bio-copy">
                    {copied === i ? <><Check size={14} /> {t.bio_copied}</> : <><Copy size={14} /> {t.bio_copy}</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setResult(null)} className="btn-ghost tool-reset">{t.bio_generate}</button>
        </div>
      )}
    </div>
  );
}
