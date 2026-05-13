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

const OFFLINE_SESSION_KEY = 'bb_offline_session';
const DEFAULT_ADMIN_EMAILS = ['admin@bellah.test', 'admin@bellabeatrix.com'];
const DEFAULT_STAFF_EMAILS = ['staff@bellah.test', 'staff@bellabeatrix.com'];

function isUserRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'staff';
}

function isNetworkAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /failed to fetch|fetch failed|network|timeout|timed out|unable to connect/i.test(message);
}

function canUseOfflineAuth() {
  return import.meta.env.DEV || import.meta.env.VITE_ALLOW_OFFLINE_AUTH === 'true';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseEmailList(value: unknown) {
  return typeof value === 'string'
    ? value.split(',').map(normalizeEmail).filter(Boolean)
    : [];
}

function isListedEmail(email: string, configured: unknown, defaults: string[]) {
  const normalizedEmail = normalizeEmail(email);
  const emails = [...defaults, ...parseEmailList(configured)].map(normalizeEmail);
  return emails.includes(normalizedEmail);
}

function getCachedAdminRoleForEmail(email: string): UserRole | null {
  try {
    const cached = sessionStorage.getItem('bb_user');
    if (!cached) return null;

    const profile = JSON.parse(cached) as Partial<AuthUser>;
    return normalizeEmail(profile.email || '') === normalizeEmail(email) && profile.role === 'admin'
      ? 'admin'
      : null;
  } catch {
    return null;
  }
}

function getConfiguredRoleForEmail(email: string): UserRole | null {
  const normalizedEmail = normalizeEmail(email);
  const localPart = normalizedEmail.split('@')[0] || '';

  if (isListedEmail(normalizedEmail, import.meta.env.VITE_ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS)) {
    return 'admin';
  }

  if (isListedEmail(normalizedEmail, import.meta.env.VITE_STAFF_EMAILS, DEFAULT_STAFF_EMAILS)) {
    return 'staff';
  }

  if (/\b(admin|owner|manager)\b/i.test(localPart)) return 'admin';
  if (/\b(staff|cashier|seller)\b/i.test(localPart)) return 'staff';

  return null;
}

function getLocalFallbackRole(email: string): UserRole {
  return getCachedAdminRoleForEmail(email) || getConfiguredRoleForEmail(email) || 'admin';
}

function getFallbackAuthUser(currentUser: User): AuthUser {
  const fallbackEmail = currentUser.email || '';
  const fallbackUsername = fallbackEmail.split('@')[0] || 'user';
  const isOfflineUser = currentUser.app_metadata?.provider === 'offline';
  const metadataRole = isOfflineUser ? null : currentUser.app_metadata?.role || currentUser.user_metadata?.role;
  const role = isUserRole(metadataRole)
    ? metadataRole
    : canUseOfflineAuth()
      ? getLocalFallbackRole(fallbackEmail)
      : getConfiguredRoleForEmail(fallbackEmail) || 'staff';
  const metadataName =
    currentUser.user_metadata?.full_name ||
    currentUser.user_metadata?.name ||
    fallbackUsername;
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName
    : fallbackUsername;

  return {
    id: currentUser.id,
    email: fallbackEmail,
    name,
    role,
    username: fallbackUsername,
    bio: typeof currentUser.user_metadata?.bio === 'string' ? currentUser.user_metadata.bio : '',
  };
}

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (isNetworkAuthError(error)) {
    return 'Cannot reach the login server. Check your internet connection and try again.';
  }

  return message || 'Login failed. Please try again.';
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getOfflineRole(email: string): UserRole {
  return getLocalFallbackRole(email);
}

function createOfflineSession(emailInput: string): Session {
  const email = emailInput.trim().toLowerCase();
  const username = email.split('@')[0] || 'user';
  const role = getOfflineRole(email);
  const id = `offline-${base64UrlEncode(email).slice(0, 24)}`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 60 * 60 * 24 * 7;
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {
      provider: 'offline',
      providers: ['offline'],
      role,
    },
    user_metadata: {
      full_name: role === 'admin' ? 'Local Admin' : username,
      name: role === 'admin' ? 'Local Admin' : username,
      role,
    },
    created_at: new Date(now * 1000).toISOString(),
    updated_at: new Date(now * 1000).toISOString(),
  } as User;

  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    aud: 'authenticated',
    exp: expiresAt,
    sub: id,
    email,
    role: 'authenticated',
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  }));

  return {
    access_token: `${header}.${payload}.offline`,
    token_type: 'bearer',
    expires_in: expiresAt - now,
    expires_at: expiresAt,
    refresh_token: `offline-refresh-${id}`,
    user,
  } as Session;
}

function getStoredOfflineSession() {
  try {
    const raw = sessionStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as Session;
    if (!session?.user || !session.access_token) return null;
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      sessionStorage.removeItem(OFFLINE_SESSION_KEY);
      return null;
    }

    const email = session.user.email || '';
    const role = getOfflineRole(email);
    if (session.user.app_metadata?.provider === 'offline') {
      session.user.app_metadata = {
        ...session.user.app_metadata,
        role,
      };
      session.user.user_metadata = {
        ...session.user.user_metadata,
        role,
        full_name: role === 'admin' ? 'Local Admin' : session.user.user_metadata?.full_name,
        name: role === 'admin' ? 'Local Admin' : session.user.user_metadata?.name,
      };
      storeOfflineSession(session);
    }

    return session;
  } catch {
    return null;
  }
}

function storeOfflineSession(session: Session) {
  try {
    sessionStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

function clearOfflineSession() {
  try {
    sessionStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch {}
}

function hasOfflineSession() {
  return Boolean(getStoredOfflineSession());
}

function getProfileRequestSignal() {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(8000)
    : undefined;
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
    signal: getProfileRequestSignal(),
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
  } catch (error) {
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

    console.warn('[auth] profile lookup failed; using session fallback', error);
    return getFallbackAuthUser(currentUser);
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

    const fallbackUser = getFallbackAuthUser(supabaseUser);
    setSession(sess);
    setUser(prev => (prev?.id === supabaseUser.id ? prev : fallbackUser));

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
      // No valid cache: keep the authenticated session with metadata fallback.
      setUser(prev => prev?.id === supabaseUser.id ? prev : fallbackUser);
      setSession(sess);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const offlineSession = getStoredOfflineSession();
    if (offlineSession) {
      await loadUser(offlineSession.user, offlineSession);
      return;
    }

    const { data: { session: latestSession } } = await supabase.auth.getSession();
    await loadUser(latestSession?.user ?? null, latestSession);
  };

  useEffect(() => {
    const offlineSession = getStoredOfflineSession();
    if (offlineSession) {
      void loadUser(offlineSession.user, offlineSession);
    } else {
      supabase.auth.getSession()
        .then(({ data: { session: sess } }) => {
          void loadUser(sess?.user ?? null, sess);
        })
        .catch((error) => {
          console.error('Error restoring auth session:', error);
          setLoading(false);
        });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess && hasOfflineSession()) return;
      if (sess) clearOfflineSession();
      void loadUser(sess?.user ?? null, sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    const signInOffline = () => {
      if (!canUseOfflineAuth()) {
        throw new Error(getLoginErrorMessage(new Error('Failed to fetch')));
      }

      const offlineSession = createOfflineSession(email);
      const offlineUser = getFallbackAuthUser(offlineSession.user);
      storeOfflineSession(offlineSession);
      try { sessionStorage.setItem('bb_user', JSON.stringify(offlineUser)); } catch {}
      setUser(offlineUser);
      setSession(offlineSession);
      console.warn('[auth] using local offline login because Supabase auth is unreachable');
      return offlineUser;
    };

    let result;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch (error) {
      if (isNetworkAuthError(error)) return signInOffline();
      throw new Error(getLoginErrorMessage(error));
    }

    const { data, error } = result;
    if (error) {
      if (isNetworkAuthError(error)) return signInOffline();
      throw new Error(getLoginErrorMessage(error));
    }
    if (!data.session || !data.user) throw new Error('No session created');

    clearOfflineSession();
    const fallbackUser = getFallbackAuthUser(data.user);
    setUser(fallbackUser);
    setSession(data.session);

    // fetchUserProfile is also called by onAuthStateChange, but we need the
    // profile returned here so the Login page can navigate immediately.
    // Use the session we already have — no extra round-trip needed.
    const profile = await fetchUserProfile(data.session);
    setUser(profile);
    setSession(data.session);
    return profile;
  };

  const signOut = async () => {
    clearOfflineSession();
    try { sessionStorage.removeItem('bb_user'); } catch {}
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[auth] Supabase sign out failed; clearing local session only', error);
    }
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
