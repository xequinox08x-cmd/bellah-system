import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface QueueItem {
  id: number;
  title: string;
  output: string;
  platform: string;
  hashtags: string;
  status: 'approved' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  createdAt: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}

interface ApprovedContent {
  id: number;
  title: string;
  output: string;
  platform: string;
  hashtags: string;
}

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', icon: Clock, bg: 'bg-blue-50', text: 'text-blue-600' },
  published: { label: 'Published', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  failed: { label: 'Failed', icon: XCircle, bg: 'bg-red-50', text: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, bg: 'bg-gray-50', text: 'text-gray-400' },
} as const;

function ScheduleModal({
  content,
  onClose,
  onScheduled,
}: {
  content: ApprovedContent;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [platform, setPlatform] = useState(content.platform === 'instagram' ? 'facebook' : content.platform);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dateTime = dateValue && timeValue ? `${dateValue}T${timeValue}` : '';

  const handleSubmit = async () => {
    if (!dateValue || !timeValue) {
      toast.error('Please select a date and time');
      return;
    }
    if (new Date(dateTime) <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Scheduling dateTime:', dateTime);
      const res = await api.scheduleContent(content.id, dateTime);
      if (res.error) throw new Error(res.error);
      toast.success('Post scheduled!');
      await onScheduled();
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
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={dateValue}
              onChange={e => setDateValue(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
            />
            <input
              type="time"
              value={timeValue}
              onChange={e => setTimeValue(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
            />
          </div>
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

export default function Scheduling() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [approvedContent, setApprovedContent] = useState<ApprovedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ApprovedContent | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'published' | 'failed'>('all');
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getContent();
      const items = Array.isArray(res.data) ? res.data : [];

      const approved = items
        .filter((item: any) => item.status === 'approved')
        .map((item: any) => ({
          id: Number(item.id),
          title: String(item.title ?? 'Untitled Content'),
          output: String(item.output ?? ''),
          platform: String(item.platform ?? 'facebook'),
          hashtags: String(item.hashtags ?? ''),
        }));

      const queue = items
        .filter((item: any) => ['scheduled', 'published', 'failed'].includes(item.status))
        .map((item: any) => ({
          id: Number(item.id),
          title: String(item.title ?? 'Untitled Content'),
          output: String(item.output ?? ''),
          platform: String(item.platform ?? 'facebook'),
          hashtags: String(item.hashtags ?? ''),
          status: item.status as QueueItem['status'],
          createdAt: String(item.createdAt),
          scheduledAt: item.scheduledAt ? String(item.scheduledAt) : null,
          publishedAt: item.publishedAt ? String(item.publishedAt) : null,
        }))
        .sort((a, b) => {
          const aDate = a.scheduledAt ?? a.publishedAt ?? a.createdAt;
          const bDate = b.scheduledAt ?? b.publishedAt ?? b.createdAt;
          return bDate.localeCompare(aDate);
        });

      setApprovedContent(approved);
      setQueueItems(queue);
    } catch {
      setError('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleCancel = async (id: number) => {
    try {
      await api.updateContentStatus(id, 'cancelled');
      toast.success('Post cancelled');
      window.dispatchEvent(new Event('ai-content-updated'));
      await loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to cancel post');
    }
  };

  const handlePublishNow = async (id: number) => {
    setPublishingId(id);
    try {
      const result = await api.publishFacebookContent(id);
      const initialMetricsSynced = Boolean(result?.data?.initialMetricsSynced);

      toast.success(
        initialMetricsSynced
          ? 'Post published and now tracked in analytics'
          : 'Post published and added to analytics tracking'
      );

      window.dispatchEvent(new Event('ai-content-updated'));
      window.dispatchEvent(new Event('facebook-analytics-updated'));
      await loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to publish to Facebook');
    } finally {
      setPublishingId(null);
    }
  };

  const filteredPosts = activeTab === 'all'
    ? queueItems
    : activeTab === 'pending'
    ? queueItems.filter(item => item.status === 'scheduled')
    : queueItems.filter(item => item.status === activeTab);

  const counts = {
    scheduled: queueItems.filter(item => item.status === 'scheduled').length,
    published: queueItems.filter(item => item.status === 'published').length,
    failed: queueItems.filter(item => item.status === 'failed').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Social Posting</h1>
        <p className="text-[#6B7280] text-sm">Schedule and manage your Facebook posts</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Scheduled', count: counts.scheduled, color: 'text-blue-600' },
          { label: 'Published', count: counts.published, color: 'text-emerald-600' },
          { label: 'Failed', count: counts.failed, color: 'text-red-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#6B7280]">{card.label}</p>
            <p className={`text-2xl mt-1 ${card.color}`} style={{ fontWeight: 700 }}>{card.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Approved Content</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Select to schedule a post</p>
          </div>
          <div className="divide-y divide-[#F3F4F6] max-h-[500px] overflow-y-auto">
            {approvedContent.length === 0 && (
              <div className="py-10 text-center text-[#9CA3AF] text-sm">No approved content yet</div>
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
                    onClick={e => {
                      e.stopPropagation();
                      void handlePublishNow(item.id);
                    }}
                    disabled={publishingId !== null}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {publishingId === item.id ? 'Publishing...' : 'Publish Now'}
                  </button>
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
              const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.scheduled;
              const Icon = cfg.icon;
              const displayDate = post.scheduledAt ?? post.publishedAt ?? post.createdAt;

              return (
                <div key={post.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{post.title}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(displayDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {post.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => void handlePublishNow(post.id)}
                              title="Publish to Facebook"
                              disabled={publishingId !== null}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-600 hover:bg-emerald-100 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {publishingId === post.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Publishing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Publish Now
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleCancel(post.id)}
                              title="Cancel post"
                              disabled={publishingId !== null}
                              className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1.5 line-clamp-1">{post.output}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
