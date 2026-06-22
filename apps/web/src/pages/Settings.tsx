import { useEffect, useRef, useState } from 'react';
import { User, Shield, Palette, Save, Check, Download, Upload } from 'lucide-react';
import { APP_THEME_PALETTES, useAppTheme } from '../components/AppThemeProvider';
import { useAuth } from '../components/AuthContext';
import { offlineStore } from '../lib/offlineStore';
import { toast } from 'sonner';

type Section = 'profile' | 'security' | 'appearance';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
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


export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { palette, paletteId, previewPaletteId, setPreviewPaletteId, commitPalette } = useAppTheme();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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



  // Reset preview to committed palette whenever the user enters the appearance section.
  useEffect(() => {
    if (activeSection === 'appearance') {
      setPreviewPaletteId(paletteId);
    }
  }, [activeSection, paletteId, setPreviewPaletteId]);

  const markSaved = (message: string) => {
    setSaved(true);
    toast.success(message);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileSave = async () => {
    if (!user) throw new Error('No active user');

    const name = profile.name.trim();
    const email = profile.email.trim();
    const username = profile.username.trim();

    if (!name) throw new Error('Full name is required');
    if (!email || !email.includes('@')) throw new Error('Valid email is required');
    if (!username) throw new Error('Username is required');

    setProfileSaving(true);
    try {
      const updated = offlineStore.updateProfile(Number(user.id), { name, email, username, bio: profile.bio.trim() });
      setProfile({
        name: updated.name,
        email: updated.email,
        username: updated.username,
        bio: updated.bio,
      });
      await refreshUser();
      markSaved('Profile updated successfully');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user) throw new Error('No active user');

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
      offlineStore.updatePassword(Number(user.id), passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      markSaved('Password updated successfully');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportData = () => {
    const payload = offlineStore.exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bellah-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    markSaved('Backup downloaded');
  };

  const handleImportData = async (file: File) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    offlineStore.importData(payload);
    await refreshUser();
    markSaved('Backup restored successfully');
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

      if (activeSection === 'appearance') {
        commitPalette(previewPaletteId);
        markSaved('Appearance saved successfully');
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


          {activeSection === 'security' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Role & Permissions</h2>
                <div className="p-4 rounded-xl border bg-[#FCE7F3] border-[#F9E0E7]">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-[#EC4899]" />
                    <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Admin Role</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      'Manage products and inventory',
                      'Record and view all sales',
                      'View reports and dashboard',
                      'Manage administrator accounts',
                    ].map((permission) => (
                      <div key={permission} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#EC4899]" />
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

              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                  <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Data Backup</h2>
                  <p className="text-xs text-[#6B7280]">Export or restore all local POS data (products, sales, users, customers).</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg text-sm hover:bg-[#374151] transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#374151] hover:bg-[#F9FAFB] transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Import JSON
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleImportData(file).catch((error: any) => {
                          toast.error(error?.message || 'Failed to import backup');
                        });
                        event.target.value = '';
                      }}
                    />
                  </div>
              </div>
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
                      onClick={() => setPreviewPaletteId(theme.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${previewPaletteId === theme.id ? 'border-[#111827] scale-110' : 'border-transparent hover:border-[#D1D5DB]'}`}
                      style={{ backgroundColor: theme.color }}
                    />
                  ))}
                  {previewPaletteId !== paletteId && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      Preview selected — click <strong>Save Changes</strong> to apply.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#374151] mb-3" style={{ fontWeight: 500 }}>System Info</p>
                <div className="space-y-2 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                  {[
                    { label: 'System', value: 'BellahBeatrix Offline POS' },
                    { label: 'Storage', value: 'Browser localStorage' },
                    { label: 'Mode', value: 'Fully offline' },
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
