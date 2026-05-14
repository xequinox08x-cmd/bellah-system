import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { preloadCriticalPages } from '../routes';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && user) {
      preloadCriticalPages();
      navigate(user.role === 'admin' ? '/admin' : '/staff');
    }
  }, [loading, user, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      preloadCriticalPages();
      navigate('/dashboard');
    } catch (err: any) {
      const message = err?.message || (typeof err === 'object' ? JSON.stringify(err) : null);
      setError(message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{ ...styles.root }}>

      {/* Card */}
      <div style={{ ...styles.card }}>

        {/* Brand */}
        <div style={styles.cardHeader}>
          <span style={{ ...styles.brandText, ...styles.brandTextLight }}>
            Bellah Beatrix
          </span>
          <p style={{ ...styles.cardSub }}>Sign in to your account to continue</p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={14} style={{ color: '#DB2777', flexShrink: 0 }} />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Email field */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.fieldLabel }} htmlFor="login-email">Email address</label>
          <div
            style={{ ...styles.inputWrap }}
            className="login-input-wrap"
          >
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              style={{ ...styles.input }}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password field */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.fieldLabel }} htmlFor="login-password">Password</label>
          <div
            style={{ ...styles.inputWrap, position: 'relative' }}
            className="login-input-wrap"
          >
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{ ...styles.input, paddingRight: 42 }}
              autoComplete="current-password"
            />
            <button
              onClick={() => setShowPassword(p => !p)}
              style={{ ...styles.eyeBtn }}
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

        <p style={{ ...styles.footerNote }}>🔒 Authorized personnel only</p>
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
      `}</style>
    </div>
  );
}

/* ── Static styles — forced light mode ── */
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
    background: '#f4f4f8',
  },

  /* Card */
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: '44px 36px 36px',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
  },

  cardHeader: {
    marginBottom: 32,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    gap: 10,
  },

  /* Brand text — light only */
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
    color: 'rgba(0,0,0,0.42)',
  },

  /* Error */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 14px',
    borderRadius: 12,
    background: 'rgba(233,30,140,0.08)',
    border: '1px solid rgba(233,30,140,0.2)',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    fontWeight: 500,
    color: '#DB2777',
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
    color: 'rgba(0,0,0,0.5)',
  },

  inputWrap: {
    borderRadius: 12,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: '#f7f7fa',
    border: '1px solid rgba(0,0,0,0.1)',
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
    color: '#111',
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
    color: 'rgba(0,0,0,0.35)',
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
    color: 'rgba(0,0,0,0.25)',
  },
};
