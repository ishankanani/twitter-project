'use client';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Modal, Toast, useToast, ConfirmDialog } from '@/components/admin/AdminUI';
import { api, User } from '@/lib/api';
import { useLang } from '@/lib/i18n';

const ALL_PERMISSIONS = [
  { id: 'accounts', label: 'X Hesapları' },
  { id: 'tweets', label: 'Gönderiler' },
  { id: 'subscribers', label: 'Aboneler' },
  { id: 'contacts', label: 'Mesajlar' },
  { id: 'collaborations', label: 'İş Birlikleri' },
  { id: 'newsletter', label: 'Bülten' },
  { id: 'rss', label: 'RSS' },
  { id: 'cms', label: 'CMS / İçerik' },
  { id: 'settings', label: 'Ayarlar' },
  { id: 'posts_review', label: 'İçerik İnceleme' }
];

const DEFAULTS: Record<string, Record<string, boolean>> = {
  superadmin: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.id, true])),
  publisher: { tweets: true, posts_review: true },
  creator: {}
};

export default function UsersPage() {

  const { t } = useLang();  const { token, user: me } = useAdminAuth();
  const [list, setList] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [delUser, setDelUser] = useState<User | null>(null);
  const { toast, show } = useToast();

  async function load() {
    if (!token) return;
    try { setList(await api.get('/api/users', token)); }
    catch (e: any) { show(e.message, 'err'); }
  }
  useEffect(() => { load(); }, [token]);

  async function save(payload: any) {
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, payload, token);
        show('Kullanıcı güncellendi');
      } else {
        await api.post('/api/users', payload, token);
        show('Kullanıcı oluşturuldu');
      }
      setEditing(null); setCreating(false); load();
    } catch (e: any) { show(e.message, 'err'); }
  }

  async function del(u: User) {
    try { await api.del(`/api/users/${u.id}`, token); load(); show('Silindi'); }
    catch (e: any) { show(e.message, 'err'); }
    setDelUser(null);
  }

  async function forceLogout(u: User) {
    try { await api.post(`/api/users/${u.id}/force-logout`, {}, token); show(`${u.username} oturumu sonlandırıldı`); load(); }
    catch (e: any) { show(e.message, 'err'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-h1">{t.admin_users}</h1>
          <p className="admin-sub">Tüm rol ve hesap yönetimi</p>
        </div>
        <button className="admin-btn" onClick={() => setCreating(true)}>+ Kullanıcı Ekle</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr><th>Kullanıcı</th><th>E-posta</th><th>Rol</th><th>Durum</th><th>E-posta</th><th>Son Giriş</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{u.fullName || u.username}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>@{u.username}</div>
                </td>
                <td style={{ fontSize: '.82rem' }}>{u.email}</td>
                <td><RoleBadge role={u.role} /></td>
                <td><span className={`admin-tag ${u.active ? 'green' : 'gray'}`}>{u.active ? 'Aktif' : 'Pasif'}</span></td>
                <td><span className={`admin-tag ${(u as any).emailVerified ? 'green' : 'red'}`}>{(u as any).emailVerified ? '✓ Doğrulandı' : '⚠ Beklemede'}</span></td>
                <td style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('tr-TR') : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 8px' }} onClick={() => setEditing(u)}>{t.admin_edit}</button>
                    <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 8px' }} onClick={() => setPwUser(u)}>Şifre</button>
                    {!(u as any).emailVerified && (
                      <>
                        <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 8px' }} onClick={async () => { try { await api.post(`/api/users/${u.id}/resend-verification`, {}, token); show('Doğrulama e-postası gönderildi'); } catch (e: any) { show(e.message, 'err'); } }}>✉ Tekrar Gönder</button>
                        <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 8px', color: '#28a745' }} onClick={async () => { try { await api.post(`/api/users/${u.id}/verify`, { verified: true }, token); show('Manuel olarak doğrulandı'); load(); } catch (e: any) { show(e.message, 'err'); } }}>✓ Manuel Doğrula</button>
                      </>
                    )}
                    <button className="admin-btn admin-btn-ghost" style={{ fontSize: '.72rem', padding: '4px 8px' }} onClick={() => forceLogout(u)}>Çıkış zorla</button>
                    {u.id !== me?.id && <button className="admin-btn admin-btn-danger" style={{ fontSize: '.72rem', padding: '4px 8px' }} onClick={() => setDelUser(u)}>{t.admin_delete}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && <UserModal user={editing} onSave={save} onClose={() => { setEditing(null); setCreating(false); }} />}
      {pwUser && <PasswordModal user={pwUser} token={token} onClose={() => setPwUser(null)} onDone={() => { setPwUser(null); show('Şifre sıfırlandı'); }} />}
      {delUser && <ConfirmDialog msg={`${delUser.username} kullanıcısını silmek istediğinize emin misiniz?`} onYes={() => del(delUser)} onNo={() => setDelUser(null)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useLang();
  const map: any = { superadmin: { label: 'Süper Admin', cls: 'red' }, publisher: { label: 'Yayıncı', cls: 'gray' }, creator: { label: 'Üretici', cls: 'green' } };
  const m = map[role] || { label: role, cls: 'gray' };
  return <span className={`admin-tag ${m.cls}`}>{m.label}</span>;
}

function UserModal({
   user, onSave, onClose }: { user: User | null; onSave: (d: any) => void; onClose: () => void }) {
  const { t } = useLang();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [role, setRole] = useState(user?.role || 'creator');
  const [perms, setPerms] = useState<Record<string, boolean>>(user?.permissions || DEFAULTS[user?.role || 'creator']);
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(user?.active ?? true);

  function onRoleChange(r: string) {
    setRole(r as any);
    setPerms(DEFAULTS[r] || {});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { fullName, email, role, permissions: perms, active };
    if (!user) { payload.username = username; payload.password = password; }
    onSave(payload);
  }

  return (
    <Modal open={true} onClose={onClose} title={user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}>
      <form onSubmit={submit} className="form-grid">
        {!user && (
          <div className="form-row">
            <div className="form-field">
              <label>Kullanıcı Adı *</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="form-field">
              <label>Şifre *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
        )}
        <div className="form-field"><label>Ad Soyad</label><input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
        <div className="form-field"><label>E-posta *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="form-field">
          <label>Rol *</label>
          <select value={role} onChange={e => onRoleChange(e.target.value)}>
            <option value="creator">İçerik Üretici (creator)</option>
            <option value="publisher">Yayıncı (publisher)</option>
            <option value="superadmin">{t.admin_role_superadmin}</option>
          </select>
        </div>

        {role !== 'creator' && (
          <div className="form-field">
            <label>Yetkiler</label>
            <div className="perm-grid">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.id} className="perm-item">
                  <input type="checkbox" checked={!!perms[p.id]} onChange={e => setPerms({ ...perms, [p.id]: e.target.checked })} disabled={role === 'superadmin'} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
            {role === 'superadmin' && <small style={{ color: 'var(--muted)' }}>Süper admin tüm yetkilere sahiptir</small>}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Aktif
        </label>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>{t.admin_cancel}</button>
          <button type="submit" className="admin-btn">{t.admin_save}</button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({
   user, token, onClose, onDone }: { user: User; token: string; onClose: () => void; onDone: () => void }) {
  const { t } = useLang();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.put(`/api/users/${user.id}/password`, { newPassword: pw }, token); onDone(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <Modal open={true} onClose={onClose} title={`${user.username} — Şifre Sıfırla`}>
      <form onSubmit={submit} className="form-grid">
        <p style={{ color: 'var(--mid)', fontSize: '.88rem' }}>Yeni bir şifre belirleyin. Kullanıcının mevcut oturumu sonlandırılacak.</p>
        <div className="form-field"><label>Yeni Şifre</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoFocus /></div>
        {err && <div className="form-error">{err}</div>}
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>{t.admin_cancel}</button>
          <button type="submit" className="admin-btn" disabled={busy}>Sıfırla</button>
        </div>
      </form>
    </Modal>
  );
}
