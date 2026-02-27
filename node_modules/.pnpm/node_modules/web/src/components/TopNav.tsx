import { useState } from 'react';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useStore } from '../data/store';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner@2.0.3';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Dashboard',          sub: 'Overview of your store performance'      },
  '/products':   { title: 'Inventory',           sub: 'Manage products and stock levels'        },
  '/sales':      { title: 'Sales Recording',     sub: 'Log transactions and track revenue'      },
  '/marketing':  { title: 'AI Marketing',        sub: 'Generate and manage marketing content'   },
  '/approvals':  { title: 'Content Approvals',   sub: 'Review and approve submitted content'    },
  '/scheduling': { title: 'Post Scheduling',     sub: 'Schedule and publish approved posts'     },
  '/analytics':  { title: 'Analytics',           sub: 'Engagement and performance insights'     },
  '/users':      { title: 'User Management',     sub: 'Manage system users and permissions'     },
  '/settings':   { title: 'Settings',            sub: 'Account and application preferences'     },
};

export function TopNav() {
  const { user, logout }      = useAuth();
  const { contentItems, products } = useStore();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);

  const pendingCount   = contentItems.filter(c => c.status === 'pending').length;
  const lowStockCount  = products.filter(p => p.stock <= p.lowStockThreshold).length;
  const totalNotifs    = pendingCount + (lowStockCount > 0 ? 1 : 0);

  const meta = PAGE_META[location.pathname] ?? { title: 'Dashboard', sub: '' };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
    setShowProfile(false);
  };

  const closeAll = () => { setShowProfile(false); setShowNotifs(false); };

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-5 shrink-0 z-20">

      {/* Page title */}
      <div>
        <h2 className="text-[#111827] text-[15px] leading-tight" style={{ fontWeight: 700 }}>
          {meta.title}
        </h2>
        <p className="text-[#9CA3AF] text-[11px] mt-0.5">{meta.sub}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">

        {/* Global search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search anything…"
            className="pl-9 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs text-[#111827] placeholder-[#9CA3AF]
                       focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-48 transition-all"
          />
        </div>

        {/* Quick create (admin) */}
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/marketing')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#EC4899] text-white rounded-lg text-xs hover:bg-[#DB2777] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Post
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className="relative p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-[#6B7280]" />
            {totalNotifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#EC4899] text-white text-[9px] rounded-full flex items-center justify-center"
                    style={{ fontWeight: 700 }}>
                {totalNotifs > 9 ? '9+' : totalNotifs}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-76 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Notifications</p>
                {totalNotifs > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#EC4899] text-white rounded-full">
                    {totalNotifs} new
                  </span>
                )}
              </div>
              <div className="py-1 max-h-60 overflow-y-auto">
                {totalNotifs === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-[#9CA3AF]">All caught up!</p>
                  </div>
                )}
                {pendingCount > 0 && (
                  <button
                    onClick={() => { navigate('/approvals'); closeAll(); }}
                    className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F9FAFB]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px]">📋</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>
                          {pendingCount} post{pendingCount > 1 ? 's' : ''} awaiting approval
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">Content Approvals → Review now</p>
                      </div>
                    </div>
                  </button>
                )}
                {lowStockCount > 0 && (
                  <button
                    onClick={() => { navigate('/products'); closeAll(); }}
                    className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px]">⚠️</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>
                          {lowStockCount} product{lowStockCount > 1 ? 's' : ''} low on stock
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">Inventory → Check stock levels</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#F9FAFB] border border-transparent hover:border-[#E5E7EB] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#EC4899]/30 flex items-center justify-center shrink-0">
              <span className="text-[#EC4899] text-[11px]" style={{ fontWeight: 700 }}>
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <span className="text-xs text-[#111827] hidden sm:inline truncate max-w-24" style={{ fontWeight: 500 }}>
              {user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#F3F4F6] bg-gradient-to-r from-[#FCE7F3]/50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#EC4899]/40 flex items-center justify-center shrink-0">
                    <span className="text-[#EC4899] text-sm" style={{ fontWeight: 700 }}>
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>{user?.name}</p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
                    <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
              {/* Menu */}
              <div className="py-1">
                <button
                  onClick={() => { navigate('/settings'); closeAll(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
                >
                  <User className="w-3.5 h-3.5" /> Profile & Settings
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { navigate('/users'); closeAll(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> User Management
                  </button>
                )}
                <div className="h-px bg-[#F3F4F6] mx-3 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {(showProfile || showNotifs) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}
    </header>
  );
}