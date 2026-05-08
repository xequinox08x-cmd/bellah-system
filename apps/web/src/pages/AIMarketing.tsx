import { useEffect, useRef, useState, type ChangeEvent, type ElementType } from 'react';
import { Sparkles, Send, Edit3, RefreshCw, Clock, CheckCircle, XCircle, Calendar, ChevronDown, ImagePlus, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useAuth } from '../components/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { toast } from 'sonner';
import { api } from '../lib/api';

type Tone = 'fun' | 'professional' | 'romantic' | 'urgent';
type ContentType = 'caption' | 'promotion' | 'product_highlight' | 'story';
type OutputMode = 'text' | 'image' | 'text_image';
type GenerationProvider = 'openai' | 'gemini' | 'fallback' | 'none';

type GenerationProviders = {
  text: GenerationProvider;
  image: GenerationProvider;
  usedReferenceImage: boolean;
};

type MarketingProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
};

type FeedContentItem = {
  id: number;
  title: string;
  content: string;
  product_name: string | null;
  platform: string;
  status: 'approved' | 'scheduled' | 'published' | 'pending';
  created_at: string;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_by_name: string;
};

type GeneratedContent = {
  id: number;
  title: string;
  caption: string;
  hashtags: string;
  generatedImageUrl: string | null;
  referenceImageUrl: string | null;
  outputMode: OutputMode;
  providers: GenerationProviders;
  status: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: ElementType; bg: string; text: string }> = {
  pending: { label: 'Pending Review', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
  approved: { label: 'Approved', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rejected: { label: 'Rejected', icon: XCircle, bg: 'bg-red-50', text: 'text-red-500' },
  scheduled: { label: 'Scheduled', icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600' },
  published: { label: 'Published', icon: CheckCircle, bg: 'bg-purple-50', text: 'text-purple-600' },
  draft: { label: 'Draft', icon: Edit3, bg: 'bg-gray-50', text: 'text-gray-500' },
};

const FACEBOOK_BADGE_CLASS = 'bg-blue-100 text-blue-600';

const OUTPUT_MODE_LABEL: Record<OutputMode, string> = {
  text: 'Text Only',
  image: 'Image Only',
  text_image: 'Text + Image',
};

const FACEBOOK_PLATFORM = 'facebook';

function formatOptionLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function formatProviderLabel(value: GenerationProvider) {
  switch (value) {
    case 'openai':
      return 'OpenAI';
    case 'gemini':
      return 'Gemini';
    case 'fallback':
      return 'Fallback';
    default:
      return 'None';
  }
}

function getProviderBadgeClass(value: GenerationProvider) {
  switch (value) {
    case 'openai':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'gemini':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'fallback':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.03 1.792-4.706 4.533-4.706 1.313 0 2.686.236 2.686.236v2.973h-1.514c-1.49 0-1.956.93-1.956 1.884v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073Z"
      />
      <path
        fill="#FFFFFF"
        d="M16.671 15.563l.532-3.49h-3.329V9.811c0-.954.467-1.884 1.957-1.884h1.513V4.954s-1.373-.236-2.686-.236c-2.741 0-4.533 1.676-4.533 4.706v2.649H7.078v3.49h3.047V24a12.09 12.09 0 0 0 3.749 0v-8.437h2.797Z"
      />
    </svg>
  );
}

export default function AIMarketing() {
  const { contentItems, addContent } = useStore();
  const { user } = useAuth();

  const [products, setProducts] = useState<MarketingProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [tone, setTone] = useState<Tone>('fun');
  const [type, setType] = useState<ContentType>('caption');
  const [outputMode, setOutputMode] = useState<OutputMode>('text');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [referenceImageName, setReferenceImageName] = useState('');
  const [referenceImagePreviewUrl, setReferenceImagePreviewUrl] = useState('');
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedContentId, setGeneratedContentId] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<FeedContentItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const res = await api.getProducts();
        if (cancelled) return;

        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setProducts(
          rows.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name),
            category: String(item.category ?? ''),
            price: Number(item.price ?? 0),
            description: item.description ? String(item.description) : '',
          }))
        );
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error('Failed to load products');
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFeed = async () => {
      setFeedLoading(true);
      setFeedError('');
      try {
        const res = await api.getAiContentFeed();
        if (cancelled) return;
        setFeedItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setFeedError(err instanceof Error ? err.message : 'Failed to load content');
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    };

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === productId);
  const platform = FACEBOOK_PLATFORM;
  const myContent = user?.role === 'admin'
    ? contentItems
    : contentItems.filter((c) => c.createdBy === user?.name);
  const sectionItems = user?.role === 'admin' ? feedItems : myContent;
  const advancedSummary = [
    formatOptionLabel(type),
    tone,
    platform,
    OUTPUT_MODE_LABEL[outputMode],
  ].join(' · ');

  const generatedProviders = generated?.providers ?? {
    text: 'none' as GenerationProvider,
    image: 'none' as GenerationProvider,
    usedReferenceImage: false,
  };
  const usedFallback = generatedProviders.text === 'fallback' || generatedProviders.image === 'fallback';

  const clearReferenceImage = () => {
    setReferenceImageName('');
    setReferenceImagePreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReferenceImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('Failed to read selected image');
        return;
      }

      setReferenceImageName(file.name);
      setReferenceImagePreviewUrl(reader.result);
    };
    reader.onerror = () => {
      toast.error('Failed to read selected image');
    };
    reader.readAsDataURL(file);
  };

  const selectedTl: { name: string; department: string } | null = null;

  const handleGenerate = async () => {
    if (!productId) {
      toast.error('Please select a product first');
      return;
    }
    if (!promptText.trim()) {
      toast.error('Please enter prompt / instructions first');
      return;
    }

    setIsGenerating(true);
    try {
      const tlContext = selectedTl ? `\n[TL: ${selectedTl.name} – ${selectedTl.department}]` : '';
      const response = await api.generateMarketingContent({
        productId: Number(productId),
        promptText: promptText.trim(),
        contentType: type,
        tone,
        platform,
        outputMode,
        referenceImageUrl: referenceImagePreviewUrl || undefined,
      });

      setGeneratedContentId(response.data.id);
      setGenerated(response.data as GeneratedContent);
      setEditCaption(response.data.caption);
      setEditHashtags(response.data.hashtags);
      setTitle(response.data.title);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!generated) {
      toast.error('Generate content first');
      return;
    }
    if (generatedContentId == null) {
      toast.error('Generated content is missing an id');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createContent({
        id: generatedContentId,
        title,
        prompt: promptText.trim(),
        output: editCaption,
        platform,
        hashtags: editHashtags,
      });
      console.log('API response:', res);

      addContent({
        title,
        caption: editCaption,
        hashtags: editHashtags,
        platform,
        status: 'pending',
        createdBy: user?.name || 'Staff',
        createdByRole: user?.role || 'staff',
        productId: selectedProduct ? String(selectedProduct.id) : undefined,
        productName: selectedProduct?.name,
      });

      try {
        const feed = await api.getAiContentFeed();
        setFeedItems(Array.isArray(feed.data) ? feed.data : []);
      } catch { }

      window.dispatchEvent(new Event('ai-content-updated'));
      toast.success('Content submitted for approval!');
      setGeneratedContentId(null);
      setGenerated(null);
      setProductId('');
      setPromptText('');
      setTitle('');
      setEditCaption('');
      setEditHashtags('');
      clearReferenceImage();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>AI Marketing</h1>
        <p className="text-[#6B7280] text-sm">Generate compelling Facebook marketing content powered by AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo size={32} className="rounded-lg" />
              <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Facebook Content Generator</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={productsLoading}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
                >
                  <option value="">{productsLoading ? 'Loading products...' : 'Select a product...'}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-[#374151]" style={{ fontWeight: 500 }}>Prompt / Instructions</label>
                  <span className="text-[10px] text-[#9CA3AF]">Primary input</span>
                </div>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={5}
                  placeholder="Tell the AI what kind of caption or poster you want. Include audience, tone, visual style, colors, layout, offer, or message."
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Platform</label>
                <div className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                  <span className="inline-flex items-center gap-2.5 text-[#111827]">
                    <FacebookIcon className="h-[18px] w-[18px] shrink-0" />
                    <span className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>Facebook</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Output Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['text', 'image', 'text_image'] as OutputMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOutputMode(mode)}
                      className={`py-2 px-2 rounded-lg text-xs transition-all ${outputMode === mode ? 'bg-[#111827] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    >
                      {OUTPUT_MODE_LABEL[mode]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-[#374151]" style={{ fontWeight: 500 }}>Product Reference Image</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-[#EC4899] hover:text-[#DB2777] transition-all"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {referenceImagePreviewUrl ? 'Replace image' : 'Upload image'}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageChange}
                  className="hidden"
                />

                {referenceImagePreviewUrl ? (
                  <div className="rounded-xl border border-[#E5E7EB] p-3 space-y-3 bg-[#FCFCFD]">
                    <img
                      src={referenceImagePreviewUrl}
                      alt={referenceImageName || 'Reference preview'}
                      className="w-full h-48 object-cover rounded-lg border border-[#E5E7EB]"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#111827] truncate" style={{ fontWeight: 500 }}>{referenceImageName}</p>
                        <p className="text-[10px] text-[#9CA3AF]">Ready to use as a poster reference later</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearReferenceImage}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
                    <p className="text-xs text-[#6B7280]">Upload a real product image to prepare for future poster generation.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-[#FAFAFB] hover:bg-[#F9FAFB] transition-all"
                >
                  <div className="text-left">
                    <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>Advanced Settings</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-1">{[formatOptionLabel(type), tone].join(' / ')}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>

                {showAdvancedSettings && (
                  <div className="space-y-4 p-4 border-t border-[#E5E7EB]">
                    <div>
                      <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Content Type</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['caption', 'promotion', 'product_highlight', 'story'] as ContentType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`py-2 px-3 rounded-lg text-xs transition-all capitalize ${type === t ? 'bg-[#EC4899] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                          >
                            {formatOptionLabel(t)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Tone</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['fun', 'professional', 'romantic', 'urgent'] as Tone[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTone(t)}
                            className={`py-2 px-3 rounded-lg text-xs transition-all capitalize ${tone === t ? 'bg-[#D4A373] text-white' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !productId || productsLoading}
                className="w-full py-2.5 bg-[#EC4899] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-[#DB2777] border border-[#EC4899] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Facebook Content</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {generated ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Generated Facebook Content</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-[#9CA3AF]">{OUTPUT_MODE_LABEL[generated.outputMode]}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !productId || productsLoading}
                  className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" /> Generate Facebook Content</>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Post Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
                />
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>Generate Source</p>
                  </div>
                  {usedFallback && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                      Fallback Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                    <p className="text-[10px] text-[#9CA3AF]">Text AI</p>
                    <span className={`inline-flex mt-1 items-center rounded-full border px-2 py-0.5 text-[10px] ${getProviderBadgeClass(generatedProviders.text)}`}>
                      {formatProviderLabel(generatedProviders.text)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                    <p className="text-[10px] text-[#9CA3AF]">Image AI</p>
                    <span className={`inline-flex mt-1 items-center rounded-full border px-2 py-0.5 text-[10px] ${getProviderBadgeClass(generatedProviders.image)}`}>
                      {formatProviderLabel(generatedProviders.image)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                    <p className="text-[10px] text-[#9CA3AF]">Reference Image</p>
                    <span className={`inline-flex mt-1 items-center rounded-full border px-2 py-0.5 text-[10px] ${generatedProviders.usedReferenceImage ? 'bg-secondary text-primary border-border' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {generatedProviders.usedReferenceImage ? 'Used' : 'Not Used'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Caption</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-[#374151] mb-1.5" style={{ fontWeight: 500 }}>Hashtags</label>
                <input
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-[#374151]" style={{ fontWeight: 500 }}>Generated Poster Preview</label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F9FAFB] text-[#6B7280]">
                    {OUTPUT_MODE_LABEL[generated.outputMode]}
                  </span>
                </div>
                {generated.generatedImageUrl ? (
                  <img
                    src={generated.generatedImageUrl}
                    alt={`${title || 'Generated'} poster preview`}
                    className="w-full rounded-xl border border-[#E5E7EB] object-cover"
                  />
                ) : (
                  <div className="aspect-[4/5] w-full rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center text-center px-6">
                    <p className="text-sm text-[#9CA3AF]">Generated poster preview will appear here</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-3">
                  <BrandLogo size={32} className="rounded-full" />
                  <div>
                    <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>BellahBeatrix</p>
                    <p className="text-[10px] text-[#9CA3AF]">Facebook Post Preview</p>
                  </div>
                </div>
                <p className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed">{editCaption}</p>
                <p className="text-xs text-blue-500 mt-2">{editHashtags}</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#EC4899] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-[#DB2777] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit for Approval</>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-[#FCE7F3] rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-[#EC4899]" />
              </div>
              <p className="text-[#111827] text-sm" style={{ fontWeight: 500 }}>No content generated yet</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Add a prompt, optionally upload a product image, and click Generate Facebook Content</p>
              <div className="mt-6 w-full max-w-sm aspect-[4/5] rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center px-6">
                <p className="text-sm text-[#9CA3AF]">Generated poster preview will appear here</p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !productId || productsLoading}
                className="mt-6 w-full max-w-sm py-2.5 bg-gradient-to-r from-[#EC4899] to-[#D4A373] text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Facebook Content</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB]">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>
            {user?.role === 'admin' ? 'All Content' : 'My Content'}
          </h3>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {user?.role === 'admin' && feedLoading ? (
            <div className="py-12 text-center text-[#9CA3AF] text-sm">Loading content...</div>
          ) : user?.role === 'admin' && feedError ? (
            <div className="py-12 text-center text-red-500 text-sm">{feedError}</div>
          ) : sectionItems.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF] text-sm">No content yet</div>
          ) : (
            sectionItems.map((item) => {
              const isFeedItem = 'content' in item;
              const statusKey = item.status in STATUS_CONFIG ? item.status : 'pending';
              const cfg = STATUS_CONFIG[statusKey];
              const Icon = cfg.icon;
              const productName = isFeedItem ? item.product_name : item.productName;
              const createdAt = isFeedItem ? item.created_at : item.createdAt;
              const createdBy = isFeedItem ? item.created_by_name : item.createdBy;
              const caption = isFeedItem ? item.content : item.caption;

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
                          {productName && `${productName} · `}
                          {new Date(createdAt).toLocaleDateString()} · by {createdBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${FACEBOOK_BADGE_CLASS}`}>
                          Facebook
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2 line-clamp-2">{caption}</p>
                    {!isFeedItem && item.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1.5 italic">Reason: {item.rejectionReason}</p>
                    )}
                    {!isFeedItem && item.engagement && (
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: 'Like', value: item.engagement.likes },
                          { label: 'Comments', value: item.engagement.comments },
                          { label: 'Shares', value: item.engagement.shares },
                          { label: 'Reach', value: item.engagement.reach },
                        ].map((entry) => (
                          <span key={entry.label} className="text-xs text-[#6B7280]">{entry.label} {entry.value}</span>
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
