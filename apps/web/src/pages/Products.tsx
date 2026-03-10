import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Package } from 'lucide-react';
import { ProductCategory } from '../data/store';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner@2.0.3';

import {
  getProducts,
  createProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  ProductDTO,
  ProductPayload,
} from "../api/products";

const CATEGORIES = ['Fragrance', 'Alcohol'] as const;
type ProductCategory = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<string, string> = {
  Fragrance: 'bg-purple-100 text-purple-600',
  Alcohol: 'bg-blue-100 text-blue-600',
};

type Product = Omit<ProductDTO, "price" | "cost"> & { price: number; cost: number };

const toUIProduct = (p: ProductDTO): Product => ({
  ...p,
  price: Number(p.price),
  cost: Number(p.cost),
});

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Out of Stock</span>;
  if (stock <= threshold) return <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">Low Stock</span>;
  return <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">In Stock</span>;
}

const emptyForm = {
  name: '', category: 'Fragrance' as ProductCategory, price: '', cost: '',
  stock: '', lowStockThreshold: '20', sku: '', description: '',
};

interface ProductFormProps {
  initial?: Product | null;
  onSave: (data: ProductPayload) => Promise<void>;
  onClose: () => void;
}

function ProductForm({ initial, onSave, onClose }: ProductFormProps) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          category: initial.category as ProductCategory,
          price: String(initial.price),
          cost: String(initial.cost),
          stock: String(initial.stock),
          lowStockThreshold: String(initial.lowStockThreshold),
          sku: initial.sku,
          description: initial.description ?? '',
        }
      : emptyForm
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.price || !form.stock || !form.sku) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload: ProductPayload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      cost: Number(form.cost || 0),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold || 20),
      sku: form.sku,
      description: form.description || '',
    };

    if (Number.isNaN(payload.price) || Number.isNaN(payload.stock) || Number.isNaN(payload.cost) || Number.isNaN(payload.lowStockThreshold)) {
      toast.error("Price/Cost/Stock/Threshold must be numbers");
      return;
    }

    try {
      setSaving(true);
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => {
  const numericDecimal = key === 'price' || key === 'cost';
  const numericInteger = key === 'stock' || key === 'lowStockThreshold';

  return (
    <div>
      <label className="block text-xs text-[#374151] mb-1" style={{ fontWeight: 500 }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        type="text"
        inputMode={
          numericDecimal
            ? "decimal"
            : numericInteger
            ? "numeric"
            : undefined
        }
        pattern={
          numericDecimal
            ? "[0-9]*[.]?[0-9]*"
            : numericInteger
            ? "[0-9]*"
            : undefined
        }
        value={form[key]}
        onChange={(e) => {
          let value = e.target.value;

          // allow only numbers + dot for price/cost
          if (numericDecimal) {
            value = value.replace(/[^0-9.]/g, "");
          }

          // allow only integers
          if (numericInteger) {
            value = value.replace(/[^0-9]/g, "");
          }

          setForm((prev) => ({ ...prev, [key]: value }));
        }}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
      />
    </div>
  );
};

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[#111827] text-base" style={{ fontWeight: 600 }}>
            {initial ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] transition-all">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {field('Product Name', 'name', 'text', true)}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#374151] mb-1" style={{ fontWeight: 500 }}>Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value as ProductCategory }))}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] bg-white"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {field('SKU', 'sku', 'text', true)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('Selling Price (₱)', 'price', 'number', true)}
            {field('Cost Price (₱)', 'cost', 'number')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('Stock Quantity', 'stock', 'number', true)}
            {field('Low Stock Threshold', 'lowStockThreshold', 'number')}
          </div>

          <div>
            <label className="block text-xs text-[#374151] mb-1" style={{ fontWeight: 500 }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm hover:bg-[#DB2777] transition-all disabled:opacity-60"
            >
              {saving ? "Saving..." : (initial ? 'Save Changes' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data.map(toUIProduct));
    } catch (e: any) {
      toast.error(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;

      const matchStock =
        stockFilter === 'All' ||
        (stockFilter === 'Low' && p.stock <= p.lowStockThreshold) ||
        (stockFilter === 'Out' && p.stock === 0);

      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  const onSave = async (payload: ProductPayload) => {
    try {
      if (editProduct) {
        const updated = await apiUpdateProduct(editProduct.id, payload);
        setProducts(prev => prev.map(p => (p.id === editProduct.id ? toUIProduct(updated) : p)));
        toast.success('Product updated successfully');
      } else {
        const created = await createProduct(payload);
        setProducts(prev => [toUIProduct(created), ...prev]);
        toast.success('Product added successfully');
      }
      setShowForm(false);
      setEditProduct(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save product");
      throw e;
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      await apiDeleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
    } catch (e: any) {
      toast.error(e.message || "Failed to delete product");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl" style={{ fontWeight: 700 }}>Inventory Management</h1>
          <p className="text-[#6B7280] text-sm">{products.length} products · {lowStockCount} low stock</p>
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

      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{lowStockCount} product(s) are running low on stock and need restocking.</span>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Product', 'SKU', 'Category', 'Price', 'Cost', 'Stock', 'Status', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-[#6B7280] uppercase tracking-wider" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F3F4F6]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#9CA3AF] text-sm">
                    Loading products...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
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
                              backgroundColor: product.stock <= product.lowStockThreshold ? '#EF4444' : '#10B981',
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
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-[#6B7280] hover:text-red-500 transition-all"
                            title="Delete"
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
      </div>

      {showForm && (
        <ProductForm
          initial={editProduct}
          onSave={onSave}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}