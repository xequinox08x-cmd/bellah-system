import { supabase } from './supabase';

export const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const API_BASE = `${API_ROOT}/api`;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

function normalizeProduct(row: any) {
  return {
    id: Number(row.id),
    sku: String(row.sku ?? ''),
    name: String(row.name ?? 'Unnamed Product'),
    category: String(row.category ?? 'Uncategorized'),
    price: Number(row.price ?? 0),
    cost: Number(row.cost ?? 0),
    stock: Number(row.stock ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold ?? 0),
    description: String(row.description ?? ''),
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getSupabaseProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || [])
    .filter((row: any) => row.is_active !== false)
    .map(normalizeProduct);
}

async function getSupabaseSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function getSupabaseDashboardSalesRecords() {
  const { data, error } = await supabase
    .from('sale_items')
    .select('id, sale_id, product_id, qty, unit_price, sales(id, created_at, customer_name), products(id, name, category, cost)')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    ok: true,
    data: (data || []).map((row: any) => {
      const sale = Array.isArray(row.sales) ? row.sales[0] : row.sales;
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const quantity = Number(row.qty ?? 0);
      const unitPrice = Number(row.unit_price ?? 0);
      const cost = Number(product?.cost ?? 0);
      const createdAt = sale?.created_at || new Date().toISOString();

      return {
        id: `${row.sale_id}-${row.product_id}-${row.id}`,
        saleId: Number(row.sale_id),
        productId: Number(row.product_id),
        productName: String(product?.name ?? 'Product'),
        category: String(product?.category ?? 'Uncategorized'),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        profit: quantity * (unitPrice - cost),
        date: new Date(createdAt).toISOString().slice(0, 10),
        createdAt,
        customerName: String(sale?.customer_name || 'Walk-in Customer'),
        staffName: 'Store Staff',
      };
    }),
  };
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function getSupabaseDashboardSummary(start?: string, end?: string) {
  const [sales, products, salesRecordsResponse] = await Promise.all([
    getSupabaseSales(),
    getSupabaseProducts(),
    getSupabaseDashboardSalesRecords().catch(() => ({ ok: true, data: [] as any[] })),
  ]);

  const today = dateKey(new Date());
  const startDate = start || dateKey(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const endDate = end || today;
  const rangeSales = sales.filter((sale: any) => {
    const key = String(sale.created_at || '').slice(0, 10);
    return key >= startDate && key <= endDate;
  });
  const lowStockProducts = products
    .filter((product: any) => product.lowStockThreshold > 0 && product.stock <= product.lowStockThreshold)
    .map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: product.stock <= product.lowStockThreshold * 0.6 ? 'critical' : 'low',
      ratio: product.lowStockThreshold > 0 ? product.stock / product.lowStockThreshold : 0,
    }));

  const byDate = new Map<string, { revenue: number; profit: number }>();
  for (const record of salesRecordsResponse.data) {
    if (record.date < startDate || record.date > endDate) continue;
    const current = byDate.get(record.date) || { revenue: 0, profit: 0 };
    current.revenue += Number(record.total ?? 0);
    current.profit += Number(record.profit ?? 0);
    byDate.set(record.date, current);
  }

  return {
    ok: true,
    summary: {
      totalSales: rangeSales.length,
      revenueToday: sales
        .filter((sale: any) => String(sale.created_at || '').slice(0, 10) === today)
        .reduce((sum: number, sale: any) => sum + Number(sale.total ?? 0), 0),
      lowStockItems: lowStockProducts.length,
      scheduledPosts: 0,
      engagementRate: 0,
    },
    lowStockProducts,
    salesTrend: Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, ...value })),
  };
}

async function getSupabaseAnalytics() {
  const [{ data: contents, error: contentError }, { data: metrics, error: metricsError }] = await Promise.all([
    supabase.from('ai_contents').select('*').order('created_at', { ascending: false }),
    supabase.from('ai_content_metrics').select('*').order('snapshot_at', { ascending: false }),
  ]);

  if (contentError) throw new Error(contentError.message);
  if (metricsError) throw new Error(metricsError.message);

  const latestMetrics = new Map<number, any>();
  for (const metric of metrics || []) {
    const contentId = Number(metric.ai_content_id);
    if (!latestMetrics.has(contentId)) latestMetrics.set(contentId, metric);
  }

  const posts = (contents || [])
    .filter((content: any) => content.facebook_post_id)
    .map((content: any) => {
      const metric = latestMetrics.get(Number(content.id)) || {};
      const likes = Number(metric.likes ?? metric.likes_count ?? 0);
      const comments = Number(metric.comments ?? metric.comments_count ?? 0);
      const shares = Number(metric.shares ?? metric.shares_count ?? 0);
      const reach = Number(metric.reach ?? metric.reach_count ?? 0);
      const engagementRate = Number(metric.engagement_rate ?? (reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0));

      return {
        id: Number(content.id),
        title: content.title || 'Untitled Content',
        content: content.content || '',
        platform: content.platform || 'facebook',
        facebookPostId: content.facebook_post_id,
        publishedAt: content.published_at || content.last_metrics_sync_at || metric.snapshot_at || null,
        createdAt: content.created_at,
        lastMetricsSyncAt: content.last_metrics_sync_at || metric.snapshot_at || null,
        likes,
        comments,
        shares,
        reach,
        engagementRate: Number(engagementRate.toFixed(2)),
      };
    });

  const summary = posts.reduce(
    (total, post) => ({
      likes: total.likes + post.likes,
      comments: total.comments + post.comments,
      shares: total.shares + post.shares,
      reach: total.reach + post.reach,
      engagementRate: 0,
      postCount: total.postCount + 1,
      lastSyncedAt: total.lastSyncedAt || post.lastMetricsSyncAt,
    }),
    { likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0, postCount: 0, lastSyncedAt: null as string | null }
  );
  summary.engagementRate = summary.reach > 0
    ? Number((((summary.likes + summary.comments + summary.shares) / summary.reach) * 100).toFixed(2))
    : 0;

  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return dateKey(date);
  });

  const trend = labels.map((date) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    engagementRate: 0,
  }));

  return { summary, posts, trend };
}

async function getSupabaseAiContentFeed() {
  const { data, error } = await supabase
    .from('ai_contents')
    .select('id, title, content, platform, status, created_at, approved_at, scheduled_at, published_at, products(name), users(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[api] failed to load Supabase content feed', error);
    return {
      ok: true,
      data: [],
      message: null,
    };
  }

  return {
    ok: true,
    data: (data || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const creator = Array.isArray(item.users) ? item.users[0] : item.users;

      return {
        id: Number(item.id),
        title: String(item.title || 'Untitled Content'),
        content: String(item.content || ''),
        product_name: product?.name ? String(product.name) : null,
        platform: String(item.platform || 'facebook'),
        status: String(item.status || 'draft'),
        created_at: item.created_at,
        approved_at: item.approved_at ?? null,
        scheduled_at: item.scheduled_at ?? null,
        published_at: item.published_at ?? null,
        created_by_name: creator?.name ? String(creator.name) : 'Staff',
      };
    }),
    message: null,
  };
}

async function withSupabaseFallback<T>(request: () => Promise<T>, fallback: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    console.warn('[api] backend unavailable, using Supabase fallback', error);
    return fallback();
  }
}

export type ApiUser = {
  id: number;
  auth_id?: string;
  authId?: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  username?: string;
  bio?: string;
  created_at: string;
};

type GenerationProvider = 'openai' | 'gemini' | 'fallback' | 'none';

type GenerationProviders = {
  text: GenerationProvider;
  image: GenerationProvider;
  usedReferenceImage: boolean;
};

export const api = {
  // PRODUCTS
  async getProducts(token?: string) {
    return getSupabaseProducts();
  },

  // SALES
  async getSales() {
    return getSupabaseSales();
  },

  async getSaleById(id: number) {
    const res = await fetch(`${API_BASE}/sales/${id}`);
    if (!res.ok) throw new Error('Failed to fetch sale');
    return res.json();
  },

  async createSale(data: {
    items: { productId: number; qty: number; unitPrice: number }[];
  }) {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create sale');
    }
    return res.json();
  },

  // DASHBOARD
  async getDashboardSummary(start?: string, end?: string) {
    return getSupabaseDashboardSummary(start, end);
  },

  async getDashboardSalesRecords() {
    return getSupabaseDashboardSalesRecords() as Promise<{
      ok: boolean;
      data: Array<{
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
      }>;
      message?: string | null;
    }>;
  },

  async getStaffTodaySales() {
    const today = dateKey(new Date());
    const records = (await getSupabaseDashboardSalesRecords()).data.filter((record) => record.date === today);
    return {
      ok: true,
      todaySales: {
        transactionCount: new Set(records.map((record) => record.saleId)).size,
        unitsSold: records.reduce((sum, record) => sum + record.quantity, 0),
        revenueTotal: records.reduce((sum, record) => sum + record.total, 0),
        profitTotal: records.reduce((sum, record) => sum + record.profit, 0),
        items: records.map((record) => ({
          saleId: record.saleId,
          productId: record.productId,
          productName: record.productName,
          category: record.category,
          customerName: record.customerName,
          qty: record.quantity,
          lineTotal: record.total,
          lineProfit: record.profit,
        })),
      },
      message: null,
    } as {
      ok: boolean;
      todaySales: {
        transactionCount: number;
        unitsSold: number;
        revenueTotal: number;
        profitTotal: number;
        items: Array<{
          saleId: number;
          productId: number;
          productName: string;
          category: string;
          customerName: string;
          qty: number;
          lineTotal: number;
          lineProfit: number;
        }>;
      };
      message?: string | null;
    };
  },

  // AI CONTENT
  async getContent(status?: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status && status !== 'all') params.set('status', status);
    const res = await fetch(`${API_BASE}/ai/contents?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch content');
    return data;
  },

  async createContent(body: {
    title?: string;
    prompt: string;
    output: string;
    platform?: string;
    hashtags?: string;
    id?: number;
  }) {
    if (!body.id) throw new Error('Content id is required');

    const res = await fetch(`${API_BASE}/ai/contents/${body.id}/submit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title,
        content: body.output,
        platform: body.platform,
        hashtags: body.hashtags,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save content');
    return data;
  },

  async updateContentStatus(id: number, status: 'approved' | 'rejected' | 'published' | 'failed' | 'cancelled') {
    const res = await fetch(`${API_BASE}/ai/contents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update status');
    return data;
  },

  async deleteContent(id: number, role?: string) {
    const res = await fetch(`${API_BASE}/ai/contents/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { 'x-user-role': role } : {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete content');
    return data as {
      ok: boolean;
      data: { id: number };
      message: string | null;
    };
  },

  async generateMarketingContent(body: {
    productId: number;
    promptText: string;
    contentType?: string;
    tone?: string;
    platform: string;
    outputMode: string;
    referenceImageUrl?: string;
  }) {
    const res = await fetch(`${API_ROOT}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate content');
    }

    return data as {
      ok: boolean;
      data: {
        id: number;
        title: string;
        caption: string;
        hashtags: string;
        generatedImageUrl: string | null;
        referenceImageUrl: string | null;
        outputMode: string;
        providers: GenerationProviders;
        status: string;
      };
      message: string | null;
    };
  },

  async getAiContentFeed(): Promise<{
      ok: boolean;
      data: Array<{
        id: number;
        title: string;
        content: string;
        product_name: string | null;
        platform: string;
        status: string;
        created_at: string;
        approved_at: string | null;
        scheduled_at: string | null;
        published_at: string | null;
        created_by_name: string;
      }>;
      message: string | null;
    }> {
    return getSupabaseAiContentFeed();
  },

  async scheduleContent(id: number, scheduledAt: string) {
    const res = await fetch(`${API_BASE}/ai/contents/${id}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to schedule content');
    return data;
  },

  async getFacebookStatus() {
    const res = await fetch(`${API_BASE}/facebook/status`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load Facebook status');
    return data as {
      ok: boolean;
      data: {
        valid: boolean;
        state: 'connected' | 'expired' | 'invalid' | 'missing_config';
        pageId: string | null;
        pageName: string | null;
        error: string | null;
        expiresAt: string | null;
        tokenUpdatedAt: string | null;
        tokenExpiresAt: string | null;
        lastKnownSync: {
          contentId: number | null;
          facebookPostId: string | null;
          syncedAt: string | null;
        };
      };
      message: string | null;
    };
  },

  async publishFacebookContent(id: number) {
    const res = await fetch(`${API_BASE}/facebook/publish/${id}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to publish Facebook content');
    return data as {
      ok: boolean;
      data: {
        contentId: number;
        title: string | null;
        status: 'published';
        approvedAt: string | null;
        publishedAt: string | null;
        facebookPostId: string;
        facebookPageId: string | null;
        facebookPermalinkUrl: string | null;
        initialMetricsSynced: boolean;
      };
      message: string | null;
    };
  },

  async syncAllFacebookMetrics() {
    const res = await fetch(`${API_BASE}/facebook/sync-all`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to refresh Facebook analytics');
    return data as {
      ok: boolean;
      data: {
        totalTracked: number;
        totalSynced: number;
        totalFailed: number;
        failedIds: number[];
        results: Array<{
          contentId: number;
          facebookPostId: string;
          likesCount: number;
          commentsCount: number;
          sharesCount: number;
        }>;
        errors: Array<{
          contentId: number;
          facebookPostId: string;
          message: string;
        }>;
      };
      message: string | null;
    };
  },

  async getAnalyticsSummary() {
    return { ok: true, data: (await getSupabaseAnalytics()).summary, message: null } as {
      ok: boolean;
      data: {
        likes: number;
        comments: number;
        shares: number;
        reach: number;
        engagementRate: number;
        postCount: number;
        lastSyncedAt: string | null;
      };
      message: string | null;
    };
  },

  async getAnalyticsTrend(days = 7) {
    return { ok: true, data: (await getSupabaseAnalytics()).trend.slice(-days), message: null } as {
      ok: boolean;
      data: Array<{
        date: string;
        label: string;
        likes: number;
        comments: number;
        shares: number;
        reach: number;
        engagementRate: number;
      }>;
      message: string | null;
    };
  },

  async getAnalyticsPosts() {
    return { ok: true, data: (await getSupabaseAnalytics()).posts, message: null } as {
      ok: boolean;
      data: Array<{
        id: number;
        title: string;
        content: string;
        platform: string;
        facebookPostId: string | null;
        publishedAt: string | null;
        createdAt: string;
        lastMetricsSyncAt: string | null;
        likes: number;
        comments: number;
        shares: number;
        reach: number;
        engagementRate: number;
      }>;
      message: string | null;
    };
  },

  // USERS
  async getCurrentUser(token: string) {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load profile');
    return data as {
      data: {
        id: number;
        authId: string;
        name: string;
        email: string;
        role: 'admin' | 'staff';
        username: string;
        bio: string;
      };
    };
  },

  async updateCurrentUser(
    body: { name?: string; email?: string; username?: string; bio?: string },
    token: string
  ) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data as {
      data: {
        id: number;
        authId: string;
        name: string;
        email: string;
        role: 'admin' | 'staff';
        username: string;
        bio: string;
      };
    };
  },

  async getUsers(token: string) {
    const res = await fetch(`${API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load users');
    return data as { data: ApiUser[] };
  },

  async createUser(
    body: { name: string; email: string; password: string; role: 'admin' | 'staff' },
    token: string
  ) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data as { data: ApiUser };
  },

  async updateUser(id: number, body: { name?: string; role?: 'admin' | 'staff' }, token: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    return data as { data: ApiUser };
  },

  async deleteUser(id: number, token: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data as { success: boolean };
  },

  // CAMPAIGNS
  getCampaigns: async () => {
    const res = await fetch(`${API_BASE}/campaigns`);
    const data = await res.json();
    if (!res.ok) return { data: [], error: data.error };
    return { data: data.data, error: null };
  },

  getCampaign: async (id: number) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`);
    const data = await res.json();
    if (!res.ok) return { data: null, error: data.error };
    return { data: data.data, error: null };
  },

  createCampaign: async (body: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
    return { data: data.data, error: null };
  },

  updateCampaign: async (id: number, body: {
    name: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update campaign');
    return { data: data.data, error: null };
  },

  deleteCampaign: async (id: number) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete campaign');
    return { success: true };
  },

  attachContent: async (campaignId: number, contentId: number) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to attach content');
    return { success: true };
  },

  detachContent: async (campaignId: number, contentId: number) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/content/${contentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to detach content');
    return { success: true };
  },

  // SCHEDULED POSTS
  getScheduledPosts: async () => {
    const res = await fetch(`${API_BASE}/scheduled-posts`);
    return res.json();
  },

  createScheduledPost: async (data: {
    content_id: number;
    campaign_id?: number;
    scheduled_at: string;
    platform?: string;
  }) => {
    const res = await fetch(`${API_BASE}/scheduled-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updatePostStatus: async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/scheduled-posts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  deleteScheduledPost: async (id: number) => {
    const res = await fetch(`${API_BASE}/scheduled-posts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // FORECASTS
  generateForecasts: async () => {
    const res = await fetch(`${API_BASE}/forecasts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  getForecasts: async () => {
    const res = await fetch(`${API_BASE}/forecasts`);
    return res.json();
  },

  getForecastAlerts: async () => {
    const res = await fetch(`${API_BASE}/forecasts/alerts`);
    return res.json();
  },
};
