import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Calendar, TrendingUp,
  ArrowUpRight, RefreshCw, AlertCircle, Sparkles, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardSummary {
  today: number;
  week: number;
  month: number;
  topProducts: { name: string; category: string; total_qty: number; total_revenue: number }[];
  lowStock: { id: number; name: string; sku: string; category: string; stock: number; low_stock_threshold: number }[];
}

interface SaleRow {
  id: number;
  total: number;
  created_at: string;
}

interface ChartPoint {
  label: string;
  Revenue: number;
}

interface ForecastAlert {
  product_id: number;
  product_name: string;
  actual_today: number;
  forecast_value: number;
  pct_of_forecast: number;
}

// ── KPI Mini Stat (Horizontal - Matching Staff Style) ─────────────────────────

function MiniStat({
  label, value, icon: Icon, iconBg, iconColor, note,
}: {
  label: string; value: string; icon: React.ElementType;
  iconBg: string; iconColor: string; note?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} style={{ width: 18, height: 18 }} />
      </div>
      <div className="min-w-0">
        <p className="text-lg text-[#111827]" style={{ fontWeight: 700 }}>{value}</p>
        <p className="text-[10px] text-[#6B7280]">{label}</p>
        {note && <p className="text-[10px] text-[#9CA3AF] truncate">{note}</p>}
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { session, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [forecastAlerts, setForecastAlerts] = useState<ForecastAlert[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const loadDashboard = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;

    setLoading(true);
    try {
      const [summaryRes, salesRes, scheduledRes, alertsRes] = await Promise.all([
        api.getDashboardSummary(token),
        api.getSales(token),
        api.getScheduledPosts(token),
        api.getForecastAlerts(token),
      ]);

      if (summaryRes.data) setSummary(summaryRes.data);

      if (salesRes) {
        const days: ChartPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const revenue = (salesRes as SaleRow[])
            .filter((s: SaleRow) => s.created_at?.startsWith(dateStr))
            .reduce((sum: number, s: SaleRow) => sum + Number(s.total), 0);
          days.push({ label, Revenue: parseFloat(revenue.toFixed(2)) });
        }
        setChartData(days);
      }

      if (scheduledRes) {
        setScheduledCount(scheduledRes.filter((p: any) => p.status === 'pending').length);
      }

      if (alertsRes.data?.length > 0) {
        setForecastAlerts(alertsRes.data);
        setShowAlert(true);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleGenerateForecasts = async () => {
    const token = session?.access_token;
    if (!token) return;
    setIsGenerating(true);
    try {
      await api.generateForecasts(token);
      toast.success('Forecasts generated');
      loadDashboard();
    } catch {
      toast.error('Failed to generate forecasts');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{todayStr}</p>
        </div>
        <div className="flex gap-2">
          {forecastAlerts.length > 0 && (
            <button onClick={() => setShowAlert(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> {forecastAlerts.length} Alerts
            </button>
          )}
          <button onClick={handleGenerateForecasts} disabled={isGenerating} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs">
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Run Forecast
          </button>
        </div>
      </div>

      {/* KPI Stats (Horizontal - Matching Staff Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="Revenue Today"
          value={`₱${Number(summary?.today ?? 0).toLocaleString()}`}
          icon={DollarSign}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
          note="from sales"
        />
        <MiniStat
          label="Weekly Sales"
          value={`₱${Number(summary?.week ?? 0).toLocaleString()}`}
          icon={ShoppingCart}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
          note="last 7 days"
        />
        <MiniStat
          label="Monthly Revenue"
          value={`₱${Number(summary?.month ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          note="last 30 days"
        />
        <MiniStat
          label="Low Stock"
          value={String(summary?.lowStock.length ?? 0)}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          note="need restocking"
        />
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h3 className="text-[#111827] text-sm font-semibold mb-4 text-center sm:text-left">Sales Trend (7 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `₱${Number(v).toLocaleString()}`} />
            <Tooltip formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} />
            <Line type="monotone" dataKey="Revenue" stroke="#EC4899" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products Section */}
      {summary && summary.topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h3 className="text-[#111827] text-sm font-semibold">Top Performing Products</h3>
            <p className="text-[#9CA3AF] text-xs mt-0.5">Best sellers over the last 30 days</p>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {summary.topProducts.map((p, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm text-[#111827] font-medium">{p.name}</p>
                    <p className="text-xs text-[#9CA3AF]">{p.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#111827] font-bold">₱{p.total_revenue.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-500">{p.total_qty} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Low Stock Alerts ─────────────────────────────────────────────── */}
      {summary && summary.lowStock.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <h3 className="text-[#111827] text-sm font-semibold">Low Stock Alerts</h3>
              <p className="text-[#9CA3AF] text-xs mt-0.5">{summary.lowStock.length} product{summary.lowStock.length > 1 ? 's' : ''} need restocking</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {summary.lowStock.map(item => {
              const pct = item.stock / item.low_stock_threshold;
              const isCritical = pct <= 0.6;
              return (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCritical ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div>
                      <p className="text-sm text-[#111827] font-medium">{item.name}</p>
                      <p className="text-xs text-[#9CA3AF] font-mono">{item.sku} · {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>{item.stock} left</p>
                      <p className="text-[10px] text-[#9CA3AF]">threshold: {item.low_stock_threshold}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {isCritical ? 'Critical' : 'Low'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}