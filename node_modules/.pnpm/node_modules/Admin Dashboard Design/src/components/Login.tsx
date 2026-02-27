import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth }     from './AuthContext';
import { toast }       from 'sonner@2.0.3';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Step = 'email' | 'password' | 'social-pick';

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
    </svg>
  );
}

function ClerkShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.35C17.25 23.15 21 18.25 21 13V7L12 2z" fill="#6C47FF" fillOpacity="0.15" stroke="#6C47FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="#6C47FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── App Logo ──────────────────────────────────────────────────────────────────
function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <path d="M8 6C8 4.895 8.895 4 10 4H26V26H10C8.895 26 8 25.105 8 24V6Z" fill="#4CAF82"/>
      <path d="M26 4H36C40.418 4 44 7.582 44 12C44 16.418 40.418 20 36 20H26V4Z" fill="#E05C5C"/>
      <path d="M26 20H38C42.418 20 46 23.582 46 28C46 32.418 42.418 36 38 36H26V20Z" fill="#F5B942"/>
      <path d="M8 26H26V48H10C8.895 48 8 47.105 8 46V28C8 26.895 8.895 26 10 26Z" fill="#4A90D9"/>
      <path d="M26 36H38C42.418 36 46 39.582 46 44C46 46.209 44.209 48 42 48H26V36Z" fill="#9B59B6"/>
    </svg>
  );
}

// ─── Social provider → demo account mapping ────────────────────────────────────
const SOCIAL_DEMO: Record<string, { identifier: string; label: string }> = {
  google:    { identifier: 'admin@bellabeatrix.com',  label: 'Google (Admin demo)'    },
  facebook:  { identifier: 'staff@bellabeatrix.com',  label: 'Facebook (Staff demo)'  },
  microsoft: { identifier: 'admin@bellabeatrix.com',  label: 'Microsoft (Admin demo)' },
};

// ─── Role-picker shown when social button is clicked ──────────────────────────
function SocialRolePicker({
  provider,
  onPick,
  onCancel,
}: {
  provider: string;
  onPick:   (identifier: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2 mb-1">
            {provider === 'google'    && <GoogleIcon />}
            {provider === 'facebook'  && <FacebookIcon />}
            {provider === 'microsoft' && <MicrosoftIcon />}
            <p className="text-[#111827] text-sm capitalize" style={{ fontWeight: 700 }}>
              Continue with {provider}
            </p>
          </div>
          <p className="text-[#6B7280] text-xs">
            Demo mode — choose an account to sign in as:
          </p>
        </div>

        {/* Account options */}
        <div className="p-3 space-y-2">
          {[
            { identifier: 'admin@bellabeatrix.com', name: 'Admin User', email: 'admin@bellabeatrix.com', badge: 'Admin', badgeColor: 'bg-[#FCE7F3] text-[#EC4899]', initials: 'AU', avatarBg: '#FCE7F3', avatarText: '#EC4899' },
            { identifier: 'staff@bellabeatrix.com', name: 'Staff Member', email: 'staff@bellabeatrix.com', badge: 'Staff', badgeColor: 'bg-blue-50 text-blue-600', initials: 'SM', avatarBg: '#EFF6FF', avatarText: '#3B82F6' },
          ].map(acct => (
            <button
              key={acct.identifier}
              onClick={() => onPick(acct.identifier)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#F3F4F6] hover:border-[#EC4899]/30 hover:bg-[#FCE7F3]/20 transition-all text-left group"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs"
                style={{ backgroundColor: acct.avatarBg, color: acct.avatarText, fontWeight: 700 }}
              >
                {acct.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#111827] text-xs truncate" style={{ fontWeight: 600 }}>{acct.name}</p>
                <p className="text-[#9CA3AF] text-[10px] truncate">{acct.email}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${acct.badgeColor}`}>
                {acct.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onCancel}
            className="w-full py-2 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Login Component ─────────────────────────────────────────────────────
export function Login() {
  const { login, resolveEmail, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already signed in, go straight to dashboard
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const [step,          setStep]         = useState<Step>('email');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [showPassword,  setShowPassword] = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [emailError,    setEmailError]   = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [socialProvider, setSocialProvider] = useState<string | null>(null);

  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'email')    emailRef.current?.focus();
    if (step === 'password') passwordRef.current?.focus();
  }, [step]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const simulateDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
    ['admin', 'staff'].includes(val.toLowerCase().trim());

  // ── Step 1: Continue with email ────────────────────────────────────────────
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    const val = email.trim();
    if (!val) {
      setEmailError('Enter your email address to continue.');
      return;
    }
    if (!isValidEmail(val)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    // Check the identifier resolves to a known user
    const found = resolveEmail(val);
    if (!found) {
      setEmailError('No account found with that email address.');
      return;
    }

    setLoading(true);
    await simulateDelay(500);
    setLoading(false);
    setStep('password');
  };

  // ── Step 2: Sign in with password ─────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!password) {
      setPasswordError('Enter your password to continue.');
      return;
    }

    setLoading(true);
    await simulateDelay(600);
    const ok = login(email.trim(), password);
    setLoading(false);

    if (ok) {
      const user = resolveEmail(email.trim());
      toast.success(`Welcome back, ${user?.name ?? 'there'}!`);
      navigate('/dashboard', { replace: true });
    } else {
      setPasswordError('Password is incorrect. Please try again.');
    }
  };

  // ── Social OAuth (demo) ────────────────────────────────────────────────────
  const handleSocialPick = async (identifier: string) => {
    setSocialProvider(null);
    setLoading(true);
    await simulateDelay(500);
    const ok = login(identifier, 'oauth');
    setLoading(false);
    if (ok) {
      const user = resolveEmail(identifier);
      toast.success(`Welcome back, ${user?.name ?? 'there'}!`);
      navigate('/dashboard', { replace: true });
    }
  };

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#111827] bg-white transition-all outline-none
     placeholder:text-[#9CA3AF]
     ${hasError
       ? 'border-red-400 ring-2 ring-red-400/20'
       : 'border-[#E4E4E7] focus:border-[#6C47FF] focus:ring-2 focus:ring-[#6C47FF]/15'
     }`;

  const resolvedUser = email ? resolveEmail(email.trim()) : null;

  return (
    <>
      {/* Social role picker overlay */}
      {socialProvider && (
        <SocialRolePicker
          provider={socialProvider}
          onPick={handleSocialPick}
          onCancel={() => setSocialProvider(null)}
        />
      )}

      {/* ── Page shell ─────────────────────────────────────────────────── */}
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ backgroundColor: '#FAFAFA' }}
      >
        {/* ── Clerk-style card ──────────────────────────────────────────── */}
        <div
          className="w-full max-w-[400px] bg-white rounded-2xl"
          style={{
            border:     '1px solid rgba(0,0,0,0.08)',
            boxShadow:  '0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
          }}
        >
          {/* ── Card header ────────────────────────────────────────────── */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F4F4F5]">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-2.5">
                <AppLogo size={36} />
                <div>
                  <p className="text-[#111827] text-[15px] leading-tight" style={{ fontWeight: 800 }}>
                    BellahBeatrix
                  </p>
                  <p className="text-[#9CA3AF] text-[10px]">Smart Marketing & Sales</p>
                </div>
              </div>
            </div>

            {/* Title + subtitle */}
            {step === 'email' ? (
              <div className="text-center">
                <h1 className="text-[#111827] text-[22px] leading-tight" style={{ fontWeight: 700 }}>
                  Sign in
                </h1>
                <p className="text-[#71717A] text-sm mt-1.5">
                  to continue to BellahBeatrix
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep('email'); setPassword(''); setPasswordError(''); }}
                  className="p-1.5 rounded-lg hover:bg-[#F4F4F5] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-[#71717A]" />
                </button>
                <div>
                  <h1 className="text-[#111827] text-[18px] leading-tight" style={{ fontWeight: 700 }}>
                    Enter your password
                  </h1>
                  <p className="text-[#71717A] text-xs mt-0.5 truncate max-w-[260px]">
                    for {email.trim()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Card body ──────────────────────────────────────────────── */}
          <div className="px-8 py-6 space-y-4">

            {/* ── STEP 1: Email ─────────────────────────────────────── */}
            {step === 'email' && (
              <>
                {/* Social buttons */}
                <div className="space-y-2.5">
                  {[
                    { id: 'google',    Icon: GoogleIcon,    label: 'Continue with Google'    },
                    { id: 'facebook',  Icon: FacebookIcon,  label: 'Continue with Facebook'  },
                    { id: 'microsoft', Icon: MicrosoftIcon, label: 'Continue with Microsoft' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSocialProvider(p.id)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#E4E4E7]
                                 bg-white text-[#111827] text-sm hover:bg-[#FAFAFA] hover:border-[#D4D4D8]
                                 transition-all active:scale-[0.99] disabled:opacity-50"
                      style={{ fontWeight: 500 }}
                    >
                      <p.Icon />
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[#E4E4E7]" />
                  <span className="text-[11px] text-[#A1A1AA] uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-[#E4E4E7]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailContinue} className="space-y-3" noValidate>
                  <div>
                    <label className="block text-xs text-[#3F3F46] mb-1.5" style={{ fontWeight: 500 }}>
                      Email address
                    </label>
                    <input
                      ref={emailRef}
                      type="text"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="you@bellabeatrix.com"
                      autoComplete="email"
                      className={inputCls(!!emailError)}
                    />
                    {emailError && (
                      <p className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1">
                        <span>⚠</span> {emailError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-2.5 rounded-lg text-white text-sm transition-all active:scale-[0.98]
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background:  loading || !email.trim() ? '#A1A1AA' : 'linear-gradient(135deg,#7C3AED,#6C47FF)',
                      boxShadow:   !loading && email.trim() ? '0 4px 12px rgba(108,71,255,0.35)' : 'none',
                      fontWeight:  600,
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Checking…
                      </>
                    ) : 'Continue'}
                  </button>
                </form>

                {/* Demo hint */}
                <div
                  className="rounded-lg p-3 space-y-1.5"
                  style={{ backgroundColor: '#F8F7FF', border: '1px solid #EDE9FF' }}
                >
                  <p className="text-[11px] text-[#6C47FF]" style={{ fontWeight: 600 }}>
                    🔑 Demo credentials
                  </p>
                  <div className="space-y-1">
                    {[
                      { email: 'admin@bellabeatrix.com', role: 'Admin — full access' },
                      { email: 'staff@bellabeatrix.com', role: 'Staff — operational access' },
                    ].map(d => (
                      <button
                        key={d.email}
                        type="button"
                        onClick={() => { setEmail(d.email); setEmailError(''); }}
                        className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <span className="text-[11px] text-[#6C47FF] font-mono">{d.email}</span>
                        <span className="text-[10px] text-[#A78BFA]">{d.role}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#A78BFA]">Any password works in demo mode.</p>
                </div>
              </>
            )}

            {/* ── STEP 2: Password ──────────────────────────────────── */}
            {step === 'password' && (
              <>
                {/* Resolved user chip */}
                {resolvedUser && (
                  <div className="flex items-center gap-2.5 p-2.5 bg-[#F9FAFB] border border-[#E4E4E7] rounded-lg">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
                      style={{
                        backgroundColor: resolvedUser.role === 'admin' ? '#FCE7F3' : '#EFF6FF',
                        color:           resolvedUser.role === 'admin' ? '#EC4899' : '#3B82F6',
                        fontWeight: 700,
                      }}
                    >
                      {resolvedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>
                        {resolvedUser.name}
                      </p>
                      <p className="text-[10px] text-[#71717A] truncate">{resolvedUser.email}</p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${
                        resolvedUser.role === 'admin'
                          ? 'bg-[#FCE7F3] text-[#EC4899]'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {resolvedUser.role}
                    </span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-3" noValidate>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[#3F3F46]" style={{ fontWeight: 500 }}>
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-[#6C47FF] hover:text-[#5B3ADD] transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={inputCls(!!passwordError) + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A] transition-colors"
                      >
                        {showPassword
                          ? <EyeOff className="w-4 h-4" />
                          : <Eye    className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1">
                        <span>⚠</span> {passwordError}
                      </p>
                    )}
                    <p className="text-[10px] text-[#A1A1AA] mt-1.5">
                      Demo mode — any password is accepted.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full py-2.5 rounded-lg text-white text-sm transition-all active:scale-[0.98]
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: loading || !password ? '#A1A1AA' : 'linear-gradient(135deg,#7C3AED,#6C47FF)',
                      boxShadow:  !loading && password ? '0 4px 12px rgba(108,71,255,0.35)' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in…
                      </>
                    ) : 'Continue'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* ── Card footer ────────────────────────────────────────────── */}
          <div className="px-8 pb-6 border-t border-[#F4F4F5] pt-4">
            <div className="flex items-center justify-center gap-1.5">
              <ClerkShield />
              <span className="text-[11px] text-[#A1A1AA]">Secured by</span>
              <span className="text-[11px] text-[#6C47FF]" style={{ fontWeight: 600 }}>Clerk</span>
              <span className="text-[11px] text-[#D4D4D8] mx-1">·</span>
              <span className="text-[11px] text-[#A1A1AA]">
                <a
                  href="https://clerk.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#71717A] transition-colors"
                >
                  Privacy
                </a>
              </span>
              <span className="text-[11px] text-[#D4D4D8]">·</span>
              <span className="text-[11px] text-[#A1A1AA]">
                <a
                  href="https://clerk.com/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#71717A] transition-colors"
                >
                  Terms
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Outside-card dev note */}
        <p className="fixed bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#D4D4D8] whitespace-nowrap">
          BellahBeatrix Smart Marketing v2.0 — Development mode
        </p>
      </div>
    </>
  );
}
