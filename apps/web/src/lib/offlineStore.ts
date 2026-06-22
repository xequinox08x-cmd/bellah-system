export type UserRole = 'admin';
export type UserStatus = 'active' | 'inactive';
export type ProductCategory = 'Skincare' | 'Makeup' | 'Fragrance' | 'Haircare';
export type DiscountType = '%' | 'PHP';

export interface OfflineUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  username: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
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
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: number;
  customerId?: number;
  customerName: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  total: number;
  profit: number;
  staffUserId: number;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  total: number;
  profit: number;
}

export interface OfflineSettings {
  paletteId: string;
  sidebarCollapsed: boolean;
  storeName: string;
}

export interface OfflineStoreData {
  version: 1;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  users: OfflineUser[];
  settings: OfflineSettings;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export type SaleDraftItem = {
  productId: number;
  quantity: number;
};

export type SaleDraft = {
  customerId?: number;
  customerName?: string;
  discountType: DiscountType;
  discountValue: number;
  staffUserId: number;
  items: SaleDraftItem[];
};

export const STORE_KEY = 'bellah_offline_store_v1';
export const SESSION_KEY = 'bellah_offline_session_v1';
export const STORE_KEY_EXPORT = STORE_KEY;

function nowIso() {
  return new Date().toISOString();
}

function todayMinus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function nextId(rows: Array<{ id: number }>) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function seedStore(): OfflineStoreData {
  const createdAt = nowIso();
  const products: Product[] = [
    { id: 1, sku: 'BB-SK-001', name: 'Rose Glow Serum', category: 'Skincare', price: 45.99, cost: 18, stock: 128, lowStockThreshold: 20, description: 'Rose-infused serum for radiant skin.', createdAt, updatedAt: createdAt },
    { id: 2, sku: 'BB-MK-001', name: 'Velvet Matte Lipstick', category: 'Makeup', price: 18.99, cost: 6.5, stock: 14, lowStockThreshold: 20, description: 'Long-lasting matte lipstick in rich colors.', createdAt, updatedAt: createdAt },
    { id: 3, sku: 'BB-SK-002', name: 'Pearl Brightening Cream', category: 'Skincare', price: 62.99, cost: 22, stock: 89, lowStockThreshold: 15, description: 'Pearl extract cream for luminous skin.', createdAt, updatedAt: createdAt },
    { id: 4, sku: 'BB-MK-002', name: 'Golden Hour Highlighter', category: 'Makeup', price: 28.99, cost: 9, stock: 6, lowStockThreshold: 10, description: 'Warm gold highlighter for a soft glow.', createdAt, updatedAt: createdAt },
    { id: 5, sku: 'BB-SK-003', name: 'Hydra Boost Toner', category: 'Skincare', price: 32.99, cost: 11, stock: 203, lowStockThreshold: 30, description: 'Alcohol-free hydrating toner.', createdAt, updatedAt: createdAt },
    { id: 6, sku: 'BB-FR-001', name: 'Bloom Eau de Parfum', category: 'Fragrance', price: 54.5, cost: 21, stock: 32, lowStockThreshold: 8, description: 'Fresh floral fragrance for everyday wear.', createdAt, updatedAt: createdAt },
  ];

  const customers: Customer[] = [
    { id: 1, name: 'Maria Santos', phone: '0917 555 0123', email: 'maria@example.test', address: 'Quezon City', notes: 'Prefers skincare bundles.', createdAt, updatedAt: createdAt },
    { id: 2, name: 'Ana Cruz', phone: '0928 555 0144', email: 'ana@example.test', address: 'Makati', notes: 'Walks in monthly.', createdAt, updatedAt: createdAt },
    { id: 3, name: 'Walk-in Customer', phone: '', email: '', address: '', notes: 'Generic customer record.', createdAt, updatedAt: createdAt },
  ];

  const users: OfflineUser[] = [
    { id: 1, name: 'Local Admin', email: 'admin@bellah.test', password: 'admin123', role: 'admin', status: 'active', username: 'admin', bio: 'Offline system administrator.', createdAt, updatedAt: createdAt },
  ];

  const sales: Sale[] = [
    { id: 1, customerId: 1, customerName: 'Maria Santos', subtotal: 91.98, discountType: '%', discountValue: 0, discountAmount: 0, total: 91.98, profit: 55.98, staffUserId: 1, createdAt: todayMinus(1) },
    { id: 2, customerId: 2, customerName: 'Ana Cruz', subtotal: 98.97, discountType: '%', discountValue: 5, discountAmount: 4.95, total: 94.02, profit: 61.02, staffUserId: 1, createdAt: todayMinus(2) },
    { id: 3, customerId: 3, customerName: 'Walk-in Customer', subtotal: 62.99, discountType: '%', discountValue: 0, discountAmount: 0, total: 62.99, profit: 40.99, staffUserId: 1, createdAt: todayMinus(4) },
  ];
  const saleItems: SaleItem[] = [
    { id: 1, saleId: 1, productId: 1, productName: 'Rose Glow Serum', category: 'Skincare', quantity: 2, unitPrice: 45.99, unitCost: 18, total: 91.98, profit: 55.98 },
    { id: 2, saleId: 2, productId: 5, productName: 'Hydra Boost Toner', category: 'Skincare', quantity: 3, unitPrice: 32.99, unitCost: 11, total: 98.97, profit: 65.97 },
    { id: 3, saleId: 3, productId: 3, productName: 'Pearl Brightening Cream', category: 'Skincare', quantity: 1, unitPrice: 62.99, unitCost: 22, total: 62.99, profit: 40.99 },
  ];

  return {
    version: 1,
    products,
    customers,
    sales,
    saleItems,
    users,
    settings: { paletteId: 'rose-pink', sidebarCollapsed: false, storeName: 'BellahBeatrix Offline' },
    metadata: { createdAt, updatedAt: createdAt },
  };
}

function readRaw(): OfflineStoreData {
  if (typeof window === 'undefined') return seedStore();
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = seedStore();
    writeRaw(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as OfflineStoreData;
    const seeded = seedStore();
    const admins = parsed.users.filter((user) => String(user.role) === 'admin');
    const users = admins.length > 0 ? admins : seeded.users;
    const defaultAdminId = users[0].id;
    const adminIds = new Set(users.map((user) => user.id));
    return {
      ...seeded,
      ...parsed,
      users,
      sales: parsed.sales.map((sale) => ({
        ...sale,
        staffUserId: adminIds.has(sale.staffUserId) ? sale.staffUserId : defaultAdminId,
      })),
      metadata: { ...seeded.metadata, ...parsed.metadata },
    };
  } catch {
    const seeded = seedStore();
    writeRaw(seeded);
    return seeded;
  }
}

function writeRaw(data: OfflineStoreData) {
  if (typeof window === 'undefined') return;
  const next = { ...data, metadata: { ...data.metadata, updatedAt: nowIso() } };
  window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('bellah-store-updated'));
}

export const offlineStore = {
  getSnapshot: readRaw,
  resetToSeed() {
    const seeded = seedStore();
    writeRaw(seeded);
    return seeded;
  },
  authenticate(email: string, password: string) {
    const user = readRaw().users.find((row) => row.email.toLowerCase() === email.trim().toLowerCase() && row.password === password && row.status === 'active');
    if (!user) throw new Error('Invalid local credentials or inactive account');
    return { ...user, password: '' };
  },
  getProducts() {
    return readRaw().products.sort((a, b) => b.id - a.id);
  },
  saveProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: number; imageUrl?: string }) {
    const data = readRaw();
    const stamp = nowIso();
    if (input.id) {
      data.products = data.products.map((product) => product.id === input.id ? { ...product, ...input, updatedAt: stamp } as Product : product);
    } else {
      data.products.push({ ...input, id: nextId(data.products), createdAt: stamp, updatedAt: stamp });
    }
    writeRaw(data);
  },
  deleteProduct(id: number) {
    const data = readRaw();
    if (data.saleItems.some((item) => item.productId === id)) throw new Error('Products with sales history cannot be deleted');
    data.products = data.products.filter((product) => product.id !== id);
    writeRaw(data);
  },
  getCustomers() {
    return readRaw().customers.sort((a, b) => a.name.localeCompare(b.name));
  },
  saveCustomer(input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) {
    const data = readRaw();
    const stamp = nowIso();
    if (input.id) {
      data.customers = data.customers.map((customer) => customer.id === input.id ? { ...customer, ...input, updatedAt: stamp } as Customer : customer);
    } else {
      data.customers.push({ ...input, id: nextId(data.customers), createdAt: stamp, updatedAt: stamp });
    }
    writeRaw(data);
  },
  deleteCustomer(id: number) {
    const data = readRaw();
    if (data.sales.some((sale) => sale.customerId === id)) throw new Error('Customers with sales history cannot be deleted');
    data.customers = data.customers.filter((customer) => customer.id !== id);
    writeRaw(data);
  },
  getUsers() {
    return readRaw().users.map((user) => ({ ...user, password: '' })).sort((a, b) => a.id - b.id);
  },
  saveUser(input: Omit<OfflineUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) {
    const data = readRaw();
    const email = input.email.trim().toLowerCase();
    const duplicate = data.users.some((user) => user.email.toLowerCase() === email && user.id !== input.id);
    if (duplicate) throw new Error('A user with this email already exists');
    const stamp = nowIso();
    if (input.id) {
      data.users = data.users.map((user) => user.id === input.id ? { ...user, ...input, email, password: input.password || user.password, updatedAt: stamp } as OfflineUser : user);
    } else {
      data.users.push({ ...input, email, id: nextId(data.users), createdAt: stamp, updatedAt: stamp });
    }
    writeRaw(data);
  },
  deleteUser(id: number, currentUserId: number) {
    if (id === currentUserId) throw new Error('You cannot delete the signed-in user');
    const data = readRaw();
    data.users = data.users.filter((user) => user.id !== id);
    writeRaw(data);
  },
  updateProfile(id: number, updates: Pick<OfflineUser, 'name' | 'email' | 'username' | 'bio'>) {
    const data = readRaw();
    const email = updates.email.trim().toLowerCase();
    if (data.users.some((user) => user.email.toLowerCase() === email && user.id !== id)) throw new Error('Email is already in use');
    data.users = data.users.map((user) => user.id === id ? { ...user, ...updates, email, updatedAt: nowIso() } : user);
    writeRaw(data);
    return data.users.find((user) => user.id === id)!;
  },
  updatePassword(id: number, currentPassword: string, nextPassword: string) {
    const data = readRaw();
    const user = data.users.find((row) => row.id === id);
    if (!user || user.password !== currentPassword) throw new Error('Current password is incorrect');
    data.users = data.users.map((row) => row.id === id ? { ...row, password: nextPassword, updatedAt: nowIso() } : row);
    writeRaw(data);
  },
  recordSale(draft: SaleDraft) {
    const data = readRaw();
    if (draft.items.length === 0) throw new Error('Add at least one item');
    const lines = draft.items.map((item) => {
      const product = data.products.find((row) => row.id === item.productId);
      if (!product) throw new Error('Selected product was not found');
      if (item.quantity < 1) throw new Error('Quantity must be at least 1');
      if (product.stock < item.quantity) throw new Error(`${product.name} has only ${product.stock} units available`);
      return { product, quantity: item.quantity };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    const discountAmount = draft.discountType === '%'
      ? subtotal * Math.min(Math.max(draft.discountValue, 0), 100) / 100
      : Math.min(Math.max(draft.discountValue, 0), subtotal);
    const total = subtotal - discountAmount;
    const grossProfit = lines.reduce((sum, line) => sum + (line.product.price - line.product.cost) * line.quantity, 0);
    const profit = grossProfit - discountAmount;
    const saleId = nextId(data.sales);
    const customer = draft.customerId ? data.customers.find((row) => row.id === draft.customerId) : null;
    const sale: Sale = {
      id: saleId,
      customerId: customer?.id,
      customerName: draft.customerName?.trim() || customer?.name || 'Walk-in Customer',
      subtotal,
      discountType: draft.discountType,
      discountValue: draft.discountValue || 0,
      discountAmount,
      total,
      profit,
      staffUserId: draft.staffUserId,
      createdAt: nowIso(),
    };
    const lineStart = nextId(data.saleItems);
    const items: SaleItem[] = lines.map((line, index) => ({
      id: lineStart + index,
      saleId,
      productId: line.product.id,
      productName: line.product.name,
      category: line.product.category,
      quantity: line.quantity,
      unitPrice: line.product.price,
      unitCost: line.product.cost,
      total: line.product.price * line.quantity,
      profit: (line.product.price - line.product.cost) * line.quantity,
    }));
    data.sales.push(sale);
    data.saleItems.push(...items);
    data.products = data.products.map((product) => {
      const sold = lines.find((line) => line.product.id === product.id);
      return sold ? { ...product, stock: product.stock - sold.quantity, updatedAt: nowIso() } : product;
    });
    writeRaw(data);
    return { sale, items };
  },
  getSalesWithItems() {
    const data = readRaw();
    return data.sales
      .map((sale) => ({ ...sale, items: data.saleItems.filter((item) => item.saleId === sale.id) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getSettings() {
    return readRaw().settings;
  },
  saveSettings(settings: Partial<OfflineSettings>) {
    const data = readRaw();
    data.settings = { ...data.settings, ...settings };
    writeRaw(data);
  },
  exportData(): OfflineStoreData {
    return readRaw();
  },
  importData(payload: OfflineStoreData) {
    if (!payload || payload.version !== 1) {
      throw new Error('Invalid backup file');
    }
    writeRaw({
      ...seedStore(),
      ...payload,
      metadata: { ...payload.metadata, updatedAt: nowIso() },
    });
  },
};

export function useOfflineStoreVersion() {
  return STORE_KEY;
}
