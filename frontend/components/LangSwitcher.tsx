'use client';
import { useLang, Lang } from '@/lib/i18n';

const LANGS: Lang[] = ['tr', 'en', 'de'];

/**
 * Compact 3-button language switcher.
 * Used in admin sidebar and creator dashboard sidebar.
 * Styled inline so it works regardless of parent theme (light or dark sidebar).
 */
export default function LangSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, setLang } = useLang();

  const baseStyle: React.CSSProperties = {
    background: variant === 'dark' ? 'rgba(255,255,255,.08)' : '#ffffff',
    border: variant === 'dark' ? '1px solid rgba(255,255,255,.14)' : '1px solid rgba(0,0,0,.10)',
    color: variant === 'dark' ? 'rgba(255,255,255,.65)' : '#666666',
  };

  const activeStyle: React.CSSProperties = {
    background: '#D10009',
    border: '1px solid #D10009',
    color: '#FFFFFF',
    fontWeight: 700,
  };

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
      background: variant === 'dark' ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.03)',
      borderRadius: 10,
      width: 'fit-content',
    }}>
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-label={l === 'tr' ? 'Türkçe' : l === 'en' ? 'English' : 'Deutsch'}
          aria-pressed={lang === l}
          style={{
            ...baseStyle,
            ...(lang === l ? activeStyle : {}),
            padding: '5px 10px',
            fontSize: '.7rem',
            fontWeight: lang === l ? 700 : 600,
            letterSpacing: '.04em',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all .15s ease',
            minWidth: 32,
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
