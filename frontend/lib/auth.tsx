'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, User } from './api';

interface AuthCtx {
  token: string;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, website?: string, totpCode?: string) => Promise<User>;
  register: (data: { username: string; email: string; password: string; fullName?: string }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  isRole: (...roles: string[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load from storage on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem('sm_token') || '';
      const u = localStorage.getItem('sm_user');
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {}
    setLoading(false);
  }, []);

  // Re-verify session every 60s — catches single-session enforcement
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const check = async () => {
      try {
        const r = await api.get('/api/auth/me', token);
        if (mounted && r.user) {
          setUser(r.user);
          try { localStorage.setItem('sm_user', JSON.stringify(r.user)); } catch {}
        }
      } catch (e: any) {
        if (e.status === 401 && mounted) {
          logout();
          router.push('/login?reason=session');
        }
      }
    };
    const id = setInterval(check, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [token]);

  const login = useCallback(async (username: string, password: string, website?: string, totpCode?: string) => {
    const r = await api.post('/api/auth/login', { username, password, website: website || '', totpCode: totpCode || '' });
    if (r && r.needsTotp && !r.token) {
      const e: any = new Error('2FA kodu gerekli');
      e.needsTotp = true;
      throw e;
    }
    setToken(r.token); setUser(r.user);
    try {
      localStorage.setItem('sm_token', r.token);
      localStorage.setItem('sm_user', JSON.stringify(r.user));
    } catch {}
    return r.user;
  }, []);

  const register = useCallback(async (data: { username: string; email: string; password: string; fullName?: string }) => {
    const r = await api.post('/api/auth/register', data);
    setToken(r.token); setUser(r.user);
    try {
      localStorage.setItem('sm_token', r.token);
      localStorage.setItem('sm_user', JSON.stringify(r.user));
    } catch {}
    return r.user;
  }, []);

  const logout = useCallback(() => {
    if (token) { api.post('/api/auth/logout', {}, token).catch(() => {}); }
    setToken(''); setUser(null);
    try { localStorage.removeItem('sm_token'); localStorage.removeItem('sm_user'); } catch {}
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get('/api/auth/me', token);
      setUser(r.user);
      try { localStorage.setItem('sm_user', JSON.stringify(r.user)); } catch {}
    } catch {}
  }, [token]);

  const hasPerm = useCallback((perm: string) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return !!user.permissions?.[perm];
  }, [user]);

  const isRole = useCallback((...roles: string[]) => !!user && roles.includes(user.role), [user]);

  return (
    <Ctx.Provider value={{ token, user, loading, login, register, logout, refresh, hasPerm, isRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
