import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  FileText,
  LogOut,
  Plus,
  Search,
  User,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import { useStore } from '../data/store';
import { toast } from 'sonner';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview of your store performance' },
  '/products': { title: 'Inventory', sub: 'Manage products and stock levels' },
  '/sales': { title: 'Sales Recording', sub: 'Log transactions and track revenue' },
  '/marketing': { title: 'AI Marketing', sub: 'Generate and manage marketing content' },
  '/approvals': { title: 'Content Approvals', sub: 'Review and approve submitted content' },
  '/scheduling': { title: 'Post Scheduling', sub: 'Schedule and publish approved posts' },
  '/analytics': { title: 'Analytics', sub: 'Engagement and performance insights' },
  '/users': { title: 'User Management', sub: 'Manage system users and permissions' },
  '/settings': { title: 'Settings', sub: 'Account and application preferences' },
};

type SearchEntry = {
  id: string;
  label: string;
  description: string;
  path: string;
  keywords: string;
  badge: 'Page' | 'Product' | 'Content';
  adminOnly?: boolean;
};

const SEARCH_PAGES: SearchEntry[] = [
  {
    id: 'page-dashboard',
    label: 'Dashboard',
    description: 'Overview of your store performance',
    path: '/dashboard',
    keywords: 'dashboard home overview summary sales revenue',
    badge: 'Page',
  },
  {
    id: 'page-products',
    label: 'Inventory',
    description: 'Manage products and stock levels',
    path: '/products',
    keywords: 'inventory products product stock items catalog',
    badge: 'Page',
  },
  {
    id: 'page-sales',
    label: 'Sales Recording',
    description: 'Log transactions and track revenue',
    path: '/sales',
    keywords: 'sales sale record transactions revenue checkout',
    badge: 'Page',
  },
  {
    id: 'page-marketing',
    label: 'Generate Content',
    description: 'Create Facebook marketing content',
    path: '/marketing',
    keywords: 'generate content ai marketing facebook post caption poster',
    badge: 'Page',
  },
  {
    id: 'page-approvals',
    label: 'Content Approvals',
    description: 'Review and approve submitted posts',
    path: '/approvals',
    keywords: 'approval approvals review pending posts content',
    badge: 'Page',
    adminOnly: true,
  },
  {
    id: 'page-scheduling',
    label: 'Scheduling',
    description: 'Schedule and publish approved posts',
    path: '/scheduling',
    keywords: 'schedule scheduling calendar post posting publish',
    badge: 'Page',
  },
  {
    id: 'page-analytics',
    label: 'Analytics',
    description: 'Engagement and performance insights',
    path: '/analytics',
    keywords: 'analytics reports engagement reach insights charts',
    badge: 'Page',
  },
  {
    id: 'page-users',
    label: 'Users',
    description: 'Manage user accounts and permissions',
    path: '/users',
    keywords: 'users staff admin accounts permissions',
    badge: 'Page',
    adminOnly: true,
  },
  {
    id: 'page-settings',
    label: 'Settings',
    description: 'Account and application preferences',
    path: '/settings',
    keywords: 'settings appearance security account preferences',
    badge: 'Page',
  },
];

function scoreSearchEntry(entry: SearchEntry, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 1;

  const label = entry.label.toLowerCase();
  const description = entry.description.toLowerCase();
  const keywords = entry.keywords.toLowerCase();
  const haystack = `${label} ${description} ${keywords}`;
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchesWholeQuery = haystack.includes(normalizedQuery);
  const matchesAllWords = words.every((word) => haystack.includes(word));

  if (!matchesWholeQuery && !matchesAllWords) return 0;

  let score = 0;
  if (label === normalizedQuery) score += 180;
  if (label.startsWith(normalizedQuery)) score += 120;
  if (label.includes(normalizedQuery)) score += 90;
  if (description.includes(normalizedQuery)) score += 55;
  if (keywords.includes(normalizedQuery)) score += 40;
  score += words.filter((word) => label.includes(word)).length * 14;

  return score;
}

export function TopNav() {
  const { user, logout } = useAuth();
  const { contentItems, products } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLFormElement | null>(null);

  const pendingCount = contentItems.filter((item) => item.status === 'pending').length;
  const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;
  const totalNotifs = pendingCount + (lowStockCount > 0 ? 1 : 0);
  const meta = PAGE_META[location.pathname] ?? { title: 'Dashboard', sub: '' };

  const searchEntries = useMemo(() => {
    const pageEntries = SEARCH_PAGES.filter((entry) => !entry.adminOnly || user?.role === 'admin');
    const productEntries: SearchEntry[] = products.map((product) => ({
      id: `product-${product.id}`,
      label: product.name,
      description: `Open product in Inventory${product.category ? ` · ${product.category}` : ''}`,
      path: '/products',
      keywords: `${product.name} ${product.category ?? ''} product inventory stock`,
      badge: 'Product',
    }));
    const contentEntries: SearchEntry[] = contentItems.map((item) => ({
      id: `content-${item.id}`,
      label: item.title,
      description: `Open content in ${user?.role === 'admin' && item.status === 'pending' ? 'Content Approvals' : 'Generate Content'}`,
      path: user?.role === 'admin' && item.status === 'pending' ? '/approvals' : '/marketing',
      keywords: `${item.title} ${item.caption} ${item.productName ?? ''} marketing content post`,
      badge: 'Content',
    }));

    return [...pageEntries, ...productEntries, ...contentEntries];
  }, [contentItems, products, user?.role]);

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return searchEntries.filter((entry) => entry.badge === 'Page').slice(0, 6);
    }

    return searchEntries
      .map((entry) => ({ entry, score: scoreSearchEntry(entry, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
      .slice(0, 6)
      .map((item) => item.entry);
  }, [searchEntries, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
    setShowProfile(false);
  };

  const handleSearchSelect = (entry: SearchEntry) => {
    setSearchQuery(entry.label);
    setShowSearchResults(false);
    navigate(entry.path);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!searchQuery.trim()) {
      toast.error('Type what you want to open first');
      return;
    }

    const firstResult = searchResults[0];
    if (!firstResult) {
      toast.error('No matching page found');
      return;
    }

    handleSearchSelect(firstResult);
  };

  const closeAll = () => {
    setShowProfile(false);
    setShowNotifs(false);
    setShowSearchResults(false);
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-5 shrink-0 z-20">
      <div>
        <h2 className="text-[#111827] text-[15px] leading-tight" style={{ fontWeight: 700 }}>
          {meta.title}
        </h2>
        <p className="text-[#9CA3AF] text-[11px] mt-0.5">{meta.sub}</p>
      </div>

      <div className="flex items-center gap-2">
        <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search pages, products, content..."
            className="pl-9 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs text-[#111827] placeholder-[#9CA3AF]
                       focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-64 transition-all"
          />

          {showSearchResults && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[#E5E7EB] bg-white shadow-xl overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-[#9CA3AF]">No matching page found</p>
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSearchSelect(entry)}
                      className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F9FAFB] last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>
                            {entry.label}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{entry.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#FCE7F3] px-2 py-0.5 text-[9px] text-[#EC4899]">
                          {entry.badge}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/marketing')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#EC4899] text-white rounded-lg text-xs hover:bg-[#DB2777] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Post
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifs(!showNotifs);
              setShowProfile(false);
              setShowSearchResults(false);
            }}
            className="relative p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-[#6B7280]" />
            {totalNotifs > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 bg-[#EC4899] text-white text-[9px] rounded-full flex items-center justify-center"
                style={{ fontWeight: 700 }}
              >
                {totalNotifs > 9 ? '9+' : totalNotifs}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-76 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>
                  Notifications
                </p>
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
                    onClick={() => {
                      navigate('/approvals');
                      closeAll();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F9FAFB]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>
                          {pendingCount} post{pendingCount > 1 ? 's' : ''} awaiting approval
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">Content Approvals to Review now</p>
                      </div>
                    </div>
                  </button>
                )}
                {lowStockCount > 0 && (
                  <button
                    onClick={() => {
                      navigate('/products');
                      closeAll();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>
                          {lowStockCount} product{lowStockCount > 1 ? 's' : ''} low on stock
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">Inventory to Check stock levels</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifs(false);
              setShowSearchResults(false);
            }}
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
              <div className="px-4 py-3 border-b border-[#F3F4F6] bg-gradient-to-r from-[#FCE7F3]/50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F9E0E7] to-[#EC4899]/40 flex items-center justify-center shrink-0">
                    <span className="text-[#EC4899] text-sm" style={{ fontWeight: 700 }}>
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 600 }}>
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
                    <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 bg-[#FCE7F3] text-[#EC4899] rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    closeAll();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
                >
                  <User className="w-3.5 h-3.5" /> Profile & Settings
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      navigate('/users');
                      closeAll();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> User Management
                  </button>
                )}
                <div className="h-px bg-[#F3F4F6] mx-3 my-1" />
                <button
                  onClick={() => void handleLogout()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showProfile || showNotifs) && <div className="fixed inset-0 z-40" onClick={closeAll} />}
    </header>
  );
}
