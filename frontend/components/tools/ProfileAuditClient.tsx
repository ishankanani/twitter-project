'use client';
import { useState } from 'react';
import { api, fmtNum } from '@/lib/api';
import ToolSourceDown from '@/components/tools/ToolSourceDown';

interface AuditSection { score: number; status: 'pass'|'warn'|'fail'; tip: string; avgLength?: number; }
interface Result {
  handle: string;
  score: number;
  grade: 'A'|'B'|'C'|'D'|'F';
  profile?: any;
  sections: Record<string, AuditSection>;
  sampleTweets?: any[];
}

const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  profilePicture: { icon: '🖼️', label: 'Profil Resmi' },
  bio: { icon: '📝', label: 'Bio Var Mı?' },
  bioLength: { icon: '📏', label: 'Bio Uzunluğu' },
  bioKeywords: { icon: '🏷️', label: 'Bio Anahtar Kelimeler' },
  location: { icon: '📍', label: 'Konum' },
  website: { icon: '🔗', label: 'Web Sitesi' },
  verified: { icon: '✓', label: 'Doğrulama' },
  postQuality: { icon: '✍️', label: 'Gönderi Kalitesi' },
  postFrequency: { icon: '📈', label: 'Gönderi Sıklığı' },
  diversity: { icon: '🌀', label: 'İçerik Çeşitliliği' }
};

export default function ProfileAuditClient() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceDown, setSourceDown] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSourceDown(false); setResult(null); setLoading(true);
    try {
      const r = await api.post('/api/tools/audit', { handle: handle.trim() });
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
            {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
          </button>
        </div>
        <p className="tool-form-hint">10 farklı kriteri tarayıp puan ve öneriler verir</p>
      </form>

      {loading && (
        <div className="tool-loading">
          <div className="tool-spinner"></div>
          <p>Profil derinlemesine inceleniyor... Bu işlem 10–20 saniye sürebilir.</p>
        </div>
      )}

      {sourceDown && <ToolSourceDown onRetry={() => { const f = document.querySelector('form'); if (f) f.requestSubmit(); }} />}
      {error && <div className="form-error" style={{ maxWidth: 700, margin: '1.5rem auto' }}>⚠ {error}</div>}

      {result && (
        <div className="tool-result">
          {/* Score circle */}
          <div className="audit-grade-wrap">
            <div className={`audit-grade grade-${result.grade}`}>
              <div className="audit-grade-letter">{result.grade}</div>
              <div className="audit-grade-score">{result.score}/100</div>
            </div>
            <div className="audit-grade-text">
              <div className="audit-grade-handle">@{result.handle}</div>
              <h2>{
                result.grade === 'A' ? 'Mükemmel profil!' :
                result.grade === 'B' ? 'İyi profil, ufak iyileştirmelerle harika olur.' :
                result.grade === 'C' ? 'Ortalama profil — bazı eksiklikler var.' :
                result.grade === 'D' ? 'Bir kaç önemli alan iyileştirme bekliyor.' :
                'Profil ciddi iyileştirme gerektiriyor.'
              }</h2>
              <p>Aşağıdaki önerileri inceleyerek profilinizi güçlendirebilirsiniz.</p>
            </div>
          </div>

          {/* Profile snapshot */}
          {result.profile && (
            <div className="tool-profile">
              <div className="tool-profile-row">
                {result.profile.avatar && <img src={result.profile.avatar} alt="" className="tool-profile-av" loading="lazy" decoding="async"/>}
                <div className="tool-profile-info">
                  <div className="tool-profile-name">
                    {result.profile.displayName || result.handle}
                    {result.profile.verified && <span className="verified-badge">✓</span>}
                  </div>
                  <div className="tool-profile-handle">@{result.handle}</div>
                  {result.profile.bio && <p className="tool-profile-bio">{result.profile.bio}</p>}
                </div>
              </div>
              <div className="tool-profile-stats">
                <div><strong>{fmtNum(result.profile.tweets || 0)}</strong> <span>Gönderi</span></div>
                <div><strong>{fmtNum(result.profile.following || 0)}</strong> <span>Takip</span></div>
                <div><strong>{fmtNum(result.profile.followers || 0)}</strong> <span>Takipçi</span></div>
              </div>
            </div>
          )}

          {/* Sections grid */}
          <h3 className="tool-section-title">Detaylı Rapor</h3>
          <div className="audit-grid">
            {Object.entries(result.sections).map(([key, sec]) => {
              const meta = SECTION_LABELS[key] || { icon: '•', label: key };
              return (
                <div key={key} className={`audit-card audit-${sec.status}`}>
                  <div className="audit-card-head">
                    <div className="audit-card-icon">{meta.icon}</div>
                    <div className="audit-card-label">{meta.label}</div>
                    <div className="audit-card-score">{sec.score}/100</div>
                  </div>
                  <div className="audit-bar"><div className="audit-bar-fill" style={{ width: `${sec.score}%` }} /></div>
                  <p className="audit-card-tip">{sec.tip}</p>
                </div>
              );
            })}
          </div>

          <div className="tool-disclaimer">
            ℹ️ Bu analiz ücretsiz halka açık X verisini kullanır. Sonuçlar yalnızca yön gösterici niteliktedir.
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button className="btn-ghost" onClick={() => { setResult(null); setHandle(''); }}>
              ↺ Yeni Analiz
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
