import { MetadataRoute } from 'next';
import { api, Account } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sosyal-medya.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let accounts: Account[] = [];
  let posts: any[] = [];
  try { accounts = await api.get('/api/accounts'); } catch {}
  try { posts = await api.get('/api/posts?limit=200'); } catch {}

  const staticPages = [
    { url: BASE, priority: 1.0 },
    { url: `${BASE}/news`, priority: 0.8 },
    { url: `${BASE}/blog`, priority: 0.9 },
    { url: `${BASE}/about`, priority: 0.7 },
    { url: `${BASE}/contact`, priority: 0.7 },
    { url: `${BASE}/collaboration`, priority: 0.7 },
    { url: `${BASE}/subscribe`, priority: 0.6 },
    { url: `${BASE}/register`, priority: 0.6 },
    { url: `${BASE}/tools`, priority: 0.8 },
    { url: `${BASE}/tools/shadowban`, priority: 0.8 },
    { url: `${BASE}/tools/audit`, priority: 0.8 },
    { url: `${BASE}/tools/tweet-performance`, priority: 0.8 },
    { url: `${BASE}/tools/best-time`, priority: 0.8 },
    { url: `${BASE}/tools/bio-generator`, priority: 0.8 },
    { url: `${BASE}/tools/hashtag`, priority: 0.8 },
    { url: `${BASE}/tools/account-age`, priority: 0.8 },
    { url: `${BASE}/gizlilik`, priority: 0.4 },
    { url: `${BASE}/cookies`, priority: 0.4 },
    { url: `${BASE}/terms`, priority: 0.4 },
    { url: `${BASE}/impressum`, priority: 0.4 }
  ];

  return [
    ...staticPages.map(p => ({ url: p.url, lastModified: new Date(), priority: p.priority, changeFrequency: 'weekly' as const })),
    ...accounts.map(a => ({
      url: `${BASE}/account/${a.handle}`,
      lastModified: new Date(),
      priority: 0.9,
      changeFrequency: 'hourly' as const
    })),
    ...posts.map((p: any) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      priority: 0.7,
      changeFrequency: 'weekly' as const
    }))
  ];
}
