import { useState, useEffect } from 'react';
import { Plus, X, Trash2, PaperclipIcon, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Campaign, CampaignContent } from '../types/campaign';
import { ContentItem } from '../types/content';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600'       },
  planned:   { label: 'Planned',   className: 'bg-blue-100 text-blue-600'       },
  active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-600' },
  completed: { label: 'Completed', className: 'bg-purple-100 text-purple-600'   },
};

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-600'     },
  facebook:  { label: 'Facebook',  className: 'bg-blue-100 text-blue-600'     },
  both:      { label: 'IG + FB',   className: 'bg-purple-100 text-purple-600' },
};

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function CampaignModal({
  campaign,
  onSave,
  onClose,
}: {
  campaign: Campaign | null; // null = create mode, Campaign = edit mode
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName]               = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [status, setStatus]           = useState(campaign?.status ?? 'planned');
  const [startDate, setStartDate]     = useState(campaign?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate]         = useState(campaign?.endDate?.slice(0, 10) ?? '');
  const [saving, setSaving]           = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Campaign name is required'); return; }
    setSaving(true);
    try {
      if (campaign) {
        // Edit mode — call PUT
        await api.updateCampaign(campaign.id, { name, description, status, startDate, endDate });
        toast.success('Campaign updated!');
      } else {
        // Create mode — call POST
        await api.createCampaign({ name, description, startDate, endDate });
        toast.success('Campaign created!');
      }
      onSave();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>
            {campaign ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Sale 2026"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this campaign about?"
              rows={3}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
            />
          </div>

          {/* Status — only shown in edit mode */}
          {campaign && (
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm hover:bg-[#DB2777] disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : campaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attach Content Modal ─────────────────────────────────────────────────────
// Shows a list of approved content items the user can attach to a campaign

function AttachContentModal({
  campaign,
  onClose,
  onAttach,
}: {
  campaign: Campaign;
  onClose: () => void;
  onAttach: () => void;
}) {
  const [approvedContent, setApprovedContent] = useState<ContentItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [attaching, setAttaching]             = useState<number | null>(null);

  // Load approved content that is not already attached
  useEffect(() => {
    const load = async () => {
      const res = await api.getContent('approved');
      if (!res.error) {
        // Filter out content already attached to this campaign
        const attachedIds = new Set(campaign.content?.map(c => c.id) ?? []);
        setApprovedContent(res.data.filter((c: ContentItem) => !attachedIds.has(c.id)));
      }
      setLoading(false);
    };
    load();
  }, [campaign]);

  const handleAttach = async (contentId: number) => {
    setAttaching(contentId);
    try {
      await api.attachContent(campaign.id, contentId);
      toast.success('Content attached!');
      onAttach();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to attach content');
    } finally {
      setAttaching(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>Attach Content</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-3">
          {loading && <p className="text-sm text-[#9CA3AF] text-center">Loading approved content...</p>}
          {!loading && approvedContent.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-[#9CA3AF]">No approved content available</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Go to Content Approvals and approve some content first</p>
            </div>
          )}
          {approvedContent.map(item => {
            const plat = PLATFORM_BADGE[item.platform] ?? { label: item.platform, className: 'bg-gray-100 text-gray-500' };
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{item.title ?? 'Untitled'}</p>
                  <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-0.5">{item.output}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${plat.className}`}>{plat.label}</span>
                </div>
                <button
                  onClick={() => handleAttach(item.id)}
                  disabled={attaching === item.id}
                  className="px-3 py-1.5 bg-[#EC4899] text-white rounded-lg text-xs hover:bg-[#DB2777] disabled:opacity-50 transition-all shrink-0"
                >
                  {attaching === item.id ? '...' : 'Attach'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onView,
}: {
  campaign: Campaign;
  onEdit:   (c: Campaign) => void;
  onDelete: (id: number) => void;
  onView:   (c: Campaign) => void;
}) {
  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#111827]" style={{ fontWeight: 600 }}>{campaign.name}</p>
          {campaign.description && (
            <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-2">{campaign.description}</p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${sc.className}`}>{sc.label}</span>
      </div>

      {/* Date range */}
      {(campaign.startDate || campaign.endDate) && (
        <p className="text-xs text-[#6B7280]">
          {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          {' → '}
          {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </p>
      )}

      {/* Content count */}
      <p className="text-xs text-[#6B7280]">
        {campaign.content?.length ?? 0} content item{(campaign.content?.length ?? 0) !== 1 ? 's' : ''} attached
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onView(campaign)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" /> View
        </button>
        <button
          onClick={() => onEdit(campaign)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(campaign.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-all ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Campaign Detail View ──────────────────────────────────────────────────────
// Shows a single campaign with its attached content

function CampaignDetail({
  campaign,
  onBack,
  onRefresh,
}: {
  campaign: Campaign;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [detail, setDetail]           = useState<Campaign | null>(null);
  const [loading, setLoading]         = useState(true);
  const [attachModal, setAttachModal] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    const res = await api.getCampaign(campaign.id);
    if (!res.error) setDetail(res.data);
    setLoading(false);
  };

  useEffect(() => { loadDetail(); }, [campaign.id]);

  const handleDetach = async (contentId: number) => {
    try {
      await api.detachContent(campaign.id, contentId);
      toast.success('Content detached');
      loadDetail();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to detach content');
    }
  };

  const sc = STATUS_CONFIG[detail?.status ?? campaign.status] ?? STATUS_CONFIG.draft;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] transition-all"
      >
        ← Back to Campaigns
      </button>

      {/* Campaign header */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg text-[#111827]" style={{ fontWeight: 700 }}>
              {detail?.name ?? campaign.name}
            </h2>
            {detail?.description && (
              <p className="text-sm text-[#6B7280] mt-1">{detail.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[10px] px-2 py-1 rounded-full ${sc.className}`}>{sc.label}</span>
              {detail?.startDate && (
                <span className="text-xs text-[#9CA3AF]">
                  {new Date(detail.startDate).toLocaleDateString()} → {detail.endDate ? new Date(detail.endDate).toLocaleDateString() : '—'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setAttachModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#EC4899] text-white rounded-lg text-xs hover:bg-[#DB2777] transition-all"
          >
            <PaperclipIcon className="w-3.5 h-3.5" /> Attach Content
          </button>
        </div>
      </div>

      {/* Attached content */}
      <div>
        <h3 className="text-sm text-[#111827] mb-3" style={{ fontWeight: 600 }}>
          Attached Content ({detail?.content?.length ?? 0})
        </h3>

        {loading && <p className="text-sm text-[#9CA3AF]">Loading...</p>}

        {!loading && (detail?.content?.length ?? 0) === 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <p className="text-sm text-[#9CA3AF]">No content attached yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Click Attach Content to add approved content</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detail?.content?.map((item: CampaignContent) => {
            const plat = PLATFORM_BADGE[item.platform] ?? { label: item.platform, className: 'bg-gray-100 text-gray-500' };
            return (
              <div key={item.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[#111827]" style={{ fontWeight: 500 }}>{item.title ?? 'Untitled'}</p>
                  <button
                    onClick={() => handleDetach(item.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-400 transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#374151] line-clamp-2 bg-[#F9FAFB] p-2 rounded-lg">{item.output}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block ${plat.className}`}>{plat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {attachModal && detail && (
        <AttachContentModal
          campaign={detail}
          onClose={() => setAttachModal(false)}
          onAttach={() => { setAttachModal(false); loadDetail(); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [createModal, setCreateModal]   = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCampaigns();
      if (res.error) throw new Error(res.error);
      setCampaigns(res.data);
    } catch {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api.deleteCampaign(id);
      toast.success('Campaign deleted');
      loadCampaigns();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete campaign');
    }
  };

  // Summary counts
  const counts = {
    total:     campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    planned:   campaigns.filter(c => c.status === 'planned').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  };

  // Show detail view if a campaign is selected
  if (viewCampaign) {
    return (
      <div className="max-w-7xl mx-auto">
        <CampaignDetail
          campaign={viewCampaign}
          onBack={() => setViewCampaign(null)}
          onRefresh={loadCampaigns}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Campaigns</h1>
          <p className="text-[#6B7280] text-sm">Manage your marketing campaigns</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#EC4899] text-white rounded-xl text-sm hover:bg-[#DB2777] transition-all"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: counts.total,     bg: 'bg-gray-50 border-gray-200',        text: 'text-gray-600'       },
          { label: 'Active',    value: counts.active,    bg: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-600'    },
          { label: 'Planned',   value: counts.planned,   bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-600'       },
          { label: 'Completed', value: counts.completed, bg: 'bg-purple-50 border-purple-200',    text: 'text-purple-600'     },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className={`text-2xl ${s.text}`} style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
          <p className="text-[#9CA3AF] text-sm">Loading campaigns...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={loadCampaigns} className="mt-2 text-xs text-red-400 underline">Try again</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && campaigns.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center">
          <p className="text-[#9CA3AF] text-sm">No campaigns yet</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Click New Campaign to create your first one</p>
        </div>
      )}

      {/* Campaign Grid */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={setEditCampaign}
              onDelete={handleDelete}
              onView={setViewCampaign}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <CampaignModal
          campaign={null}
          onSave={() => { setCreateModal(false); loadCampaigns(); }}
          onClose={() => setCreateModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editCampaign && (
        <CampaignModal
          campaign={editCampaign}
          onSave={() => { setEditCampaign(null); loadCampaigns(); }}
          onClose={() => setEditCampaign(null)}
        />
      )}
    </div>
  );
}