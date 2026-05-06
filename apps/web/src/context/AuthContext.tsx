import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { parseJsonResponse } from '../lib/http';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile from our backend
  const fetchUserProfile = async (sess: Session): Promise<AuthUser> => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${sess.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const payload = await parseJsonResponse<{ data?: { name?: string; role?: 'admin' | 'staff' }; error?: string }>(res);
    if (!res.ok) throw new Error(payload.error || 'Failed to fetch user profile');
    const data = payload.data || {};
    
    return {
      id: sess.user.id,
      email: sess.user.email || '',
      name: data.name || sess.user.email?.split('@')[0] || 'User',
      role: data.role || 'staff'
    };
  };

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
    } catch (err) {
      console.error('Error loading user profile:', err);
      // Fallback if API is down
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.email?.split('@')[0] || 'User',
        role: 'staff'
      });
      setSession(sess);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      loadUser(sess?.user ?? null, sess);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      loadUser(sess?.user ?? null, sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('No session created');

    // Fetch profile immediately after login to get the role
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
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
