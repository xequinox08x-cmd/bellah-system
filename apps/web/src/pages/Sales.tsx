import React from "react";
import { offlineStore } from "../lib/offlineStore";
import { getSalesRecords, getSaleById } from "../lib/dashboardData";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, ShoppingCart, TrendingUp, ChevronDown,
  Plus, Minus, AlertTriangle, CheckCircle, X, User,
  Tag, Receipt, Calendar, DollarSign, BarChart2,
} from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  description?: string;
};

type RecentSaleLineItem = {
  id: string;
  saleId: number;
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  profit: number;
  date: string;
  createdAt: string;
  customerName: string;
  staffName: string;
};

type RecentSaleRow = {
  saleId: number;
  customerName: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
  itemSummary: string;
  revenue: number;
  searchText: string;
};

// ─── constants ────────────────────────────────────────────────────────────────
// ─── Searchable Product Combobox ──────────────────────────────────────────────
function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find(p => p.id === value) ?? null;

  const filtered = useMemo(() =>
    products.filter(p =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
    ),
    [products, query]
  );

  // close on click-outside
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

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  const stockColor = (p: Product) => {
    const pct = p.stock / p.lowStockThreshold;
    if (pct <= 0.6) return 'text-red-500';
    if (pct <= 1)   return 'text-amber-500';
    return 'text-emerald-600';
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
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
          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] text-center py-5">No products found</p>
            ) : filtered.map(p => {
              const isLow     = p.stock <= p.lowStockThreshold;
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

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSalesDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildRecentSaleRows(records: RecentSaleLineItem[]): RecentSaleRow[] {
  const grouped = new Map<number, RecentSaleRow>();

  records.forEach((record) => {
    const customerName = record.customerName?.trim() || 'Walk-in Customer';
    const createdAt = record.createdAt || record.date;
    const itemLabel = `${record.productName}${record.quantity > 1 ? ` ×${record.quantity}` : ''}`;
    const searchBits = [
      String(record.saleId),
      customerName,
      record.productName,
      record.category,
      itemLabel,
      String(record.quantity),
      String(record.total ?? 0),
    ]
      .join(' ')
      .toLowerCase();

    const existing = grouped.get(record.saleId);
    if (!existing) {
      grouped.set(record.saleId, {
        saleId: record.saleId,
        customerName,
        createdAt,
        items: [{ productName: record.productName, quantity: Number(record.quantity ?? 0) }],
        itemSummary: itemLabel,
        revenue: Number(record.total ?? 0),
        searchText: searchBits,
      });
      return;
    }

    existing.items.push({ productName: record.productName, quantity: Number(record.quantity ?? 0) });
    existing.itemSummary = existing.items
      .map((item) => `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`)
      .join(', ');
    existing.revenue += Number(record.total ?? 0);
    existing.searchText = [
      String(existing.saleId),
      existing.customerName,
      existing.itemSummary,
      ...existing.items.map((item) => item.productName),
      String(existing.revenue),
    ]
      .join(' ')
      .toLowerCase();

    if (createdAt && new Date(createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      existing.createdAt = createdAt;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.saleId - a.saleId;
  });
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

// ─── Stock Bar ────────────────────────────────────────────────────────────────
function StockBar({ product }: { product: Product }) {
  const pct      = Math.min((product.stock / (product.lowStockThreshold * 3)) * 100, 100);
  const isLow    = product.stock <= product.lowStockThreshold;
  const isCrit   = product.stock <= Math.floor(product.lowStockThreshold * 0.6);
  const barColor = isCrit ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#F9FAFB] last:border-0">
      {/* Status dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: barColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[#374151] truncate" style={{ fontWeight: 500 }}>
            {product.name}
          </p>
          <span className={`text-[10px] shrink-0 ml-2 tabular-nums ${isCrit ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#6B7280]'}`}>
            {product.stock} / {product.lowStockThreshold * 3}
          </span>
        </div>
        <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        {isLow && (
          <p className={`text-[10px] mt-0.5 ${isCrit ? 'text-red-500' : 'text-amber-500'}`}>
            {isCrit ? '⚠ Critical — reorder now' : '↓ Below reorder threshold'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────
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

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [recentSaleLines, setRecentSaleLines] = useState<RecentSaleLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setLoading(true);
      const rawProducts = offlineStore.getProducts();
      const normalizedProducts: Product[] = rawProducts.map((p) => ({
        id: String(p.id),
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        description: p.description ?? "",
      }));
      setProducts(normalizedProducts);
      setSales(offlineStore.getSalesWithItems());
      setRecentSaleLines(getSalesRecords() as RecentSaleLineItem[]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener('bellah-store-updated', handleUpdate);
    return () => window.removeEventListener('bellah-store-updated', handleUpdate);
  }, [load]);

  // ── Form state ─────────────────────────────────────────────────────────
  const [productId,      setProductId]      = useState('');
  const [quantity,       setQuantity]       = useState(1);
  const [customerName,   setCustomerName]   = useState('');
  const [discountType,   setDiscountType]   = useState<'%' | '₱'>('%');
  const [discountValue,  setDiscountValue]  = useState<number | ''>('');
  const [submitting,     setSubmitting]     = useState(false);
  const [modalSale,      setModalSale]      = useState<any>(null);

  // ── Table state ────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const todayIso = useMemo(() => formatDateInput(new Date()), []);
  const [salesViewMode, setSalesViewMode] = useState<'overall' | 'date'>('overall');
  const [selectedDate, setSelectedDate] = useState(todayIso);

  // ── Derived product data ───────────────────────────────────────────────
  const selectedProduct = products.find(p => p.id === productId) ?? null;
  const maxQty          = selectedProduct?.stock ?? 1;

  // ── Price calculations ─────────────────────────────────────────────────
  const { subtotal, discountAmount, total, profit } = useMemo(() => {
    if (!selectedProduct) return { subtotal: 0, discountAmount: 0, total: 0, profit: 0 };
    const sub = selectedProduct.price * quantity;
    const disc =
      discountValue === '' || discountValue <= 0
        ? 0
        : discountType === '%'
        ? Math.min(sub * (discountValue / 100), sub)
        : Math.min(Number(discountValue), sub);
    const tot  = sub - disc;
    const pft  = (selectedProduct.price - selectedProduct.cost) * quantity - disc;
    return {
      subtotal:       parseFloat(sub.toFixed(2)),
      discountAmount: parseFloat(disc.toFixed(2)),
      total:          parseFloat(tot.toFixed(2)),
      profit:         parseFloat(pft.toFixed(2)),
    };
  }, [selectedProduct, quantity, discountType, discountValue]);

  // ── Stock status for selected product ─────────────────────────────────
  const isSelectedLow      = selectedProduct && selectedProduct.stock <= selectedProduct.lowStockThreshold;
  const isSelectedCritical = selectedProduct && selectedProduct.stock <= Math.floor(selectedProduct.lowStockThreshold * 0.6);
  const stockAfter         = selectedProduct ? selectedProduct.stock - quantity : 0;
  const willBeLow          = selectedProduct && stockAfter <= selectedProduct.lowStockThreshold;

  // ── Reset form ─────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setProductId('');
    setQuantity(1);
    setCustomerName('');
    setDiscountValue('');
    setDiscountType('%');
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { toast.error("Please select a product"); return; }
    if (quantity < 1) { toast.error("Quantity must be at least 1"); return; }
    if (!selectedProduct) return;
    try {
      setSubmitting(true);
      if (!user) throw new Error('Not signed in');
      offlineStore.recordSale({
        customerName: customerName.trim() || undefined,
        discountType: discountType === '₱' ? 'PHP' : '%',
        discountValue: discountValue === '' ? 0 : Number(discountValue),
        staffUserId: Number(user.id),
        items: [{ productId: Number(productId), quantity }],
      });
      load();
      toast.success(`Sale recorded — ${selectedProduct.name} ×${quantity}`);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sorted stock list ─────────────────────────────────────────────────
  const sortedByStock = useMemo(
    () => [...products].sort((a, b) => {
      const aPct = a.stock / a.lowStockThreshold;
      const bPct = b.stock / b.lowStockThreshold;
      return aPct - bPct;
    }),
    [products]
  );

  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todaySales  = sales.filter(s => s.created_at && new Date(s.created_at) >= startOfToday);
    const monthSales  = sales.filter(s => s.created_at && new Date(s.created_at) >= startOfMonth);
    return {
      todayCount:   todaySales.length,
      todayRevenue: todaySales.reduce((acc, x) => acc + Number(x.total ?? 0), 0),
      monthRevenue: monthSales.reduce((acc, x) => acc + Number(x.total ?? 0), 0),
      monthProfit:  monthSales.reduce((acc, x) => acc + Number(x.profit ?? 0), 0),
    };
  }, [sales]);

  // ── 7-day chart data ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const revenue = sales
        .filter((s: any) => s.created_at?.startsWith(dateStr))
        .reduce((sum: number, s: any) => sum + Number(s.total ?? 0), 0);
      return { label, Revenue: parseFloat(revenue.toFixed(2)) };
    });
  }, [sales]);

  // ── Filtered recent sales ─────────────────────────────────────────────
  const isSelectedDateMode = salesViewMode === 'date';
  const recentSalesRows = useMemo(() => buildRecentSaleRows(recentSaleLines), [recentSaleLines]);
  const filteredSales = useMemo(() => {
    return recentSalesRows.filter((s) => {
      const q = search.trim().toLowerCase();

      const matchSearch =
        !q ||
        s.searchText.includes(q);

      const created = s.createdAt ? new Date(s.createdAt) : null;
      const saleDate = created ? formatDateInput(created) : '';
      const matchDate = isSelectedDateMode ? saleDate === selectedDate : true;

      return matchSearch && matchDate;
    });
  }, [recentSalesRows, search, isSelectedDateMode, selectedDate]);

  const INPUT_CLS = 'w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#C5C5C5] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15 focus:border-[#EC4899] bg-white transition-all';

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Point of Sale</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Record a transaction — inventory updates automatically</p>
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span style={{ fontWeight: 600 }}>{lowStockCount}</span> low stock
          </div>
        )}
      </div>

      {/* ── Main: Form + Stock Panel ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* ── Sale Form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          {/* Form header */}
          <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FCE7F3] flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#EC4899]" />
            </div>
            <div>
              <h2 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Record New Sale</h2>
              <p className="text-[#9CA3AF] text-xs">Stock will update automatically on submit</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitting) handleSubmit(e);
            }}
            className="p-6 space-y-5"
          >

            {/* Product */}
            <div>
              <FieldLabel hint="Required">Product</FieldLabel>
              <ProductCombobox
                products={products}
                value={productId}
                onChange={id => { setProductId(id); setQuantity(1); }}
              />
            </div>

            {/* Selected product info card */}
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

            {/* Row: Quantity + Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel hint={selectedProduct ? `max ${maxQty}` : undefined}>Quantity</FieldLabel>
                <QtyStepper
                  value={quantity}
                  min={1}
                  max={maxQty}
                  onChange={setQuantity}
                />
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

            {/* Discount */}
            <div>
              <FieldLabel hint="Optional">Discount</FieldLabel>
              <div className="flex gap-0">
                {/* Type toggle */}
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
                {/* Amount input */}
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

            {/* Divider */}
            <div className="border-t border-dashed border-[#E5E7EB]" />

            {/* Order Summary */}
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
                    <span>Discount ({discountType === '%' ? `${discountValue}%` : `₱${discountValue}`})</span>
                    <span>− ₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between">
                  <span className="text-sm text-[#111827]" style={{ fontWeight: 700 }}>Total</span>
                  <span
                    className="text-lg text-[#111827]"
                    style={{ fontWeight: 800, letterSpacing: '-0.01em' }}
                  >
                    {selectedProduct ? `₱${total.toFixed(2)}` : '₱0.00'}
                  </span>
                </div>
                {selectedProduct && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Profit</span>
                    <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                      {profit >= 0 ? '+' : ''}₱{profit.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* After-sale stock warning */}
            {selectedProduct && willBeLow && stockAfter > 0 && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  After this sale, <strong>{selectedProduct.name}</strong> will have{' '}
                  <strong>{stockAfter} units</strong> remaining — below the reorder threshold of {selectedProduct.lowStockThreshold}.
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!productId || submitting}
              className="w-full py-3 rounded-xl text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: !productId || submitting
                  ? '#D1D5DB'
                  : 'linear-gradient(135deg, #F9A8C0 0%, #EC4899 100%)',
                boxShadow: !productId || submitting ? 'none' : '0 4px 14px rgba(236,72,153,0.3)',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Recording…' : '✓ Record Sale'}
            </button>

            {/* Reset */}
            {(productId || customerName || discountValue !== '') && (
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

        {/* ── Stock Remaining Panel ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Low stock alert banner */}
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

          {/* Stock cards */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>Stock Remaining</h3>
                <p className="text-[#9CA3AF] text-xs">All products · sorted by urgency</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Low</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> OK</span>
              </div>
            </div>
            <div className="px-5 py-2 divide-y divide-[#F9FAFB] max-h-[420px] overflow-y-auto">
              {sortedByStock.map(p => (
                <StockBar key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Sales", value: loading ? '—' : String(kpis.todayCount), prefix: '', suffix: loading ? '' : ' txns', icon: ShoppingCart, bg: 'bg-pink-50', color: 'text-[#EC4899]' },
          { label: "Today's Revenue", value: loading ? '—' : kpis.todayRevenue.toFixed(2), prefix: loading ? '' : '₱', suffix: '', icon: DollarSign, bg: 'bg-yellow-50', color: 'text-yellow-600' },
          { label: 'Month Revenue', value: loading ? '—' : kpis.monthRevenue.toFixed(2), prefix: loading ? '' : '₱', suffix: '', icon: TrendingUp, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Month Profit', value: loading ? '—' : kpis.monthProfit.toFixed(2), prefix: loading ? '' : '₱', suffix: '', icon: BarChart2, bg: 'bg-purple-50', color: 'text-purple-600' },
        ].map(({ label, value, prefix, suffix, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`${color}`} style={{ width: 18, height: 18 }} />
            </div>
            <div className="min-w-0">
              <p className="text-base text-[#111827]" style={{ fontWeight: 700 }}>{prefix}{value}{suffix}</p>
              <p className="text-[10px] text-[#6B7280]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 7-Day Revenue Chart ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h3 className="text-[#111827] text-sm font-semibold mb-4">Revenue — Last 7 Days</h3>
        {chartData.every(d => d.Revenue === 0) ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-[#9CA3AF]">No sales data for the past 7 days</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `₱${v.toLocaleString()}`} />
              <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="Revenue" fill="#EC4899" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

{/* ── Recent Sales Table ─────────────────────────────────────────── */}
<div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
  {/* Table toolbar */}
  <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap gap-3 items-center">
    <div className="flex items-center gap-2">
      <ShoppingCart className="w-4 h-4 text-[#EC4899]" />
      <h3 className="text-[#111827] text-sm" style={{ fontWeight: 600 }}>
        Recent Sales
      </h3>
    </div>

    <div className="flex-1" />

    {/* Search */}
    <div className="relative w-52">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search product or customer..."
        className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#F9A8C0] focus:ring-1 focus:ring-[#EC4899]/15 bg-white"
      />
    </div>

    {/* Date filter */}
    <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white p-1">
      <button
        type="button"
        onClick={() => setSalesViewMode('overall')}
        className={`px-3 py-1.5 rounded-md text-xs transition-all ${
          salesViewMode === 'overall'
            ? 'bg-[#EC4899] text-white'
            : 'text-[#6B7280] hover:bg-[#F9FAFB]'
        }`}
        style={{ fontWeight: 600 }}
      >
        Overall
      </button>
      <button
        type="button"
        onClick={() => setSalesViewMode('date')}
        className={`px-3 py-1.5 rounded-md text-xs transition-all ${
          salesViewMode === 'date'
            ? 'bg-[#EC4899] text-white'
            : 'text-[#6B7280] hover:bg-[#F9FAFB]'
        }`}
        style={{ fontWeight: 600 }}
      >
        Selected Date
      </button>
    </div>

    {isSelectedDateMode && (
      <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#374151]">
        <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
        <input
          type="date"
          value={selectedDate}
          max={todayIso}
          onChange={(e) => setSelectedDate(e.target.value)}
          onInput={(e) => setSelectedDate(e.currentTarget.value)}
          className="bg-transparent text-xs text-[#111827] focus:outline-none"
        />
      </label>
    )}

    <span className="text-xs text-[#9CA3AF] shrink-0">
      {filteredSales.length} record{filteredSales.length !== 1 ? "s" : ""}
    </span>
  </div>


  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-[780px] table-fixed">
      <thead>
        <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
          <th className="w-[84px] px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider text-left whitespace-nowrap">ID</th>
          <th className="w-[180px] px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider text-left whitespace-nowrap">Name</th>
          <th className="w-[220px] px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider text-left whitespace-nowrap">Date &amp; Time</th>
          <th className="px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider text-left whitespace-nowrap">Items</th>
          <th className="w-[140px] px-4 py-2.5 text-[10px] text-[#9CA3AF] uppercase tracking-wider text-right whitespace-nowrap">Revenue</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[#F3F4F6]">
        {filteredSales.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-14 text-center text-xs text-[#9CA3AF]">
              No sales records match your filters
            </td>
          </tr>
        ) : (
          filteredSales.map((s) => {
            return (
              <tr
                key={s.saleId}
                onClick={() => {
                  try {
                    const details = getSaleById(s.saleId);
                    setModalSale({
                      id: s.saleId,
                      total: s.revenue,
                      customer_name: s.customerName,
                      created_at: s.createdAt,
                      items: details.items ?? [],
                    });
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to load sale details');
                  }
                }}
                className="hover:bg-[#FDF2F8] active:bg-[#FCE7F3] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-xs text-[#111827] whitespace-nowrap" style={{ fontWeight: 600 }}>#{s.saleId}</td>
                <td className="px-4 py-3 text-xs text-[#111827] whitespace-nowrap truncate" style={{ fontWeight: 500 }}>
                  {s.customerName}
                </td>
                <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{formatSalesDateTime(s.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-[#6B7280]">
                  {s.itemSummary
                    ? <span className="truncate block">{s.itemSummary}</span>
                    : <span className="text-[#C5C5C5] italic">Tap to view items</span>
                  }
                </td>
                <td className="px-4 py-3 text-xs text-right text-[#111827] whitespace-nowrap" style={{ fontWeight: 700 }}>
                  ₱{Number(s.revenue ?? 0).toFixed(2)}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

          {/* Table footer summary */}
  {filteredSales.length > 0 && (
    <div className="px-5 py-3 border-t border-[#F3F4F6] bg-[#F9FAFB] flex flex-wrap gap-5 items-center">
      <span className="text-xs text-[#9CA3AF]">{filteredSales.length} transactions</span>
      <span className="text-xs text-[#6B7280]">
        Total Revenue:{" "}
        <span className="text-[#111827]" style={{ fontWeight: 700 }}>
          ₱
          {filteredSales
            .reduce((sum: number, x) => sum + Number(x.revenue ?? 0), 0)
            .toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </span>
    </div>
  )}
</div>

      {/* ── Sale Detail Modal ──────────────────────────────────────────── */}
      {modalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalSale(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <h2 className="text-[#111827] text-sm" style={{ fontWeight: 700 }}>Sale #{modalSale.id}</h2>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">{modalSale.created_at ? new Date(modalSale.created_at).toLocaleString() : '—'}</p>
              </div>
              <button onClick={() => setModalSale(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {(modalSale.items ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(modalSale.items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#F9FAFB] last:border-0">
                      <div>
                        <p className="text-xs text-[#111827]" style={{ fontWeight: 600 }}>{item.product_name ?? `Product #${item.product_id}`}</p>
                        <p className="text-[10px] text-[#9CA3AF]">Qty: {item.qty} × ₱{Number(item.unit_price ?? 0).toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-[#111827]" style={{ fontWeight: 700 }}>₱{(Number(item.qty) * Number(item.unit_price ?? 0)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF] text-center py-4">No item breakdown available</p>
              )}
              <div className="border-t border-dashed border-[#E5E7EB] pt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6B7280]">Total</span>
                  <span className="text-[#111827]" style={{ fontWeight: 700 }}>₱{Number(modalSale.total ?? 0).toFixed(2)}</span>
                </div>
                {modalSale.profit != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6B7280]">Profit</span>
                    <span className={Number(modalSale.profit) >= 0 ? 'text-emerald-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                      {Number(modalSale.profit) >= 0 ? '+' : ''}₱{Number(modalSale.profit).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setModalSale(null)}
                className="w-full py-2.5 rounded-xl text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #F9A8C0 0%, #EC4899 100%)', fontWeight: 600 }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
