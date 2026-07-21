'use client';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';

export default function ToolHero({ tag, titleKey, descKey }: { tag: string; titleKey: string; descKey: string }) {
  const { t } = useLang();
  return (
    <section className="page-hero">
      <Link href="/tools" className="tool-back-link">{t.tools_back_to_tools}</Link>
      <p className="section-tag">{tag}</p>
      <h1>{(t as any)[titleKey]}</h1>
      <p className="page-hero-desc">{(t as any)[descKey]}</p>
    </section>
  );
}
