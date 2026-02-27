import { useState, useMemo } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../components/AuthContext';
import {
  Users as UsersIcon, Plus, Edit2, Trash2, Shield, User,
  Search, X, CheckCircle, XCircle, Mail, Clock,
  MoreHorizontal, UserCheck, UserX,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role   = 'admin' | 'staff';
type Status = 'active' | 'inactive';

interface SystemUser {
  id:         string;
  name:       string;
  username:   string;
  email:      string;
  role:       Role;
  status:     Status;
  lastActive: string;
  joinedAt:   string;
  department: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const INITIAL_USERS: SystemUser[] = [
  {
    id: 'u1', name: 'Admin User',    username: 'admin',       email: 'admin@bellabeatrix.com',
    role: 'admin',  status: 'active',   lastActive: '2026-02-26', joinedAt: '2025-01-15', department: 'Management',
  },
  {
    id: 'u2', name: 'Staff Member',  username: 'staff',       email: 'staff@bellabeatrix.com',
    role: 'staff',  status: 'active',   lastActive: '2026-02-26', joinedAt: '2025-03-01', department: 'Sales',
  },
  {
    id: 'u3', name: 'Maria Santos',  username: 'maria.santos', email: 'maria@bellabeatrix.com',
    role: 'staff',  status: 'active',   lastActive: '2026-02-25', joinedAt: '2025-06-10', department: 'Marketing',
  },
  {
    id: 'u4', name: 'Ana Cruz',      username: 'ana.cruz',    email: 'ana@bellabeatrix.com',
    role: 'staff',  status: 'inactive', lastActive: '2026-02-10', joinedAt: '2025-08-20', department: 'Sales',
  },
  {
    id: 'u5', name: 'Bella Reyes',   username: 'bella.reyes', email: 'bella@bellabeatrix.com',
    role: 'staff',  status: 'active',   lastActive: '2026-02-24', joinedAt: '2026-01-05', department: 'Marketing',
  },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
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

function StatusBadge({ status }: { status: Status }) {
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
  initial?: SystemUser | null;
  onSave:  (data: Omit<SystemUser, 'id' | 'lastActive' | 'joinedAt'>) => void;
  onClose: () => void;
}

const DEPARTMENTS = ['Management', 'Sales', 'Marketing', 'Operations', 'Finance'];
const emptyForm = { name: '', username: '', email: '', role: 'staff' as Role, status: 'active' as Status, department: 'Sales' };

function UserFormModal({ initial, onSave, onClose }: UserFormProps) {
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, username: initial.username, email: initial.email, role: initial.role, status: initial.status, department: initial.department }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim())     e.name     = 'Name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const FIELD_CLS = 'w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white transition-all placeholder-[#C5C5C5]';
  const ERR_CLS   = 'text-red-500 text-[10px] mt-1';

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
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
          {/* Name */}
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Maria Santos"
              className={FIELD_CLS}
            />
            {errors.name && <p className={ERR_CLS}>{errors.name}</p>}
          </div>

          {/* Username + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
                Username <span className="text-red-400">*</span>
              </label>
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="maria.santos"
                className={FIELD_CLS}
              />
              {errors.username && <p className={ERR_CLS}>{errors.username}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Department</label>
              <select
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                className={FIELD_CLS}
              >
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="maria@bellabeatrix.com"
              className={FIELD_CLS}
            />
            {errors.email && <p className={ERR_CLS}>{errors.email}</p>}
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Role</label>
              <div className="flex gap-1.5">
                {(['staff', 'admin'] as Role[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role: r }))}
                    className={`flex-1 py-2 rounded-lg text-xs capitalize transition-all ${
                      form.role === r
                        ? r === 'admin'
                          ? 'bg-[#EC4899] text-white'
                          : 'bg-blue-500 text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Status</label>
              <div className="flex gap-1.5">
                {(['active', 'inactive'] as Status[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, status: s }))}
                    className={`flex-1 py-2 rounded-lg text-xs capitalize transition-all ${
                      form.status === s
                        ? s === 'active'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-400 text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-xl text-xs hover:bg-[#DB2777] transition-colors"
              style={{ fontWeight: 600 }}
            >
              {initial ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ user: u, onConfirm, onClose }: { user: SystemUser; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 700 }}>Remove User</h3>
            <p className="text-[#6B7280] text-xs mt-1">
              Are you sure you want to remove <strong>{u.name}</strong>?{' '}
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs hover:bg-red-600 transition-colors" style={{ fontWeight: 600 }}>
              Remove User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────
export default function Users() {
  const { user: currentUser } = useAuth();

  // Guard: admin only
  if (currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const [users,     setUsers]     = useState<SystemUser[]>(INITIAL_USERS);
  const [search,    setSearch]    = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [showForm,  setShowForm]  = useState(false);
  const [editUser,  setEditUser]  = useState<SystemUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<SystemUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.status === 'active').length,
    admins:   users.filter(u => u.role === 'admin').length,
    staff:    users.filter(u => u.role === 'staff').length,
    inactive: users.filter(u => u.status === 'inactive').length,
  }), [users]);

  // ── Filtered ───────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    users.filter(u => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);
      const matchR = roleFilter === 'all' || u.role === roleFilter;
      return matchQ && matchR;
    }),
    [users, search, roleFilter]
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSave = (data: Omit<SystemUser, 'id' | 'lastActive' | 'joinedAt'>) => {
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data } : u));
      toast.success(`${data.name} updated successfully`);
    } else {
      const newUser: SystemUser = {
        ...data, id: `u${Date.now()}`,
        lastActive: '—', joinedAt: '2026-02-26',
      };
      setUsers(prev => [...prev, newUser]);
      toast.success(`${data.name} added to the system`);
    }
    setShowForm(false);
    setEditUser(null);
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
    toast.success(`${deleteUser.name} removed`);
    setDeleteUser(null);
  };

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
    ));
    const u = users.find(x => x.id === id);
    if (u) toast.success(`${u.name} marked as ${u.status === 'active' ? 'inactive' : 'active'}`);
    setActiveMenu(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>User Management</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            Manage system users, roles and access permissions
          </p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#EC4899] text-white rounded-xl text-xs hover:bg-[#DB2777] transition-colors shrink-0"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',    value: stats.total,    icon: UsersIcon,   bg: 'bg-[#FCE7F3]',  text: 'text-[#EC4899]' },
          { label: 'Active',         value: stats.active,   icon: UserCheck,   bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Admins',         value: stats.admins,   icon: Shield,      bg: 'bg-purple-50',  text: 'text-purple-600' },
          { label: 'Inactive',       value: stats.inactive, icon: UserX,       bg: 'bg-gray-50',    text: 'text-gray-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-4 h-4 ${card.text}`} />
            </div>
            <div>
              <p className="text-xl text-[#111827]" style={{ fontWeight: 700 }}>{card.value}</p>
              <p className="text-[10px] text-[#6B7280]">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, username, email, department…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white"
            />
          </div>
          {/* Role filter pills */}
          <div className="flex gap-1.5">
            {(['all', 'admin', 'staff'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  roleFilter === r
                    ? 'bg-[#EC4899] text-white'
                    : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>
          <span className="text-xs text-[#9CA3AF]">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                {['User', 'Role', 'Department', 'Status', 'Last Active', 'Joined', 'Actions'].map(h => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[10px] text-[#9CA3AF] uppercase tracking-wider ${
                      h === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#F9FAFB] flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-[#D1D5DB]" />
                      </div>
                      <p className="text-xs text-[#9CA3AF]">No users match your search</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} />
                      <div className="min-w-0">
                        <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>
                          {u.name}
                          {u.id === 'u1' && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full">you</span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5" /> {u.email}
                        </p>
                        <p className="text-[10px] text-[#B0B8C4]">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  {/* Department */}
                  <td className="px-5 py-3.5 text-xs text-[#6B7280]">{u.department}</td>
                  {/* Status */}
                  <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                  {/* Last Active */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                      <Clock className="w-3 h-3" />
                      {u.lastActive === '—' ? '—' : new Date(u.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  {/* Joined */}
                  <td className="px-5 py-3.5 text-xs text-[#9CA3AF]">
                    {new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditUser(u); setShowForm(true); }}
                        className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit user"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(u.id)}
                        className={`p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 ${
                          u.status === 'active'
                            ? 'hover:bg-amber-50 text-[#9CA3AF] hover:text-amber-500'
                            : 'hover:bg-emerald-50 text-[#9CA3AF] hover:text-emerald-500'
                        }`}
                        title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteUser(u)}
                        disabled={u.id === 'u1'}
                        className="p-1.5 rounded-md hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                        title="Remove user"
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#F9FAFB] bg-[#F9FAFB] flex items-center justify-between">
          <p className="text-[10px] text-[#9CA3AF]">
            {stats.active} active · {stats.inactive} inactive · {stats.admins} admin{stats.admins !== 1 ? 's' : ''} · {stats.staff} staff
          </p>
          <p className="text-[10px] text-[#9CA3AF]">
            Role changes require re-authentication in production
          </p>
        </div>
      </div>

      {/* ── Role permissions reference ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            role: 'Admin', color: 'bg-[#FCE7F3] border-[#F9A8C0]/40', titleColor: 'text-[#EC4899]',
            icon: Shield, iconBg: 'bg-[#FCE7F3]', iconColor: 'text-[#EC4899]',
            perms: [
              'Full dashboard access with all KPIs',
              'Approve and reject marketing content',
              'Schedule and publish posts',
              'Manage products & inventory',
              'Record and view all sales data',
              'Access engagement analytics',
              'Manage system users and roles',
            ],
          },
          {
            role: 'Staff', color: 'bg-blue-50 border-blue-200/40', titleColor: 'text-blue-600',
            icon: User, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
            perms: [
              'View products and stock levels',
              'Record sales transactions',
              'Generate AI marketing content',
              'Submit content for admin approval',
              'View upcoming scheduled posts',
              'Basic analytics overview',
              'Manage personal account settings',
            ],
          },
        ].map(r => (
          <div key={r.role} className={`bg-white rounded-xl border ${r.color} p-5`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-8 h-8 rounded-lg ${r.iconBg} flex items-center justify-center`}>
                <r.icon className={`w-4 h-4 ${r.iconColor}`} />
              </div>
              <h3 className={`text-sm ${r.titleColor}`} style={{ fontWeight: 700 }}>{r.role} Permissions</h3>
            </div>
            <ul className="space-y-2">
              {r.perms.map(p => (
                <li key={p} className="flex items-start gap-2">
                  <CheckCircle className={`w-3.5 h-3.5 ${r.iconColor} mt-0.5 shrink-0`} />
                  <span className="text-xs text-[#6B7280]">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <UserFormModal
          initial={editUser}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditUser(null); }}
        />
      )}
      {deleteUser && (
        <DeleteModal
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </div>
  );
}
