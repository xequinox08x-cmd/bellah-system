import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { API_BASE } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  username: string;
  bio: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type UserRole = 'admin' | 'staff';

function isUserRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'staff';
}

async function fetchUserProfile(sess: Session): Promise<AuthUser> {
  const currentUser = sess.user;
  if (!currentUser) throw new Error('No authenticated user in session');

  const fallbackEmail = currentUser.email || '';
  const fallbackUsername = fallbackEmail.split('@')[0] || 'user';

  // ── Tier 1: Express API (authoritative, has full profile) ─────────────
  const apiPromise = fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${sess.access_token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(8000), // 8s — accounts for tsx watch cold-start
  }).then(async (res) => {
    const payload = await res.json();
    if (res.ok && payload?.data && isUserRole(payload.data.role)) {
      return {
        id: currentUser.id,
        email: payload.data.email || fallbackEmail,
        name: payload.data.name || fallbackUsername,
        role: payload.data.role as UserRole,
        username: payload.data.username || fallbackUsername,
        bio: payload.data.bio || '',
      } as AuthUser;
    }
    throw new Error('API profile invalid');
  });

  // ── Tier 2: Supabase users table (direct DB, bypasses API) ────────────
  const supabasePromise = supabase
    .from('users')
    .select('name, email, role')
    .eq('auth_id', currentUser.id)
    .maybeSingle()   // returns null instead of 406/400 when no row found
    .then(({ data, error }) => {
      if (error) throw new Error(error.message);
      if (!data || !isUserRole(data.role)) throw new Error('No profile row');
      return {
        id: currentUser.id,
        email: (data as any).email || fallbackEmail,
        name: (data as any).name || fallbackUsername,
        role: data.role as UserRole,
        username: fallbackUsername,
        bio: '',
      } as AuthUser;
    });

  // Race tiers 1 & 2 — fastest success wins
  try {
    return await Promise.any([apiPromise, supabasePromise]);
  } catch {
    // ── Tier 3: JWT metadata (zero DB queries — always available) ────────
    // Supabase embeds app_metadata & user_metadata directly in the JWT.
    // Admin can set role via: supabase.auth.admin.updateUserById(id, { app_metadata: { role: 'admin' } })
    const jwtRole =
      currentUser.app_metadata?.role ||
      currentUser.user_metadata?.role;

    if (isUserRole(jwtRole)) {
      return {
        id: currentUser.id,
        email: fallbackEmail,
        name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || fallbackUsername,
        role: jwtRole as UserRole,
        username: fallbackUsername,
        bio: '',
      };
    }

    throw new Error(
      'Could not load your profile. Check your internet connection and try again.'
    );
  }
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async (supabaseUser: User | null, sess: Session | null) => {
    if (!supabaseUser || !sess) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    // Preserve existing user during re-fires to prevent flicker
    setUser(prev => (prev?.id === supabaseUser.id ? prev : prev));

    try {
      const profile = await fetchUserProfile(sess);
      // Cache profile so 503s don't log the user out on next load
      try { sessionStorage.setItem('bb_user', JSON.stringify(profile)); } catch {}
      setUser(profile);
      setSession(sess);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Try restoring from cache before giving up
      try {
        const cached = sessionStorage.getItem('bb_user');
        if (cached) {
          const cachedProfile = JSON.parse(cached) as AuthUser;
          if (cachedProfile.id === supabaseUser.id) {
            console.info('[auth] restored profile from session cache');
            setUser(cachedProfile);
            setSession(sess);
            setLoading(false);
            return;
          }
        }
      } catch {}
      // No valid cache — preserve existing user rather than clearing
      setUser(prev => prev?.id === supabaseUser.id ? prev : null);
      setSession(sess);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { session: latestSession } } = await supabase.auth.getSession();
    await loadUser(latestSession?.user ?? null, latestSession);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      void loadUser(sess?.user ?? null, sess);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      void loadUser(sess?.user ?? null, sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('No session created');

    // fetchUserProfile is also called by onAuthStateChange, but we need the
    // profile returned here so the Login page can navigate immediately.
    // Use the session we already have — no extra round-trip needed.
    const profile = await fetchUserProfile(data.session);
    setUser(profile);
    setSession(data.session);
    return profile;
  };

  const signOut = async () => {
    try { sessionStorage.removeItem('bb_user'); } catch {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, logout: signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
