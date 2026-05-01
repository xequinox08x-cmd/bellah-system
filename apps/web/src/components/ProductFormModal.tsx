import { useState } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ProductCategory = 'Skincare' | 'Makeup' | 'Fragrance' | 'Haircare' | 'Miscellaneous';
const CATEGORIES: ProductCategory[] = ['Skincare', 'Makeup', 'Fragrance', 'Haircare', 'Miscellaneous'];

interface Product {
  id: number; sku: string; name: string; category: ProductCategory;
  price: number; cost: number; stock: number; lowStockThreshold: number; description: string;
  imageUrl?: string;
}

interface Props {
  initial?: Product | null;
  onSave: (data: Omit<Product, 'id'>) => void;
  onClose: () => void;
  saving: boolean;
  token: string;
}

const emptyForm = {
  name: '', category: 'Skincare' as ProductCategory,
  price: '', cost: '', stock: '', lowStockThreshold: '20',
  sku: '', description: '', isActive: true,
};
type FKey = keyof typeof emptyForm;
type FErr = Partial<Record<FKey, string>>;

const I = 'w-full px-4 py-3 border rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#ec4899]/20 focus:border-[#ec4899] transition-all placeholder-[#C5C5C5]';
const IE = 'border-red-400 bg-red-50/40';
const IO = 'border-[#E5E7EB]';

function Section({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-widest uppercase whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#F3F4F6]" />
    </div>
  );
}

function Lbl({ text, req, hint }: { text: string; req?: boolean; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
      {text}{req && <span className="text-[#ec4899] ml-0.5">*</span>}
      {hint && <span className="ml-1.5 text-[10px] font-normal text-[#B0B7C3]">{hint}</span>}
    </label>
  );
}

export default function ProductFormModal({ initial, onSave, onClose, saving, token }: Props) {
  const [form, setForm] = useState(
    initial
      ? {
        name: initial.name, category: initial.category,
        price: String(initial.price), cost: String(initial.cost),
        stock: String(initial.stock), lowStockThreshold: String(initial.lowStockThreshold),
        sku: initial.sku, description: initial.description, isActive: true,
      }
      : { ...emptyForm }
  );
  const [errors, setErrors] = useState<FErr>({});
  const [imgPreview, setImgPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (k: FKey, v: any) => setForm(p => ({ ...p, [k]: v }));

  const validate = (k: FKey) => {
    const v = String(form[k]).trim();
    let m = '';
    if (k === 'name' && !v) m = 'Product name is required';
    if (k === 'sku' && !v) m = 'SKU is required';
    if (k === 'price' && (!v || Number(v) < 0)) m = 'Enter a valid price';
    if (k === 'cost' && (!v || Number(v) < 0)) m = 'Enter a valid cost';
    if (k === 'stock' && (!v || Number(v) < 0)) m = 'Enter stock quantity';
    setErrors(p => ({ ...p, [k]: m }));
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImgPreview(URL.createObjectURL(f));
      setImgFile(f);
    }
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imgFile) return initial?.imageUrl ?? undefined;
    const ext = imgFile.name.split('.').pop() || 'jpg';
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, imgFile, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    const req: FKey[] = ['name', 'sku', 'price', 'cost', 'stock'];
    const ne: FErr = {};
    let bad = false;
    req.forEach(k => {
      if (!String(form[k]).trim()) { ne[k] = 'Required'; bad = true; }
    });
    if (bad) { setErrors(ne); return; }

    try {
      setUploading(true);
      const imageUrl = await uploadImage();
      onSave({
        name: form.name.trim(), category: form.category,
        price: parseFloat(form.price), cost: parseFloat(form.cost),
        stock: parseInt(form.stock), lowStockThreshold: parseInt(form.lowStockThreshold) || 20,
        sku: form.sku.trim(), description: form.description.trim(),
        imageUrl,
      });
    } catch (err: any) {
      setErrors({ name: err.message });
    } finally {
      setUploading(false);
    }
  };

  const err = (k: FKey) => errors[k]
    ? <p className="text-[11px] text-red-400 mt-1.5 ml-0.5">{errors[k]}</p>
    : null;

  const margin = form.price && form.cost
    ? parseFloat(form.price) - parseFloat(form.cost)
    : null;
  const marginPct = margin !== null && parseFloat(form.price) > 0
    ? ((margin / parseFloat(form.price)) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#F3F4F6] flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-[#111827] leading-tight">
              {initial ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-[#B0B7C3] mt-0.5">Bellah Beatrix · Inventory</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F9FAFB] text-[#C5C5C5] hover:text-[#374151] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-8 py-7 space-y-5">

          {/* BASIC INFO */}
          <Section label="Basic Info" />

          {/* Image Upload — horizontal strip, not a giant square */}
          <div
            className="w-full h-24 rounded-2xl border-2 border-dashed border-[#F0F0F0] bg-[#FAFAFA] flex items-center gap-4 px-5 cursor-pointer hover:border-[#ec4899] hover:bg-[#FFF5F9] transition-all overflow-hidden group"
            onClick={() => document.getElementById('prod-img-input')?.click()}
          >
            {imgPreview ? (
              <>
                <img src={imgPreview} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="preview" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[#374151]">Image selected</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setImgPreview(null); setImgFile(null); }}
                    className="text-xs text-red-400 hover:text-red-500 text-left"
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-[#FCE7F3] flex items-center justify-center flex-shrink-0 group-hover:bg-[#F9A8D4]/40 transition-colors">
                  <ImagePlus className="w-5 h-5 text-[#ec4899]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#374151]">Upload Product Image</p>
                  <p className="text-xs text-[#B0B7C3] mt-0.5">Click to browse · PNG, JPG, WEBP</p>
                </div>
              </>
            )}
            <input id="prod-img-input" type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          {/* Product Name */}
          <div>
            <Lbl text="Product Name" req />
            <input
              id="prod-name" type="text" value={form.name}
              placeholder="e.g. Glow Serum 30ml"
              onChange={e => set('name', e.target.value)}
              onBlur={() => validate('name')}
              className={`${I} ${errors.name ? IE : IO}`}
            />
            {err('name')}
          </div>

          {/* Category + SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Lbl text="Category" req />
              <select
                id="prod-cat" value={form.category}
                onChange={e => set('category', e.target.value as ProductCategory)}
                className={`${I} ${IO} cursor-pointer`}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Lbl text="SKU" req hint="e.g. BBX-0001" />
              <input
                id="prod-sku" type="text" value={form.sku}
                placeholder="BBX-0001"
                onChange={e => set('sku', e.target.value)}
                onBlur={() => validate('sku')}
                className={`${I} ${errors.sku ? IE : IO} font-mono`}
              />
              {err('sku')}
            </div>
          </div>

          {/* PRICING */}
          <Section label="Pricing" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Lbl text="Selling Price" req />
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">₱</span>
                <input
                  id="prod-price" type="number" min="0" step="0.01"
                  value={form.price} placeholder="0.00"
                  onChange={e => set('price', e.target.value)}
                  onBlur={() => validate('price')}
                  className={`${I} pl-9 ${errors.price ? IE : IO}`}
                />
              </div>
              {err('price')}
            </div>
            <div>
              <Lbl text="Cost Price" req />
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">₱</span>
                <input
                  id="prod-cost" type="number" min="0" step="0.01"
                  value={form.cost} placeholder="0.00"
                  onChange={e => set('cost', e.target.value)}
                  onBlur={() => validate('cost')}
                  className={`${I} pl-9 ${errors.cost ? IE : IO}`}
                />
              </div>
              {err('cost')}
            </div>
          </div>

          {/* Margin pill */}
          {margin !== null && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${margin >= 0 ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-red-50 border border-red-100 text-red-500'}`}>
              <span>{margin >= 0 ? '▲' : '▼'}</span>
              <span>Margin ₱{margin.toFixed(2)} ({marginPct}%)</span>
            </div>
          )}

          {/* STOCK */}
          <Section label="Stock" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Lbl text="Stock Quantity" req />
              <input
                id="prod-stock" type="number" min="0"
                value={form.stock} placeholder="0"
                onChange={e => set('stock', e.target.value)}
                onBlur={() => validate('stock')}
                className={`${I} ${errors.stock ? IE : IO}`}
              />
              {err('stock')}
            </div>
            <div>
              <Lbl text="Low Stock Threshold" hint="default 20" />
              <input
                id="prod-threshold" type="number" min="0"
                value={form.lowStockThreshold} placeholder="20"
                onChange={e => set('lowStockThreshold', e.target.value)}
                className={`${I} ${IO}`}
              />
            </div>
          </div>

          {/* ADDITIONAL */}
          <Section label="Additional" />

          <div>
            <Lbl text="Description" />
            <textarea
              id="prod-desc" value={form.description} rows={3}
              placeholder="Brief product description…"
              onChange={e => set('description', e.target.value)}
              className={`${I} ${IO} resize-none`}
            />
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-[#FAFAFA] border border-[#F0F0F0]">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200 ${form.isActive ? 'bg-emerald-400' : 'bg-[#D1D5DB]'}`} />
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {form.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-[11px] text-[#B0B7C3] mt-0.5">
                  {form.isActive ? 'Visible in sales & inventory' : 'Hidden from sales'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${form.isActive ? 'bg-[#ec4899]' : 'bg-[#D1D5DB]'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="h-1" />
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-5 border-t border-[#F3F4F6] flex gap-3 flex-shrink-0">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-3.5 border border-[#E5E7EB] rounded-xl text-sm font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSave} disabled={saving || uploading}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #F9A8C0, #ec4899)',
              boxShadow: '0 4px 14px rgba(236,72,153,0.3)',
            }}
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'Uploading…' : saving ? 'Saving…' : initial ? 'Save Changes' : '+ Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}