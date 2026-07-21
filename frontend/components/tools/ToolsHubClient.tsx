'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLang } from '@/lib/i18n';
import {
  Ban, BarChart3, TrendingUp, Clock, Sparkles, Hash, CalendarClock,
  Gift, UserX, Database, Zap, ChevronDown, ArrowRight, LucideIcon
} from 'lucide-react';

interface Tool {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  color: string;
  popular?: boolean;
}

// "popular" flags the two tools that are fully self-contained (no external
// data dependency) — they always work, so we surface them first.
const TOOLS: Tool[] = [
  { href: '/tools/bio-generator', icon: Sparkles, titleKey: 'tool_bio_title', descKey: 'tool_bio_desc', color: '#9333ea', popular: true },
  { href: '/tools/hashtag', icon: Hash, titleKey: 'tool_hashtag_title', descKey: 'tool_hashtag_desc', color: '#0891b2', popular: true },
  { href: '/tools/shadowban', icon: Ban, titleKey: 'tool_shadowban_title', descKey: 'tool_shadowban_desc', color: '#D10009' },
  { href: '/tools/audit', icon: BarChart3, titleKey: 'tool_audit_title', descKey: 'tool_audit_desc', color: '#2563eb' },
  { href: '/tools/tweet-performance', icon: TrendingUp, titleKey: 'tool_perf_title', descKey: 'tool_perf_desc', color: '#16a34a' },
  { href: '/tools/best-time', icon: Clock, titleKey: 'tool_time_title', descKey: 'tool_time_desc', color: '#ea580c' },
  { href: '/tools/account-age', icon: CalendarClock, titleKey: 'tool_age_title', descKey: 'tool_age_desc', color: '#c026d3' },
];

const TRUST = [
  { icon: Gift, key: 'tools_trust_free' },
  { icon: UserX, key: 'tools_trust_nologin' },
  { icon: Database, key: 'tools_trust_nostore' },
  { icon: Zap, key: 'tools_trust_instant' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`tools-faq-item ${open ? 'open' : ''}`}>
      <button className="tools-faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={18} className="tools-faq-caret" />
      </button>
      {open && <div className="tools-faq-a">{a}</div>}
    </div>
  );
}

export default function ToolsHubClient() {
  const { t } = useLang();

  return (
    <>
      {/* Hero — benefit-driven, trust-forward */}
      <section className="tools-hero">
        <span className="tools-hero-eyebrow">{t.tools_hero_eyebrow}</span>
        <h1 className="tools-hero-h1">
          {t.tools_hero_h1a} <em>{t.tools_hero_h1b}</em>
        </h1>
        <p className="tools-hero-sub">{t.tools_hero_sub}</p>

        {/* Trust bar — reduces friction/anxiety before the click */}
        <div className="tools-trust-bar">
          {TRUST.map(({ icon: Icon, key }) => (
            <div key={key} className="tools-trust-item">
              <Icon size={15} strokeWidth={2} />
              <span>{(t as any)[key]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tool grid */}
      <section className="wrap">
        <h2 className="tools-grid-title">{t.tools_section_all}</h2>
        <div className="tools-grid">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className="tool-card">
                {tool.popular && <span className="tool-card-popular">{t.tools_popular}</span>}
                <div className="tool-card-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                <div className="tool-card-body">
                  <div className="tool-card-head">
                    <h3>{(t as any)[tool.titleKey]}</h3>
                  </div>
                  <p>{(t as any)[tool.descKey]}</p>
                  <span className="tool-card-cta">{t.tools_cta_open} <ArrowRight size={14} /></span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* FAQ — objection handling, also feeds FAQ schema */}
        <section className="tools-faq">
          <h2 className="tools-faq-title">{t.tools_faq_title}</h2>
          <FaqItem q={t.tools_faq_q1} a={t.tools_faq_a1} />
          <FaqItem q={t.tools_faq_q2} a={t.tools_faq_a2} />
          <FaqItem q={t.tools_faq_q3} a={t.tools_faq_a3} />
        </section>

        {/* Bottom CTA — honest lead-gen for the agency behind the tools */}
        <section className="tools-bottom-cta">
          <h2>{t.tools_bottom_cta_title}</h2>
          <p>{t.tools_bottom_cta_body}</p>
          <Link href="/contact" className="btn-primary tools-bottom-cta-btn">
            {t.tools_bottom_cta_btn} <ArrowRight size={16} />
          </Link>
        </section>
      </section>
    </>
  );
}
