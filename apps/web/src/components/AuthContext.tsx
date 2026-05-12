import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);

  const currentUser = authData.user;
  if (!currentUser || currentUser.id !== sess.user.id) {
    throw new Error('Unable to verify authenticated user');
  }

  const { data, error } = await supabase
    .from('users')
    .select('name, email, role')
    .eq('auth_id', currentUser.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !isUserRole(data.role)) {
    throw new Error('User role not found');
  }

  const fallbackEmail = currentUser.email || sess.user.email || '';
  const fallbackUsername = fallbackEmail.split('@')[0] || 'user';

  return {
    id: currentUser.id,
    email: data.email || fallbackEmail,
    name: data.name || fallbackUsername,
    role: data.role,
    username: fallbackUsername,
    bio: '',
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
      setUser(null);
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
