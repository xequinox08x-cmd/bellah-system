import { useState } from 'react';
import { Sparkles, Send, Edit3, RefreshCw, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useStore, ContentItem } from '../data/store';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner@2.0.3';

type Tone = 'fun' | 'professional' | 'romantic' | 'urgent';
type ContentType = 'caption' | 'promotion' | 'product_highlight' | 'story';
type Platform = 'instagram' | 'facebook' | 'both';

function generateCaption(productName: string, price: number, tone: Tone, type: ContentType, platform: Platform): { caption: string; hashtags: string } {
  const emojis: Record<Tone, string[]> = {
    fun: ['✨', '🎉', '💕', '🛍️', '🌸', '💅'],
    professional: ['•', '—'],
    romantic: ['💕', '🌹', '✨', '💫', '🤍'],
    urgent: ['⚡', '🔥', '❗', '🚨', '⏰'],
  };

  const e = emojis[tone];
  const templates: Record<ContentType, Record<Tone, string>> = {
    caption: {
      fun: `${e[0]} Meet your new fave! ${productName} is here and we CANNOT stop talking about it! ${e[2]} Grab yours before it's gone — only ₱${price.toFixed(2)}! Shop now! ${e[3]}`,
      professional: `Introducing ${productName}. Expertly formulated to deliver visible results from day one. Priced at ₱${price.toFixed(2)}, it's your next essential beauty investment.`,
      romantic: `${e[0]} Fall in love with ${productName}. ${e[1]} Crafted for those who believe beauty is self-love in action. Yours for just ₱${price.toFixed(2)}. ${e[2]}`,
      urgent: `${e[0]} LAST CHANCE! ${productName} is selling out FAST! ${e[2]} Get yours NOW for ₱${price.toFixed(2)} before it's gone! DM us or shop in-store today!`,
    },
    promotion: {
      fun: `${e[0]} SALE ALERT! ${e[1]} ${productName} is now available and we're celebrating with an exclusive launch offer! Don't miss out — only ₱${price.toFixed(2)}. Tag a friend who needs this! ${e[2]}`,
      professional: `Special Announcement: ${productName} is now available at ₱${price.toFixed(2)}. For a limited time, enjoy complimentary consultation with every purchase. Visit us in-store or message us to order.`,
      romantic: `${e[0]} We created ${productName} with love — for you. ${e[3]} This month only, treat yourself to something truly special at ₱${price.toFixed(2)}. Because you deserve it. ${e[1]}`,
      urgent: `${e[0]} LIMITED TIME OFFER! ${productName} — ONLY ₱${price.toFixed(2)}! ${e[2]} This price won't last! Order NOW — DM us or visit our store today! ${e[3]}`,
    },
    product_highlight: {
      fun: `Did you know ${productName} is our BESTSELLER?! ${e[0]} ${e[2]} Our customers are OBSESSED and honestly we understand why. Shop now for just ₱${price.toFixed(2)} and see the difference yourself!`,
      professional: `Product Spotlight: ${productName}\n\n✓ Dermatologist tested\n✓ Suitable for all skin types\n✓ Visible results in 2 weeks\n\nAvailable now at ₱${price.toFixed(2)}.`,
      romantic: `${e[2]} ${productName} — because your skin deserves the very best. ${e[0]} Formulated with care, designed for results. A little luxury at just ₱${price.toFixed(2)}.`,
      urgent: `${e[0]} SPOTLIGHT: ${productName} is going VIRAL and stocks are running low! ${e[2]} Only ₱${price.toFixed(2)} — grab yours before it sells out! ${e[3]}`,
    },
    story: {
      fun: `POV: You just discovered ${productName} and your skincare game will never be the same again ${e[0]} ${e[2]} Available now for ₱${price.toFixed(2)}! Swipe up to shop! ${e[1]}`,
      professional: `Today we're sharing the story behind ${productName}. Developed after months of research, this product was designed to solve real beauty challenges. Available at ₱${price.toFixed(2)}.`,
      romantic: `${e[2]} Some things are worth the wait. We've been working on ${productName} for months, perfecting every detail — just for you. Now it's finally here at ₱${price.toFixed(2)}. ${e[0]}`,
      urgent: `${e[0]} Storytime: I almost missed out on ${productName} and I would NOT have forgiven myself! ${e[2]} Don't make my mistake — grab it NOW for ₱${price.toFixed(2)}! Link in bio!`,
    },
  };

  const platformTags: Record<Platform, string> = {
    instagram: '#BellahBeatrix #BeautyGram #SkincareRoutine #GlowUp #MakeupLover #BeautyTips',
    facebook: '#BellahBeatrix #BeautyShop #PhilippineBeauty #LocalBrand #SkincarePH',
    both: '#BellahBeatrix #BeautyGram #GlowUp #SkincareRoutine #PhilippineBeauty #LocalBrand',
  };

  const productTag = `#${productName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`;

  return {
    caption: templates[type][tone],
    hashtags: `${productTag} ${platformTags[platform]}`,
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  pending: { label: 'Pending Review', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
  approved: { label: 'Approved', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rejected: { label: 'Rejected', icon: XCircle, bg: 'bg-red-50', text: 'text-red-500' },
  scheduled: { label: 'Scheduled', icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600' },
  published: { label: 'Published', icon: CheckCircle, bg: 'bg-purple-50', text: 'text-purple-600' },
  draft: { label: 'Draft', icon: Edit3, bg: 'bg-gray-50', text: 'text-gray-500' },
};

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-600',
  facebook: 'bg-blue-100 text-blue-600',
  both: 'bg-purple-100 text-purple-600',
};

export default function AIMarketing() {
  const { products, contentItems, addContent } = useStore();
  const { user } = useAuth();

  const [productId, setProductId] = useState('');
  const [tone, setTone] = useState<Tone>('fun');
  const [type, setType] = useState<ContentType>('caption');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [generated, setGenerated] = useState<{ caption: string; hashtags: string } | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);

  // Show only current user's content (or all for admin)
  const myContent = user?.role === 'admin'
    ? contentItems
    : contentItems.filter(c => c.createdBy === user?.name);

  const handleGenerate = () => {
    if (!productId) { toast.error('Please select a product first'); return; }
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateCaption(selectedProduct!.name, selectedProduct!.price, tone, type, platform);
      setGenerated(result);
      setEditCaption(result.caption);
      setEditHashtags(result.hashtags);
      setTitle(`${selectedProduct!.name} — ${type.replace('_', ' ')} (${tone})`);
      setIsGenerating(false);
    }, 1200);
  };

  const handleSubmit = () => {
    if (!generated) { toast.error('Generate content first'); return; }
    if (!title.trim()) { toast.error('Please enter a title'); return; }

    addContent({
      title,
      caption: editCaption,
      hashtags: editHashtags,
      platform,
      status: 'pending',
      createdBy: user?.name || 'Staff',
      createdByRole: user?.role || 'staff',
      productId,
      productName: selectedProduct?.name,
    });

    toast.success('Content submitted for approval!');
    setGenerated(null);
    setProductId('');
    setTitle('');
    setEditCaption('');
    setEditHashtags('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>AI Marketing</h1>
        <p className="text-[#6B7280] text-sm">Generate compelling marketing content powered by AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Generator Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#EC4899] to-[#D4A373] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Content Generator</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Product</label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
                >
                  <option value="">Select a product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Content Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['caption', 'promotion', 'product_highlight', 'story'] as ContentType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2 px-3 rounded-lg text-xs transition-all capitalize ${type === t ? 'bg-[#EC4899] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Tone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fun', 'professional', 'romantic', 'urgent'] as Tone[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`py-2 px-3 rounded-lg text-xs transition-all capitalize ${tone === t ? 'bg-[#D4A373] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Platform</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['instagram', 'facebook', 'both'] as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-2 rounded-lg text-xs transition-all capitalize ${platform === p ? 'bg-[#111827] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !productId}
                className="w-full py-2.5 bg-gradient-to-r from-[#EC4899] to-[#D4A373] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Content</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-3 space-y-4">
          {generated ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Generated Content</h3>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111827] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Post Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Caption</label>
                <textarea
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Hashtags</label>
                <input
                  value={editHashtags}
                  onChange={e => setEditHashtags(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all font-mono"
                />
              </div>

              {/* Preview Card */}
              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#EC4899] to-[#D4A373] rounded-full" />
                  <div>
                    <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>BellahBeatrix</p>
                    <p className="text-[10px] text-[#9CA3AF]">{platform === 'both' ? 'Instagram & Facebook' : platform}</p>
                  </div>
                </div>
                <p className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed">{editCaption}</p>
                <p className="text-xs text-blue-500 mt-2">{editHashtags}</p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-2.5 bg-[#EC4899] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-[#DB2777] transition-all"
              >
                <Send className="w-4 h-4" /> Submit for Approval
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-[#FCE7F3] rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-[#EC4899]" />
              </div>
              <p className="text-[#111827] text-sm" style={{ fontWeight: 500 }}>No content generated yet</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Select a product and click Generate Content</p>
            </div>
          )}
        </div>
      </div>

      {/* Content History */}
      <div className="bg-white rounded-xl border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>
            {user?.role === 'admin' ? 'All Content' : 'My Content'}
          </h3>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {myContent.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF] text-sm">No content yet</div>
          ) : (
            myContent.map(item => {
              const cfg = STATUS_CONFIG[item.status];
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{item.title}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {item.productName && `${item.productName} · `}
                          {new Date(item.createdAt).toLocaleDateString()} · by {item.createdBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PLATFORM_BADGE[item.platform]}`}>
                          {item.platform}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2 line-clamp-2">{item.caption}</p>
                    {item.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1.5 italic">Reason: {item.rejectionReason}</p>
                    )}
                    {item.engagement && (
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: '❤', value: item.engagement.likes },
                          { label: '💬', value: item.engagement.comments },
                          { label: '↗', value: item.engagement.shares },
                          { label: '👁', value: item.engagement.reach },
                        ].map(e => (
                          <span key={e.label} className="text-xs text-[#6B7280]">{e.label} {e.value}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
