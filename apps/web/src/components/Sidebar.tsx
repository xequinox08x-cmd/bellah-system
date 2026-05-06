import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Package, ShoppingCart, Sparkles,
  CheckSquare, Calendar, BarChart2, Settings, LogOut,
  Shield, Users, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { BrandLogo } from './BrandLogo';
import { toast } from 'sonner';
import { api } from '../lib/api';

// ─── Logo ─────────────────────────────────────────────────────────────────────

// ─── Nav helpers ───────────────────────────────────────────────────────────────
const NAV_BASE = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 w-full';
const NAV_ACTIVE = 'bg-[#FCE7F3] text-[#EC4899]';
const NAV_IDLE = 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]';
const SUB_BASE = 'flex items-center gap-2 pl-9 pr-3 py-2 rounded-lg text-xs transition-all w-full';
const SUB_ACTIVE = 'text-[#EC4899] bg-[#FCE7F3]';
const SUB_IDLE = 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB]';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`;

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  `${SUB_BASE} ${isActive ? SUB_ACTIVE : SUB_IDLE}`;

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[9px] text-[#9CA3AF] uppercase tracking-widest px-3 pt-4 pb-1 select-none">
      {label}
    </p>
  );
}

// ─── Tooltip wrapper (for collapsed state) ─────────────────────────────────────
function NavItem({
  to, icon: Icon, label, badge, collapsed, end,
}: {
  to: string; icon: React.ElementType; label: string;
  badge?: number; collapsed?: boolean; end?: boolean;
}) {
  return (
    <div className="relative group/nav">
      <NavLink to={to} className={navClass} end={end} title={collapsed ? label : undefined}>
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && badge != null && badge > 0 && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-[#EC4899] text-white rounded-full shrink-0">
            {badge}
          </span>
        )}
        {collapsed && badge != null && badge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#EC4899] rounded-full" />
        )}
      </NavLink>
      {/* Tooltip on collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-[#111827] text-white text-xs rounded-md opacity-0 group-hover/nav:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Persist collapse state
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem('bb_sidebar_collapsed') === 'true'
  );

  // Auto-open marketing submenu when on a marketing page
  const isOnMarketing = ['/marketing', '/approvals', '/scheduling'].some(
    p => location.pathname.startsWith(p)
  );
  const [marketingOpen, setMarketingOpen] = useState(isOnMarketing);
  const [approvalDraftCount, setApprovalDraftCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('bb_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isOnMarketing) setMarketingOpen(true);
  }, [location.pathname, isOnMarketing]);

  useEffect(() => {
    let cancelled = false;

    const loadApprovalCount = async () => {
      if (user?.role !== 'admin') {
        setApprovalDraftCount(0);
        return;
      }

      try {
        const res = await api.getContent();
        if (cancelled) return;

        const items = Array.isArray(res?.data) ? res.data : [];
        setApprovalDraftCount(items.filter((item: { status?: string }) => item.status === 'draft').length);
      } catch {
        if (!cancelled) setApprovalDraftCount(0);
      }
    };

    loadApprovalCount();
    const handleContentUpdated = () => {
      loadApprovalCount();
    };
    window.addEventListener('ai-content-updated', handleContentUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('ai-content-updated', handleContentUpdated);
    };
  }, [user?.role, location.pathname]);

  const isAdmin = user?.role === 'admin';
  const draftCount = approvalDraftCount;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const toggleCollapse = () => {
    setCollapsed(prev => {
      if (!prev) setMarketingOpen(false); // close submenu on collapse
      return !prev;
    });
  };

  return (
    <aside
      className="bg-white border-r border-[#E5E7EB] flex flex-col h-full relative shrink-0 sidebar-transition"
      style={{ width: collapsed ? 64 : 232 }}
    >
      {/* ── Brand Header ──────────────────────────────────────────────── */}
      <div
        className={`flex items-center border-b border-[#E5E7EB] h-16 px-4 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'
          }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size={30} className="rounded-lg" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[#111827] text-[13px] leading-tight truncate" style={{ fontWeight: 700 }}>
                BellahBeatrix
              </p>
              <p className="text-[#9CA3AF] text-[10px]">Smart Marketing</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#6B7280] transition-colors shrink-0"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-[#E5E7EB] rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-20"
          title="Expand sidebar"
        >
          <ChevronRight className="w-3 h-3 text-[#6B7280]" />
        </button>
      )}

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-0.5">

        {/* Main */}
        {!collapsed && <SectionLabel label="Main" />}
        {collapsed && <div className="h-3" />}

        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
        <NavItem to="/products" icon={Package} label="Inventory" collapsed={collapsed} />
        <NavItem to="/sales" icon={ShoppingCart} label="Sales" collapsed={collapsed} />

        {/* Marketing */}
        {!collapsed && <SectionLabel label="Marketing" />}
        {collapsed && <div className="h-px bg-[#F3F4F6] mx-2 my-2" />}

        {!collapsed ? (
          /* Expanded: collapsible marketing section */
          <div>
            <button
              onClick={() => setMarketingOpen(prev => !prev)}
              className={`${NAV_BASE} ${isOnMarketing ? NAV_ACTIVE : NAV_IDLE}`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Marketing</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${marketingOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {/* Sub-items */}
            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: marketingOpen ? 200 : 0 }}
            >
              <div className="pt-0.5 space-y-0.5">
                <NavLink to="/marketing" className={subNavClass}>Generate Content</NavLink>
                {isAdmin && (
                  <NavLink to="/approvals" className={subNavClass}>
                    Content Approvals
                    {draftCount > 0 && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-[#EC4899] text-white rounded-full shrink-0">
                        {draftCount}
                      </span>
                    )}
                  </NavLink>
                )}
                <NavLink to="/scheduling" className={subNavClass}>Scheduling</NavLink>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed: just the Sparkles icon */
          <div className="relative group/nav">
            <NavLink
              to="/marketing"
              className={navClass}
              title="Marketing"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {draftCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#EC4899] rounded-full" />
              )}
            </NavLink>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-[#111827] text-white text-xs rounded-md opacity-0 group-hover/nav:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              Marketing
            </div>
          </div>
        )}

        {/* Insights */}
        {!collapsed && <SectionLabel label="Insights" />}
        {collapsed && <div className="h-px bg-[#F3F4F6] mx-2 my-2" />}

        <NavItem to="/analytics" icon={BarChart2} label="Analytics" collapsed={collapsed} />

        {/* Admin section */}
        {isAdmin && (
          <>
            {!collapsed && <SectionLabel label="Administration" />}
            {collapsed && <div className="h-px bg-[#F3F4F6] mx-2 my-2" />}

            <NavItem to="/users" icon={Users} label="Users" collapsed={collapsed} />
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          </>
        )}

        {/* Staff: just settings */}
        {!isAdmin && (
          <>
            {!collapsed && <SectionLabel label="Account" />}
            {collapsed && <div className="h-px bg-[#F3F4F6] mx-2 my-2" />}
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          </>
        )}
      </nav>

      {/* ── User Footer ───────────────────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB] px-2.5 py-3 shrink-0">
        {/* Avatar + info */}
        <div className={`flex items-center gap-2.5 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#EC4899]/30 flex items-center justify-center shrink-0">
            <span className="text-[#EC4899] text-xs" style={{ fontWeight: 700 }}>
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>
                {user?.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-[#EC4899]" />
                <span className="text-[10px] text-[#EC4899] capitalize">{user?.role}</span>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="relative group/logout">
          <button
            onClick={() => void handleLogout()}
            title={collapsed ? 'Sign Out' : undefined}
            className={`${NAV_BASE} text-[#9CA3AF] hover:bg-red-50 hover:text-red-500 mt-1 ${collapsed ? 'justify-center' : ''
              }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-[#111827] text-white text-xs rounded-md opacity-0 group-hover/logout:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              Sign Out
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
