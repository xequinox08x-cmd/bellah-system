import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, Instagram, Facebook, X, Eye } from 'lucide-react';
import { useStore, ContentItem, ContentStatus } from '../data/store';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router';
import { toast } from 'sonner@2.0.3';

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-600' },
  facebook: { label: 'Facebook', className: 'bg-blue-100 text-blue-600' },
  both: { label: 'IG + FB', className: 'bg-purple-100 text-purple-600' },
};

const STATUS_TABS: { key: ContentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

function ContentCard({
  item,
  onApprove,
  onReject,
  onView,
}: {
  item: ContentItem;
  onApprove: (id: string) => void;
  onReject: (item: ContentItem) => void;
  onView: (item: ContentItem) => void;
}) {
  const plat = PLATFORM_BADGE[item.platform];

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{item.title}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {item.productName && `${item.productName} · `}
            Submitted by <span className="text-[#6B7280]">{item.createdBy}</span>
            {' '}· {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${plat.className}`}>{plat.label}</span>
      </div>

      {/* Caption Preview */}
      <p className="text-xs text-[#374151] leading-relaxed line-clamp-3 bg-[#F9FAFB] p-3 rounded-lg">
        {item.caption}
      </p>
      <p className="text-xs text-blue-400 line-clamp-1">{item.hashtags}</p>

      {/* Rejection reason */}
      {item.rejectionReason && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs text-red-600" style={{ fontWeight: 500 }}>Rejection Reason:</p>
          <p className="text-xs text-red-500 mt-0.5">{item.rejectionReason}</p>
        </div>
      )}

      {/* Scheduled date */}
      {item.scheduledAt && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <Calendar className="w-3.5 h-3.5" />
          Scheduled: {new Date(item.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Engagement */}
      {item.engagement && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#6B7280]">❤ {item.engagement.likes}</span>
          <span className="text-xs text-[#6B7280]">💬 {item.engagement.comments}</span>
          <span className="text-xs text-[#6B7280]">↗ {item.engagement.shares}</span>
          <span className="text-xs text-[#6B7280]">👁 {item.engagement.reach.toLocaleString()}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onView(item)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        {item.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => onReject(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RejectModal({ item, onConfirm, onClose }: { item: ContentItem; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Reject Content</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]"><X className="w-4 h-4 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-[#F9FAFB] rounded-lg">
            <p className="text-xs text-[#374151]" style={{ fontWeight: 500 }}>{item.title}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">by {item.createdBy}</p>
          </div>
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this content is being rejected..."
              rows={4}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-all">Cancel</button>
            <button
              onClick={() => { if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; } onConfirm(reason); }}
              className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const plat = PLATFORM_BADGE[item.platform];
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Content Preview</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]"><X className="w-4 h-4 text-[#6B7280]" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{item.title}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${plat.className}`}>{plat.label}</span>
              {item.productName && <span className="text-[10px] text-[#9CA3AF]">{item.productName}</span>}
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#EC4899] to-[#D4A373] rounded-full" />
              <div>
                <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>BellahBeatrix</p>
                <p className="text-[10px] text-[#9CA3AF]">{plat.label}</p>
              </div>
            </div>
            <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">{item.caption}</p>
            <p className="text-xs text-blue-500 mt-3">{item.hashtags}</p>
          </div>
          <div className="text-xs text-[#9CA3AF] space-y-1">
            <p>Created by: {item.createdBy} · {new Date(item.createdAt).toLocaleString()}</p>
            {item.approvedBy && <p>Reviewed by: {item.approvedBy}</p>}
            {item.scheduledAt && <p>Scheduled for: {new Date(item.scheduledAt).toLocaleString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentApproval() {
  const { user } = useAuth();
  const { contentItems, updateContentStatus } = useStore();
  const [activeTab, setActiveTab] = useState<ContentStatus | 'all'>('pending');
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null);
  const [viewItem, setViewItem] = useState<ContentItem | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const pendingCount = contentItems.filter(c => c.status === 'pending').length;

  const filtered = activeTab === 'all' ? contentItems : contentItems.filter(c => c.status === activeTab);

  const handleApprove = (id: string) => {
    updateContentStatus(id, 'approved', { approvedBy: user.name });
    toast.success('Content approved! It can now be scheduled.');
  };

  const handleReject = (reason: string) => {
    if (!rejectItem) return;
    updateContentStatus(rejectItem.id, 'rejected', { approvedBy: user.name, rejectionReason: reason });
    toast.success('Content rejected with feedback sent.');
    setRejectItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Content Approvals</h1>
          <p className="text-[#6B7280] text-sm">Review and approve marketing content before publishing</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700" style={{ fontWeight: 500 }}>{pendingCount} pending</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['pending', 'approved', 'rejected', 'scheduled', 'published'] as ContentStatus[]).map(status => {
          const count = contentItems.filter(c => c.status === status).length;
          const cfg: Record<string, { bg: string; text: string }> = {
            pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
            approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
            rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-500' },
            scheduled: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
            published: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
          };
          return (
            <div key={status} className={`rounded-xl border p-4 ${cfg[status].bg}`}>
              <p className={`text-2xl ${cfg[status].text}`} style={{ fontWeight: 700 }}>{count}</p>
              <p className="text-xs text-[#6B7280] capitalize mt-0.5">{status}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB] w-fit">
        {STATUS_TABS.map(tab => {
          const count = tab.key === 'all' ? contentItems.length : contentItems.filter(c => c.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-[#F3F4F6]' : 'bg-transparent'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
          <p className="text-[#9CA3AF] text-sm">No content in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={setRejectItem}
              onView={setViewItem}
            />
          ))}
        </div>
      )}

      {rejectItem && (
        <RejectModal item={rejectItem} onConfirm={handleReject} onClose={() => setRejectItem(null)} />
      )}
      {viewItem && (
        <ViewModal item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  );
}
