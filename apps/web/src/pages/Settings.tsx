import { useEffect, useState } from 'react';
import { User, Bell, Shield, Palette, Save, Check, Link2, RefreshCw, AlertCircle } from 'lucide-react';
import { APP_THEME_PALETTES, useAppTheme } from '../components/AppThemeProvider';
import { useAuth } from '../components/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

type Section = 'profile' | 'notifications' | 'security' | 'appearance';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security & Role', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function Toggle({
  enabled,
  onChange,
  activeColor = '#EC4899',
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition-all relative ${enabled ? '' : 'bg-[#D1D5DB]'}`}
      style={enabled ? { backgroundColor: activeColor } : undefined}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

type FacebookStatus = {
  valid: boolean;
  state: 'connected' | 'expired' | 'invalid' | 'missing_config';
  pageId: string | null;
  pageName: string | null;
  error: string | null;
  expiresAt: string | null;
  tokenUpdatedAt: string | null;
  tokenExpiresAt: string | null;
  lastKnownSync: {
    contentId: number | null;
    facebookPostId: string | null;
    syncedAt: string | null;
  };
};

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not available';
}

export default function Settings() {
  const { user, session, refreshUser } = useAuth();
  const { palette, paletteId, setPaletteId } = useAppTheme();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [facebookStatusLoading, setFacebookStatusLoading] = useState(false);
  const [facebookStatusError, setFacebookStatusError] = useState<string | null>(null);
  const [facebookStatusRefreshKey, setFacebookStatusRefreshKey] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    username: '',
    bio: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifs, setNotifs] = useState({
    newSale: true,
    lowStock: true,
    pendingApproval: true,
    contentPublished: false,
    weeklyReport: true,
    dailyDigest: false,
  });

  const markSaved = (message: string) => {
    setSaved(true);
    toast.success(message);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileSave = async () => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const name = profile.name.trim();
    const email = profile.email.trim();
    const username = profile.username.trim();

    if (!name) throw new Error('Full name is required');
    if (!email || !email.includes('@')) throw new Error('Valid email is required');
    if (!username) throw new Error('Username is required');

    setProfileSaving(true);
    try {
      const response = await api.updateCurrentUser(
        {
          name,
          email,
          username,
          bio: profile.bio,
        },
        session.access_token
      );

      setProfile({
        name: response.data.name,
        email: response.data.email,
        username: response.data.username,
        bio: response.data.bio,
      });

      await refreshUser();
      markSaved('Profile updated successfully');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user?.email) {
      throw new Error('No active user');
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      throw new Error('Complete all password fields');
    }

    if (passwordForm.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      throw new Error('Password confirmation does not match');
    }

    setPasswordSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      markSaved('Password updated successfully');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      if (activeSection === 'profile') {
        await handleProfileSave();
        return;
      }

      if (activeSection === 'security') {
        await handlePasswordUpdate();
        return;
      }

      markSaved('Settings saved successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings');
    }
  };

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      username: user?.username || '',
      bio: user?.bio || '',
    });
  }, [user?.bio, user?.email, user?.name, user?.username]);

  useEffect(() => {
    if (activeSection !== 'security' || user?.role !== 'admin') return;

    let active = true;

    async function loadFacebookStatus() {
      setFacebookStatusLoading(true);
      setFacebookStatusError(null);

      try {
        const response = await api.getFacebookStatus();
        if (!active) return;
        setFacebookStatus(response.data as FacebookStatus);
      } catch (error: any) {
        if (!active) return;
        setFacebookStatus(null);
        setFacebookStatusError(error?.message || 'Failed to load Facebook status');
      } finally {
        if (active) {
          setFacebookStatusLoading(false);
        }
      }
    }

    void loadFacebookStatus();
    return () => {
      active = false;
    };
  }, [activeSection, user?.role, facebookStatusRefreshKey]);

  const canShowFacebookStatus = activeSection === 'security' && user?.role === 'admin';
  const facebookState = facebookStatus?.state ?? 'missing_config';
  const facebookStateClasses =
    facebookState === 'connected'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : facebookState === 'expired'
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : facebookState === 'invalid'
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-gray-50 border-gray-200 text-gray-700';
  const facebookStateLabel =
    facebookState === 'connected'
      ? 'Connected'
      : facebookState === 'expired'
        ? 'Expired'
        : facebookState === 'invalid'
          ? 'Invalid'
          : 'Missing token';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Settings</h1>
        <p className="text-[#6B7280] text-sm">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 h-fit">
          <nav className="space-y-0.5">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${activeSection === section.id
                    ? ''
                    : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
                    }`}
                  style={
                    activeSection === section.id
                      ? { backgroundColor: palette.colorLight, color: palette.color }
                      : undefined
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="md:col-span-3 space-y-4">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
              <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Profile Settings</h2>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#FCE7F3] flex items-center justify-center">
                  <span className="text-xl" style={{ fontWeight: 700, color: palette.color }}>
                    {profile.name.trim().charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{profile.name || 'User'}</p>
                  <p className="text-xs text-[#9CA3AF]">{profile.email}</p>
                  <span
                    className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: palette.colorLight, color: palette.color }}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name' as const },
                  { label: 'Username', key: 'username' as const },
                  { label: 'Email Address', key: 'email' as const },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>{field.label}</label>
                    <input
                      value={profile[field.key]}
                      onChange={(event) => setProfile((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
              <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'newSale' as const, label: 'New Sale Recorded', description: 'Get notified when a sale is recorded' },
                  { key: 'lowStock' as const, label: 'Low Stock Alerts', description: 'Alert when products fall below threshold' },
                  { key: 'pendingApproval' as const, label: 'Pending Content Approvals', description: 'Notify when content is submitted for review' },
                  { key: 'contentPublished' as const, label: 'Content Published', description: 'Notify when scheduled content goes live' },
                  { key: 'weeklyReport' as const, label: 'Weekly Summary Report', description: 'Receive weekly analytics digest' },
                  { key: 'dailyDigest' as const, label: 'Daily Digest', description: 'Daily summary of all activity' },
                ].map((notification) => (
                  <div key={notification.key} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                    <div>
                      <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{notification.label}</p>
                      <p className="text-xs text-[#9CA3AF]">{notification.description}</p>
                    </div>
                    <Toggle
                      enabled={notifs[notification.key]}
                      onChange={(value) => setNotifs((prev) => ({ ...prev, [notification.key]: value }))}
                      activeColor={palette.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Role & Permissions</h2>
                <div className={`p-4 rounded-xl border ${user?.role === 'admin' ? 'bg-[#FCE7F3] border-[#F9E0E7]' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${user?.role === 'admin' ? 'text-[#EC4899]' : 'text-blue-600'}`} />
                    <p className="text-sm text-[#111827] capitalize" style={{ fontWeight: 600 }}>{user?.role} Role</p>
                  </div>
                  <div className="space-y-1.5">
                    {(user?.role === 'admin' ? [
                      'View and manage all content',
                      'Approve or reject marketing posts',
                      'Schedule and publish content',
                      'Manage products and inventory',
                      'Record and view sales',
                      'Access all analytics',
                      'Manage user roles',
                    ] : [
                      'View products and inventory',
                      'Record sales transactions',
                      'Generate AI marketing content',
                      'Submit content for approval',
                      'View basic analytics',
                    ]).map((permission) => (
                      <div key={permission} className="flex items-center gap-2">
                        <Check className={`w-3.5 h-3.5 ${user?.role === 'admin' ? 'text-[#EC4899]' : 'text-blue-500'}`} />
                        <span className="text-xs text-[#6B7280]">{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Change Password</h2>
                {[
                  { label: 'Current Password', key: 'currentPassword' as const },
                  { label: 'New Password', key: 'newPassword' as const },
                  { label: 'Confirm New Password', key: 'confirmPassword' as const },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>{field.label}</label>
                    <input
                      type="password"
                      value={passwordForm[field.key]}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      placeholder="********"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                    />
                  </div>
                ))}
                <button
                  onClick={() => void handlePasswordUpdate().catch((error: any) => {
                    toast.error(error?.message || 'Failed to update password');
                  })}
                  disabled={passwordSaving}
                  className="px-4 py-2 bg-[#111827] text-white rounded-lg text-sm hover:bg-[#374151] transition-all disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>

              {canShowFacebookStatus && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Facebook Connection</h2>
                      <p className="text-xs text-[#9CA3AF]">Backend-only token health for manual sync and analytics</p>
                    </div>
                    <button
                      onClick={() => setFacebookStatusRefreshKey((value) => value + 1)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs text-[#374151] hover:bg-[#F9FAFB] transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                  </div>

                  {facebookStatusError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{facebookStatusError}</span>
                    </div>
                  )}

                  {facebookStatusLoading ? (
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                      Checking Facebook connection...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`rounded-xl border px-4 py-3 ${facebookStateClasses}`}>
                        <div className="flex items-center gap-2">
                          {facebookState === 'connected' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          <span className="text-sm" style={{ fontWeight: 600 }}>{facebookStateLabel}</span>
                        </div>
                        <p className="text-xs mt-1">
                          {facebookStatus?.error || 'Facebook page access token is active and ready for sync.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Link2 className="w-4 h-4 text-[#6B7280]" />
                            <p className="text-xs text-[#6B7280]">Facebook Page</p>
                          </div>
                          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>
                            {facebookStatus?.pageName || facebookStatus?.pageId || 'Not configured'}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                          <p className="text-xs text-[#6B7280] mb-1">Last Known Sync</p>
                          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>
                            {formatDateTime(facebookStatus?.lastKnownSync?.syncedAt ?? null)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                          <p className="text-xs text-[#6B7280] mb-1">Token Updated</p>
                          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>
                            {formatDateTime(facebookStatus?.tokenUpdatedAt ?? null)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                          <p className="text-xs text-[#6B7280] mb-1">Token Expires</p>
                          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>
                            {formatDateTime(facebookStatus?.expiresAt ?? facebookStatus?.tokenExpiresAt ?? null)}
                          </p>
                        </div>
                      </div>

                      {!facebookStatus?.valid && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Reconnect Facebook or refresh the page access token in the backend env.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
              <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Appearance</h2>
              <div>
                <p className="text-xs text-[#374151] mb-3" style={{ fontWeight: 500 }}>Theme Color</p>
                <div className="flex gap-3">
                  {APP_THEME_PALETTES.map((theme) => (
                    <button
                      key={theme.name}
                      title={theme.name}
                      type="button"
                      onClick={() => setPaletteId(theme.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${paletteId === theme.id ? 'border-[#111827] scale-110' : 'border-transparent hover:border-[#D1D5DB]'}`}
                      style={{ backgroundColor: theme.color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#374151] mb-3" style={{ fontWeight: 500 }}>System Info</p>
                <div className="space-y-2 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                  {[
                    { label: 'System', value: 'BellahBeatrix Smart Marketing v2.0' },
                    { label: 'Build', value: 'React + Tailwind + shadcn/ui' },
                    { label: 'Environment', value: 'Production Ready' },
                    { label: 'Last Updated', value: 'May 6, 2026' },
                  ].map((info) => (
                    <div key={info.label} className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">{info.label}</span>
                      <span className="text-[#111827]" style={{ fontWeight: 500 }}>{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => void handleSave()}
            disabled={profileSaving || passwordSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'text-white'} disabled:opacity-50`}
            style={saved ? undefined : { backgroundColor: palette.color, color: palette.primaryForeground }}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : profileSaving || passwordSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
