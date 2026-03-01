import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
export type ProductCategory = 'Skincare' | 'Makeup' | 'Fragrance' | 'Haircare';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  sku: string;
  description: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  profit: number;
  date: string;
  staffName: string;
  customerName: string;
}

export type ContentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'scheduled' | 'published';
export type ContentPlatform = 'facebook' | 'instagram' | 'both';

export interface ContentItem {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  platform: ContentPlatform;
  status: ContentStatus;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  productId?: string;
  productName?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
}

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  contentItems: ContentItem[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  recordSale: (sale: Omit<Sale, 'id'>) => boolean;
  addContent: (content: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  updateContentStatus: (
    id: string,
    status: ContentStatus,
    meta?: { approvedBy?: string; rejectionReason?: string; scheduledAt?: string; publishedAt?: string }
  ) => void;
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Rose Glow Serum', category: 'Skincare', price: 45.99, cost: 18.0, stock: 128, lowStockThreshold: 20, sku: 'BB-SK-001', description: 'A luxurious rose-infused serum for radiant skin.' },
  { id: 'p2', name: 'Velvet Matte Lipstick', category: 'Makeup', price: 18.99, cost: 6.5, stock: 14, lowStockThreshold: 20, sku: 'BB-MK-001', description: 'Long-lasting matte finish in rich, bold colors.' },
  { id: 'p3', name: 'Pearl Brightening Cream', category: 'Skincare', price: 62.99, cost: 22.0, stock: 89, lowStockThreshold: 15, sku: 'BB-SK-002', description: 'Illuminating cream with pearl extract for luminous skin.' },
  { id: 'p4', name: 'Golden Hour Highlighter', category: 'Makeup', price: 28.99, cost: 9.0, stock: 6, lowStockThreshold: 10, sku: 'BB-MK-002', description: 'Blinding highlight with warm gold undertones.' },
  { id: 'p5', name: 'Hydra Boost Toner', category: 'Skincare', price: 32.99, cost: 11.0, stock: 203, lowStockThreshold: 30, sku: 'BB-SK-003', description: 'Alcohol-free hydrating toner with hyaluronic acid.' },
  { id: 'p6', name: 'Berry Bliss Lip Gloss', category: 'Makeup', price: 14.99, cost: 4.5, stock: 56, lowStockThreshold: 15, sku: 'BB-MK-003', description: 'Plumping lip gloss in juicy berry shades.' },
  { id: 'p7', name: 'Collagen Eye Patches', category: 'Skincare', price: 22.99, cost: 8.0, stock: 34, lowStockThreshold: 10, sku: 'BB-SK-004', description: 'Firming under-eye patches with collagen boost.' },
  { id: 'p8', name: 'Shimmer Eyeshadow Palette', category: 'Makeup', price: 38.99, cost: 14.0, stock: 42, lowStockThreshold: 12, sku: 'BB-MK-004', description: '16 shades of shimmer and matte eyeshadow.' },
];

// Deterministic sales data for last 14 days
const SALES_DATA: Omit<Sale, 'id'>[] = [
  { productId: 'p1', productName: 'Rose Glow Serum', category: 'Skincare', quantity: 2, unitPrice: 45.99, total: 91.98, profit: 55.98, date: '2026-02-13', staffName: 'Staff', customerName: 'Maria Santos' },
  { productId: 'p5', productName: 'Hydra Boost Toner', category: 'Skincare', quantity: 3, unitPrice: 32.99, total: 98.97, profit: 65.97, date: '2026-02-13', staffName: 'Admin', customerName: 'Ana Cruz' },
  { productId: 'p3', productName: 'Pearl Brightening Cream', category: 'Skincare', quantity: 1, unitPrice: 62.99, total: 62.99, profit: 40.99, date: '2026-02-14', staffName: 'Staff', customerName: 'Isabel Reyes' },
  { productId: 'p6', productName: 'Berry Bliss Lip Gloss', category: 'Makeup', quantity: 4, unitPrice: 14.99, total: 59.96, profit: 41.96, date: '2026-02-14', staffName: 'Staff', customerName: 'Carmen Lopez' },
  { productId: 'p8', productName: 'Shimmer Eyeshadow Palette', category: 'Makeup', quantity: 2, unitPrice: 38.99, total: 77.98, profit: 49.98, date: '2026-02-15', staffName: 'Admin', customerName: 'Sofia Garcia' },
  { productId: 'p1', productName: 'Rose Glow Serum', category: 'Skincare', quantity: 1, unitPrice: 45.99, total: 45.99, profit: 27.99, date: '2026-02-15', staffName: 'Staff', customerName: 'Luna Mendez' },
  { productId: 'p7', productName: 'Collagen Eye Patches', category: 'Skincare', quantity: 2, unitPrice: 22.99, total: 45.98, profit: 29.98, date: '2026-02-16', staffName: 'Staff', customerName: 'Walk-in Customer' },
  { productId: 'p2', productName: 'Velvet Matte Lipstick', category: 'Makeup', quantity: 3, unitPrice: 18.99, total: 56.97, profit: 37.47, date: '2026-02-16', staffName: 'Admin', customerName: 'Diana Flores' },
  { productId: 'p5', productName: 'Hydra Boost Toner', category: 'Skincare', quantity: 2, unitPrice: 32.99, total: 65.98, profit: 43.98, date: '2026-02-17', staffName: 'Staff', customerName: 'Elena Vargas' },
  { productId: 'p4', productName: 'Golden Hour Highlighter', category: 'Makeup', quantity: 1, unitPrice: 28.99, total: 28.99, profit: 19.99, date: '2026-02-17', staffName: 'Staff', customerName: 'Fiona Torres' },
  { productId: 'p3', productName: 'Pearl Brightening Cream', category: 'Skincare', quantity: 2, unitPrice: 62.99, total: 125.98, profit: 81.98, date: '2026-02-18', staffName: 'Admin', customerName: 'Grace Kim' },
  { productId: 'p6', productName: 'Berry Bliss Lip Gloss', category: 'Makeup', quantity: 5, unitPrice: 14.99, total: 74.95, profit: 52.45, date: '2026-02-18', staffName: 'Staff', customerName: 'Helen Park' },
  { productId: 'p1', productName: 'Rose Glow Serum', category: 'Skincare', quantity: 3, unitPrice: 45.99, total: 137.97, profit: 83.97, date: '2026-02-19', staffName: 'Staff', customerName: 'Iris Lim' },
  { productId: 'p8', productName: 'Shimmer Eyeshadow Palette', category: 'Makeup', quantity: 1, unitPrice: 38.99, total: 38.99, profit: 24.99, date: '2026-02-19', staffName: 'Admin', customerName: 'Julia Chen' },
  { productId: 'p7', productName: 'Collagen Eye Patches', category: 'Skincare', quantity: 3, unitPrice: 22.99, total: 68.97, profit: 44.97, date: '2026-02-20', staffName: 'Staff', customerName: 'Karen Wu' },
  { productId: 'p5', productName: 'Hydra Boost Toner', category: 'Skincare', quantity: 1, unitPrice: 32.99, total: 32.99, profit: 21.99, date: '2026-02-20', staffName: 'Staff', customerName: 'Laura Tan' },
  { productId: 'p2', productName: 'Velvet Matte Lipstick', category: 'Makeup', quantity: 2, unitPrice: 18.99, total: 37.98, profit: 24.98, date: '2026-02-21', staffName: 'Admin', customerName: 'Mia Ng' },
  { productId: 'p3', productName: 'Pearl Brightening Cream', category: 'Skincare', quantity: 1, unitPrice: 62.99, total: 62.99, profit: 40.99, date: '2026-02-21', staffName: 'Staff', customerName: 'Nina Ong' },
  { productId: 'p4', productName: 'Golden Hour Highlighter', category: 'Makeup', quantity: 2, unitPrice: 28.99, total: 57.98, profit: 38.98, date: '2026-02-22', staffName: 'Staff', customerName: 'Olivia Yap' },
  { productId: 'p1', productName: 'Rose Glow Serum', category: 'Skincare', quantity: 2, unitPrice: 45.99, total: 91.98, profit: 55.98, date: '2026-02-22', staffName: 'Admin', customerName: 'Penny Ho' },
  { productId: 'p6', productName: 'Berry Bliss Lip Gloss', category: 'Makeup', quantity: 3, unitPrice: 14.99, total: 44.97, profit: 31.47, date: '2026-02-23', staffName: 'Staff', customerName: 'Quinn Lee' },
  { productId: 'p8', productName: 'Shimmer Eyeshadow Palette', category: 'Makeup', quantity: 2, unitPrice: 38.99, total: 77.98, profit: 49.98, date: '2026-02-23', staffName: 'Staff', customerName: 'Rose Ma' },
  { productId: 'p3', productName: 'Pearl Brightening Cream', category: 'Skincare', quantity: 3, unitPrice: 62.99, total: 188.97, profit: 122.97, date: '2026-02-24', staffName: 'Admin', customerName: 'Sara Chu' },
  { productId: 'p5', productName: 'Hydra Boost Toner', category: 'Skincare', quantity: 2, unitPrice: 32.99, total: 65.98, profit: 43.98, date: '2026-02-24', staffName: 'Staff', customerName: 'Tina Fong' },
  { productId: 'p1', productName: 'Rose Glow Serum', category: 'Skincare', quantity: 1, unitPrice: 45.99, total: 45.99, profit: 27.99, date: '2026-02-25', staffName: 'Staff', customerName: 'Uma Rao' },
  { productId: 'p7', productName: 'Collagen Eye Patches', category: 'Skincare', quantity: 2, unitPrice: 22.99, total: 45.98, profit: 29.98, date: '2026-02-25', staffName: 'Admin', customerName: 'Vera Singh' },
  { productId: 'p2', productName: 'Velvet Matte Lipstick', category: 'Makeup', quantity: 1, unitPrice: 18.99, total: 18.99, profit: 12.49, date: '2026-02-26', staffName: 'Staff', customerName: 'Walk-in Customer' },
  { productId: 'p4', productName: 'Golden Hour Highlighter', category: 'Makeup', quantity: 1, unitPrice: 28.99, total: 28.99, profit: 19.99, date: '2026-02-26', staffName: 'Staff', customerName: 'Xia Liu' },
];

const MOCK_SALES: Sale[] = SALES_DATA.map((s, i) => ({ ...s, id: `s${i + 1}` }));

const MOCK_CONTENT: ContentItem[] = [
  {
    id: 'c1',
    title: 'Rose Glow Serum — Spring Launch',
    caption: "✨ Spring is here and so is your glow! Introducing our Rose Glow Serum — packed with rose hip oil and vitamin C to give you that dewy, radiant complexion you've been dreaming of. 🌹 Perfect for all skin types. Available now!",
    hashtags: '#BellahBeatrix #RoseGlowSerum #SpringSkincare #GlowUp #NaturalBeauty #SkincareRoutine',
    platform: 'instagram',
    status: 'published',
    createdBy: 'Staff',
    createdByRole: 'staff',
    createdAt: '2026-02-18T09:00:00',
    publishedAt: '2026-02-20T10:00:00',
    approvedBy: 'Admin',
    productId: 'p1',
    productName: 'Rose Glow Serum',
    engagement: { likes: 342, comments: 28, shares: 47, reach: 2840 },
  },
  {
    id: 'c2',
    title: 'Weekend Sale — Makeup Collection',
    caption: '💄 WEEKEND SALE! Get 20% OFF on our entire Makeup Collection this Saturday and Sunday only! Stock up on your faves before they run out. Shop in-store or DM us to order. 🛍️',
    hashtags: '#WeekendSale #BellahBeatrix #MakeupSale #BeautyDeals #LipstickLover',
    platform: 'facebook',
    status: 'published',
    createdBy: 'Staff',
    createdByRole: 'staff',
    createdAt: '2026-02-21T14:00:00',
    publishedAt: '2026-02-22T09:00:00',
    approvedBy: 'Admin',
    productId: 'p2',
    productName: 'Velvet Matte Lipstick',
    engagement: { likes: 218, comments: 41, shares: 63, reach: 4120 },
  },
  {
    id: 'c3',
    title: 'Pearl Brightening Cream — New Arrival',
    caption: '🤍 New Arrival! Introducing the Pearl Brightening Cream — formulated with real pearl extract to give you glass-skin glow in just 2 weeks. Clinically tested. Dermatologist approved. Your skin deserves the best!',
    hashtags: '#PearlCream #BrightSkin #BellahBeatrix #NewArrival #GlassSkin',
    platform: 'both',
    status: 'scheduled',
    createdBy: 'Admin',
    createdByRole: 'admin',
    createdAt: '2026-02-25T16:00:00',
    scheduledAt: '2026-03-01T09:00:00',
    approvedBy: 'Admin',
    productId: 'p3',
    productName: 'Pearl Brightening Cream',
  },
  {
    id: 'c4',
    title: 'Golden Hour Highlighter Tutorial',
    caption: "✨ GLOW GETTER ALERT! Our Golden Hour Highlighter is giving main character energy and we are HERE for it! 💛 Swipe to see the full transformation. Which shade is your fave? Comment below!",
    hashtags: '#GoldenHour #HighlighterMakeup #BellahBeatrix #MakeupTutorial #GlowUp',
    platform: 'instagram',
    status: 'pending',
    createdBy: 'Staff',
    createdByRole: 'staff',
    createdAt: '2026-02-25T11:30:00',
    productId: 'p4',
    productName: 'Golden Hour Highlighter',
  },
  {
    id: 'c5',
    title: 'Hydra Boost Toner — Skin Science',
    caption: 'Did you know hydration is the #1 secret to youthful skin? 💧 Our Hydra Boost Toner with hyaluronic acid delivers intense moisture in seconds. No alcohol, no harsh chemicals — just pure hydration your skin will love.',
    hashtags: '#HydraBoost #Toner #SkincareTips #HyaluronicAcid #BellahBeatrix',
    platform: 'instagram',
    status: 'pending',
    createdBy: 'Admin',
    createdByRole: 'admin',
    createdAt: '2026-02-26T08:00:00',
    productId: 'p5',
    productName: 'Hydra Boost Toner',
  },
  {
    id: 'c6',
    title: "Valentine's Beauty Bundle",
    caption: "Love is in the air and so is beautiful skin! 💕 Treat yourself or someone special to our Valentine's Beauty Bundle. Rose Glow Serum + Berry Bliss Lip Gloss + Collagen Eye Patches = the perfect gift!",
    hashtags: '#ValentinesDay #BellahBeatrix #GiftForHer #BeautyBundle #SkincareLove',
    platform: 'facebook',
    status: 'rejected',
    createdBy: 'Staff',
    createdByRole: 'staff',
    createdAt: '2026-02-10T10:00:00',
    approvedBy: 'Admin',
    rejectionReason: "Valentine's promotion has already ended. Please create content relevant to the current spring season.",
  },
  {
    id: 'c7',
    title: 'Berry Bliss Lip Gloss — OOTD Ready',
    caption: "Your OOTD isn't complete without a pop of color! 💋 Berry Bliss Lip Gloss gives you that juicy, plump look all day long. Available in 6 gorgeous shades. Shop now!",
    hashtags: '#BerryBliss #LipGloss #OOTD #BellahBeatrix #MakeupOfTheDay',
    platform: 'instagram',
    status: 'approved',
    createdBy: 'Staff',
    createdByRole: 'staff',
    createdAt: '2026-02-26T10:00:00',
    approvedBy: 'Admin',
    productId: 'p6',
    productName: 'Berry Bliss Lip Gloss',
  },
];

// ── Context ────────────────────────────────────────────────────────────
const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);
  const [contentItems, setContentItems] = useState<ContentItem[]>(MOCK_CONTENT);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...product, id: `p${Date.now()}` };
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const updateProduct = useCallback((product: Product) => {
    setProducts(prev => prev.map(p => (p.id === product.id ? product : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const recordSale = useCallback(
    (sale: Omit<Sale, 'id'>): boolean => {
      const product = products.find(p => p.id === sale.productId);
      if (!product || product.stock < sale.quantity) return false;
      setProducts(prev =>
        prev.map(p => (p.id === sale.productId ? { ...p, stock: p.stock - sale.quantity } : p))
      );
      const newSale: Sale = { ...sale, id: `s${Date.now()}` };
      setSales(prev => [newSale, ...prev]);
      return true;
    },
    [products]
  );

  const addContent = useCallback((content: Omit<ContentItem, 'id' | 'createdAt'>) => {
    const newContent: ContentItem = {
      ...content,
      id: `c${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setContentItems(prev => [newContent, ...prev]);
  }, []);

  const updateContentStatus = useCallback(
    (
      id: string,
      status: ContentStatus,
      meta?: { approvedBy?: string; rejectionReason?: string; scheduledAt?: string; publishedAt?: string }
    ) => {
      setContentItems(prev =>
        prev.map(c => (c.id === id ? { ...c, status, ...(meta || {}) } : c))
      );
    },
    []
  );

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        contentItems,
        addProduct,
        updateProduct,
        deleteProduct,
        recordSale,
        addContent,
        updateContentStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
} 