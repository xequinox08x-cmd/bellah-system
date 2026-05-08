import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Calendar, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw, Activity,
  AlertCircle, Sparkles, X,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import type { ContentItem } from '../data/store';
import { getDashboardSummary, type DashboardSummary, type LowStockProduct } from '../api/dashboard';
import { getSales, type SalesRecordDTO } from '../api/sales';
import { getProducts, type ProductDTO } from '../api/products';
import { api } from '../lib/api';

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

type ForecastAlert = {
  product_id: number | string;
  product_name: string;
  actual_today: number | string;
  forecast_value: number | string;
  pct_of_forecast: number | string;
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


// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend, trendUp,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  iconBg: string; iconColor: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3">
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

// ── Critical Alert Modal ──────────────────────────────────────────────────────

function CriticalAlertModal({
  alerts,
  onClose,
  onGenerateContent,
}: {
  alerts: ForecastAlert[];
  onClose: () => void;
  onGenerateContent: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="bg-red-500 rounded-t-2xl px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 700 }}>Critical Sales Alert</p>
              <p className="text-red-100 text-xs mt-0.5">
                {alerts.length} product{alerts.length > 1 ? 's' : ''} below 50% of forecast
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert list */}
        <div className="px-6 py-4 space-y-3 max-h-[300px] overflow-y-auto">
          {alerts.map(alert => (
            <div key={alert.product_id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div>
                <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{alert.product_name}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Actual: ₱{Number(alert.actual_today).toFixed(2)} · Forecast: ₱{Number(alert.forecast_value).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg text-red-500" style={{ fontWeight: 700 }}>
                  {Number(alert.pct_of_forecast).toFixed(0)}%
                </p>
                <p className="text-[10px] text-red-400">of forecast</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#F3F4F6] space-y-2">
          <p className="text-xs text-[#6B7280] mb-3">Recommended actions to boost sales:</p>
          <button
            onClick={onGenerateContent}
            className="w-full py-2.5 bg-[#EC4899] text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#DB2777] transition-all"
          >
            <Sparkles className="w-4 h-4" /> Generate AI Marketing Content
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-[#E5E7EB] text-[#374151] rounded-xl text-sm hover:bg-[#F9FAFB] transition-all"
          >
            Dismiss
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
  const [forecastAlerts, setForecastAlerts] = useState<ForecastAlert[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardSummary() {
      try {
        setDashboardLoading(true);
        setDashboardError(null);
        const response = await getDashboardSummary(todayIso, todayIso);
        if (!cancelled) {
          setDashboardSummary(response.summary);
          setDashboardLowStock(response.lowStockProducts);
        }
      } catch (e: any) {
        if (!cancelled) {
          setDashboardError(e?.message || 'Failed to load dashboard summary');
          setDashboardSummary(EMPTY_SUMMARY);
          setDashboardLowStock(null);
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboardSummary();
    return () => {
      cancelled = true;
    };
  }, [todayIso]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardDataSources() {
      try {
        const [salesResponse, productsResponse, contentFeedResponse, analyticsSummaryResponse] = await Promise.all([
          getSales(),
          getProducts(),
          api.getAiContentFeed(),
          api.getAnalyticsSummary().catch(() => ({
            ok: false,
            data: {
              likes: 0,
              comments: 0,
              shares: 0,
              reach: 0,
              engagementRate: 0,
              postCount: 0,
              lastSyncedAt: null,
            },
            message: null,
          })),
        ]);

        if (!cancelled) {
          setSales(salesResponse);
          setProducts(productsResponse);
          setContentItems(
            Array.isArray(contentFeedResponse.data)
              ? contentFeedResponse.data.map((item) => ({
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
          setAnalyticsEngagementRate(Number(analyticsSummaryResponse.data?.engagementRate ?? 0));
        }
      } catch (e: any) {
        if (!cancelled) {
          setDashboardError(prev => prev || e?.message || 'Failed to load dashboard data');
        }
      }
    }

    loadDashboardDataSources();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadForecastAlerts() {
      try {
        const response = await api.getForecastAlerts();
        if (!cancelled) {
          const alerts = Array.isArray(response?.data) ? response.data as ForecastAlert[] : [];
          setForecastAlerts(alerts);
        }
      } catch {
        if (!cancelled) {
          setForecastAlerts([]);
        }
      }
    }

    loadForecastAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerateForecasts() {
    try {
      setIsGenerating(true);
      await api.generateForecasts();
      const response = await api.getForecastAlerts();
      const alerts = Array.isArray(response?.data) ? response.data as ForecastAlert[] : [];
      setForecastAlerts(alerts);
      setShowAlert(alerts.length > 0);
    } catch (e: any) {
      setDashboardError(e?.error || e?.message || 'Failed to generate forecasts');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleGenerateContent() {
    setShowAlert(false);
    navigate('/marketing');
  }

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

      {/* Critical Alert Modal */}
      {showAlert && forecastAlerts.length > 0 && (
        <CriticalAlertModal
          alerts={forecastAlerts}
          onClose={() => setShowAlert(false)}
          onGenerateContent={handleGenerateContent}
        />
      )}

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

          {/* Forecast alert badge */}
          {forecastAlerts.length > 0 && (
            <button
              onClick={() => setShowAlert(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-100 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {forecastAlerts.length} Sales Alert{forecastAlerts.length > 1 ? 's' : ''}
            </button>
          )}

          {/* Generate forecast button */}
          <button
            onClick={handleGenerateForecasts}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#374151] hover:bg-[#F9FAFB] transition-all disabled:opacity-50"
          >
            {isGenerating
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              : <><TrendingUp className="w-3.5 h-3.5" /> Run Forecast</>
            }
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          label="Total Sales"
          value={String(totalSalesCount)}
          sub={isDateMode ? 'transactions on selected day' : 'all recorded transactions'}
          icon={ShoppingCart}
          iconBg="bg-[#FCE7F3]"
          iconColor="text-[#EC4899]"
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
        />
        <KPICard
          label="Low Stock Items"
          value={String(lowStockProducts.length)}
          sub="need restocking"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <KPICard
          label="Scheduled Posts"
          value={String(scheduledPostsCount)}
          sub="upcoming content"
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
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
        />
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
        {dashboardLoading && !dashboardError && (
          <p className="text-xs text-[#9CA3AF] mb-3">Loading dashboard data...</p>
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
                  {['#', 'Product', 'Category', 'Units', 'Revenue', 'Profit'].map(h => (
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
                    <td colSpan={6} className="px-4 py-10 text-center text-xs text-[#9CA3AF]">
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
                    <td className="px-4 py-3 text-xs text-right text-emerald-600" style={{ fontWeight: 500 }}>
                      ₱{p.profit.toFixed(2)}
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
