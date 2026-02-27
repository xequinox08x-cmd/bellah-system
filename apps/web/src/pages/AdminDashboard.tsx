import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Calendar, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw, Activity, ChevronDown,
} from 'lucide-react';
import { useStore } from '../data/store';
import { useAuth } from '../components/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = '2026-02-26';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-purple-100 text-purple-700',
  draft:     'bg-gray-100 text-gray-600',
};

const RANK_COLORS = ['#EC4899', '#D4A373', '#4A90D9', '#10B981', '#8B5CF6'];

function getDateRange(from: string, to: string) {
  const days: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 py-4 border-b border-[#F3F4F6]">
      <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>{title}</h3>
      {sub && <p className="text-[#9CA3AF] text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { sales, products, contentItems } = useStore();
  const { user } = useAuth();

  // ── Filters ────────────────────────────────────────────────────────────
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date('2026-02-26');
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  }, []);

  const [dateFrom, setDateFrom]               = useState(thirtyDaysAgo);
  const [dateTo, setDateTo]                   = useState(TODAY);
  const [selectedProduct, setSelectedProduct] = useState('All');

  // ── Filtered sales by date range ──────────────────────────────────────
  const filteredSales = useMemo(
    () => sales.filter(s => s.date >= dateFrom && s.date <= dateTo),
    [sales, dateFrom, dateTo]
  );

  // ── KPI: Total Sales ──────────────────────────────────────────────────
  const totalSalesCount = filteredSales.length;

  // ── KPI: Revenue Today ────────────────────────────────────────────────
  const revenueToday = useMemo(
    () => sales.filter(s => s.date === TODAY).reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  // ── KPI: Low Stock ────────────────────────────────────────────────────
  const lowStockProducts = useMemo(
    () => products.filter(p => p.stock <= p.lowStockThreshold),
    [products]
  );

  // ── KPI: Scheduled Posts ──────────────────────────────────────────────
  const scheduledPostsCount = useMemo(
    () => contentItems.filter(c => c.status === 'scheduled').length,
    [contentItems]
  );

  // ── KPI: Engagement Rate ──────────────────────────────────────────────
  const engagementRate = useMemo(() => {
    const withEng = contentItems.filter(c => c.engagement && c.engagement.reach > 0);
    if (!withEng.length) return 0;
    const total = withEng.reduce((sum, c) => {
      const e = c.engagement!;
      return sum + (e.likes + e.comments + e.shares) / e.reach;
    }, 0);
    return (total / withEng.length) * 100;
  }, [contentItems]);

  // ── Chart: date-range trend ───────────────────────────────────────────
  const chartData = useMemo(() => {
    const days = getDateRange(dateFrom, dateTo);
    return days.map(date => {
      const daySales = sales.filter(
        s => s.date === date &&
          (selectedProduct === 'All' || s.productName === selectedProduct)
      );
      return {
        label:   new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Revenue: parseFloat(daySales.reduce((sum, s) => sum + s.total, 0).toFixed(2)),
        Profit:  parseFloat(daySales.reduce((sum, s) => sum + s.profit, 0).toFixed(2)),
      };
    });
  }, [sales, dateFrom, dateTo, selectedProduct]);

  // ── Top products table ────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; category: string; units: number; revenue: number; profit: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.productId]) {
        map[s.productId] = { id: s.productId, name: s.productName, category: s.category, units: 0, revenue: 0, profit: 0 };
      }
      map[s.productId].units   += s.quantity;
      map[s.productId].revenue += s.total;
      map[s.productId].profit  += s.profit;
    });
    let rows = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    if (selectedProduct !== 'All') rows = rows.filter(r => r.name === selectedProduct);
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    return rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue.toFixed(2)),
      profit:  parseFloat(r.profit.toFixed(2)),
      share:   totalRev > 0 ? (r.revenue / totalRev) * 100 : 0,
      barPct:  rows[0]?.revenue > 0 ? (r.revenue / rows[0].revenue) * 100 : 0,
    }));
  }, [filteredSales, selectedProduct]);

  // ── Low stock (filtered) ──────────────────────────────────────────────
  const lowStockFiltered = useMemo(() => {
    if (selectedProduct === 'All') return lowStockProducts;
    return lowStockProducts.filter(p => p.name === selectedProduct);
  }, [lowStockProducts, selectedProduct]);

  // ── Scheduled / upcoming posts ────────────────────────────────────────
  const scheduledContent = useMemo(
    () =>
      contentItems
        .filter(c => c.status === 'scheduled' || c.status === 'approved')
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
        .slice(0, 6),
    [contentItems]
  );

  // ── Staff activity log ────────────────────────────────────────────────
  const activityLog = useMemo(() => {
    type LogEntry = { id: string; type: 'sale' | 'content'; title: string; meta: string; date: string; actor: string };
    const entries: LogEntry[] = [];

    sales.slice(0, 12).forEach(s => {
      entries.push({
        id:    `sale-${s.id}`,
        type:  'sale',
        title: `Sale recorded: ${s.productName}`,
        meta:  `×${s.quantity} · ${s.customerName} · ₱${s.total.toFixed(2)}`,
        date:  s.date,
        actor: s.staffName,
      });
    });

    contentItems.forEach(c => {
      const verb = c.status === 'published' ? 'Published' : c.status === 'approved' ? 'Approved' : 'Submitted';
      entries.push({
        id:    `content-${c.id}`,
        type:  'content',
        title: `${verb}: "${c.title}"`,
        meta:  `${c.platform} · ${c.status}`,
        date:  (c.publishedAt ?? c.createdAt ?? '').split('T')[0],
        actor: c.approvedBy ?? c.createdBy,
      });
    });

    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [sales, contentItems]);

  // ── Product options ───────────────────────────────────────────────────
  const productOptions = ['All', ...products.map(p => p.name)];

  const tickInterval = Math.max(1, Math.floor(chartData.length / 7) - 1);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">

      {/* ── Header + Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Admin Dashboard</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            Welcome back, {user?.name?.split(' ')[0]} — Thursday, February 26, 2026
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#374151]">
            <Calendar className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent outline-none text-xs text-[#374151] w-[110px]"
            />
            <span className="text-[#9CA3AF]">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent outline-none text-xs text-[#374151] w-[110px]"
            />
          </div>

          {/* Product Filter */}
          <div className="relative flex items-center bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 gap-1.5">
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="appearance-none bg-transparent outline-none text-xs text-[#374151] pr-4 cursor-pointer"
            >
              {productOptions.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'All Products' : p}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#9CA3AF] absolute right-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          label="Total Sales"
          value={String(totalSalesCount)}
          sub="transactions in range"
          icon={ShoppingCart}
          iconBg="bg-[#FCE7F3]"
          iconColor="text-[#EC4899]"
          trend="+8.1%"
          trendUp
        />
        <KPICard
          label="Revenue Today"
          value={`₱${revenueToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="Feb 26, 2026"
          icon={DollarSign}
          iconBg="bg-[#FEF9C3]"
          iconColor="text-[#D97706]"
          trend="+5.2%"
          trendUp
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

      {/* ── Sales Trend Chart ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Sales Trend</h3>
            <p className="text-[#9CA3AF] text-xs">
              {dateFrom} → {dateTo}
              {selectedProduct !== 'All' && ` · ${selectedProduct}`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#EC4899] inline-block rounded-full" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#D4A373] inline-block rounded-full" /> Profit
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `₱${v}`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              formatter={(v: number, name: string) => [`₱${v.toFixed(2)}`, name]}
            />
            <Line
              type="monotone"
              dataKey="Revenue"
              stroke="#EC4899"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#EC4899' }}
            />
            <Line
              type="monotone"
              dataKey="Profit"
              stroke="#D4A373"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#D4A373' }}
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
            sub={`Within selected date range${selectedProduct !== 'All' ? ` · ${selectedProduct}` : ''}`}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  {['#', 'Product', 'Category', 'Units', 'Revenue', 'Profit', 'Share'].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider ${
                        h === '#' || h === 'Category' || h === 'Share' ? 'text-left' : 'text-right'
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
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#9CA3AF]">
                      No sales data for selected filters
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        p.category === 'Skincare' ? 'bg-[#FCE7F3] text-[#EC4899]' :
                        p.category === 'Makeup'   ? 'bg-[#FEF3C7] text-[#D97706]' :
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
                    <td className="px-4 py-3 min-w-[90px]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.barPct}%`, backgroundColor: RANK_COLORS[i % RANK_COLORS.length] }}
                          />
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] w-7 text-right shrink-0">
                          {p.share.toFixed(0)}%
                        </span>
                      </div>
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
              const pct       = Math.round((p.stock / p.lowStockThreshold) * 100);
              const isCritical = p.stock <= Math.floor(p.lowStockThreshold * 0.6);
              return (
                <div key={p.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{p.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{p.sku} · {p.category}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 flex items-center gap-1 ${
                      isCritical
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
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] ${
                    c.platform === 'instagram' ? 'bg-pink-500' :
                    c.platform === 'facebook'  ? 'bg-blue-500' : 'bg-purple-500'
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  a.type === 'sale' ? 'bg-[#FCE7F3]' : 'bg-blue-50'
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
