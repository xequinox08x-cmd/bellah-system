import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { offlineStore, SESSION_KEY, type UserRole } from '../lib/offlineStore';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  username: string;
  bio: string;
}

type LocalSession = {
  access_token: string;
  userId: number;
  createdAt: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: LocalSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function toAuthUser(user: ReturnType<typeof offlineStore.authenticate>): AuthUser {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    username: user.username,
    bio: user.bio,
  };
}

function readSession(): LocalSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as LocalSession : null;
  } catch {
    return null;
  }
}

function writeSession(session: LocalSession | null) {
  if (session) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

function sessionUser(session: LocalSession | null): AuthUser | null {
  if (!session) return null;
  const user = offlineStore.getUsers().find((row) => row.id === session.userId && row.status === 'active');
  return user ? toAuthUser(user as Parameters<typeof toAuthUser>[0]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<LocalSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const stored = readSession();
    const refreshedUser = sessionUser(stored);
    setSessionState(refreshedUser ? stored : null);
    setUser(refreshedUser);
    if (!refreshedUser) writeSession(null);
  };

  useEffect(() => {
    void refreshUser();
    setLoading(false);
    const handleStoreUpdate = () => void refreshUser();
    window.addEventListener('bellah-store-updated', handleStoreUpdate);
    return () => window.removeEventListener('bellah-store-updated', handleStoreUpdate);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    signIn: async (email: string, password: string) => {
      const authenticated = offlineStore.authenticate(email, password);
      const nextSession: LocalSession = {
        access_token: `offline-${authenticated.id}-${Date.now()}`,
        userId: authenticated.id,
        createdAt: new Date().toISOString(),
      };
      const authUser = toAuthUser(authenticated);
      writeSession(nextSession);
      setSessionState(nextSession);
      setUser(authUser);
      return authUser;
    },
    signOut: async () => {
      writeSession(null);
      setSessionState(null);
      setUser(null);
    },
    logout: async () => {
      writeSession(null);
      setSessionState(null);
      setUser(null);
    },
    refreshUser,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
