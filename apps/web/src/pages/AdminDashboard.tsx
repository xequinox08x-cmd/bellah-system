import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Calendar, TrendingUp,
  ArrowUpRight, ArrowDownRight, Activity, X, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import type { ContentItem } from '../data/store';
import { type DashboardSummary, type LowStockProduct } from '../api/dashboard';
import { getSales, type SalesRecordDTO } from '../api/sales';
import { getProducts, type ProductDTO } from '../api/products';
import { api } from '../lib/api';

// ─── Dashboard Cache (stale-while-revalidate) ─────────────────────────────────
const DASH_CACHE_KEY = 'bb_dashboard_v2';
const DASH_CACHE_TTL = 90_000; // 90 seconds

type DashboardCache = {
  ts: number;
  sales: SalesRecordDTO[];
  products: ProductDTO[];
  contentItems: ContentItem[];
  dashboardLowStock: LowStockProduct[];
  dashboardSummary: DashboardSummary;
};

function readDashCache(): DashboardCache | null {
  try {
    const raw = sessionStorage.getItem(DASH_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as DashboardCache;
    return Date.now() - c.ts < DASH_CACHE_TTL ? c : null;
  } catch { return null; }
}

function writeDashCache(c: Omit<DashboardCache, 'ts'>) {
  try { sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ ...c, ts: Date.now() })); } catch { }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-purple-100 text-purple-700',
  draft: 'bg-gray-100 text-gray-600',
};

const RANK_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const CHART_TICK_STYLE = { fontSize: 10, fill: 'var(--muted-foreground)' };
const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  backgroundColor: 'var(--card)',
};



const EMPTY_SUMMARY: DashboardSummary = {
  totalSales: 0,
  revenueToday: 0,
  lowStockItems: 0,
  scheduledPosts: 0,
  engagementRate: 0,
};

function formatDashboardDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


// ─── KPI Card Skeleton ────────────────────────────────────────────────────────
function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-[#F3F4F6]" />
      </div>
      <div>
        <div className="h-6 bg-[#F3F4F6] rounded w-16 mb-1.5" />
        <div className="h-3 bg-[#F3F4F6] rounded w-24 mb-1" />
        <div className="h-3 bg-[#F3F4F6] rounded w-20" />
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend, trendUp, onClick,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  iconBg: string; iconColor: string; trend?: string; trendUp?: boolean;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      className={`bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3 transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-[#EC4899]/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 select-none'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xl text-[#111827]" style={{ fontWeight: 700 }}>{value}</p>
        <p className="text-[10px] text-[#6B7280] mt-0.5">{label}</p>
        <p className="text-[10px] text-[#9CA3AF]">{sub}</p>
      </div>
      {isClickable && (
        <p className="text-[9px] text-[#EC4899] opacity-60 -mt-1">View details →</p>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 py-4 border-b border-[#F3F4F6]">
      <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>{title}</h3>
      {sub && <p className="text-[#9CA3AF] text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Low Stock Modal ───────────────────────────────────────────────────────────

function LowStockModal({
  items,
  onClose,
}: {
  items: LowStockProduct[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] rounded-t-2xl px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 700 }}>Low Stock Items</p>
              <p className="text-white/70 text-xs mt-0.5">
                {items.length} item{items.length !== 1 ? 's' : ''} need restocking
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item list */}
        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[#6B7280]">✓ No low stock items found</p>
              <p className="text-xs text-[#9CA3AF] mt-1">All stock levels are healthy</p>
            </div>
          ) : items.map(p => {
            const pct = Math.round((p.stock / p.lowStockThreshold) * 100);
            const isCritical = p.stock <= Math.floor(p.lowStockThreshold * 0.6);
            return (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{p.name}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{p.sku} · {p.category}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden w-28">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isCritical ? '#EF4444' : '#F59E0B',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7280] tabular-nums">
                      {p.stock} / {p.lowStockThreshold}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ml-3 ${isCritical
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}
                >
                  {isCritical ? 'Critical' : 'Low'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F3F4F6]">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-[#E5E7EB] text-[#374151] rounded-xl text-sm hover:bg-[#F9FAFB] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────────────────
  const todayIso = useMemo(() => formatDateInput(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [salesViewMode, setSalesViewMode] = useState<'overall' | 'date'>('overall');
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [dashboardLowStock, setDashboardLowStock] = useState<LowStockProduct[] | null>(null);
  const [sales, setSales] = useState<SalesRecordDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [analyticsEngagementRate, setAnalyticsEngagementRate] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  void setShowLowStockModal; // kept to avoid removing - navigating instead

  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    []
  );

  // ── Single parallel fetch for all dashboard data ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      // Stale-while-revalidate: serve cached data instantly, refresh in background.
      const cached = readDashCache();
      if (cached) {
        setSales(cached.sales);
        setProducts(cached.products);
        setContentItems(cached.contentItems);
        setDashboardLowStock(cached.dashboardLowStock);
        setDashboardSummary(cached.dashboardSummary);
        setDashboardLoading(false); // show stale data immediately
      } else {
        setDashboardLoading(true);
      }
      setDashboardError(null);

      // Run all heavy queries in parallel — no sequential waterfalls
      const [salesRes, productsRes, contentFeedRes, analyticsRes] =
        await Promise.allSettled([
          getSales(),          // sale_items join (single query)
          getProducts(),       // products (single query)
          api.getAiContentFeed(),
          api.getAnalyticsSummary(),
        ]);

      if (cancelled) return;

      let loadedSales: typeof sales = [];
      let loadedProducts: typeof products = [];

      // Sales
      if (salesRes.status === 'fulfilled') {
        loadedSales = salesRes.value;
        setSales(loadedSales);
      }

      // Products
      if (productsRes.status === 'fulfilled') {
        loadedProducts = productsRes.value;
        setProducts(loadedProducts);
      }

      // Derive dashboard summary locally — no extra round-trip
      const startDate = todayIso;
      const endDate = todayIso;
      const rangeSales = loadedSales.filter(s => s.date >= startDate && s.date <= endDate);
      const lowStock = loadedProducts
        .filter(p => (p as any).lowStockThreshold > 0 && (p as any).stock <= (p as any).lowStockThreshold)
        .map(p => ({
          id: (p as any).id,
          name: (p as any).name,
          sku: (p as any).sku ?? null,
          category: (p as any).category ?? null,
          stock: (p as any).stock,
          lowStockThreshold: (p as any).lowStockThreshold,
          status: ((p as any).stock <= (p as any).lowStockThreshold * 0.6 ? 'critical' : 'low') as 'critical' | 'low',
          ratio: (p as any).lowStockThreshold > 0 ? (p as any).stock / (p as any).lowStockThreshold : 0,
        }));

      setDashboardSummary({
        totalSales: rangeSales.length,
        revenueToday: rangeSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0),
        lowStockItems: lowStock.length,
        scheduledPosts: 0,
        engagementRate: 0,
      });
      setDashboardLowStock(lowStock);

      // AI Content Feed
      if (contentFeedRes.status === 'fulfilled') {
        setContentItems(
          Array.isArray(contentFeedRes.value.data)
            ? contentFeedRes.value.data.map((item) => ({
                id: String(item.id),
                title: item.title,
                caption: item.content,
                hashtags: '',
                platform: item.platform as ContentItem['platform'],
                status: item.status as ContentItem['status'],
                createdBy: item.created_by_name,
                createdByRole: 'admin',
                createdAt: item.created_at,
                scheduledAt: item.scheduled_at ?? undefined,
                publishedAt: item.published_at ?? undefined,
                approvedBy: undefined,
                productName: item.product_name ?? undefined,
              }))
            : []
        );
      }

      if (salesRes.status === 'rejected') {
        setDashboardError(salesRes.reason?.message || 'Failed to load sales data');
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsEngagementRate(Number(analyticsRes.value.data?.engagementRate ?? 0));
      }

      // Persist fresh data to cache for next visit.
      const finalContentItems = contentFeedRes.status === 'fulfilled' && Array.isArray(contentFeedRes.value.data)
        ? contentFeedRes.value.data.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            caption: item.content,
            hashtags: '',
            platform: item.platform as ContentItem['platform'],
            status: item.status as ContentItem['status'],
            createdBy: item.created_by_name,
            createdByRole: 'admin' as const,
            createdAt: item.created_at,
            scheduledAt: item.scheduled_at ?? undefined,
            publishedAt: item.published_at ?? undefined,
            approvedBy: undefined,
            productName: item.product_name ?? undefined,
          }))
        : [];

      const finalSummary = {
        totalSales: loadedSales.filter(s => s.date >= todayIso && s.date <= todayIso).length,
        revenueToday: loadedSales.filter(s => s.date >= todayIso && s.date <= todayIso).reduce((sum, s) => sum + Number(s.total ?? 0), 0),
        lowStockItems: lowStock.length,
        scheduledPosts: 0,
        engagementRate: 0,
      };

      writeDashCache({
        sales: loadedSales,
        products: loadedProducts,
        contentItems: finalContentItems,
        dashboardLowStock: lowStock,
        dashboardSummary: finalSummary,
      });

      setDashboardLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, [todayIso]);

  useEffect(() => {
    let cancelled = false;

    const refreshAnalyticsEngagement = async () => {
      try {
        const analyticsRes = await api.getAnalyticsSummary();
        if (!cancelled) {
          setAnalyticsEngagementRate(Number(analyticsRes.data?.engagementRate ?? 0));
        }
      } catch {
        // Keep the current value if analytics refresh is unavailable.
      }
    };

    const handleFacebookAnalyticsUpdated = () => {
      void refreshAnalyticsEngagement();
    };

    window.addEventListener('facebook-analytics-updated', handleFacebookAnalyticsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('facebook-analytics-updated', handleFacebookAnalyticsUpdated);
    };
  }, []);



  // ── Filtered sales by date range ──────────────────────────────────────
  const isDateMode = salesViewMode === 'date';
  const scopedSales = useMemo(
    () => (isDateMode ? sales.filter((sale) => sale.date === selectedDate) : sales),
    [isDateMode, sales, selectedDate]
  );

  // ── KPI: Total Sales ──────────────────────────────────────────────────
  const totalSalesCount = scopedSales.length;

  // ── KPI: Revenue Today ────────────────────────────────────────────────
  const revenueTotal = useMemo(
    () => scopedSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
    [scopedSales]
  );

  // ── KPI: Low Stock ────────────────────────────────────────────────────
  const lowStockProducts = useMemo(() => {
    if (dashboardLowStock) return dashboardLowStock;
    return products.filter(p => p.stock <= p.lowStockThreshold);
  }, [dashboardLowStock, products]);

  // ── KPI: Scheduled Posts ──────────────────────────────────────────────
  const scheduledPostsCount = useMemo(
    () =>
      contentItems.filter((item) => item.status === 'scheduled').length
      || dashboardSummary.scheduledPosts,
    [contentItems, dashboardSummary]
  );

  // ── KPI: Engagement Rate ──────────────────────────────────────────────
  const engagementRate = useMemo(
    () => analyticsEngagementRate || dashboardSummary.engagementRate,
    [analyticsEngagementRate, dashboardSummary]
  );

  // ── Chart: date-range trend ───────────────────────────────────────────
  const chartData = useMemo(() => {
    const groupedSales = new Map<string, { revenue: number; profit: number }>();

    scopedSales.forEach((sale) => {
      const current = groupedSales.get(sale.date) ?? { revenue: 0, profit: 0 };
      current.revenue += Number(sale.total ?? 0);
      current.profit += Number(sale.profit ?? 0);
      groupedSales.set(sale.date, current);
    });

    return Array.from(groupedSales.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, totals]) => ({
        label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        Revenue: parseFloat(totals.revenue.toFixed(2)),
        Profit: parseFloat(totals.profit.toFixed(2)),
      }));
  }, [scopedSales]);

  const selectedProfit = useMemo(
    () => chartData.reduce((sum, point) => sum + Number(point.Profit ?? 0), 0),
    [chartData]
  );

  const selectedDateLabel = useMemo(
    () => formatDashboardDateLabel(selectedDate),
    [selectedDate]
  );

  const salesScopeLabel = isDateMode ? selectedDateLabel : 'All recorded sales';

  // ── Top products table ────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; category: string; units: number; revenue: number; profit: number }> = {};
    scopedSales.forEach(s => {
      const productKey = `${s.productName}::${s.category}`;
      if (!map[productKey]) {
        map[productKey] = { id: productKey, name: s.productName, category: s.category, units: 0, revenue: 0, profit: 0 };
      }
      map[productKey].units += s.quantity;
      map[productKey].revenue += s.total;
      map[productKey].profit += s.profit;
    });
    const rows = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    return rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue.toFixed(2)),
      profit: parseFloat(r.profit.toFixed(2)),
    }));
  }, [scopedSales]);

  // ── Low stock (filtered) ──────────────────────────────────────────────
  const lowStockFiltered = lowStockProducts;

  // ── Scheduled / upcoming posts ────────────────────────────────────────
  const scheduledContent = useMemo(
    () =>
      contentItems
        .filter((item) => item.status === 'scheduled' || item.status === 'approved')
        .sort((left, right) => (left.scheduledAt ?? '').localeCompare(right.scheduledAt ?? ''))
        .slice(0, 6),
    [contentItems]
  );

  // ── Staff activity log ────────────────────────────────────────────────
  const activityLog = useMemo(() => {
    type LogEntry = { id: string; type: 'sale' | 'content'; title: string; meta: string; date: string; actor: string };
    const entries: LogEntry[] = [];

    sales.slice(0, 12).forEach(s => {
      entries.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Sale recorded: ${s.productName}`,
        meta: `×${s.quantity} · ${s.customerName} · ₱${s.total.toFixed(2)}`,
        date: s.date,
        actor: s.staffName,
      });
    });

    contentItems.forEach(c => {
      const verb = c.status === 'published' ? 'Published' : c.status === 'approved' ? 'Approved' : 'Submitted';
      entries.push({
        id: `content-${c.id}`,
        type: 'content',
        title: `${verb}: "${c.title}"`,
        meta: `${c.platform} · ${c.status}`,
        date: (c.publishedAt ?? c.createdAt ?? '').split('T')[0],
        actor: c.approvedBy ?? c.createdBy,
      });
    });

    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [sales, contentItems]);

  const tickInterval = Math.max(0, Math.floor(chartData.length / 7) - 1);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">

      {/* Low Stock Modal - removed; KPI card now navigates to /products */}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Admin Dashboard</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            Welcome back, {user?.name?.split(' ')[0]} — {today}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white p-1">
            <button
              type="button"
              onClick={() => setSalesViewMode('overall')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${salesViewMode === 'overall'
                  ? 'bg-[#EC4899] text-white'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
            >
              Overall
            </button>
            <button
              type="button"
              onClick={() => setSalesViewMode('date')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${salesViewMode === 'date'
                  ? 'bg-[#EC4899] text-white'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
            >
              Selected Date
            </button>
          </div>

          {isDateMode && (
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#374151]">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <input
                type="date"
                value={selectedDate}
                max={todayIso}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="bg-transparent text-xs text-[#111827] focus:outline-none"
              />
            </label>
          )}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {dashboardLoading && sales.length === 0 ? (
          // Skeleton — shown only on first load (no cache)
          Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (<>
        <KPICard
          label="Total Sales"
          value={String(totalSalesCount)}
          sub={isDateMode ? 'transactions on selected day' : 'all recorded transactions'}
          icon={ShoppingCart}
          iconBg="bg-[#FCE7F3]"
          iconColor="text-[#EC4899]"
          onClick={() => navigate('/sales')}
        />
        <KPICard
          label="Revenue"
          value={`₱${revenueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={salesScopeLabel}
          icon={DollarSign}
          iconBg="bg-[#FEF9C3]"
          iconColor="text-[#D97706]"
          trend={`₱${selectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          trendUp={selectedProfit >= 0}
          onClick={() => navigate('/sales')}
        />
        <KPICard
          label="Low Stock Items"
          value={String(lowStockProducts.length)}
          sub="need restocking"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          onClick={() => navigate('/products', { state: { stockFilter: 'Low' } })}
        />
        <KPICard
          label="Scheduled Posts"
          value={String(scheduledPostsCount)}
          sub="upcoming content"
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/scheduling')}
        />
        <KPICard
          label="Engagement Rate"
          value={`${engagementRate.toFixed(1)}%`}
          sub="avg across published"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend="+2.3%"
          trendUp
          onClick={() => navigate('/analytics')}
        />
        </>
        )}
      </div>

      {/* ── Sales Trend Chart (7 days) ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Sales Trend</h3>
            <p className="text-[#9CA3AF] text-xs">{salesScopeLabel}</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} /> Profit
            </span>
          </div>
        </div>
        {dashboardError && (
          <p className="text-xs text-red-500 mb-3">{dashboardError}</p>
        )}
        {dashboardLoading && !dashboardError && sales.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-3">
            <RefreshCw className="w-3 h-3 animate-spin" /> Loading chart data...
          </div>
        )}
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `₱${v}`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v: number, name: string) => [`₱${v.toFixed(2)}`, name]}
            />
            <Line
              type="monotone"
              dataKey="Revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--chart-1)' }}
            />
            <Line
              type="monotone"
              dataKey="Profit"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--chart-2)' }}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tables Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Top Selling Products */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <SectionHeader
            title="Top Selling Products"
            sub={isDateMode ? `For ${selectedDateLabel}` : 'Across all recorded sales'}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  {['#', 'Product', 'Category', 'Units', 'Revenue'].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider ${h === '#' || h === 'Category' ? 'text-left' : 'text-right'
                        }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs text-[#9CA3AF]">
                      {isDateMode ? 'No sales data for selected date' : 'No sales data available'}
                    </td>
                  </tr>
                ) : topProducts.map((p, i) => (
                  <tr key={p.id} className="border-t border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                        style={{ backgroundColor: RANK_COLORS[i % RANK_COLORS.length] }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#111827] max-w-[140px]" style={{ fontWeight: 500 }}>
                      <span className="truncate block">{p.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.category === 'Skincare' ? 'bg-[#FCE7F3] text-[#EC4899]' :
                          p.category === 'Makeup' ? 'bg-[#FEF3C7] text-[#D97706]' :
                            'bg-blue-50 text-blue-600'
                        }`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-[#374151]">{p.units}</td>
                    <td className="px-4 py-3 text-xs text-right text-[#111827]" style={{ fontWeight: 600 }}>
                      ₱{p.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alert Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Low Stock Alerts</h3>
              <p className="text-[#9CA3AF] text-xs">
                {lowStockFiltered.length} item{lowStockFiltered.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
            {lowStockFiltered.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                {lowStockFiltered.length} alert{lowStockFiltered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {lowStockFiltered.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-[#9CA3AF]">✓ All stock levels healthy</p>
            ) : lowStockFiltered.map(p => {
              const pct = Math.round((p.stock / p.lowStockThreshold) * 100);
              const isCritical = p.stock <= Math.floor(p.lowStockThreshold * 0.6);
              return (
                <div key={p.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{p.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{p.sku} · {p.category}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 flex items-center gap-1 ${isCritical
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                      <RefreshCw className="w-2.5 h-2.5" />
                      Reorder
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isCritical ? '#EF4444' : '#F59E0B',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7280] shrink-0 tabular-nums">
                      {p.stock} / {p.lowStockThreshold}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Scheduled Posts + Activity Log ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Scheduled Marketing Posts */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <SectionHeader title="Scheduled Marketing Posts" sub="Upcoming & approved content" />
          <div className="divide-y divide-[#F3F4F6]">
            {scheduledContent.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-[#9CA3AF]">No scheduled posts</p>
            ) : scheduledContent.map(c => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] ${c.platform === 'instagram' ? 'bg-pink-500' :
                      c.platform === 'facebook' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}
                  style={{ fontWeight: 700 }}
                >
                  {c.platform === 'instagram' ? 'IG' : c.platform === 'facebook' ? 'FB' : '✦'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 500 }}>{c.title}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                    {c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                      : 'Pending schedule'}
                    {c.productName && ` · ${c.productName}`}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Activity Log */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <SectionHeader title="Staff Activity Log" sub="Recent actions across the system" />
          <div className="divide-y divide-[#F3F4F6] overflow-y-auto max-h-[340px]">
            {activityLog.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.type === 'sale' ? 'bg-[#FCE7F3]' : 'bg-blue-50'
                  }`}>
                  {a.type === 'sale'
                    ? <ShoppingCart className="w-3.5 h-3.5 text-[#EC4899]" />
                    : <Activity className="w-3.5 h-3.5 text-blue-500" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 500 }}>{a.title}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{a.meta}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[10px] text-[#9CA3AF] tabular-nums">{a.date}</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{a.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
