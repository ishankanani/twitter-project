'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('sm_cookie_consent')) {
        // Wait a moment so it doesn't flash on page load
        setTimeout(() => setShow(true), 800);
      }
    } catch {}
  }, []);

  function decide(accept: boolean) {
    try {
      localStorage.setItem('sm_cookie_consent', accept ? 'all' : 'essential');
      localStorage.setItem('sm_cookie_consent_at', new Date().toISOString());
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-title">
      <div className="cookie-inner">
        <div className="cookie-body">
          <strong id="cookie-title">🍪 Çerezler Hakkında</strong>
          <p>
            Bu site size en iyi deneyimi sunmak için <strong>yalnızca zorunlu çerezleri</strong> kullanır
            (oturum yönetimi, dil tercihi). İzleme veya reklam çerezi kullanmıyoruz. Detaylar için{' '}
            <Link href="/cookies">çerez politikamızı</Link> ve{' '}
            <Link href="/gizlilik">gizlilik politikamızı</Link> inceleyin.
          </p>
        </div>
        <div className="cookie-actions">
          <button onClick={() => decide(false)} className="cookie-btn ghost">Sadece Zorunlu</button>
          <button onClick={() => decide(true)} className="cookie-btn primary">Anladım, Kabul Ediyorum</button>
        </div>
      </div>
    </div>
  );
}
