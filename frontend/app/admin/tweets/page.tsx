'use client';
import { useEffect, useState } from 'react';
import { api, Tweet, timeAgo } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import RichEditor from '@/components/admin/RichEditor';
import MediaUploader, { MediaItem } from '@/components/admin/MediaUploader';
import TemplatePicker, { Template } from '@/components/admin/TemplatePicker';
import { useLang } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '').trim();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

export default function AdminTweetsPage() {

  const { t } = useLang();  const { token } = useAdminAuth();
  const [list, setList] = useState<Tweet[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  // Composer state
  const [composer, setComposer] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [accountHandle, setAccountHandle] = useState('');
  const [richText, setRichText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [xUrl, setXUrl] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast, show } = useToast();

  async function load() {
    try {
      const [tw, ac] = await Promise.all([
        api.get(`/api/tweets?limit=200${filter ? `&handle=${filter}` : ''}`),
        api.get('/api/accounts')
      ]);
      setList(tw); setAccounts(ac);
    } catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { if (token) load(); }, [token, filter]);

  function openNew() {
    setEditId(null);
    setAccountHandle(accounts[0]?.handle || '');
    setRichText('');
    setMedia([]);
    setXUrl('');
    setComposer(true);
  }

  function openEdit(t: Tweet) {
    setEditId(t.id);
    setAccountHandle(t.accountHandle);
    setRichText(t.richText || `<p>${escapeHtml(t.text)}</p>`);
    setMedia(t.media as MediaItem[] || []);
    setXUrl(t.xUrl || '');
    setComposer(true);
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  function applyTemplate(tpl: Template) {
    setRichText(tpl.richText);
    show(`Şablon yüklendi: ${tpl.name}`);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const plainText = stripHtml(richText);
    if (!accountHandle) return show('Lütfen hesap seçin.', 'err');
    if (!plainText && media.length === 0) return show('İçerik veya medya gerekli.', 'err');

    setSaving(true);
    try {
      const payload = {
        accountHandle,
        text: plainText,
        richText,
        media,
        xUrl,
        createdAt: new Date().toISOString()
      };
      if (editId) {
        await api.put(`/api/tweets/${editId}`, payload, token);
        show('Gönderi güncellendi.');
      } else {
        await api.post('/api/tweets', payload, token);
        show('Gönderi yayınlandı.');
      }
      await load();
      setComposer(false);
    } catch (e: any) { show(e.message, 'err'); }
    setSaving(false);
  }

  async function syncNow() {
    setSyncing(true);
    try { const res = await api.post('/api/tweets/sync-now', {}, token); show(`${res.synced} yeni gönderi senkronize edildi.`); await load(); }
    catch (e: any) { show(e.message, 'err'); }
    setSyncing(false);
  }

  async function del(id: number) {
    try { await api.del(`/api/tweets/${id}`, token); await load(); show('Gönderi silindi.'); }
    catch (e: any) { show(e.message, 'err'); }
    setConfirm(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">Gönderiler (Tweets)</h1>
          <p className="admin-sub">Otomatik X senkronizasyonu + zengin metin editörü ile manuel yayınlama</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn admin-btn-ghost" onClick={syncNow} disabled={syncing}>
            {syncing ? '⟳ Senkronize ediliyor...' : '⟳ Şimdi Senkronize Et'}
          </button>
          <button className="admin-btn" onClick={openNew}>✏️ Yeni Gönderi</button>
        </div>
      </div>

      <div className="admin-card">
        <div className="form-field" style={{ maxWidth: 320 }}>
          <label>Hesaba Göre Filtrele</label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tüm Hesaplar</option>
            {accounts.map(a => <option key={a.id} value={a.handle}>@{a.handle}</option>)}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr><th>Hesap</th><th>İçerik</th><th>Medya</th><th>Tarih</th><th>Kaynak</th><th></th></tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Gönderi yok</td></tr>
            ) : list.map(t => (
              <tr key={t.id}>
                <td style={{ color: 'var(--red)', fontFamily: 'monospace', fontSize: '.78rem' }}>@{t.accountHandle}</td>
                <td style={{ maxWidth: 360 }}>
                  {t.richText ? (
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '.86rem' }}
                      dangerouslySetInnerHTML={{ __html: t.richText }} />
                  ) : (
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.text}</div>
                  )}
                </td>
                <td style={{ fontSize: '.78rem' }}>
                  {t.media && t.media.length > 0 ? `📎 ${t.media.length}` : '—'}
                </td>
                <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{timeAgo(t.createdAt)}</td>
                <td><span className={`admin-tag ${t.source === 'manual' ? 'red' : 'gray'}`}>{t.source}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {t.source === 'manual' && (
                      <button className="admin-btn admin-btn-ghost" onClick={() => openEdit(t)}>{t.admin_edit}</button>
                    )}
                    <button className="admin-btn admin-btn-danger" onClick={() => setConfirm(t.id)}>{t.admin_delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* COMPOSER */}
      <Modal open={composer} onClose={() => setComposer(false)} title={editId ? '✏️ Gönderi Düzenle' : '✏️ Yeni Gönderi Oluştur'}>
        <form onSubmit={publish} className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label>Hesap *</label>
              <select value={accountHandle} onChange={e => setAccountHandle(e.target.value)} required>
                <option value="">Seçiniz</option>
                {accounts.map(a => <option key={a.id} value={a.handle}>@{a.handle} — {a.displayName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowTemplates(true)} style={{ width: '100%', justifyContent: 'center' }}>
                📚 Şablonlar
              </button>
            </div>
          </div>

          <div className="form-field">
            <label>İçerik (zengin metin editörü) *</label>
            <RichEditor value={richText} onChange={setRichText} placeholder="Gönderinizi yazın... Üstteki araç çubuğundan yazıyı biçimlendirebilirsiniz." />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.74rem', color: 'var(--muted)' }}>
              <span>Karakter: {stripHtml(richText).length}</span>
              {stripHtml(richText).length > 280 && (
                <span style={{ color: 'var(--red)' }}>⚠ X için 280 karakter sınırı</span>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>Medya (resim / video)</label>
            <MediaUploader media={media} onChange={setMedia} token={token} maxFiles={4} />
          </div>

          <div className="form-field">
            <label>X URL (opsiyonel — orijinal post varsa link)</label>
            <input value={xUrl} onChange={e => setXUrl(e.target.value)} placeholder="https://x.com/..." />
          </div>

          {/* Live preview */}
          {(richText || media.length > 0) && (
            <div className="form-field">
              <label>Önizleme</label>
              <div style={{ background: '#fafaf9', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                {richText && (
                  <div style={{ fontSize: '.95rem', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: richText }} />
                )}
                {media.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: media.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginTop: 10, borderRadius: 10, overflow: 'hidden' }}>
                    {media.slice(0, 4).map((m, i) => (
                      <div key={i} style={{ aspectRatio: media.length === 1 ? '16/9' : '1', overflow: 'hidden', borderRadius: 8 }}>
                        {m.type === 'photo' ? (
                          <img src={m.url.startsWith('http') ? m.url : `${API_URL}${m.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" decoding="async"/>
                        ) : (
                          <video src={m.url.startsWith('http') ? m.url : `${API_URL}${m.url}`} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setComposer(false)}>{t.admin_cancel}</button>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? 'Yayınlanıyor...' : (editId ? '💾 Güncelle' : '🚀 Yayınla')}
            </button>
          </div>
        </form>
      </Modal>

      <TemplatePicker
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onPick={applyTemplate}
        token={token}
        currentRichText={richText}
      />

      {confirm && <ConfirmDialog msg="Bu gönderiyi silmek istediğinizden emin misiniz?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
