// Server-side: use internal URL (faster + works even without public exposure)
// Client-side: use public URL (browser must reach it)
// When deployed as a combined app (same origin), leave NEXT_PUBLIC_API_URL blank
// and API calls go to the same domain automatically.
const API_URL =
  (typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''
    : process.env.NEXT_PUBLIC_API_URL || '');

async function request(path: string, opts: RequestInit = {}) {
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers, cache: 'no-store' });
  if (!res.ok) {
    let err: any = {};
    try { err = await res.json(); } catch {}
    const error: any = new Error(err.error || `Hata: ${res.status}`);
    error.status = res.status;
    // Forward useful flags
    if (err.needsVerification) { error.needsVerification = true; error.email = err.email; }
    if (err.needsTotp) { error.needsTotp = true; }
    if (err.code) { error.code = err.code; }
    if (res.status === 401 && typeof window !== 'undefined') {
      const msg = err.error || '';
      if (msg.includes('cihazdan') || msg.includes('Geçersiz')) {
        try { localStorage.removeItem('sm_token'); localStorage.removeItem('sm_user'); } catch {}
      }
    }
    throw error;
  }
  return res.json();
}

function authHeader(token?: string) {
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}`, 'x-admin-token': token };
}

export const api = {
  get: (path: string, token?: string) => request(path, { headers: authHeader(token) }),
  post: (path: string, body: any, token?: string) =>
    request(path, { method: 'POST', body: JSON.stringify(body), headers: authHeader(token) }),
  put: (path: string, body: any, token: string) =>
    request(path, { method: 'PUT', body: JSON.stringify(body), headers: authHeader(token) }),
  del: (path: string, token: string) =>
    request(path, { method: 'DELETE', headers: authHeader(token) })
};

// ─── Types ─────────────────────────────────────────
export interface Account {
  id: number;
  displayName: string;
  handle: string;
  url: string;
  bio: string;
  category: string;
  followers: number;
  avatar: string;
  enabled: boolean;
  createdAt: string;
}

// ── Auth / Users ──
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: 'superadmin' | 'publisher' | 'creator';
  permissions: Record<string, boolean>;
  active?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserPost {
  id: number;
  authorId: number;
  authorUsername?: string;
  authorName?: string;
  authorAvatar?: string;
  authorBio?: string;
  type: 'post' | 'blog' | 'news';
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  media: { type: string; url: string }[];
  category: string;
  tags: string[];
  status: 'pending' | 'approved' | 'declined' | 'draft';
  declineReason: string;
  reviewedAt?: string;
  reviewerUsername?: string;
  publishedAt?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Payment {
  id: number;
  collaborationId?: number;
  amount: number;
  currency: string;
  source: string;
  description: string;
  status: string;
  receivedAt: string;
  recordedBy?: number;
  createdAt: string;
}

export interface Collaboration {
  id: number;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  type: string;
  budget: string;
  budgetAmount?: number;
  budgetCurrency: string;
  message: string;
  media: { type: string; url: string; name?: string }[];
  status: 'new' | 'reviewing' | 'accepted' | 'declined' | 'completed';
  adminRemarks: string;
  assignedTo?: number;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Batch 2 types ──
export interface Comment {
  id: number;
  postId: number;
  userId?: number;
  username?: string;
  fullName?: string;
  avatar?: string;
  guestName?: string;
  content: string;
  parentId?: number;
  createdAt: string;
}

export interface Engagement {
  likes: number;
  comments: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
}

export interface CategoryStat {
  category: string;
  postCount: number;
}

export interface SearchResults {
  posts: UserPost[];
  accounts: Account[];
  news: any[];
  query: string;
}

export interface Activity {
  id: number;
  type: string;
  postId?: number;
  postTitle?: string;
  postSlug?: string;
  actorId?: number;
  actorUsername?: string;
  actorName?: string;
  data?: any;
  createdAt: string;
}

export interface CoAuthor {
  id: number;
  username: string;
  fullName?: string;
  avatar?: string;
  position?: number;
}


export interface Subscriber {
  id: number;
  name: string;
  handle: string;
  xUrl: string;
  addedAt: string;
}

export interface Tweet {
  id: number;
  xId?: string;
  accountHandle: string;
  text: string;
  richText?: string;
  media: { type: string; url: string; name?: string }[];
  likes: number;
  retweets: number;
  replies: number;
  createdAt: string;
  xUrl: string;
  source: string;
}

export interface NewsItem {
  id: number;
  rssSourceId: number;
  guid: string;
  title: string;
  url: string;
  description: string;
  image: string;
  category: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface Stats {
  totalFollowers: number;
  accountCount: number;
  subscriberCount: number;
  tweetCount: number;
  contactCount: number;
  collaborationCount: number;
  newsletterCount: number;
  newsCount: number;
  lastTweetSync: string | null;
}

// ─── Helpers ──────────────────────────────────────
export function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export function timeAgo(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return 'şimdi';
  if (sec < 3600) return Math.floor(sec / 60) + ' dk';
  if (sec < 86400) return Math.floor(sec / 3600) + ' sa';
  if (sec < 604800) return Math.floor(sec / 86400) + ' gün';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name: string): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
