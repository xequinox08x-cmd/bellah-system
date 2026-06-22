/**
 * Persistent Storage Layer
 * Syncs mock data from API with localStorage for offline support and persistence
 */

const STORAGE_KEY = 'bellah_persistent_data_v1';
const STORAGE_TTL_KEY = 'bellah_storage_ttl_v1';
const SYNC_INTERVAL = 60000; // Sync every 60 seconds

export interface PersistentData {
  products: any[];
  sales: any[];
  saleLines: any[];
  aiContent: any[];
  campaigns: any[];
  scheduledPosts: any[];
  users: any[];
  lastSynced: string;
}

let lastSyncTime = 0;
let syncInProgress = false;

function getStorageKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '{}';
  } catch {
    return '{}';
  }
}

export function getPersistentData(): PersistentData {
  try {
    const data = JSON.parse(getStorageKey());
    return data || createEmptyData();
  } catch {
    return createEmptyData();
  }
}

export function createEmptyData(): PersistentData {
  return {
    products: [],
    sales: [],
    saleLines: [],
    aiContent: [],
    campaigns: [],
    scheduledPosts: [],
    users: [],
    lastSynced: new Date().toISOString(),
  };
}

export function setPersistentData(data: PersistentData): void {
  try {
    data.lastSynced = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TTL_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
  } catch (error) {
    console.warn('Failed to persist data to localStorage:', error);
  }
}

export function mergePersistentData(updates: Partial<PersistentData>): void {
  const current = getPersistentData();
  const merged = { ...current, ...updates };
  setPersistentData(merged);
}

export async function syncWithBackend(
  fetchFn: () => Promise<PersistentData>
): Promise<PersistentData> {
  if (syncInProgress) return getPersistentData();
  
  const now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL) {
    return getPersistentData();
  }

  syncInProgress = true;
  try {
    const backendData = await fetchFn();
    setPersistentData(backendData);
    lastSyncTime = now;
    return backendData;
  } catch (error) {
    console.warn('Failed to sync with backend:', error);
    return getPersistentData();
  } finally {
    syncInProgress = false;
  }
}

export function updateProducts(products: any[]): void {
  const data = getPersistentData();
  data.products = products;
  setPersistentData(data);
}

export function updateSales(sales: any[]): void {
  const data = getPersistentData();
  data.sales = sales;
  setPersistentData(data);
}

export function updateSaleLines(saleLines: any[]): void {
  const data = getPersistentData();
  data.saleLines = saleLines;
  setPersistentData(data);
}

export function updateAIContent(content: any[]): void {
  const data = getPersistentData();
  data.aiContent = content;
  setPersistentData(data);
}

export function updateCampaigns(campaigns: any[]): void {
  const data = getPersistentData();
  data.campaigns = campaigns;
  setPersistentData(data);
}

export function addSale(sale: any, saleLines: any[]): void {
  const data = getPersistentData();
  data.sales = [sale, ...data.sales];
  data.saleLines = [...saleLines, ...data.saleLines];
  setPersistentData(data);
}

export function addProduct(product: any): void {
  const data = getPersistentData();
  data.products = [product, ...data.products];
  setPersistentData(data);
}

export function updateProduct(id: number, updates: Partial<any>): void {
  const data = getPersistentData();
  const index = data.products.findIndex(p => p.id === id);
  if (index !== -1) {
    data.products[index] = { ...data.products[index], ...updates };
    setPersistentData(data);
  }
}

export function deleteProduct(id: number): void {
  const data = getPersistentData();
  data.products = data.products.filter(p => p.id !== id);
  setPersistentData(data);
}

export function clearAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TTL_KEY);
  } catch {
    // Ignored
  }
}
