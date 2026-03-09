import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface ScheduledPost {
  id: number;
  content_id: number;
  campaign_id: number | null;
  scheduled_at: string;
  platform: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  facebook_post_id: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  content_title: string;
  content_output: string;
  content_hashtags: string;
  campaign_name: string | null;
}

interface ApprovedContent {
  id: number;
  title: string;
  output: string;
  platform: string;
  hashtags: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: 'Scheduled',  icon: Clock,         bg: 'bg-blue-50',    text: 'text-blue-600'   },
  published: { label: 'Published',  icon: CheckCircle,   bg: 'bg-emerald-50', text: 'text-emerald-600' },
  failed:    { label: 'Failed',     icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-500'    },
  cancelled: { label: 'Cancelled',  icon: AlertCircle,   bg: 'bg-gray-50',    text: 'text-gray-400'   },
} as const;

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({
  content,
  onClose,
  onScheduled,
}: {
  content: ApprovedContent;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [platform, setPlatform] = useState(content.platform === 'instagram' ? 'facebook' : content.platform);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!scheduledAt) { toast.error('Please select a date and time'); return; }
    if (new Date(scheduledAt) <= new Date()) { toast.error('Scheduled time must be in the future'); return; }

    setIsSubmitting(true);
    try {
      const res = await api.createScheduledPost({
        content_id: content.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        platform,
      });
      if (res.error) throw new Error(res.error);
      toast.success('Post scheduled!');
      onScheduled();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to schedule post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-[#111827] text-base" style={{ fontWeight: 700 }}>Schedule Post</h2>

        <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{content.title}</p>
          <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{content.output}</p>
        </div>

        <div>
          <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Platform</label>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
          >
            <option value="facebook">Facebook</option>
          </select>
          <p className="text-[10px] text-[#9CA3AF] mt-1">Currently supports Facebook only</p>
        </div>

        <div>
          <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#E5E7EB] text-[#374151] rounded-lg text-sm hover:bg-[#F9FAFB] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-[#DB2777] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scheduling...</> : <><Send className="w-4 h-4" /> Schedule</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Scheduling() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [approvedContent, setApprovedContent] = useState<ApprovedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ApprovedContent | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'published' | 'failed'>('all');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, contentRes] = await Promise.all([
        api.getScheduledPosts(),
        api.getContent('approved'),
      ]);
      setPosts(postsRes.data ?? []);
      setApprovedContent(contentRes.data ?? []);
    } catch {
      setError('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCancel = async (id: number) => {
    try {
      const res = await api.deleteScheduledPost(id);
      if (res.error) throw new Error(res.error);
      toast.success('Post cancelled');
      loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to cancel post');
    }
  };

  const handleMarkPublished = async (id: number) => {
    try {
      const res = await api.updatePostStatus(id, 'published');
      if (res.error) throw new Error(res.error);
      toast.success('Marked as published');
      loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update status');
    }
  };

  const filteredPosts = activeTab === 'all' ? posts : posts.filter(p => p.status === activeTab);

  // Summary counts
  const counts = {
    pending:   posts.filter(p => p.status === 'pending').length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Social Posting</h1>
        <p className="text-[#6B7280] text-sm">Schedule and manage your Facebook posts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Scheduled', count: counts.pending,   color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Published', count: counts.published, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed',    count: counts.failed,    color: 'text-red-500',     bg: 'bg-red-50'     },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#6B7280]">{card.label}</p>
            <p className={`text-2xl mt-1 ${card.color}`} style={{ fontWeight: 700 }}>{card.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Approved content — pick to schedule */}
        <div className="bg-white rounded-xl border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Approved Content</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Select to schedule a post</p>
          </div>
          <div className="divide-y divide-[#F3F4F6] max-h-[500px] overflow-y-auto">
            {approvedContent.length === 0 && (
              <div className="py-10 text-center text-[#9CA3AF] text-sm">
                No approved content yet
              </div>
            )}
            {approvedContent.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedContent(item)}
                className="px-5 py-4 cursor-pointer hover:bg-[#F9FAFB] transition-all"
              >
                <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
                <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{item.output}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{item.platform}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedContent(item); }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777] transition-all"
                  >
                    + Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled posts list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Posts Queue</h3>
            <div className="flex gap-1">
              {(['all', 'pending', 'published', 'failed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
                    activeTab === tab ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#F3F4F6] max-h-[500px] overflow-y-auto">
            {loading && <div className="py-12 text-center text-[#9CA3AF] text-sm">Loading...</div>}
            {error && <div className="py-12 text-center text-red-500 text-sm">{error}</div>}
            {!loading && !error && filteredPosts.length === 0 && (
              <div className="py-12 text-center text-[#9CA3AF] text-sm">No posts here yet</div>
            )}
            {!loading && !error && filteredPosts.map(post => {
              const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={post.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{post.content_title}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.scheduled_at).toLocaleString()}
                          {post.campaign_name && <span className="ml-1">· {post.campaign_name}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {post.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleMarkPublished(post.id)}
                              title="Mark as published"
                              className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(post.id)}
                              title="Cancel post"
                              className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1.5 line-clamp-1">{post.content_output}</p>
                    {post.error_message && (
                      <p className="text-xs text-red-500 mt-1">Error: {post.error_message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule modal */}
      {selectedContent && (
        <ScheduleModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
          onScheduled={loadData}
        />
      )}
    </div>
  );
}