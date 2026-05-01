import { useState } from 'react';
import { User, Bell, Shield, Palette, Save, Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner';

type Section = 'profile' | 'notifications' | 'security' | 'appearance';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security & Role', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-[#EC4899]' : 'bg-[#D1D5DB]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
    bio: 'Marketing admin at BellahBeatrix Cosmetics.',
  });

  const [notifs, setNotifs] = useState({
    newSale: true,
    lowStock: true,
    pendingApproval: true,
    contentPublished: false,
    weeklyReport: true,
    dailyDigest: false,
  });

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Settings</h1>
        <p className="text-[#6B7280] text-sm">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 h-fit">
          <nav className="space-y-0.5">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeSection === s.id
                      ? 'bg-[#FCE7F3] text-[#EC4899]'
                      : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-4">
          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
              <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Profile Settings</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#FCE7F3] flex items-center justify-center">
                  <span className="text-[#EC4899] text-xl" style={{ fontWeight: 700 }}>
                    {profile.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{profile.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name' as const },
                  { label: 'Username', key: 'username' as const },
                  { label: 'Email Address', key: 'email' as const },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>{f.label}</label>
                    <input
                      value={profile[f.key]}
                      onChange={e => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
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
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                    <div>
                      <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{n.label}</p>
                      <p className="text-xs text-[#9CA3AF]">{n.description}</p>
                    </div>
                    <Toggle enabled={notifs[n.key]} onChange={v => setNotifs(prev => ({ ...prev, [n.key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security & Role */}
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
                      'View and manage all content', 'Approve or reject marketing posts',
                      'Schedule and publish content', 'Manage products and inventory',
                      'Record and view sales', 'Access all analytics',
                      'Manage user roles',
                    ] : [
                      'View products and inventory',
                      'Record sales transactions',
                      'Generate AI marketing content',
                      'Submit content for approval',
                      'View basic analytics',
                    ]).map(perm => (
                      <div key={perm} className="flex items-center gap-2">
                        <Check className={`w-3.5 h-3.5 ${user?.role === 'admin' ? 'text-[#EC4899]' : 'text-blue-500'}`} />
                        <span className="text-xs text-[#6B7280]">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
                <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Change Password</h2>
                {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                  <div key={label}>
                    <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>{label}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                    />
                  </div>
                ))}
                <button className="px-4 py-2 bg-[#111827] text-white rounded-lg text-sm hover:bg-[#374151] transition-all">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-5">
              <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Appearance</h2>
              <div>
                <p className="text-xs text-[#374151] mb-3" style={{ fontWeight: 500 }}>Theme Color</p>
                <div className="flex gap-3">
                  {[
                    { name: 'Rose Pink', color: '#EC4899', active: true },
                    { name: 'Gold', color: '#D4A373', active: false },
                    { name: 'Sage', color: '#4CAF82', active: false },
                    { name: 'Royal Blue', color: '#4A90D9', active: false },
                  ].map(t => (
                    <button
                      key={t.name}
                      title={t.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${t.active ? 'border-[#111827] scale-110' : 'border-transparent hover:border-[#D1D5DB]'}`}
                      style={{ backgroundColor: t.color }}
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
                    { label: 'Last Updated', value: 'February 26, 2026' },
                  ].map(info => (
                    <div key={info.label} className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">{info.label}</span>
                      <span className="text-[#111827]" style={{ fontWeight: 500 }}>{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-[#EC4899] text-white hover:bg-[#DB2777]'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
