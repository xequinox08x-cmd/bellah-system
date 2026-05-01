import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import {
  Users as UsersIcon, Plus, Edit2, Trash2, Shield, User,
  Search, X, CheckCircle, XCircle, Mail, Clock,
  UserCheck, UserX, Loader2, Key
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiUser } from '../lib/api';

// ─── Small helpers ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: 'admin' | 'staff' }) {
  return role === 'admin' ? (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full border border-[#F9A8C0]/30">
      <Shield className="w-2.5 h-2.5" /> Admin
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200/50">
      <User className="w-2.5 h-2.5" /> Staff
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return status === 'active' ? (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200/50">
      <CheckCircle className="w-2.5 h-2.5" /> Active
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
      <XCircle className="w-2.5 h-2.5" /> Inactive
    </span>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = [
    ['#FCE7F3', '#EC4899'], ['#FEF3C7', '#D97706'], ['#EFF6FF', '#3B82F6'],
    ['#F0FDF4', '#16A34A'], ['#F5F3FF', '#7C3AED'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [bg, text] = colors[idx];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <span className="text-xs" style={{ color: text, fontWeight: 700, fontSize: size * 0.35 }}>
        {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

// ─── User Form Modal ───────────────────────────────────────────────────────────
interface UserFormProps {
  initial?: ApiUser | null;
  onSave:  (data: any) => Promise<void>;
  onClose: () => void;
}

function UserFormModal({ initial, onSave, onClose }: UserFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    password: '',
    role: (initial?.role || 'staff') as 'admin' | 'staff',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!initial && !form.password) e.password = 'Password is required';
    if (!initial && form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FIELD_CLS = 'w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white transition-all placeholder-[#C5C5C5]';
  const ERR_CLS   = 'text-red-500 text-[10px] mt-1';

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FCE7F3] flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-[#EC4899]" />
            </div>
            <h2 className="text-[#111827] text-sm" style={{ fontWeight: 700 }}>
              {initial ? 'Edit User' : 'Add New User'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Maria Santos"
              className={FIELD_CLS}
            />
            {errors.name && <p className={ERR_CLS}>{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Email Address</label>
            <input
              type="email"
              disabled={!!initial}
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="maria@bellabeatrix.com"
              className={`${FIELD_CLS} ${initial ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            {errors.email && <p className={ERR_CLS}>{errors.email}</p>}
          </div>

          {!initial && (
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
                Set Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  className={`${FIELD_CLS} pl-9`}
                />
              </div>
              {errors.password && <p className={ERR_CLS}>{errors.password}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Role</label>
            <div className="flex gap-1.5">
              {(['staff', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={`flex-1 py-2 rounded-lg text-xs capitalize transition-all ${
                    form.role === r
                      ? r === 'admin' ? 'bg-[#EC4899] text-white' : 'bg-blue-500 text-white'
                      : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-xl text-xs hover:bg-[#DB2777] transition-colors flex items-center justify-center gap-2"
              style={{ fontWeight: 600 }}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initial ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Users() {
  const { user: currentUser, session } = useAuth();
  if (currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);

  const fetchUsers = async () => {
    console.log('Fetching users with token:', session?.access_token ? 'Present' : 'Missing');
    try {
      const res = await api.getUsers(session?.access_token || '');
      console.log('Users fetch success:', res);
      if (res && res.data) {
        setUsers(res.data);
      } else {
        console.warn('Users fetch returned unexpected format:', res);
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Users fetch error details:', err);
      toast.error('Failed to load users: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (session) {
      fetchUsers(); 
    } else {
      setLoading(false); // No session yet, stop loading spinner
    }
  }, [session]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
  }), [users]);

  const filtered = useMemo(() =>
    users.filter(u => {
      const q = search.toLowerCase();
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchR = roleFilter === 'all' || u.role === roleFilter;
      return matchQ && matchR;
    }), [users, search, roleFilter]
  );

  const handleSave = async (data: any) => {
    const token = session?.access_token || '';
    if (editUser) {
      const res = await api.updateUser(editUser.id, { name: data.name, role: data.role }, token);
      setUsers(prev => prev.map(u => u.id === editUser.id ? res.data : u));
      toast.success(`${data.name} updated`);
    } else {
      const res = await api.createUser(data, token);
      setUsers(prev => [...prev, res.data]);
      toast.success(`Account created for ${data.name}`);
    }
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await api.deleteUser(deleteUser.id, session?.access_token || '');
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      toast.success('User removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleteUser(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#EC4899]" />
      <p className="text-sm text-gray-500">Loading system users...</p>
    </div>
  );

  return (
    <div className="space-y-5 pb-6">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[#111827] text-xl font-bold">User Management</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Manage staff access and permissions</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#EC4899] text-white rounded-xl text-xs font-semibold hover:bg-[#DB2777] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add New User
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: stats.total, icon: UsersIcon, bg: 'bg-[#FCE7F3]', text: 'text-[#EC4899]' },
          { label: 'Admins', value: stats.admins, icon: Shield, bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Staff', value: stats.staff, icon: User, bg: 'bg-blue-50', text: 'text-blue-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-4 h-4 ${card.text}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-[#111827]">{card.value}</p>
              <p className="text-[10px] text-[#6B7280]">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899]"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'admin', 'staff'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  roleFilter === r ? 'bg-[#EC4899] text-white' : 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                <th className="px-5 py-3 text-[10px] text-[#9CA3AF] uppercase text-left">User</th>
                <th className="px-5 py-3 text-[10px] text-[#9CA3AF] uppercase text-left">Role</th>
                <th className="px-5 py-3 text-[10px] text-[#9CA3AF] uppercase text-left">Joined</th>
                <th className="px-5 py-3 text-[10px] text-[#9CA3AF] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} />
                      <div>
                        <p className="text-xs font-semibold text-[#111827]">{u.name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3.5 text-xs text-[#9CA3AF]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditUser(u); setShowForm(true); }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(u)}
                        disabled={u.email === currentUser?.email}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserFormModal
          initial={editUser}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditUser(null); }}
        />
      )}

      {deleteUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-[#111827] text-sm font-bold">Remove User</h3>
              <p className="text-[#6B7280] text-xs mt-1">
                Are you sure you want to remove <strong>{deleteUser.name}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 border rounded-xl text-xs text-gray-500">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
