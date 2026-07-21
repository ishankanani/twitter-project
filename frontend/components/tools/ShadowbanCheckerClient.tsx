'use client';
import { useState } from 'react';
import { api, fmtNum } from '@/lib/api';
import ToolSourceDown from '@/components/tools/ToolSourceDown';

interface Check { id: string; label: string; status: 'pass'|'warn'|'fail'; message: string; }
interface Result {
  handle: string;
  overall: 'healthy'|'partial'|'banned'|'suspended';
  score: number;
  message: string;
  profile?: { displayName: string; bio: string; avatar: string; followers: number; following: number; tweets: number; joinDate: string; verified: boolean; };
  checks: Check[];
  disclaimer?: string;
}

export default function ShadowbanCheckerClient() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceDown, setSourceDown] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSourceDown(false); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/shadowban', { handle: handle.trim() });
      setResult(r);
    } catch (e: any) {
      if (e.code === 'SOURCE_UNAVAILABLE') setSourceDown(true);
      else setError(e.message || 'Bir hata oluştu');
    }
    setLoading(false);
  }

  return (
    <section className="wrap">
      <form onSubmit={submit} className="tool-form">
        <div className="tool-form-row">
          <span className="tool-form-prefix">@</span>
          <input
            type="text"
            placeholder="elonmusk"
            value={handle}
            onChange={e => setHandle(e.target.value.replace(/^@/, ''))}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={loading || !handle.trim()}>
            {loading ? 'Analiz ediliyor...' : 'Kontrol Et'}
          </button>
        </div>
        <p className="tool-form-hint">Yalnızca X kullanıcı adını yazın — URL veya @ gerekmez</p>
      </form>

      {loading && (
        <div className="tool-loading">
          <div className="tool-spinner"></div>
          <p>Profil taranıyor... Bu işlem 10–20 saniye sürebilir.</p>
        </div>
      )}

      {sourceDown && <ToolSourceDown onRetry={() => { const f = document.querySelector('form'); if (f) f.requestSubmit(); }} />}
      {error && <div className="form-error" style={{ maxWidth: 700, margin: '1.5rem auto' }}>⚠ {error}</div>}

      {result && (
        <div className="tool-result">
          {/* Overall verdict */}
          <div className={`tool-verdict verdict-${result.overall}`}>
            <div className="tool-verdict-icon">
              {result.overall === 'healthy' && '✓'}
              {result.overall === 'partial' && '!'}
              {result.overall === 'banned' && '✕'}
              {result.overall === 'suspended' && '⛔'}
            </div>
            <div className="tool-verdict-text">
              <div className="tool-verdict-title">
                @{result.handle}
              </div>
              <div className="tool-verdict-msg">{result.message}</div>
            </div>
            <div className="tool-verdict-score">
              <div className="tool-score-num">{result.score}</div>
              <div className="tool-score-label">/ 100</div>
            </div>
          </div>

          {/* Profile mini-card */}
          {result.profile && (
            <div className="tool-profile">
              <div className="tool-profile-row">
                {result.profile.avatar && <img src={result.profile.avatar} alt="" className="tool-profile-av" loading="lazy" decoding="async"/>}
                <div className="tool-profile-info">
                  <div className="tool-profile-name">
                    {result.profile.displayName || result.handle}
                    {result.profile.verified && <span className="verified-badge" title="Doğrulanmış">✓</span>}
                  </div>
                  <div className="tool-profile-handle">@{result.handle}</div>
                  {result.profile.bio && <p className="tool-profile-bio">{result.profile.bio}</p>}
                </div>
              </div>
              <div className="tool-profile-stats">
                <div><strong>{fmtNum(result.profile.tweets)}</strong> <span>Gönderi</span></div>
                <div><strong>{fmtNum(result.profile.following)}</strong> <span>Takip</span></div>
                <div><strong>{fmtNum(result.profile.followers)}</strong> <span>Takipçi</span></div>
                {result.profile.joinDate && <div><strong>{result.profile.joinDate.split(' - ')[0]}</strong> <span>Katılım</span></div>}
              </div>
            </div>
          )}

          {/* Checks */}
          <div className="tool-checks">
            <h3 className="tool-section-title">Kontrol Sonuçları</h3>
            {result.checks.map(c => (
              <div key={c.id} className={`tool-check tool-check-${c.status}`}>
                <div className="tool-check-icon">
                  {c.status === 'pass' && '✓'}
                  {c.status === 'warn' && '!'}
                  {c.status === 'fail' && '✕'}
                </div>
                <div className="tool-check-body">
                  <div className="tool-check-label">{c.label}</div>
                  <div className="tool-check-msg">{c.message}</div>
                </div>
              </div>
            ))}
          </div>

          {result.disclaimer && (
            <div className="tool-disclaimer">
              ℹ️ {result.disclaimer}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button className="btn-ghost" onClick={() => { setResult(null); setHandle(''); }}>
              ↺ Yeni Kontrol
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
