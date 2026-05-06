import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Heart, MessageCircle, Share2, Eye, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

function MetricCard({ label, value, icon: Icon, color, bg, change, up }: {
  label: string; value: string | number; icon: ElementType;
  color: string; bg: string; change?: string; up?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {change && (
          <span className={`flex items-center gap-0.5 text-xs ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl text-[#111827]" style={{ fontWeight: 700 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
    </div>
  );
}

type AnalyticsSummary = {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  postCount: number;
  lastSyncedAt: string | null;
};

type AnalyticsTrendPoint = {
  date: string;
  label: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
};

type AnalyticsPost = {
  id: number;
  title: string;
  platform: string;
  facebookPostId: string | null;
  publishedAt: string | null;
  createdAt: string;
  lastMetricsSyncAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  likes: 0,
  comments: 0,
  shares: 0,
  reach: 0,
  engagementRate: 0,
  postCount: 0,
  lastSyncedAt: null,
};

function formatShortTitle(value: string) {
  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
}

async function fetchAnalyticsData() {
  const [summaryResponse, trendResponse, postsResponse] = await Promise.all([
    api.getAnalyticsSummary(),
    api.getAnalyticsTrend(7),
    api.getAnalyticsPosts(),
  ]);

  return {
    summary: summaryResponse.data,
    trend: trendResponse.data,
    posts: postsResponse.data,
  };
}

export default function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [trend, setTrend] = useState<AnalyticsTrendPoint[]>([]);
  const [posts, setPosts] = useState<AnalyticsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);

  async function loadAnalytics(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const analyticsData = await fetchAnalyticsData();

      setSummary(analyticsData.summary);
      setTrend(analyticsData.trend);
      setPosts(analyticsData.posts);
    } catch (e: any) {
      setSummary(EMPTY_SUMMARY);
      setTrend([]);
      setPosts([]);
      setError(e?.message || 'Failed to load Facebook analytics');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  useEffect(() => {
    const handleAnalyticsUpdated = () => {
      void loadAnalytics(false);
    };

    window.addEventListener('facebook-analytics-updated', handleAnalyticsUpdated);

    return () => {
      window.removeEventListener('facebook-analytics-updated', handleAnalyticsUpdated);
    };
  }, []);

  async function handleRefreshAnalytics() {
    setRefreshing(true);
    setRefreshSummary(null);
    setError(null);

    try {
      const refreshResponse = await api.syncAllFacebookMetrics();
      await loadAnalytics(false);

      const syncData = refreshResponse.data;
      setRefreshSummary(
        syncData.totalFailed > 0
          ? `Synced ${syncData.totalSynced} of ${syncData.totalTracked} tracked posts. Failed IDs: ${syncData.failedIds.join(', ')}`
          : `Synced ${syncData.totalSynced} of ${syncData.totalTracked} tracked posts.`
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh Facebook analytics');
    } finally {
      setRefreshing(false);
    }
  }

  const engagementRate = summary.engagementRate.toFixed(1);
  const PIE_COLORS = ['#EC4899', '#D4A373', '#4A90D9'];

  const engagementMix = useMemo(
    () => [
      { name: 'Likes', value: summary.likes },
      { name: 'Comments', value: summary.comments },
      { name: 'Shares', value: summary.shares },
    ].filter((item) => item.value > 0),
    [summary]
  );

  const engagementTrend = useMemo(
    () =>
      trend.map((item) => ({
        day: item.label,
        Likes: item.likes,
        Comments: item.comments,
        Shares: item.shares,
      })),
    [trend]
  );

  const topPostsData = useMemo(
    () =>
      [...posts]
        .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
        .slice(0, 5)
        .map((item) => ({
          name: formatShortTitle(item.title),
          Likes: item.likes,
          Comments: item.comments,
          Shares: item.shares,
        })),
    [posts]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Analytics</h1>
          <p className="text-[#6B7280] text-sm">Track engagement and performance across published Facebook content</p>
          <p className="text-[#9CA3AF] text-xs mt-1">Includes system records in ai_contents that already have a Facebook post ID.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshAnalytics()}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#374151] transition-all hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && refreshSummary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {refreshSummary}
        </div>
      )}

      {!error && loading && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#6B7280]">
          Loading Facebook analytics...
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Likes" value={summary.likes} icon={Heart} color="text-[#EC4899]" bg="bg-[#FCE7F3]" />
        <MetricCard label="Comments" value={summary.comments} icon={MessageCircle} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard label="Shares" value={summary.shares} icon={Share2} color="text-[#D97706]" bg="bg-[#FEF3C7]" />
        <MetricCard label="Total Reach" value={summary.reach} icon={Eye} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="bg-gradient-to-r from-[#EC4899] to-[#D4A373] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm">Average Engagement Rate</p>
            <p className="text-4xl mt-1" style={{ fontWeight: 700 }}>{engagementRate}%</p>
            <p className="text-white/70 text-xs mt-1">{summary.postCount} published Facebook posts</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-white/70 text-xs">Last Sync</p>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>
                {summary.lastSyncedAt ? new Date(summary.lastSyncedAt).toLocaleString() : 'No sync yet'}
              </p>
            </div>
            <div>
              <p className="text-white/70 text-xs">Benchmark</p>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>2.5%</p>
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-lg">
              <p className="text-white text-xs">
                {parseFloat(engagementRate) > 2.5 ? 'Above average' : 'Keep growing'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="mb-4">
            <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Engagement Trend</h3>
            <p className="text-xs text-[#9CA3AF]">Last 7 days of Facebook metrics snapshots</p>
          </div>
          {engagementTrend.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-[#9CA3AF]">
              No Facebook metrics snapshots yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={engagementTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Likes" stroke="#EC4899" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Comments" stroke="#4A90D9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Shares" stroke="#D4A373" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="mb-4">
            <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Facebook Engagement Mix</h3>
            <p className="text-xs text-[#9CA3AF]">Likes, comments, and shares</p>
          </div>
          {engagementMix.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-sm text-[#9CA3AF]">
              No engagement data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={engagementMix} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                  {engagementMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-2">
            {(engagementMix.length ? engagementMix : [
              { name: 'Likes', value: 0 },
              { name: 'Comments', value: 0 },
              { name: 'Shares', value: 0 },
            ]).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-[#6B7280]">{item.name}</span>
                </div>
                <span className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="mb-4">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Top Facebook Posts by Engagement</h3>
          <p className="text-xs text-[#9CA3AF]">Likes, comments, and shares on published posts</p>
        </div>
        {topPostsData.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-[#9CA3AF]">
            No published Facebook posts with metrics yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topPostsData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Likes" fill="#EC4899" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Comments" fill="#4A90D9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Shares" fill="#D4A373" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Published Content Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Post', 'Platform', 'Reach', 'Likes', 'Comments', 'Shares', 'Eng. Rate'].map((heading) => (
                  <th key={heading} className="text-left px-5 py-3 text-xs text-[#6B7280] uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#9CA3AF] text-sm">
                    {loading ? 'Loading published Facebook content...' : 'No published Facebook content yet'}
                  </td>
                </tr>
              ) : (
                posts.map((item) => {
                  const rate = item.engagementRate.toFixed(1);

                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Facebook
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#111827]">{item.reach.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-[#EC4899]" style={{ fontWeight: 500 }}>{item.likes}</td>
                      <td className="px-5 py-3.5 text-sm text-blue-600">{item.comments}</td>
                      <td className="px-5 py-3.5 text-sm text-[#D97706]">{item.shares}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${parseFloat(rate) > 5 ? 'bg-emerald-100 text-emerald-600' : parseFloat(rate) > 2 ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-gray-100 text-gray-600'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
