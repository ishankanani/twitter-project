/**
 * Skeleton loaders — replace plain "Loading..." text with a visual placeholder.
 * Respects prefers-reduced-motion automatically via globals.css.
 */
import React from 'react';

export function SkeletonText({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return <span className="skeleton skeleton-text" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonTitle({ width = '60%' }: { width?: string }) {
  return <div className="skeleton skeleton-title" style={{ width }} aria-hidden="true" />;
}

export function SkeletonCard({ height = 160 }: { height?: number }) {
  return <div className="skeleton skeleton-card" style={{ height }} aria-hidden="true" />;
}

/**
 * SkeletonList — n stacked rows for list views (admin tables, etc.)
 */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
          <SkeletonTitle width={`${40 + Math.random() * 40}%`} />
          <SkeletonText width="80%" />
          <SkeletonText width="50%" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * SkeletonGrid — for card grids (blog list, dashboard posts grid, etc.)
 */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
        gap: '1.2rem',
      }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}
          style={{
            background: 'white',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
          <SkeletonCard height={140} />
          <div style={{ padding: '14px 16px' }}>
            <SkeletonTitle />
            <SkeletonText width="90%" />
            <SkeletonText width="60%" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
