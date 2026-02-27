import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Heart, MessageCircle, Share2, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../data/store';

function MetricCard({ label, value, icon: Icon, color, bg, change, up }: {
  label: string; value: string | number; icon: React.ElementType;
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
      <p className="text-2xl text-[#111827]" style={{ fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { contentItems, sales } = useStore();

  const publishedContent = contentItems.filter(c => c.status === 'published' && c.engagement);

  const totals = useMemo(() => publishedContent.reduce(
    (acc, c) => ({
      likes: acc.likes + (c.engagement?.likes || 0),
      comments: acc.comments + (c.engagement?.comments || 0),
      shares: acc.shares + (c.engagement?.shares || 0),
      reach: acc.reach + (c.engagement?.reach || 0),
    }),
    { likes: 0, comments: 0, shares: 0, reach: 0 }
  ), [publishedContent]);

  // Engagement rate
  const engagementRate = totals.reach > 0
    ? (((totals.likes + totals.comments + totals.shares) / totals.reach) * 100).toFixed(1)
    : '0';

  // Platform performance
  const platformData = useMemo(() => {
    const platforms = ['instagram', 'facebook', 'both'] as const;
    return platforms.map(p => {
      const items = publishedContent.filter(c => c.platform === p);
      const totalLikes = items.reduce((s, c) => s + (c.engagement?.likes || 0), 0);
      const totalComments = items.reduce((s, c) => s + (c.engagement?.comments || 0), 0);
      const totalShares = items.reduce((s, c) => s + (c.engagement?.shares || 0), 0);
      return {
        name: p.charAt(0).toUpperCase() + p.slice(1),
        Likes: totalLikes,
        Comments: totalComments,
        Shares: totalShares,
      };
    });
  }, [publishedContent]);

  // Simulated engagement over time (last 7 days)
  const engagementTrend = [
    { day: 'Mon', Likes: 48, Comments: 8, Shares: 12 },
    { day: 'Tue', Likes: 62, Comments: 11, Shares: 18 },
    { day: 'Wed', Likes: 55, Comments: 9, Shares: 14 },
    { day: 'Thu', Likes: 89, Comments: 16, Shares: 24 },
    { day: 'Fri', Likes: 124, Comments: 22, Shares: 38 },
    { day: 'Sat', Likes: 145, Comments: 28, Shares: 41 },
    { day: 'Sun', Likes: 107, Comments: 19, Shares: 29 },
  ];

  // Content type performance
  const contentTypeData = [
    { name: 'Caption', posts: 3, avgLikes: 145, avgReach: 1200 },
    { name: 'Promotion', posts: 2, avgLikes: 218, avgReach: 2800 },
    { name: 'Product Highlight', posts: 1, avgLikes: 342, avgReach: 2840 },
    { name: 'Story', posts: 1, avgLikes: 89, avgReach: 980 },
  ];

  const PIE_COLORS = ['#EC4899', '#D4A373', '#4A90D9'];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Analytics</h1>
        <p className="text-[#6B7280] text-sm">Track engagement and performance across all published content</p>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Likes" value={totals.likes} icon={Heart} color="text-[#EC4899]" bg="bg-[#FCE7F3]" change="+18.2%" up />
        <MetricCard label="Comments" value={totals.comments} icon={MessageCircle} color="text-blue-600" bg="bg-blue-50" change="+12.5%" up />
        <MetricCard label="Shares" value={totals.shares} icon={Share2} color="text-[#D97706]" bg="bg-[#FEF3C7]" change="+24.1%" up />
        <MetricCard label="Total Reach" value={totals.reach} icon={Eye} color="text-purple-600" bg="bg-purple-50" change="+9.8%" up />
      </div>

      {/* Engagement Rate Card */}
      <div className="bg-gradient-to-r from-[#EC4899] to-[#D4A373] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Average Engagement Rate</p>
            <p className="text-4xl mt-1" style={{ fontWeight: 700 }}>{engagementRate}%</p>
            <p className="text-white/70 text-xs mt-1">{publishedContent.length} published posts</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-white/70 text-xs">Industry Avg.</p>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>2.5%</p>
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-lg">
              <p className="text-white text-xs">
                {parseFloat(engagementRate) > 2.5 ? '🚀 Above average!' : '📈 Keep growing!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Engagement Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="mb-4">
            <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Engagement Trend</h3>
            <p className="text-xs text-[#9CA3AF]">Last 7 days</p>
          </div>
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
        </div>

        {/* Platform Breakdown Pie */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="mb-4">
            <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Platform Reach</h3>
            <p className="text-xs text-[#9CA3AF]">Distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={platformData} dataKey="Likes" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                {platformData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {platformData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-xs text-[#6B7280]">{p.name}</span>
                </div>
                <span className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{(p.Likes + p.Comments + p.Shares).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Performance Bar Chart */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="mb-4">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Platform Performance Comparison</h3>
          <p className="text-xs text-[#9CA3AF]">Likes, Comments, and Shares by platform</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={platformData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
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
      </div>

      {/* Content Performance Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>Published Content Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Post', 'Platform', 'Reach', 'Likes', 'Comments', 'Shares', 'Eng. Rate'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-[#6B7280] uppercase tracking-wider" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {publishedContent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#9CA3AF] text-sm">No published content yet</td>
                </tr>
              ) : (
                publishedContent.map(item => {
                  const eng = item.engagement!;
                  const rate = ((eng.likes + eng.comments + eng.shares) / eng.reach * 100).toFixed(1);
                  const platBadge = { instagram: 'bg-pink-100 text-pink-600', facebook: 'bg-blue-100 text-blue-600', both: 'bg-purple-100 text-purple-600' };
                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${platBadge[item.platform]}`}>
                          {item.platform}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#111827]">{eng.reach.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-[#EC4899]" style={{ fontWeight: 500 }}>{eng.likes}</td>
                      <td className="px-5 py-3.5 text-sm text-blue-600">{eng.comments}</td>
                      <td className="px-5 py-3.5 text-sm text-[#D97706]">{eng.shares}</td>
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
