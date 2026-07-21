'use client';
import { useLang } from '@/lib/i18n';
import { CloudOff, RotateCw } from 'lucide-react';

/**
 * Honest "data source temporarily unavailable" state.
 * Shown when the free public X data source is down — framed so the user
 * understands it's not their fault and not a bug in the site.
 */
export default function ToolSourceDown({ onRetry }: { onRetry: () => void }) {
  const { t } = useLang();
  return (
    <div className="tool-source-down">
      <div className="tool-source-down-icon"><CloudOff size={30} strokeWidth={1.6} /></div>
      <h3>{t.tool_source_down_title}</h3>
      <p>{t.tool_source_down_body}</p>
      <button onClick={onRetry} className="btn-primary tool-source-down-btn">
        <RotateCw size={15} /> {t.tool_source_down_retry}
      </button>
    </div>
  );
}
