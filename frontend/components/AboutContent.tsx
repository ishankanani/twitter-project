'use client';
import { useLang } from '@/lib/i18n';

export default function AboutContent({ cms }: { cms: any }) {
  const { t } = useLang();

  return (
    <>
      <section className="page-hero">
        <h1>{t.about_title_a} <em>{t.about_title_b}</em></h1>
        <p className="page-hero-desc">{t.page_about_desc}</p>
      </section>

      <section className="wrap">
        <div style={{ maxWidth: '780px' }}>
          <p style={{ fontSize: '1.05rem', color: 'var(--mid)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
            {cms.about_p1 || t.about_p1}
          </p>
          <p style={{ fontSize: '1.05rem', color: 'var(--mid)', lineHeight: 1.75, marginBottom: '3rem' }}>
            {cms.about_p2 || t.about_p2}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '3rem' }}>
            {[
              { icon: '◈', title: 'Bağımsızlık', text: 'Hiçbir siyasi ya da ticari baskı altında olmaksızın içerik üretiriz.' },
              { icon: '◉', title: 'Kalite', text: 'Standartlarımızı yüksek tutarak güvenilir bilgi sunarız.' },
              { icon: '◎', title: 'Şeffaflık', text: 'Okuyucularımıza karşı her zaman açık ve dürüst davranırız.' }
            ].map((v, i) => (
              <div key={i} className="reveal" style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.6rem 1.4rem' }}>
                <div style={{ fontSize: '1.6rem', color: 'var(--red)', marginBottom: '.6rem' }}>{v.icon}</div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', marginBottom: '.5rem' }}>{v.title}</h3>
                <p style={{ fontSize: '.86rem', color: 'var(--muted)', lineHeight: 1.6 }}>{v.text}</p>
              </div>
            ))}
          </div>

          <div className="priv" style={{ borderRadius: '12px', borderTop: '1px solid var(--border)', padding: '1.4rem 1.6rem' }}>
            <span className="priv-tag">{t.priv_tag}</span>
            <p className="priv-text">{t.priv_text}</p>
          </div>
        </div>
      </section>
    </>
  );
}
