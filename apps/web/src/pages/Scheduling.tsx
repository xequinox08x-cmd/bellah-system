import { useState } from 'react';
import { Calendar, Clock, X, CheckCircle, Send } from 'lucide-react';
import { useStore, ContentItem } from '../data/store';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner@2.0.3';

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-600' },
  facebook: { label: 'Facebook', className: 'bg-blue-100 text-blue-600' },
  both: { label: 'IG + FB', className: 'bg-purple-100 text-purple-600' },
};

function ScheduleModal({ item, onSchedule, onClose }: { item: ContentItem; onSchedule: (date: string) => void; onClose: () => void }) {
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minStr = minDate.toISOString().slice(0, 16);

  const [datetime, setDatetime] = useState(minStr);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Schedule Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]"><X className="w-4 h-4 text-[#6B7280]" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#F9FAFB] rounded-lg">
            <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-2">{item.caption}</p>
          </div>
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Publish Date & Time</label>
            <input
              type="datetime-local"
              value={datetime}
              min={minStr}
              onChange={e => setDatetime(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-all">Cancel</button>
            <button
              onClick={() => {
                if (!datetime) { toast.error('Please select a date and time'); return; }
                onSchedule(new Date(datetime).toISOString());
              }}
              className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm hover:bg-[#DB2777] transition-all"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ item, onSchedule, onPublish, isAdmin }: {
  item: ContentItem;
  onSchedule?: (item: ContentItem) => void;
  onPublish?: (id: string) => void;
  isAdmin: boolean;
}) {
  const plat = PLATFORM_BADGE[item.platform];

  const statusConfig: Record<string, { label: string; className: string }> = {
    approved: { label: 'Ready to Schedule', className: 'bg-emerald-100 text-emerald-700' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    published: { label: 'Published', className: 'bg-purple-100 text-purple-700' },
  };

  const sc = statusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-600' };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">by {item.createdBy}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${plat.className}`}>{plat.label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
        </div>
      </div>

      <p className="text-xs text-[#374151] line-clamp-2 bg-[#F9FAFB] p-2.5 rounded-lg">{item.caption}</p>

      {item.scheduledAt && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <Clock className="w-3.5 h-3.5" />
          {new Date(item.scheduledAt).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}

      {item.publishedAt && (
        <div className="flex items-center gap-1.5 text-xs text-purple-600">
          <CheckCircle className="w-3.5 h-3.5" />
          Published {new Date(item.publishedAt).toLocaleDateString()}
        </div>
      )}

      {item.engagement && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7280]">❤ {item.engagement.likes}</span>
          <span className="text-xs text-[#6B7280]">💬 {item.engagement.comments}</span>
          <span className="text-xs text-[#6B7280]">↗ {item.engagement.shares}</span>
          <span className="text-xs text-[#6B7280]">👁 {item.engagement.reach.toLocaleString()}</span>
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2 pt-1">
          {item.status === 'approved' && onSchedule && (
            <button
              onClick={() => onSchedule(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EC4899] text-white rounded-lg text-xs hover:bg-[#DB2777] transition-all"
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </button>
          )}
          {item.status === 'scheduled' && onPublish && (
            <button
              onClick={() => onPublish(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Mark Published
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Scheduling() {
  const { contentItems, updateContentStatus } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [scheduleItem, setScheduleItem] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduled' | 'published'>('queue');

  const approvedContent = contentItems.filter(c => c.status === 'approved');
  const scheduledContent = contentItems.filter(c => c.status === 'scheduled');
  const publishedContent = contentItems.filter(c => c.status === 'published');

  const handleSchedule = (date: string) => {
    if (!scheduleItem) return;
    updateContentStatus(scheduleItem.id, 'scheduled', { scheduledAt: date });
    toast.success(`Post scheduled for ${new Date(date).toLocaleDateString()}`);
    setScheduleItem(null);
  };

  const handlePublish = (id: string) => {
    updateContentStatus(id, 'published', { publishedAt: new Date().toISOString() });
    toast.success('Post marked as published!');
  };

  const tabs: { key: typeof activeTab; label: string; count: number }[] = [
    { key: 'queue', label: 'Ready to Schedule', count: approvedContent.length },
    { key: 'scheduled', label: 'Scheduled', count: scheduledContent.length },
    { key: 'published', label: 'Published', count: publishedContent.length },
  ];

  const displayContent = activeTab === 'queue' ? approvedContent : activeTab === 'scheduled' ? scheduledContent : publishedContent;

  // Upcoming scheduled posts sorted by date
  const upcoming = scheduledContent
    .filter(c => c.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Post Scheduling</h1>
        <p className="text-[#6B7280] text-sm">Manage and schedule your approved content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ready to Schedule', value: approvedContent.length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Scheduled', value: scheduledContent.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Published', value: publishedContent.length, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className={`text-2xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB] w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${activeTab === tab.key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {displayContent.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
              <Calendar className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[#9CA3AF] text-sm">No content in this category</p>
              {activeTab === 'queue' && (
                <p className="text-xs text-[#9CA3AF] mt-1">Approve content from the Approvals page to schedule it</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayContent.map(item => (
                <PostCard
                  key={item.id}
                  item={item}
                  onSchedule={isAdmin ? setScheduleItem : undefined}
                  onPublish={isAdmin ? handlePublish : undefined}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Calendar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-sm text-[#111827] mb-4" style={{ fontWeight: 600 }}>Upcoming Posts</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">No scheduled posts</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(item => {
                  const plat = PLATFORM_BADGE[item.platform];
                  const date = new Date(item.scheduledAt!);
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#F9FAFB] rounded-lg flex flex-col items-center justify-center shrink-0 border border-[#E5E7EB]">
                        <span className="text-[10px] text-[#9CA3AF] leading-none">
                          {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-sm text-[#111827]" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 500 }}>{item.title}</p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${plat.className}`}>{plat.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-[#FCE7F3] to-[#FEF3C7] rounded-xl border border-[#F9E0E7] p-5">
            <h4 className="text-sm text-[#111827] mb-2" style={{ fontWeight: 600 }}>📅 Best Times to Post</h4>
            <div className="space-y-2">
              {[
                { day: 'Weekdays', time: '9–11 AM', platform: 'Instagram' },
                { day: 'Weekdays', time: '12–1 PM', platform: 'Facebook' },
                { day: 'Weekends', time: '7–9 PM', platform: 'Both' },
              ].map(t => (
                <div key={t.platform} className="text-xs text-[#6B7280]">
                  <span className="text-[#111827]" style={{ fontWeight: 500 }}>{t.platform}:</span> {t.day} {t.time}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {scheduleItem && (
        <ScheduleModal item={scheduleItem} onSchedule={handleSchedule} onClose={() => setScheduleItem(null)} />
      )}
    </div>
  );
}