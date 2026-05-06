import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, X, Eye } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { ContentItem } from '../types/content';

// ─── Types ────────────────────────────────────────────────────────────────────

// All possible statuses a content item can have
type ContentStatus = 'draft' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'pending';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-600' },
  facebook: { label: 'Facebook', className: 'bg-blue-100 text-blue-600' },
  both: { label: 'IG + FB', className: 'bg-purple-100 text-purple-600' },
};

const STATUS_TABS: { key: ContentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'For Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_CARD_CONFIG: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-500' },
};

// ─── Content Card ─────────────────────────────────────────────────────────────
// This is the card shown for each content item in the grid

function ContentCard({
  item,
  onApprove,
  onReject,
  onView,
}: {
  item: ContentItem;
  onApprove: (id: number) => void;
  onReject: (item: ContentItem) => void;
  onView: (item: ContentItem) => void;
}) {
  const plat = PLATFORM_BADGE[item.platform] ?? { label: item.platform, className: 'bg-gray-100 text-gray-500' };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-3">

      {/* Header — title, date, platform badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>
            {item.title ?? 'Untitled'}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${plat.className}`}>
          {plat.label}
        </span>
      </div>

      {/* Content output preview */}
      {/* Note: field is "output" not "caption" — matches what the API returns */}
      <p className="text-xs text-[#374151] leading-relaxed line-clamp-3 bg-[#F9FAFB] p-3 rounded-lg">
        {item.output}
      </p>

      {/* Hashtags */}
      {item.hashtags && (
        <p className="text-xs text-blue-400 line-clamp-1">{item.hashtags}</p>
      )}

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
          ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
            item.status === 'rejected' ? 'bg-red-50 text-red-500' :
              'bg-gray-50 text-gray-500'}`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {/* View button — always visible */}
        <button
          onClick={() => onView(item)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>

        {/* Approve and Reject buttons — only shown for drafts */}
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

// ─── Reject Modal ─────────────────────────────────────────────────────────────
// Popup that asks the admin for a rejection reason before confirming

function RejectModal({
  item,
  onConfirm,
  onClose,
}: {
  item: ContentItem;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Reject Content</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-[#F9FAFB] rounded-lg">
            <p className="text-xs text-[#374151]" style={{ fontWeight: 500 }}>{item.title ?? 'Untitled'}</p>
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
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
                onConfirm(reason);
              }}
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

// ─── View Modal ───────────────────────────────────────────────────────────────
// Popup that shows the full content preview

function ViewModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const plat = PLATFORM_BADGE[item.platform] ?? { label: item.platform, className: 'bg-gray-100 text-gray-500' };
  const previewImageUrl = item.generatedImageUrl || item.referenceImageUrl || null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Content Preview</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{item.title ?? 'Untitled'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${plat.className}`}>{plat.label}</span>
            </div>
          </div>

          {/* Social media style preview */}
          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#EC4899] to-[#D4A373] rounded-full" />
              <div>
                <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>BellahBeatrix</p>
                <p className="text-[10px] text-[#9CA3AF]">{plat.label}</p>
              </div>
            </div>
            <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">{item.output}</p>
            {item.hashtags && (
              <p className="text-xs text-blue-500 mt-3">{item.hashtags}</p>
            )}
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt={item.title ?? 'Generated content preview'}
                className="w-full rounded-xl border border-[#E5E7EB] object-cover mt-4"
              />
            )}
          </div>

          <div className="text-xs text-[#9CA3AF] space-y-1">
            <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
            <p>Status: <span className="capitalize">{item.status}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContentApproval() {
  const { user } = useAuth();

  // ── State ───────────────────────────────────────────────────────────────────
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentStatus | 'all'>('pending');
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null);
  const [viewItem, setViewItem] = useState<ContentItem | null>(null);

  // ── Redirect non-admins ─────────────────────────────────────────────────────
  // Staff should never see this page
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  // ── Fetch content from real API ─────────────────────────────────────────────
  // Before: came from useStore() — in memory only, lost on refresh
  // Now: fetched from GET /api/ai-content on page load and after every action
  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getContent();
      if (res.error) throw new Error(res.error);
      setContentItems(res.data);
    } catch {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContent(); }, []);

  // ── Approve ─────────────────────────────────────────────────────────────────
  // Calls PATCH /api/ai-content/:id/status with status = 'approved'
  const handleApprove = async (id: number) => {
    try {
      const res = await api.updateContentStatus(id, 'approved');
      if (res.error) throw new Error(res.error);
      toast.success('Content approved!');
      loadContent(); // reload list so the status updates immediately
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to approve content');
    }
  };

  // ── Reject ──────────────────────────────────────────────────────────────────
  // Calls PATCH /api/ai-content/:id/status with status = 'rejected'
  // The rejection reason is shown in the modal but not yet saved to DB
  // (you can add a rejectionReason column later if needed)
  const handleReject = async (reason: string) => {
    if (!rejectItem) return;
    try {
      const res = await api.updateContentStatus(rejectItem.id, 'rejected');
      if (res.error) throw new Error(res.error);
      toast.success('Content rejected.');
      setRejectItem(null);
      loadContent(); // reload list so the status updates immediately
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to reject content');
    }
  };

  // ── Filter by active tab ────────────────────────────────────────────────────
  const filtered = activeTab === 'all'
    ? contentItems
    : contentItems.filter(c => c.status === activeTab);

  // Count per status for the summary cards and tab badges
  const counts = {
    pending: contentItems.filter(c => c.status === 'pending').length,
    approved: contentItems.filter(c => c.status === 'approved').length,
    rejected: contentItems.filter(c => c.status === 'rejected').length,
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Content Approvals</h1>
          <p className="text-[#6B7280] text-sm">Review and approve marketing content before publishing</p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700" style={{ fontWeight: 500 }}>
              {counts.pending} item{counts.pending > 1 ? 's' : ''} to review
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards — shows count per status */}
      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'approved', 'rejected'] as ContentStatus[]).map(status => (
          <div key={status} className={`rounded-xl border p-4 ${STATUS_CARD_CONFIG[status].bg}`}>
            <p className={`text-2xl ${STATUS_CARD_CONFIG[status].text}`} style={{ fontWeight: 700 }}>
              {counts[status as keyof typeof counts] ?? 0}
            </p>
            <p className="text-xs text-[#6B7280] capitalize mt-0.5">{status}</p>
          </div>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB] w-fit">
        {STATUS_TABS.map(tab => {
          const count = tab.key === 'all'
            ? contentItems.length
            : contentItems.filter(c => c.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5
                ${activeTab === tab.key
                  ? 'bg-white text-[#111827] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
                }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full
                ${activeTab === tab.key ? 'bg-[#F3F4F6]' : 'bg-transparent'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
          <p className="text-[#9CA3AF] text-sm">Loading content...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={loadContent}
            className="mt-2 text-xs text-red-400 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
          <p className="text-[#9CA3AF] text-sm">No content in this category</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && filtered.length > 0 && (
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

      {/* Modals */}
      {rejectItem && (
        <RejectModal
          item={rejectItem}
          onConfirm={handleReject}
          onClose={() => setRejectItem(null)}
        />
      )}
      {viewItem && (
        <ViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}
    </div>
  );
}
