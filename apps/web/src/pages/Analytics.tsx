import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Heart, MessageCircle, Share2, Eye, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

function MetricCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: ElementType;
  color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm shadow-[#111827]/5">
      <div className="flex items-start justify-between mb-2.5">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
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

const ANALYTICS_CACHE_KEY = 'bellah.analytics.latest';
const FALLBACK_NOTICE = 'Analytics temporarily unavailable. Showing cached insights.';

type AnalyticsCache = {
  summary: AnalyticsSummary;
  trend: AnalyticsTrendPoint[];
  posts: AnalyticsPost[];
  cachedAt: string;
};

function safeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSummary(value: any): AnalyticsSummary {
  return {
    likes: safeNumber(value?.likes ?? value?.reactions),
    comments: safeNumber(value?.comments),
    shares: safeNumber(value?.shares),
    reach: safeNumber(value?.reach),
    engagementRate: safeNumber(value?.engagementRate),
    postCount: safeNumber(value?.postCount),
    lastSyncedAt: typeof value?.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
  };
}

function normalizeTrend(value: any): AnalyticsTrendPoint[] {
  return Array.isArray(value)
    ? value.map((item) => ({
      date: String(item?.date || ''),
      label: String(item?.label || item?.date || ''),
      likes: safeNumber(item?.likes ?? item?.reactions),
      comments: safeNumber(item?.comments),
      shares: safeNumber(item?.shares),
      reach: safeNumber(item?.reach),
      engagementRate: safeNumber(item?.engagementRate),
    })).filter((item) => item.date && item.label)
    : [];
}

function normalizePosts(value: any): AnalyticsPost[] {
  return Array.isArray(value)
    ? value.map((item, index) => ({
      id: safeNumber(item?.id) || index + 1,
      title: String(item?.title || 'Untitled Content'),
      platform: String(item?.platform || 'facebook'),
      facebookPostId: typeof item?.facebookPostId === 'string' ? item.facebookPostId : null,
      publishedAt: typeof item?.publishedAt === 'string' ? item.publishedAt : null,
      createdAt: String(item?.createdAt || new Date().toISOString()),
      lastMetricsSyncAt: typeof item?.lastMetricsSyncAt === 'string' ? item.lastMetricsSyncAt : null,
      likes: safeNumber(item?.likes ?? item?.reactions),
      comments: safeNumber(item?.comments),
      shares: safeNumber(item?.shares),
      reach: safeNumber(item?.reach),
      engagementRate: safeNumber(item?.engagementRate),
    }))
    : [];
}

function readCachedAnalytics(): AnalyticsCache | null {
  try {
    const raw = localStorage.getItem(ANALYTICS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    return {
      summary: normalizeSummary(parsed?.summary),
      trend: normalizeTrend(parsed?.trend),
      posts: normalizePosts(parsed?.posts),
      cachedAt: String(parsed?.cachedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function writeCachedAnalytics(cache: Omit<AnalyticsCache, 'cachedAt'>) {
  try {
    localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify({
      ...cache,
      cachedAt: new Date().toISOString(),
    }));
  } catch {
    // Storage can be unavailable in private browser modes; analytics still renders in memory.
  }
}

function clearCachedAnalytics() {
  try {
    localStorage.removeItem(ANALYTICS_CACHE_KEY);
  } catch {
    // Storage can be unavailable in private browser modes; analytics still renders in memory.
  }
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#F3F4F6] ${className}`} />;
}

function formatShortTitle(value: string) {
  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
}

async function fetchAnalyticsData(force = false) {
  const [summaryResponse, trendResponse, postsResponse] = await Promise.all([
    api.getAnalyticsSummary({ force }),
    api.getAnalyticsTrend(90, { force }),
    api.getAnalyticsPosts({ force }),
  ]);

  return {
    summary: normalizeSummary(summaryResponse.data),
    trend: normalizeTrend(trendResponse.data),
    posts: normalizePosts(postsResponse.data),
  };
}

export default function Analytics() {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [trend, setTrend] = useState<AnalyticsTrendPoint[]>([]);
  const [posts, setPosts] = useState<AnalyticsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);
  const [selectedTrendDate, setSelectedTrendDate] = useState('');

  async function loadAnalytics(showLoading = true, force = false) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const analyticsData = await fetchAnalyticsData(force);

      setSummary(analyticsData.summary);
      setTrend(analyticsData.trend);
      setPosts(analyticsData.posts);
      writeCachedAnalytics(analyticsData);
      if (force) {
        console.info('[analytics.refresh] frontend state updated', {
          likes: analyticsData.summary.likes,
          comments: analyticsData.summary.comments,
          shares: analyticsData.summary.shares,
          reach: analyticsData.summary.reach,
          lastSyncedAt: analyticsData.summary.lastSyncedAt,
        });
      }
    } catch (e: any) {
      const cached = readCachedAnalytics();
      setSummary(cached?.summary ?? EMPTY_SUMMARY);
      setTrend(cached?.trend ?? []);
      setPosts(cached?.posts ?? []);
      setError(FALLBACK_NOTICE);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const cached = readCachedAnalytics();
    if (cached) {
      setSummary(cached.summary);
      setTrend(cached.trend);
      setPosts(cached.posts);
    }
    void loadAnalytics();
  }, []);

  useEffect(() => {
    const handleAnalyticsUpdated = () => {
      void loadAnalytics(false, true);
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
    clearCachedAnalytics();
    console.info('[analytics.refresh] manual refresh requested; local analytics cache cleared');

    try {
      const refreshResponse = await api.syncAllFacebookMetrics();
      await queryClient.cancelQueries({ queryKey: queryKeys.analytics.all });
      queryClient.removeQueries({ queryKey: queryKeys.analytics.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      await loadAnalytics(false, true);

      const syncData = refreshResponse.data;
      console.info('[analytics.refresh] frontend refresh completion', {
        fallback: Boolean(refreshResponse.fallback),
        synced: syncData.totalSynced,
        failed: syncData.totalFailed,
        reactions: syncData.reactions ?? null,
        comments: syncData.comments ?? null,
        shares: syncData.shares ?? null,
      });
      setRefreshSummary(
        refreshResponse.fallback
          ? FALLBACK_NOTICE
          : syncData.totalFailed > 0
          ? `Synced ${syncData.totalSynced} of ${syncData.totalTracked} tracked posts. Failed IDs: ${syncData.failedIds.join(', ')}`
          : `Synced ${syncData.totalSynced} of ${syncData.totalTracked} tracked posts.`
      );
    } catch (e: any) {
      const cached = readCachedAnalytics();
      if (cached) {
        setSummary(cached.summary);
        setTrend(cached.trend);
        setPosts(cached.posts);
      }
      setError(FALLBACK_NOTICE);
    } finally {
      setRefreshing(false);
    }
  }

  const PIE_COLORS = ['#EC4899', '#D4A373', '#4A90D9'];
  const trendDates = useMemo(() => trend.map((item) => item.date), [trend]);
  const selectedTrend = useMemo(
    () => (selectedTrendDate ? trend.filter((item) => item.date === selectedTrendDate) : trend.slice(-7)),
    [selectedTrendDate, trend]
  );

  const engagementMix = useMemo(
    () => [
      { name: 'Reacts', value: summary.likes },
      { name: 'Comments', value: summary.comments },
      { name: 'Shares', value: summary.shares },
    ].filter((item) => item.value > 0),
    [summary]
  );

  const engagementTrend = useMemo(
    () =>
      selectedTrend.map((item) => ({
        day: item.label,
        Reacts: item.likes,
        Comments: item.comments,
        Shares: item.shares,
      })),
    [selectedTrend]
  );

  const topPostsData = useMemo(
    () =>
      [...posts]
        .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
        .slice(0, 5)
        .map((item) => ({
          name: formatShortTitle(item.title),
          Reacts: item.likes,
          Comments: item.comments,
          Shares: item.shares,
        })),
    [posts]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Analytics</h1>
          <p className="text-[#6B7280] text-sm">Track engagement and performance across published Facebook content</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshAnalytics()}
          disabled={loading || refreshing}
          className="inline-flex min-w-[154px] items-center justify-center gap-2 rounded-lg border border-[#F9A8D4] bg-white px-3 py-2 text-sm text-[#BE185D] shadow-sm shadow-[#111827]/5 transition-all hover:bg-[#FDF2F8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-[#F9A8D4] bg-[#FDF2F8] px-4 py-3 text-sm text-[#9D174D] shadow-sm shadow-[#111827]/5">
          {FALLBACK_NOTICE}
        </div>
      )}

      {!error && refreshSummary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm shadow-[#111827]/5">
          {refreshSummary}
        </div>
      )}

      {!error && loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-[#111827]/5">
              <SkeletonBlock className="mb-3 h-9 w-9" />
              <SkeletonBlock className="mb-2 h-7 w-20" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Reacts" value={summary.likes} icon={Heart} color="text-[#EC4899]" bg="bg-[#FCE7F3]" />
        <MetricCard label="Comments" value={summary.comments} icon={MessageCircle} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard label="Shares" value={summary.shares} icon={Share2} color="text-[#D97706]" bg="bg-[#FEF3C7]" />
        <MetricCard label="Total Reach" value={summary.reach} icon={Eye} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm shadow-[#111827]/5">
          <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Engagement Trend</h3>
              <p className="text-xs text-[#9CA3AF]">
                {selectedTrendDate ? 'Facebook metrics snapshot for selected date' : 'Last 7 days of Facebook metrics snapshots'}
              </p>
            </div>
            <label className="ml-auto flex max-w-full items-center justify-end gap-2 text-xs text-[#6B7280]">
              Selected Date
              <input
                type="date"
                value={selectedTrendDate}
                min={trendDates[0]}
                max={trendDates[trendDates.length - 1]}
                onChange={(event) => setSelectedTrendDate(event.target.value)}
                className="h-8 shrink-0 rounded-lg border border-[#E5E7EB] px-2 text-xs text-[#374151] focus:border-[#EC4899] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15"
              />
            </label>
          </div>
          {engagementTrend.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-[#9CA3AF]">
              No Facebook metrics snapshots yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={engagementTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Reacts" stroke="#EC4899" strokeWidth={3} dot={Boolean(selectedTrendDate)} />
                <Line type="monotone" dataKey="Comments" stroke="#2563EB" strokeWidth={3} dot={Boolean(selectedTrendDate)} />
                <Line type="monotone" dataKey="Shares" stroke="#D97706" strokeWidth={3} dot={Boolean(selectedTrendDate)} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm shadow-[#111827]/5">
          <div className="mb-4">
            <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Facebook Engagement Mix</h3>
            <p className="text-xs text-[#9CA3AF]">Reacts, comments, and shares</p>
          </div>
          {engagementMix.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-sm text-[#9CA3AF]">
              No engagement data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
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
              { name: 'Reacts', value: 0 },
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

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm shadow-[#111827]/5">
        <div className="mb-4">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Top Facebook Posts by Engagement</h3>
          <p className="text-xs text-[#9CA3AF]">Reacts, comments, and shares on published posts</p>
        </div>
        {topPostsData.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-[#9CA3AF]">
            No published Facebook posts with metrics yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topPostsData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Reacts" fill="#EC4899" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Comments" fill="#2563EB" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Shares" fill="#D97706" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm shadow-[#111827]/5">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Published Content Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Post', 'Platform', 'Reach', 'Reacts', 'Comments', 'Shares', 'Eng. Rate'].map((heading) => (
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
