import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser(supabaseUser: User | null, sess: Session | null) {
    if (!supabaseUser) {
      setUser(null);
      setSession(null);
      return;
    }

    const email = supabaseUser.email || '';
    // Basic mapping: customize these emails to your actual admin accounts
    const role = (email === 'admin@bellah.com' || email === 'admin@gmail.com' || email === 'admin@bellah.test') ? 'admin' : 'staff';

    setUser({
      id: supabaseUser.id,
      email: email,
      name: email.split('@')[0],
      role: role,
    });
    setSession(sess);
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      loadUser(sess?.user ?? null, sess).finally(() => setLoading(false));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      loadUser(sess?.user ?? null, sess);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
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