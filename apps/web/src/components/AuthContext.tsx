import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { parseJsonResponse } from '../lib/http';

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

type UserProfileResponse = {
  data?: {
    id?: number;
    authId?: string;
    name?: string;
    email?: string;
    role?: 'admin' | 'staff';
    username?: string;
    bio?: string;
  };
  error?: string;
};

async function fetchUserProfile(sess: Session): Promise<AuthUser> {
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${sess.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await parseJsonResponse<UserProfileResponse>(res);
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch user profile');
  }

  const data = payload.data || {};
  const fallbackEmail = sess.user.email || '';
  const fallbackUsername = fallbackEmail.split('@')[0] || 'user';

  return {
    id: sess.user.id,
    email: data.email || fallbackEmail,
    name: data.name || fallbackUsername,
    role: data.role || 'staff',
    username: data.username || fallbackUsername,
    bio: data.bio || '',
  };
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

    try {
      const profile = await fetchUserProfile(sess);
      setUser(profile);
      setSession(sess);
    } catch (error) {
      console.error('Error loading user profile:', error);
      const fallbackEmail = supabaseUser.email || '';
      const fallbackUsername = fallbackEmail.split('@')[0] || 'user';

      setUser({
        id: supabaseUser.id,
        email: fallbackEmail,
        name: fallbackUsername,
        role: 'staff',
        username: fallbackUsername,
        bio: '',
      });
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

    const profile = await fetchUserProfile(data.session);
    setUser(profile);
    setSession(data.session);
    return profile;
  };

  const signOut = async () => {
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
