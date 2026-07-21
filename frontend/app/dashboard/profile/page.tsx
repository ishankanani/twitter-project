'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import MediaUploader, { MediaItem } from '@/components/admin/MediaUploader';
import { useLang } from '@/lib/i18n';

export default function ProfilePage() {
  const { user, token, logout, refresh } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarItems, setAvatarItems] = useState<MediaItem[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [curr, setCurr] = useState(''); const [next1, setNext1] = useState(''); const [next2, setNext2] = useState('');
  const [pwMsg, setPwMsg] = useState(''); const [pwErr, setPwErr] = useState(''); const [pwBusy, setPwBusy] = useState(false);

  const [emailCurrent, setEmailCurrent] = useState(''); const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState(''); const [emailErr, setEmailErr] = useState(''); const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBio((user as any).bio || '');
      if (user.avatar) setAvatarItems([{ type: 'photo', url: user.avatar }]);
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true); setProfileMsg('');
    try {
      await api.put('/api/me/profile', { fullName, bio, avatar: avatarItems[0]?.url || '' }, token);
      setProfileMsg(t.admin_updated);
      refresh();
    } catch (e: any) { setProfileMsg(e.message); }
    setSavingProfile(false);
  }

  async function changePass(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (next1 !== next2) return setPwErr(t.pw_mismatch);
    if (next1.length < 6) return setPwErr(t.pw_min_len);
    setPwBusy(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: curr, newPassword: next1 }, token);
      setPwMsg(t.pw_updated_login_again);
      setTimeout(() => { logout(); router.push('/login'); }, 1500);
    } catch (e: any) { setPwErr(e.message); }
    setPwBusy(false);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(''); setEmailErr(''); setEmailBusy(true);
    try {
      const r = await api.post('/api/auth/change-email', { currentPassword: emailCurrent, newEmail }, token);
      setEmailMsg(r.message || t.verify_sent);
      setEmailCurrent(''); setNewEmail('');
    } catch (e: any) { setEmailErr(e.message); }
    setEmailBusy(false);
  }

  if (!user) return null;

  const roleLabel = user.role === 'creator' ? t.admin_role_creator : user.role === 'publisher' ? t.admin_role_publisher : t.admin_role_superadmin;

  return (
    <div>
      <h2 className="dash-h2">👤 {t.profile_title}</h2>
      <p className="dash-sub">{t.profile_sub}</p>

      <div className="dash-card">
        <h3 style={{ marginBottom: '1rem' }}>{t.profile_title}</h3>
        <form onSubmit={saveProfile} className="form-grid" style={{ maxWidth: 600 }}>
          <div className="form-field">
            <label>{t.dash_profile_avatar}</label>
            <MediaUploader media={avatarItems} onChange={setAvatarItems} token={token} maxFiles={1} />
          </div>
          <div className="form-field">
            <label>{t.full_name}</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="form-field">
            {/* Username is shown verbatim — not translated */}
            <label>{t.dash_profile_bio} (/u/{user.username})</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3} />
          </div>
          {profileMsg && <div className={profileMsg === t.admin_updated ? 'form-success' : 'form-error'}>{profileMsg}</div>}
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? t.saving : '💾 ' + t.dash_profile_save}
          </button>
          <div style={{ marginTop: 6 }}>
            <Link href={`/u/${user.username}`} target="_blank" style={{ color: 'var(--red)', fontSize: '.84rem' }}>
              {t.admin_view}: /u/{user.username} ↗
            </Link>
          </div>
        </form>
      </div>

      <div className="dash-card">
        <h3 style={{ marginBottom: '1rem' }}>{t.settings_account}</h3>
        <div className="info-grid">
          {/* Username, email = personal data, never translated */}
          <Info label={t.username} value={'@' + user.username} />
          <Info label={t.email} value={user.email} />
          <Info label={t.role_label} value={roleLabel} />
        </div>
      </div>

      <div className="dash-card">
        <h3 style={{ marginBottom: '1rem' }}>📧 {t.dash_change_email}</h3>
        <form onSubmit={changeEmail} className="form-grid" style={{ maxWidth: 460 }}>
          <div className="form-field"><label>{t.email}</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></div>
          <div className="form-field"><label>{t.twofa_current_pw}</label><input type="password" value={emailCurrent} onChange={e => setEmailCurrent(e.target.value)} required /></div>
          {emailMsg && <div className="form-success">{emailMsg}</div>}
          {emailErr && <div className="form-error">{emailErr}</div>}
          <button type="submit" className="btn-primary" disabled={emailBusy}>
            {emailBusy ? t.saving : t.admin_send}
          </button>
        </form>
      </div>

      <div className="dash-card">
        <h3 style={{ marginBottom: '1rem' }}>🔒 {t.dash_change_pw}</h3>
        <form onSubmit={changePass} className="form-grid" style={{ maxWidth: 460 }}>
          <div className="form-field"><label>{t.twofa_current_pw}</label><input type="password" value={curr} onChange={e => setCurr(e.target.value)} required /></div>
          <div className="form-field"><label>{t.dash_new_pw}</label><input type="password" value={next1} onChange={e => setNext1(e.target.value)} required minLength={6} /></div>
          <div className="form-field"><label>{t.repeat_pw}</label><input type="password" value={next2} onChange={e => setNext2(e.target.value)} required /></div>
          {pwMsg && <div className="form-success">{pwMsg}</div>}
          {pwErr && <div className="form-error">{pwErr}</div>}
          <button type="submit" className="btn-primary" disabled={pwBusy}>{pwBusy ? t.saving : t.dash_change_pw}</button>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
