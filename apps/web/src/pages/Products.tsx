import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Package, DollarSign, BarChart2, Camera } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import ProductFormModal from '../components/ProductFormModal';

type ProductCategory = 'Skincare' | 'Makeup' | 'Fragrance' | 'Haircare';

interface Product {
  id: number;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
  imageUrl?: string;
}

const CATEGORIES: ProductCategory[] = ['Skincare', 'Makeup', 'Fragrance', 'Haircare'];

const CATEGORY_COLORS: Record<string, string> = {
  Skincare: 'bg-[#FCE7F3] text-[#EC4899]',
  Makeup: 'bg-[#FEF3C7] text-[#D97706]',
  Fragrance: 'bg-purple-100 text-purple-600',
  Haircare: 'bg-blue-100 text-blue-600',
};

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Out of Stock</span>;
  if (stock <= threshold) return <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">Low Stock</span>;
  return <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">In Stock</span>;
}

const emptyForm = {
  name: '', category: 'Skincare' as ProductCategory,
  price: '', cost: '', stock: '', lowStockThreshold: '20',
  sku: '', description: '', isActive: true,
};
type FormErrors = Partial<Record<keyof typeof emptyForm, string>>;

interface ProductFormProps {
  initial?: Product | null;
  onSave: (data: Omit<Product, 'id'>) => void;
  onClose: () => void;
  saving: boolean;
}

const ProductForm = ProductFormModal;


export default function Products() {
  const { user, session } = useAuth();
  const token = session?.access_token ?? '';
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const raw = await api.getProducts(token);
      setProducts(raw.map((p: any) => ({
        id: Number(p.id),
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        cost: Number(p.cost),
        stock: Number(p.stock),
        lowStockThreshold: Number(p.lowStockThreshold),
        description: p.description ?? '',
        imageUrl: p.imageUrl ?? undefined,
      })));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
    const retailValue = products.reduce((s, p) => s + p.price * p.stock, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    return { totalValue, retailValue, lowStockCount, outOfStock };
  }, [products]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchStock = stockFilter === 'All' ||
      (stockFilter === 'Low' && p.stock <= p.lowStockThreshold && p.stock > 0) ||
      (stockFilter === 'Out' && p.stock === 0);
    return matchSearch && matchCat && matchStock;
  });

  // ── Save (create / update) ────────────────────────────────────────────────
  const handleSave = async (data: Omit<Product, 'id'>) => {
    try {
      setSaving(true);
      if (editProduct) {
        await api.updateProduct(editProduct.id, data, token);
        toast.success('Product updated');
      } else {
        await api.createProduct(data, token);
        toast.success('Product added');
      }
      setShowForm(false);
      setEditProduct(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(id, token);
      toast.success('Product deleted');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Inventory Management</h1>
          <p className="text-[#6B7280] text-sm">{products.length} products · {kpis.lowStockCount} low stock · {kpis.outOfStock} out of stock</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm hover:bg-[#DB2777] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: String(products.length), icon: Package, bg: 'bg-pink-50', color: 'text-[#EC4899]' },
          { label: 'Stock Cost Value', value: `₱${kpis.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, bg: 'bg-yellow-50', color: 'text-yellow-600' },
          { label: 'Retail Value', value: `₱${kpis.retailValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: BarChart2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Low / Out Stock', value: `${kpis.lowStockCount} / ${kpis.outOfStock}`, icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={color} style={{ width: 18, height: 18 }} />
            </div>
            <div className="min-w-0">
              <p className="text-base text-[#111827] truncate" style={{ fontWeight: 700 }}>{value}</p>
              <p className="text-[10px] text-[#6B7280]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Low stock banner */}
      {kpis.lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{kpis.lowStockCount} product(s) are running low on stock and need restocking.</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20"
        >
          <option value="All">All Stock</option>
          <option value="Low">Low Stock</option>
          <option value="Out">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#9CA3AF]">Loading inventory…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {(['Product', 'SKU', 'Category', 'Price', 'Cost', 'Stock', 'Status', isAdmin ? 'Actions' : ''] as string[])
                    .filter(Boolean)
                    .map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs text-[#6B7280] uppercase tracking-wider" style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#9CA3AF] text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No products found
                    </td>
                  </tr>
                ) : (
                  filtered.map(product => (
                    <tr key={product.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{product.name}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{product.description}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#6B7280] font-mono">{product.sku}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[product.category]}`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#111827]" style={{ fontWeight: 500 }}>₱{product.price.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-sm text-[#6B7280]">₱{product.cost.toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm text-[#111827]" style={{ fontWeight: 500 }}>{product.stock}</p>
                          <div className="w-16 h-1 bg-[#F3F4F6] rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min((product.stock / (product.lowStockThreshold * 3)) * 100, 100)}%`,
                                backgroundColor: product.stock === 0 ? '#EF4444' : product.stock <= product.lowStockThreshold ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditProduct(product); setShowForm(true); }}
                              className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-[#6B7280] hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ProductForm
          initial={editProduct}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          saving={saving}
          token={token}
        />
      )}
    </div>
  );
}
