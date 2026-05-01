import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, AlertCircle, Moon, Sun } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  const t = isDark ? theme.dark : theme.light;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!data.session) throw new Error('No session created.');

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch user role.');
      const { data: profile } = await res.json();

      if ((profile?.role || 'staff') === 'admin') navigate('/admin/dashboard');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{ ...styles.root, background: t.bg }}>
      {/* Background orbs — only in dark mode */}
      {isDark && (
        <>
          <div style={{ ...styles.orb, ...styles.orb1 }} />
          <div style={{ ...styles.orb, ...styles.orb2 }} />
          <div style={{ ...styles.orb, ...styles.orb3 }} />
        </>
      )}

      {/* Theme toggle — top right */}
      <button
        id="theme-toggle"
        onClick={() => setIsDark(d => !d)}
        style={{ ...styles.themeToggle, background: t.toggleBg, border: `1px solid ${t.toggleBorder}`, color: t.toggleIcon }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        type="button"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Card */}
      <div style={{ ...styles.card, background: t.cardBg, border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow }}>

        {/* Brand */}
        <div style={styles.cardHeader}>
          <span style={{ ...styles.brandText, ...(isDark ? styles.brandTextDark : styles.brandTextLight) }}>
            Bellah Beatrix
          </span>
          <p style={{ ...styles.cardSub, color: t.subText }}>Sign in to your account to continue</p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={14} style={{ color: '#f472b6', flexShrink: 0 }} />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Email field */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.fieldLabel, color: t.labelColor }} htmlFor="login-email">Email address</label>
          <div
            style={{ ...styles.inputWrap, background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
            className="login-input-wrap"
          >
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              style={{ ...styles.input, color: t.inputText }}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password field */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.fieldLabel, color: t.labelColor }} htmlFor="login-password">Password</label>
          <div
            style={{ ...styles.inputWrap, background: t.inputBg, border: `1px solid ${t.inputBorder}`, position: 'relative' }}
            className="login-input-wrap"
          >
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{ ...styles.input, color: t.inputText, paddingRight: 42 }}
              autoComplete="current-password"
            />
            <button
              onClick={() => setShowPassword(p => !p)}
              style={{ ...styles.eyeBtn, color: t.eyeIcon }}
              type="button"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Forgot */}
        <div style={styles.forgotRow}>
          <button style={styles.forgotBtn} type="button">Forgot password?</button>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          onClick={handleLogin}
          disabled={isLoading}
          style={styles.submitBtn}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Signing in…</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <p style={{ ...styles.footerNote, color: t.footerText }}>🔒 Authorized personnel only</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .login-input-wrap:focus-within {
          border-color: #e91e8c !important;
          box-shadow: 0 0 0 3px rgba(233,30,140,0.15) !important;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes orb-float-1 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(40px, -30px) scale(1.08); }
        }
        @keyframes orb-float-2 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-30px, 40px) scale(1.05); }
        }
        @keyframes orb-float-3 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(20px, 20px) scale(1.06); }
        }

        #theme-toggle:hover {
          opacity: 0.75;
        }
      `}</style>
    </div>
  );
}

/* ── Theme tokens ── */
const theme = {
  dark: {
    bg: '#0c0c0f',
    cardBg: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.09)',
    cardShadow: '0 24px 80px rgba(0,0,0,0.5)',
    subText: 'rgba(255,255,255,0.38)',
    labelColor: 'rgba(255,255,255,0.5)',
    inputBg: 'rgba(255,255,255,0.05)',
    inputBorder: 'rgba(255,255,255,0.1)',
    inputText: '#fff',
    eyeIcon: 'rgba(255,255,255,0.35)',
    footerText: 'rgba(255,255,255,0.18)',
    toggleBg: 'rgba(255,255,255,0.06)',
    toggleBorder: 'rgba(255,255,255,0.12)',
    toggleIcon: 'rgba(255,255,255,0.7)',
  },
  light: {
    bg: '#f4f4f8',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.08)',
    cardShadow: '0 12px 48px rgba(0,0,0,0.1)',
    subText: 'rgba(0,0,0,0.42)',
    labelColor: 'rgba(0,0,0,0.5)',
    inputBg: '#f7f7fa',
    inputBorder: 'rgba(0,0,0,0.1)',
    inputText: '#111',
    eyeIcon: 'rgba(0,0,0,0.35)',
    footerText: 'rgba(0,0,0,0.25)',
    toggleBg: 'rgba(0,0,0,0.05)',
    toggleBorder: 'rgba(0,0,0,0.1)',
    toggleIcon: 'rgba(0,0,0,0.6)',
  },
};

/* ── Static styles ── */
const PINK = '#e91e8c';
const PINK_DARK = '#c2185b';

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '24px 16px',
    transition: 'background 0.3s',
  },

  /* Background orbs (dark only) */
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orb1: {
    width: 480, height: 480,
    background: 'rgba(233,30,140,0.18)',
    top: '-120px', left: '-80px',
    animation: 'orb-float-1 9s ease-in-out infinite',
  },
  orb2: {
    width: 340, height: 340,
    background: 'rgba(140,30,233,0.12)',
    bottom: '-80px', right: '10%',
    animation: 'orb-float-2 12s ease-in-out infinite',
  },
  orb3: {
    width: 260, height: 260,
    background: 'rgba(233,30,140,0.09)',
    top: '40%', right: '5%',
    animation: 'orb-float-3 10s ease-in-out infinite',
  },

  /* Theme toggle */
  themeToggle: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.2s, background 0.3s',
  },

  /* Card */
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 420,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 24,
    padding: '44px 36px 36px',
    transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
  },

  cardHeader: {
    marginBottom: 32,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    gap: 10,
  },

  /* Brand text — dark variant */
  brandTextDark: {
    background: 'linear-gradient(135deg, #fff 20%, #e91e8c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,

  /* Brand text — light variant */
  brandTextLight: {
    color: '#111111',
    WebkitTextFillColor: '#111111',
    background: 'none',
  } as React.CSSProperties,

  brandText: {
    display: 'block',
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1.1,
  },

  cardSub: {
    fontSize: 13,
    fontWeight: 400,
    margin: 0,
  },

  /* Error */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 14px',
    borderRadius: 12,
    background: 'rgba(233,30,140,0.1)',
    border: '1px solid rgba(233,30,140,0.25)',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    fontWeight: 500,
    color: '#f9a8d4',
  },

  /* Fields */
  fieldGroup: { marginBottom: 16 },

  fieldLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },

  inputWrap: {
    borderRadius: 12,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  input: {
    display: 'block',
    width: '100%',
    padding: '13px 16px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontWeight: 400,
    borderRadius: 12,
    fontFamily: "'Inter', sans-serif",
  },

  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    transition: 'color 0.15s',
  },

  forgotRow: {
    textAlign: 'right' as const,
    marginBottom: 24,
    marginTop: -4,
  },

  forgotBtn: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    color: PINK,
    cursor: 'pointer',
    opacity: 0.85,
    fontFamily: "'Inter', sans-serif",
    padding: 0,
    transition: 'opacity 0.15s',
  },

  submitBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${PINK}, ${PINK_DARK})`,
    boxShadow: `0 4px 20px rgba(233,30,140,0.35)`,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.01em',
    transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
    marginBottom: 24,
  },

  footerNote: {
    textAlign: 'center' as const,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
};