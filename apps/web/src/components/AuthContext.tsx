import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'staff';

export interface AuthUser {
  id:        string;
  name:      string;
  username:  string;
  email:     string;
  role:      UserRole;
  avatar?:   string;
  /** Mirrors Clerk's publicMetadata.role field for future real Clerk integration */
  publicMetadata?: { role: UserRole };
}

interface AuthContextType {
  user:            AuthUser | null;
  /** Sign in by username OR full email address. Any password accepted (demo mode). */
  login:           (identifier: string, password: string) => boolean;
  /** Resolve which role an email belongs to without fully signing in (used in 2-step flow) */
  resolveEmail:    (email: string) => AuthUser | null;
  logout:          () => void;
  isAuthenticated: boolean;
  /** Clerk-compatible: true once auth state is determined */
  isLoaded:        boolean;
}

// ─── Mock user registry ───────────────────────────────────────────────────────
// In a real Clerk integration these come from Clerk's user object + publicMetadata.role
const MOCK_USERS: AuthUser[] = [
  {
    id:       'user_admin_001',
    name:     'Admin User',
    username: 'admin',
    email:    'admin@bellabeatrix.com',
    role:     'admin',
    avatar:   'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    publicMetadata: { role: 'admin' },
  },
  {
    id:       'user_staff_001',
    name:     'Staff Member',
    username: 'staff',
    email:    'staff@bellabeatrix.com',
    role:     'staff',
    avatar:   'https://api.dicebear.com/7.x/avataaars/svg?seed=staff',
    publicMetadata: { role: 'staff' },
  },
];

/** Normalise an identifier → look up by username OR by email (case-insensitive) */
function findUser(identifier: string): AuthUser | null {
  const key = identifier.toLowerCase().trim();
  return (
    MOCK_USERS.find(u => u.username === key) ??
    MOCK_USERS.find(u => u.email === key) ??
    null
  );
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('bb_clerk_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (identifier: string, _password: string): boolean => {
    const found = findUser(identifier);
    if (found) {
      setUser(found);
      localStorage.setItem('bb_clerk_session', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const resolveEmail = (email: string): AuthUser | null => findUser(email);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bb_clerk_session');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        resolveEmail,
        logout,
        isAuthenticated: !!user,
        isLoaded: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
