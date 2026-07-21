'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/components/admin/AdminAuth';
import { Toast, useToast } from '@/components/admin/AdminUI';
import { useLang } from '@/lib/i18n';

export default function AdminCmsPage() {
  const { token } = useAdminAuth();
  const { t } = useLang();
  const [cms, setCms] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    api.get('/api/cms').then(setCms).catch(() => {});
  }, [token]);

  async function save() {
    setSaving(true);
    try { await api.put('/api/cms', cms, token); show(t.admin_updated); }
    catch (e: any) { show(e.message, 'err'); }
    setSaving(false);
  }

  function field(key: string, label: string, multiline = false, rows = 3) {
    return (
      <div className="form-field" key={key}>
        <label>{label}</label>
        {multiline
          ? <textarea rows={rows} value={cms[key] || ''} onChange={e => setCms({ ...cms, [key]: e.target.value })} />
          : <input value={cms[key] || ''} onChange={e => setCms({ ...cms, [key]: e.target.value })} />}
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-h1">{t.cms_title}</h1>
      <p className="admin-sub">{t.cms_sub}</p>

      <div className="admin-card">
        <h3>Hero</h3>
        {field('hero_title', t.page_title)}
        {field('hero_sub', t.page_subtitle, true, 2)}
      </div>

      <div className="admin-card">
        <h3>{t.nav_about}</h3>
        {field('about_p1', '1. ' + t.page_subtitle, true, 4)}
        {field('about_p2', '2. ' + t.page_subtitle, true, 4)}
      </div>

      <div className="admin-card">
        <h3>{t.privacy}</h3>
        {field('privacy', t.cms_content, true, 12)}
      </div>

      <div className="admin-card">
        <h3>{t.impressum}</h3>
        {field('impressum', t.cms_content, true, 12)}
      </div>

      <button className="admin-btn" onClick={save} disabled={saving}>
        {saving ? t.saving : '💾 ' + t.admin_save}
      </button>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
