import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search, ShoppingCart, TrendingUp, ChevronDown,
  Plus, Minus, AlertTriangle, CheckCircle, X, User,
  Tag, Receipt, Calendar,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner@2.0.3';

import { getProducts, ProductDTO } from "../api/products";
import { createSale, getSales, SalesRecordDTO } from "../api/sales";

// ─── Helpers ────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

type UIProduct = Omit<ProductDTO, "price" | "cost"> & { price: number; cost: number };
const toUIProduct = (p: ProductDTO): UIProduct => ({
  ...p,
  price: Number(p.price),
  cost: Number(p.cost),
});

// ─── Searchable Product Combobox ──────────────────────────────────────────────
function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: UIProduct[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value != null ? products.find(p => p.id === value) ?? null : null;

  const filtered = useMemo(() =>
    products.filter(p =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
    ),
    [products, query]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  const stockColor = (p: UIProduct) => {
    const pct = p.stock / p.lowStockThreshold;
    if (pct <= 0.6) return 'text-red-500';
    if (pct <= 1) return 'text-amber-500';
    return 'text-emerald-600';
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-lg text-sm text-left transition-all bg-white focus:outline-none ${
          open
            ? 'border-[#EC4899] ring-2 ring-[#EC4899]/15'
            : 'border-[#E5E7EB] hover:border-[#F9A8C0]'
        }`}
      >
        {selected ? (
          <span className="text-[#111827]" style={{ fontWeight: 500 }}>{selected.name}</span>
        ) : (
          <span className="text-[#9CA3AF]">Search products by name, category, or SKU…</span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-[#F3F4F6] transition-colors"
            >
              <X className="w-3 h-3 text-[#9CA3AF]" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#F3F4F6]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#F9A8C0]"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] text-center py-5">No products found</p>
            ) : filtered.map(p => {
              const isLow = p.stock <= p.lowStockThreshold;
              const isCritical = p.stock <= Math.floor(p.lowStockThreshold * 0.6);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[#FDF2F8] text-left transition-colors ${
                    value === p.id ? 'bg-[#FCE7F3]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[#111827] truncate" style={{ fontWeight: value === p.id ? 600 : 400 }}>
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">{p.category} · {p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>₱{p.price.toFixed(2)}</p>
                    <p className={`text-[10px] ${stockColor(p)}`}>
                      {isCritical ? '⚠ ' : isLow ? '↓ ' : ''}{p.stock} left
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Qty Stepper ──────────────────────────────────────────────────────────────
function QtyStepper({
  value, min, max, onChange,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(Math.max(v, min), max));
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        className="w-9 h-9 flex items-center justify-center border border-[#E5E7EB] rounded-l-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3.5 h-3.5 text-[#6B7280]" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => set(parseInt(e.target.value) || min)}
        className="w-16 h-9 border-y border-[#E5E7EB] text-center text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white tabular-nums"
        style={{ fontWeight: 600 }}
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        className="w-9 h-9 flex items-center justify-center border border-[#E5E7EB] rounded-r-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-[#6B7280]" />
      </button>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs text-[#374151]" style={{ fontWeight: 500 }}>{children}</label>
      {hint && <span className="text-[10px] text-[#9CA3AF]">{hint}</span>}
    </div>
  );
}

// ─── Sales Page ───────────────────────────────────────────────────────────────
export default function Sales() {
  const { user } = useAuth();

  // DB products
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // DB-backed sales records
  const [sales, setSales] = useState<SalesRecordDTO[]>([]);

  // Form state
  const [productId, setProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState<'%' | '₱'>('%');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Table state
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await getProducts();
      setProducts(data.map(toUIProduct));
    } catch (e: any) {
      toast.error(e.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load sales records");
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadSales();
  }, [loadProducts, loadSales]);

  const selectedProduct = productId != null ? products.find(p => p.id === productId) ?? null : null;
  const maxQty = selectedProduct?.stock ?? 1;

  const { subtotal, discountAmount, total, profit } = useMemo(() => {
    if (!selectedProduct) return { subtotal: 0, discountAmount: 0, total: 0, profit: 0 };
    const sub = selectedProduct.price * quantity;
    const disc =
      discountValue === '' || discountValue <= 0
        ? 0
        : discountType === '%'
        ? Math.min(sub * (discountValue / 100), sub)
        : Math.min(Number(discountValue), sub);
    const tot = sub - disc;
    const pft = (selectedProduct.price - selectedProduct.cost) * quantity - disc;

    return {
      subtotal: parseFloat(sub.toFixed(2)),
      discountAmount: parseFloat(disc.toFixed(2)),
      total: parseFloat(tot.toFixed(2)),
      profit: parseFloat(pft.toFixed(2)),
    };
  }, [selectedProduct, quantity, discountType, discountValue]);

  const isSelectedLow = selectedProduct && selectedProduct.stock <= selectedProduct.lowStockThreshold;
  const isSelectedCritical = selectedProduct && selectedProduct.stock <= Math.floor(selectedProduct.lowStockThreshold * 0.6);
  const stockAfter = selectedProduct ? selectedProduct.stock - quantity : 0;
  const willBeLow = selectedProduct && stockAfter <= selectedProduct.lowStockThreshold;

  const resetForm = useCallback(() => {
    setProductId(null);
    setQuantity(1);
    setCustomerName('');
    setDiscountValue('');
    setDiscountType('%');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (productId == null) { toast.error('Please select a product'); return; }
    if (quantity < 1) { toast.error('Quantity must be at least 1'); return; }
    if (!selectedProduct) { toast.error('Selected product not found'); return; }
    if (quantity > selectedProduct.stock) { toast.error('Insufficient stock'); return; }

    try {
      setSubmitting(true);

      // IMPORTANT: send DB productId (number)
      await createSale({
      customerName: customerName.trim() || "Walk-in Customer",

      // display name (optional)
      staffName: user?.name || "Staff",

      // THIS is the important fix
      createdByClerkId: user?.id,
      staffEmail: user?.email,

      discountType: discountType === "%" ? "%" : "PHP",
      discountValue: discountValue === '' ? 0 : Number(discountValue),

      items: [
        {
        productId: selectedProduct.id,
        qty: quantity,
        unitPrice: selectedProduct.price
        }
      ]
    });
      toast.success(`Sale recorded — ${selectedProduct.name} ×${quantity}`);

      // refresh products and sales records from DB
      await loadProducts();
      await loadSales();

      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  const sortedByStock = useMemo(
    () => [...products].sort((a, b) => (a.stock / a.lowStockThreshold) - (b.stock / b.lowStockThreshold)),
    [products]
  );

  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  const kpis = useMemo(() => {
    const todaySales = sales.filter(s => s.date === TODAY);
    const monthSales = sales.filter(s => s.date >= TODAY.slice(0, 8) + "01");
    return {
      todayCount: todaySales.length,
      todayRevenue: todaySales.reduce((s, x) => s + x.total, 0),
      monthRevenue: monthSales.reduce((s, x) => s + x.total, 0),
      monthProfit: monthSales.reduce((s, x) => s + x.profit, 0),
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        s.productName.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.staffName.toLowerCase().includes(q);

      const matchDate = !selectedDate || s.date === selectedDate;

      return matchSearch && matchDate;
    });
  }, [sales, search, selectedDate]);

  const INPUT_CLS =
    'w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#C5C5C5] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white transition-all';

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Sales Recording</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Log a new transaction and auto-update inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280]">
            <ShoppingCart className="w-3.5 h-3.5 text-[#EC4899]" />
            <span style={{ fontWeight: 600 }}>{kpis.todayCount}</span> sales today
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280]">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span style={{ fontWeight: 600 }}>₱{kpis.todayRevenue.toFixed(2)}</span> today
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span style={{ fontWeight: 600 }}>{lowStockCount}</span> low stock
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FCE7F3] flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#EC4899]" />
            </div>
            <div>
              <h2 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Record New Sale</h2>
              <p className="text-[#9CA3AF] text-xs">Stock will update automatically on submit</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <FieldLabel hint="Required">Product</FieldLabel>
              <ProductCombobox
                products={products}
                value={productId}
                onChange={id => { setProductId(id); setQuantity(1); }}
              />
              {loadingProducts && (
                <p className="text-[10px] text-[#9CA3AF] mt-1">Loading products…</p>
              )}
            </div>

            {selectedProduct && (
              <div className={`rounded-xl border p-4 ${
                isSelectedCritical
                  ? 'bg-red-50 border-red-200'
                  : isSelectedLow
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-[#F8FFFE] border-emerald-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-[#374151]" style={{ fontWeight: 600 }}>
                      {selectedProduct.name}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">
                      {selectedProduct.category} · {selectedProduct.sku}
                    </p>
                  </div>
                  {isSelectedLow ? (
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                      isSelectedCritical
                        ? 'bg-red-100 text-red-600 border-red-200'
                        : 'bg-amber-100 text-amber-600 border-amber-200'
                    }`}>
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {isSelectedCritical ? 'Critical stock' : 'Low stock'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
                      <CheckCircle className="w-2.5 h-2.5" /> In stock
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">Unit Price</p>
                    <p className="text-sm text-[#111827]" style={{ fontWeight: 700 }}>
                      ₱{selectedProduct.price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">Available</p>
                    <p className={`text-sm ${isSelectedCritical ? 'text-red-500' : isSelectedLow ? 'text-amber-500' : 'text-[#111827]'}`} style={{ fontWeight: 700 }}>
                      {selectedProduct.stock} units
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">After sale</p>
                    <p className={`text-sm ${willBeLow ? 'text-amber-500' : 'text-[#111827]'}`} style={{ fontWeight: 700 }}>
                      {stockAfter} units
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel hint={selectedProduct ? `max ${maxQty}` : undefined}>Quantity</FieldLabel>
                <QtyStepper value={quantity} min={1} max={maxQty} onChange={setQuantity} />
              </div>
              <div>
                <FieldLabel hint="Optional">Customer Name</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className={INPUT_CLS + ' pl-9'}
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel hint="Optional">Discount</FieldLabel>
              <div className="flex gap-0">
                <div className="flex border border-[#E5E7EB] rounded-l-lg overflow-hidden shrink-0">
                  {(['%', '₱'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setDiscountType(type); setDiscountValue(''); }}
                      className={`w-10 h-9 text-xs transition-all ${
                        discountType === type
                          ? 'bg-[#EC4899] text-white'
                          : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                  <input
                    type="number"
                    min={0}
                    max={discountType === '%' ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={discountType === '%' ? 'e.g. 10' : 'e.g. 50.00'}
                    className="w-full h-9 pl-8 pr-3 border border-l-0 border-[#E5E7EB] rounded-r-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white transition-all placeholder-[#C5C5C5]"
                  />
                </div>
              </div>
              {discountAmount > 0 && (
                <p className="text-[10px] text-[#EC4899] mt-1">
                  − ₱{discountAmount.toFixed(2)} discount applied
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-[#E5E7EB]" />

            <div className="rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#F3F4F6]">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Order Summary</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs text-[#6B7280]">
                  <span>Unit Price</span>
                  <span>{selectedProduct ? `₱${selectedProduct.price.toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between text-xs text-[#6B7280]">
                  <span>Quantity</span>
                  <span>× {quantity}</span>
                </div>
                <div className="flex justify-between text-xs text-[#6B7280]">
                  <span>Subtotal</span>
                  <span>{selectedProduct ? `₱${subtotal.toFixed(2)}` : '—'}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-[#EC4899]">
                    <span>Discount</span>
                    <span>− ₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between">
                  <span className="text-sm text-[#111827]" style={{ fontWeight: 700 }}>Total</span>
                  <span className="text-lg text-[#111827]" style={{ fontWeight: 800 }}>
                    {selectedProduct ? `₱${total.toFixed(2)}` : '₱0.00'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={productId == null || submitting}
              className="w-full py-3 rounded-xl text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: productId == null || submitting
                  ? '#D1D5DB'
                  : 'linear-gradient(135deg, #F9A8C0 0%, #EC4899 100%)',
                boxShadow: productId == null || submitting ? 'none' : '0 4px 14px rgba(236,72,153,0.3)',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Recording…' : '✓ Record Sale'}
            </button>

            {(productId != null || customerName || discountValue !== '') && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full py-2 rounded-lg text-xs text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
              >
                Clear form
              </button>
            )}
          </form>
        </div>

        {/* Stock Remaining Panel (kept) */}
        <div className="lg:col-span-2 space-y-4">
          {lowStockCount > 0 && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-700" style={{ fontWeight: 600 }}>
                  {lowStockCount} product{lowStockCount > 1 ? 's are' : ' is'} running low
                </p>
                <p className="text-[10px] text-red-500 mt-0.5">
                  Consider placing a reorder before accepting more sales.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Stock Remaining</h3>
                <p className="text-[#9CA3AF] text-xs">All products · sorted by urgency</p>
              </div>
            </div>
            <div className="px-5 py-2 divide-y divide-[#F9FAFB]">
              {sortedByStock.map(p => (
                <div key={p.id} className="py-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#374151]" style={{ fontWeight: 500 }}>{p.name}</span>
                    <span className="text-[#9CA3AF]">{p.stock}</span>
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((p.stock / (p.lowStockThreshold * 3)) * 100, 100)}%`,
                        backgroundColor: p.stock <= Math.floor(p.lowStockThreshold * 0.6)
                          ? '#EF4444'
                          : p.stock <= p.lowStockThreshold
                          ? '#F59E0B'
                          : '#10B981',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Sales Records Table (still works locally for now) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#EC4899]" />
            <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Sales Record</h3>
          </div>
          <div className="flex-1" />

          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product, customer…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#F9A8C0] focus:ring-1 focus:ring-[#EC4899]/15 bg-white"
            />
          </div>

          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white text-[#374151] focus:outline-none focus:border-[#F9A8C0] cursor-pointer"
            />
          </div>

          <span className="text-xs text-[#9CA3AF] shrink-0">
            {filteredSales.length} record{filteredSales.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                {['Date', 'Product', 'Customer', 'Qty', 'Unit Price', 'Discount', 'Total', 'Profit', 'Staff'].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider ${
                      ['Qty', 'Unit Price', 'Discount', 'Total', 'Profit'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-xs text-[#9CA3AF]">
                    No sales records match your filters
                  </td>
                </tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#9CA3AF] whitespace-nowrap">{sale.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[#111827] whitespace-nowrap" style={{ fontWeight: 500 }}>
                      {sale.productName}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">{sale.category}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{sale.customerName}</td>
                  <td className="px-4 py-3 text-xs text-right text-[#374151]">×{sale.quantity}</td>
                  <td className="px-4 py-3 text-xs text-right text-[#6B7280]">₱{sale.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-right text-[#6B7280] whitespace-nowrap">
                    {sale.discountAmount > 0 ? `- PHP ${sale.discountAmount.toFixed(2)}` : 'No discount'}
                  </td>
                  <td className="px-4 py-3 text-xs text-right text-[#111827] whitespace-nowrap" style={{ fontWeight: 700 }}>
                    ₱{sale.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right text-emerald-600 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    +₱{sale.profit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{sale.staffName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}




