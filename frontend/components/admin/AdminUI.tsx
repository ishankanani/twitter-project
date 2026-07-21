'use client';
import { ReactNode, useState } from 'react';
import { useLang } from '@/lib/i18n';

export function Toast({ msg, type = 'ok' }: { msg: string; type?: 'ok'|'err' }) {
  if (!msg) return null;
  return <div className={`admin-toast ${type}`}>{msg}</div>;
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-num">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="admin-modal-bg modal-backdrop-anim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal modal-content-anim">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
  const { t } = useLang();
  return (
    <div className="admin-modal-bg modal-backdrop-anim" onClick={onNo}>
      <div className="admin-modal modal-content-anim" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h3>{t.admin_confirm}</h3>
        <p style={{ color: 'var(--mid)', marginBottom: 20 }}>{msg}</p>
        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-ghost" onClick={onNo}>{t.admin_cancel}</button>
          <button className="admin-btn admin-btn-danger" onClick={onYes}>{t.admin_delete}</button>
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' }>({ msg: '', type: 'ok' });
  function show(msg: string, type: 'ok'|'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3000);
  }
  return { toast, show };
}
