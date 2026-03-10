import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, AlertTriangle, Calendar, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw, Activity, ChevronDown,
  AlertCircle, Sparkles, X,
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

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_COLORS = ['#EC4899', '#D4A373', '#4A90D9', '#10B981', '#8B5CF6'];

// ── KPI Card ──────────────────────────────────────────────────────────────────

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

  // ── State ──────────────────────────────────────────────────────────────
  const [summary, setSummary]               = useState<DashboardSummary | null>(null);
  const [chartData, setChartData]           = useState<ChartPoint[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [forecastAlerts, setForecastAlerts] = useState<ForecastAlert[]>([]);
  const [showAlert, setShowAlert]           = useState(false);
  const [loading, setLoading]               = useState(true);
  const [isGenerating, setIsGenerating]     = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Load all dashboard data ────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, salesRes, scheduledRes, alertsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getSales(),
        api.getScheduledPosts(),
        api.getForecastAlerts(),
      ]);

      if (summaryRes.data ?? summaryRes.today !== undefined) {
        setSummary(summaryRes.data ?? summaryRes);
      }

      // Build 7-day chart from sales
      if (salesRes.data) {
        const days: ChartPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const revenue = (salesRes.data as SaleRow[])
            .filter((s: SaleRow) => s.created_at?.startsWith(dateStr))
            .reduce((sum: number, s: SaleRow) => sum + Number(s.total), 0);
          days.push({ label, Revenue: parseFloat(revenue.toFixed(2)) });
        }
        setChartData(days);
      }

      // Scheduled posts count
      if (scheduledRes.data) {
        setScheduledCount(
          scheduledRes.data.filter((p: { status: string }) => p.status === 'pending').length
        );
      }

      // Forecast alerts — show modal if any
      if (alertsRes.data && alertsRes.data.length > 0) {
        setForecastAlerts(alertsRes.data);
        setShowAlert(true);
      }

    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── Generate forecasts manually ────────────────────────────────────────
  const handleGenerateForecasts = async () => {
    setIsGenerating(true);
    try {
      await api.generateForecasts();
      toast.success('Forecasts generated');
      loadDashboard();
    } catch {
      toast.error('Failed to generate forecasts');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Navigate to AI Marketing ───────────────────────────────────────────
  const handleGenerateContent = () => {
    setShowAlert(false);
    window.location.href = '/ai-marketing';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  const lowStock = summary?.lowStock ?? [];
  const topProducts = summary?.topProducts ?? [];

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

        <div className="flex gap-2">
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
          label="Revenue Today"
          value={`₱${Number(summary?.today ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="from sales today"
          icon={DollarSign}
          iconBg="bg-[#FEF9C3]"
          iconColor="text-[#D97706]"
        />
        <KPICard
          label="Revenue This Week"
          value={`₱${Number(summary?.week ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="last 7 days"
          icon={ShoppingCart}
          iconBg="bg-[#FCE7F3]"
          iconColor="text-[#EC4899]"
        />
        <KPICard
          label="Revenue This Month"
          value={`₱${Number(summary?.month ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="last 30 days"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KPICard
          label="Low Stock Items"
          value={String(lowStock.length)}
          sub="need restocking"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <KPICard
          label="Scheduled Posts"
          value={String(scheduledCount)}
          sub="pending Facebook posts"
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* ── Sales Trend Chart (7 days) ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Sales Trend</h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `₱${v}`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} formatter={(v: number, name: string) => [`₱${v.toFixed(2)}`, name]} />
            <Line type="monotone" dataKey="Revenue" stroke="#EC4899" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#EC4899' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}