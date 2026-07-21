'use client';
import { useRef, useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];
const COLORS = ['#000000', '#D10009', '#FFFFFF', '#555555', '#0078d4', '#28a745', '#ffc107', '#6f42c1'];

const EMOJIS = ['😀', '😂', '🥰', '😎', '🔥', '💯', '🎉', '👍', '❤️', '⚡', '✨', '🚀', '📢', '🏆', '⚽', '📰', '💰', '📊', '🎬', '✅'];

export default function RichEditor({ value, onChange, placeholder }: Props) {
  const { t } = useLang();
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Sync external value changes (e.g. when loading template) without losing cursor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== el.innerHTML) {
      el.innerHTML = value || '';
    }
  }, [value]);

  function exec(command: string, val?: string) {
    document.execCommand(command, false, val);
    handleInput();
    editorRef.current?.focus();
  }

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function applyFontSize(size: string) {
    // execCommand fontSize takes 1-7 — wrap in span instead for px values
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7'); // dummy
    // Replace the just-created font tags with span
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    document.execCommand('removeFormat');
    if (!sel.toString()) return;
    const span = document.createElement('span');
    span.style.fontSize = size;
    span.appendChild(sel.getRangeAt(0).extractContents());
    sel.getRangeAt(0).insertNode(span);
    handleInput();
    setShowSizes(false);
  }

  function applyColor(color: string) {
    exec('foreColor', color);
    setShowColors(false);
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    handleInput();
    setShowEmojis(false);
  }

  function addLink() {
    if (!linkUrl) return setShowLinkInput(false);
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    exec('createLink', url);
    setLinkUrl('');
    setShowLinkInput(false);
  }

  return (
    <div style={editorWrap}>
      {/* Toolbar */}
      <div style={toolbar}>
        <ToolBtn title={t.editor_bold} onClick={() => exec('bold')}><b>B</b></ToolBtn>
        <ToolBtn title={t.editor_italic} onClick={() => exec('italic')}><i>I</i></ToolBtn>
        <ToolBtn title={t.editor_underline} onClick={() => exec('underline')}><u>U</u></ToolBtn>
        <ToolBtn title={t.editor_strike} onClick={() => exec('strikeThrough')}><s>S</s></ToolBtn>
        <Sep />

        <div style={{ position: 'relative' }}>
          <ToolBtn title={t.editor_size} onClick={() => { setShowSizes(!showSizes); setShowColors(false); setShowEmojis(false); }}>A↕</ToolBtn>
          {showSizes && (
            <div style={dropdown}>
              {FONT_SIZES.map(s => (
                <button key={s} onClick={() => applyFontSize(s)} style={{ ...dropItem, fontSize: s }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <ToolBtn title={t.editor_color} onClick={() => { setShowColors(!showColors); setShowSizes(false); setShowEmojis(false); }}>🎨</ToolBtn>
          {showColors && (
            <div style={{ ...dropdown, padding: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 24px)', gap: 6 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => applyColor(c)} title={c}
                    style={{ width: 24, height: 24, borderRadius: 4, background: c, border: '1px solid #ddd', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <Sep />
        <ToolBtn title={t.editor_align_left} onClick={() => exec('justifyLeft')}>⇤</ToolBtn>
        <ToolBtn title={t.editor_center} onClick={() => exec('justifyCenter')}>↔</ToolBtn>
        <ToolBtn title={t.editor_align_right} onClick={() => exec('justifyRight')}>⇥</ToolBtn>
        <Sep />
        <ToolBtn title={t.editor_bullets} onClick={() => exec('insertUnorderedList')}>• ≡</ToolBtn>
        <ToolBtn title={t.editor_numbered} onClick={() => exec('insertOrderedList')}>1≡</ToolBtn>
        <Sep />

        <div style={{ position: 'relative' }}>
          <ToolBtn title={t.editor_emoji} onClick={() => { setShowEmojis(!showEmojis); setShowColors(false); setShowSizes(false); }}>😀</ToolBtn>
          {showEmojis && (
            <div style={{ ...dropdown, padding: 8, minWidth: 220 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => insertEmoji(e)}
                    style={{ background: 'none', border: 'none', fontSize: '1.2rem', padding: 4, cursor: 'pointer', borderRadius: 4 }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ToolBtn title={t.editor_link} onClick={() => setShowLinkInput(!showLinkInput)}>🔗</ToolBtn>
        <ToolBtn title={t.editor_clear} onClick={() => exec('removeFormat')}>⌫</ToolBtn>
      </div>

      {showLinkInput && (
        <div style={linkBar}>
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
            autoFocus
          />
          <button onClick={addLink} style={{ padding: '6px 14px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Ekle
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={editor}
      />
    </div>
  );
}

function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title} style={toolBtn}>
      {children}
    </button>
  );
}
function Sep() { return <div style={{ width: 1, height: 22, background: '#e5e5e5', margin: '0 2px' }} />; }

const editorWrap: React.CSSProperties = {
  border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'visible', background: 'white'
};
const toolbar: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 2, padding: 6,
  borderBottom: '1px solid var(--border)', background: '#fafaf9', borderRadius: '10px 10px 0 0',
  position: 'relative'
};
const toolBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: 4,
  fontSize: 14, cursor: 'pointer', minWidth: 28,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
};
const dropdown: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
  background: 'white', border: '1px solid var(--border)', borderRadius: 8,
  boxShadow: '0 4px 16px rgba(0,0,0,.1)', minWidth: 80,
  display: 'flex', flexDirection: 'column'
};
const dropItem: React.CSSProperties = {
  background: 'none', border: 'none', padding: '6px 12px', textAlign: 'left',
  cursor: 'pointer', fontSize: 13
};
const linkBar: React.CSSProperties = {
  display: 'flex', gap: 6, padding: 8, background: '#fafaf9', borderBottom: '1px solid var(--border)'
};
const editor: React.CSSProperties = {
  minHeight: 160, padding: '14px 16px', outline: 'none', fontSize: 15, lineHeight: 1.6,
  fontFamily: 'var(--sans)'
};
