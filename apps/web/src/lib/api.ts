import { supabase } from './supabase';

function getDefaultApiRoot() {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:4000`;
}

const configuredApiRoot = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

export const API_ROOT = configuredApiRoot || getDefaultApiRoot();
export const API_BASE = `${API_ROOT}/api`;

const REQUEST_TIMEOUT_MS = 8_000;
const FAST_OPTIONAL_TIMEOUT_MS = 4_000;
const LOCAL_USERS_KEY = 'bb_local_users';

// OPTIMIZATION: Simple request cache with TTL to prevent duplicate API calls
// Cache stays valid for 30 seconds by default, can be overridden per request
const REQUEST_CACHE = new Map<string, { data: unknown; expires: number }>();

function getCacheKey(url: string, init?: RequestInit): string {
  // Only cache GET requests
  if (init?.method && init.method !== 'GET') return '';
  return url;
}

function getFromCache(key: string): unknown | null {
  if (!key) return null;
  const cached = REQUEST_CACHE.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    REQUEST_CACHE.delete(key);
    return null;
  }
  return cached.data;
}

function setInCache(key: string, data: unknown, ttlMs = 30_000): void {
  if (!key) return;
  REQUEST_CACHE.set(key, { data, expires: Date.now() + ttlMs });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (init.signal) return fetch(input, init);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit, cacheTtlMs?: number): Promise<T> {
  // OPTIMIZATION: Check cache first for GET requests
  const cacheKey = getCacheKey(url, init);
  if (cacheKey) {
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
      return cached as T;
    }
  }

  const res = await fetchWithTimeout(url, init);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${res.status}`);
  }

  // OPTIMIZATION: Store successful responses in cache
  if (cacheKey && res.ok) {
    setInCache(cacheKey, data, cacheTtlMs);
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
    .select('id, sku, name, category, price, cost, stock, low_stock_threshold, description, image_url, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeProduct);
}

async function getSupabaseSales() {
  // OPTIMIZATION: Select only needed columns instead of *
  const { data, error } = await supabase
    .from('sales')
    .select('id, total, customer_name, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function getSupabaseSaleById(id: number) {
  // OPTIMIZATION: Select only needed columns instead of *
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('id, total, created_at')
    .eq('id', id)
    .maybeSingle();

  if (saleError) throw new Error(saleError.message);
  if (!sale) throw new Error('Sale not found');

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('id, sale_id, product_id, qty, unit_price, products(id, name, sku)')
    .eq('sale_id', id)
    .order('id', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return {
    sale,
    items: (items || []).map((row: any) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const productName = String(product?.name ?? `Product #${row.product_id}`);

      return {
        id: row.id,
        sale_id: row.sale_id,
        product_id: row.product_id,
        qty: Number(row.qty ?? 0),
        unit_price: Number(row.unit_price ?? 0),
        product_name: productName,
        name: productName,
        sku: String(product?.sku ?? ''),
      };
    }),
  };
}

async function getSupabaseDashboardSalesRecords() {
  const { data, error } = await supabase
    .from('sale_items')
    .select('id, sale_id, product_id, qty, unit_price, sales(id, created_at, customer_name), products(id, name, category, cost)')
    .order('id', { ascending: false })
    .limit(200);

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

async function getSupabaseAnalytics(trendDays = 7) {
  // OPTIMIZATION: Select only needed columns instead of *
  const [{ data: contents, error: contentError }, { data: metrics, error: metricsError }] = await Promise.all([
    supabase.from('ai_contents').select('id, title, content, platform, facebook_post_id, published_at, last_metrics_sync_at, created_at').order('created_at', { ascending: false }),
    supabase.from('ai_content_metrics').select('ai_content_id, likes_count, comments_count, shares_count, reach_count, engagement_rate, snapshot_at').order('snapshot_at', { ascending: false }),
  ]);

  if (contentError) {
    console.warn('[api] analytics content unavailable, returning empty analytics', contentError);
  }
  if (metricsError) {
    console.warn('[api] analytics metrics unavailable, using zero metrics', metricsError);
  }

  const contentRows = contentError ? [] : (contents || []);
  const metricRows = metricsError ? [] : (metrics || []);

  const latestMetrics = new Map<number, any>();
  for (const metric of metricRows) {
    const contentId = Number(metric.ai_content_id);
    if (!latestMetrics.has(contentId)) latestMetrics.set(contentId, metric);
  }

  const posts = contentRows
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

  const dailyMetrics = new Map<string, { likes: number; comments: number; shares: number; reach: number }>();
  const latestMetricByContentDate = new Map<string, any>();
  const trackedContentIds = new Set(posts.map((post) => post.id));

  for (const metric of metricRows) {
    const contentId = Number(metric.ai_content_id);
    const snapshotAt = metric.snapshot_at || metric.fetched_at || metric.created_at;
    if (!trackedContentIds.has(contentId) || !snapshotAt) continue;

    const day = String(snapshotAt).slice(0, 10);
    const key = `${contentId}:${day}`;
    if (!latestMetricByContentDate.has(key)) latestMetricByContentDate.set(key, metric);
  }

  for (const metric of latestMetricByContentDate.values()) {
    const day = String(metric.snapshot_at || metric.fetched_at || metric.created_at).slice(0, 10);
    const current = dailyMetrics.get(day) || { likes: 0, comments: 0, shares: 0, reach: 0 };
    current.likes += Number(metric.likes ?? metric.likes_count ?? 0);
    current.comments += Number(metric.comments ?? metric.comments_count ?? 0);
    current.shares += Number(metric.shares ?? metric.shares_count ?? 0);
    current.reach += Number(metric.reach ?? metric.reach_count ?? 0);
    dailyMetrics.set(day, current);
  }

  const days = Math.max(7, trendDays);
  const labels = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - ((days - 1) - index));
    return dateKey(date);
  });

  const trend = labels.map((date) => {
    const metricsForDate = dailyMetrics.get(date) || { likes: 0, comments: 0, shares: 0, reach: 0 };
    const engagementRate = metricsForDate.reach > 0
      ? ((metricsForDate.likes + metricsForDate.comments + metricsForDate.shares) / metricsForDate.reach) * 100
      : 0;

    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      likes: metricsForDate.likes,
      comments: metricsForDate.comments,
      shares: metricsForDate.shares,
      reach: metricsForDate.reach,
      engagementRate: Number(engagementRate.toFixed(2)),
    };
  });

  return { summary, posts, trend };
}

async function getSupabaseAiContentFeed() {
  const { data, error } = await supabase
    .from('ai_contents')
    .select('id, title, content, platform, status, created_at, approved_at, scheduled_at, published_at, products(name)')
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
        created_by_name: 'Staff',
      };
    }),
    message: null,
  };
}

function normalizeAiContentItem(item: any) {
  return {
    id: Number(item.id),
    title: String(item.title || 'Untitled Content'),
    prompt: String(item.prompt_text || ''),
    output: String(item.content || ''),
    platform: String(item.platform || 'facebook'),
    hashtags: String(item.hashtags || ''),
    outputMode: String(item.output_mode || 'text'),
    referenceImageUrl: item.reference_image_url ?? null,
    generatedImageUrl: item.generated_image_url ?? null,
    status: String(item.status || 'draft'),
    createdAt: item.created_at,
    approvedAt: item.approved_at ?? null,
    scheduledAt: item.scheduled_at ?? null,
    publishedAt: item.published_at ?? null,
  };
}

async function getSupabaseContent(status?: string, page = 1) {
  const limit = 20;
  const offset = (Math.max(1, page) - 1) * limit;
  let query = supabase
    .from('ai_contents')
    .select('id, title, content, platform, prompt_text, hashtags, output_mode, reference_image_url, generated_image_url, status, created_at, approved_at, scheduled_at, published_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return {
    ok: true,
    data: (data || []).map(normalizeAiContentItem),
    total: data?.length || 0,
    page,
    limit,
    message: null,
  };
}

async function getSupabaseScheduledPosts() {
  const { data, error } = await supabase
    .from('ai_contents')
    .select('id, title, content, hashtags, platform, status, scheduled_at, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const scheduledStatuses = new Set(['scheduled', 'published', 'failed', 'cancelled']);
  const posts = (data || [])
    .filter((item: any) => item.scheduled_at || scheduledStatuses.has(String(item.status || '')))
    .map((item: any) => ({
      id: Number(item.id),
      content_id: Number(item.id),
      campaign_id: null,
      scheduled_at: item.scheduled_at,
      platform: String(item.platform || 'facebook'),
      status: item.status === 'published' || item.status === 'failed' || item.status === 'cancelled'
        ? item.status
        : 'pending',
      facebook_post_id: null,
      published_at: item.published_at ?? null,
      error_message: null,
      created_at: item.created_at,
      content_title: String(item.title || 'Untitled Content'),
      content_output: String(item.content || ''),
      content_hashtags: String(item.hashtags || ''),
      campaign_name: null,
    }));

  return { data: posts };
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

function isApiUserRole(value: unknown): value is ApiUser['role'] {
  return value === 'admin' || value === 'staff';
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
  return decodeURIComponent(bytes);
}

function getTokenPayload(token: string): Record<string, any> | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    return JSON.parse(decodeBase64Url(payloadSegment));
  } catch {
    return null;
  }
}

function getCachedSessionUser(): Partial<ApiUser> | null {
  try {
    const raw = sessionStorage.getItem('bb_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApiUser>;
    return parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeApiUser(row: Partial<ApiUser> & Record<string, any>): ApiUser {
  const email = String(row.email || 'admin@bellah.test').toLowerCase();
  const role = isApiUserRole(row.role) ? row.role : 'staff';

  return {
    id: Number(row.id || Date.now()),
    auth_id: row.auth_id || row.authId || `local-${email}`,
    authId: row.authId || row.auth_id || `local-${email}`,
    name: String(row.name || email.split('@')[0] || 'User'),
    email,
    role,
    username: String(row.username || email.split('@')[0] || 'user'),
    bio: String(row.bio || ''),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function getLocalCurrentUser(token: string): ApiUser {
  const tokenPayload = getTokenPayload(token);
  const cachedUser = getCachedSessionUser();
  const email = String(cachedUser?.email || tokenPayload?.email || 'admin@bellah.test').toLowerCase();
  const role = isApiUserRole(cachedUser?.role)
    ? cachedUser.role
    : isApiUserRole(tokenPayload?.app_metadata?.role)
      ? tokenPayload.app_metadata.role
      : isApiUserRole(tokenPayload?.user_metadata?.role)
        ? tokenPayload.user_metadata.role
        : 'admin';

  return normalizeApiUser({
    id: role === 'admin' ? 1 : 2,
    auth_id: String(tokenPayload?.sub || cachedUser?.auth_id || cachedUser?.authId || `local-${email}`),
    name: String(
      cachedUser?.name ||
      tokenPayload?.user_metadata?.full_name ||
      tokenPayload?.user_metadata?.name ||
      (role === 'admin' ? 'Local Admin' : email.split('@')[0])
    ),
    email,
    role,
    username: String(cachedUser?.username || email.split('@')[0] || 'user'),
    bio: String(cachedUser?.bio || ''),
    created_at: String(tokenPayload?.created_at || new Date().toISOString()),
  });
}

function readLocalUsers(token: string): ApiUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((item) => normalizeApiUser(item));
    }
  } catch {
    // Ignore corrupt local fallback data and re-seed below.
  }

  const current = getLocalCurrentUser(token);
  const seed = [
    current,
    normalizeApiUser({
      id: current.email === 'staff@bellah.test' ? 1 : 2,
      auth_id: 'local-staff',
      name: 'Local Staff',
      email: 'staff@bellah.test',
      role: 'staff',
      created_at: new Date().toISOString(),
    }),
  ].filter((user, index, users) => users.findIndex((candidate) => candidate.email === user.email) === index);

  writeLocalUsers(seed);
  return seed;
}

function writeLocalUsers(users: ApiUser[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users.map(normalizeApiUser)));
  } catch {
    // Local fallback is best-effort only.
  }
}

function createLocalUser(body: { name: string; email: string; role: 'admin' | 'staff' }, token: string) {
  const users = readLocalUsers(token);
  const email = body.email.trim().toLowerCase();
  const existing = users.find((user) => user.email === email);
  if (existing) throw new Error('A user with this email already exists');

  const next = normalizeApiUser({
    id: Math.max(0, ...users.map((user) => Number(user.id) || 0)) + 1,
    auth_id: `local-${email}`,
    name: body.name.trim(),
    email,
    role: body.role,
    created_at: new Date().toISOString(),
  });
  const updated = [...users, next];
  writeLocalUsers(updated);
  return next;
}

function updateLocalUser(id: number, body: { name?: string; role?: 'admin' | 'staff' }, token: string) {
  const users = readLocalUsers(token);
  const current = users.find((user) => user.id === id);
  if (!current) throw new Error('User not found');

  const updatedUser = normalizeApiUser({
    ...current,
    ...(body.name ? { name: body.name.trim() } : {}),
    ...(body.role ? { role: body.role } : {}),
  });
  writeLocalUsers(users.map((user) => user.id === id ? updatedUser : user));
  return updatedUser;
}

function deleteLocalUser(id: number, token: string) {
  const users = readLocalUsers(token);
  const updated = users.filter((user) => user.id !== id);
  writeLocalUsers(updated);
}

type GenerationProvider = 'openai' | 'gemini' | 'fallback' | 'none';

type GenerationProviders = {
  text: GenerationProvider;
  image: GenerationProvider;
  usedReferenceImage: boolean;
};

type AutoPromptProduct = {
  name: string;
  category?: string;
  price?: number;
  description?: string;
};

function formatAutoPromptLabel(value?: string) {
  return String(value || 'caption').replace(/_/g, ' ');
}

function buildLocalAutoMarketingPrompt(body: {
  product?: AutoPromptProduct;
  contentType?: string;
  tone?: string;
  platform?: string;
  outputMode: string;
  referenceImageUrl?: string;
}) {
  const product = body.product;
  const productName = product?.name?.trim() || 'the selected product';
  const category = product?.category?.trim() || 'beauty';
  const price = Number(product?.price ?? 0);
  const description = product?.description?.trim();
  const contentType = formatAutoPromptLabel(body.contentType);
  const tone = body.tone || 'fun';
  const hasReferenceImage = Boolean(body.referenceImageUrl);
  const modeInstruction = body.outputMode === 'text'
    ? 'Write this as a usable caption brief: lead with one specific hook, frame the key benefit without exaggerating claims, and end with a direct shop-now CTA.'
    : 'Write this as a usable poster-generation brief: specify the product hero placement, background, lighting, supporting props, minimal text treatment, and premium Facebook 4:5 composition.';
  const referenceInstruction = hasReferenceImage
    ? 'Use the uploaded/reference image as the visual source of truth: preserve the actual product identity, packaging shape, label placement, and dominant product colors.'
    : 'No reference image is provided, so base the creative direction only on the product name, category, price, and description.';

  return [
    `Create a ${tone} Facebook ${contentType} creative prompt for ${productName}, a ${category} product${price > 0 ? ` priced at PHP ${price.toFixed(2)}` : ''}.`,
    description ? `Use these product facts only as source material, not as the entire prompt: ${description}.` : '',
    modeInstruction,
    referenceInstruction,
    'Keep the final direction premium, beauty-focused, conversion-oriented, and suitable for a Filipino audience. Do not invent product claims.',
  ].filter(Boolean).join(' ');
}

export const api = {
  // PRODUCTS — go through Express API (pooled PG), Supabase as fallback
  async getProducts(token?: string) {
    return withSupabaseFallback(
      async () => {
        const res = await fetch(`${API_BASE}/products`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();
        return (Array.isArray(rows) ? rows : []).map(normalizeProduct);
      },
      () => getSupabaseProducts()
    );
  },

  async createProduct(data: Record<string, unknown>, token?: string) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || payload.message || 'Failed to create product');
    return normalizeProduct(payload);
  },

  async updateProduct(id: number, data: Record<string, unknown>, token?: string) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || payload.message || 'Failed to update product');
    return normalizeProduct(payload);
  },

  async deleteProduct(id: number, token?: string) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || payload.message || 'Failed to delete product');
    return payload;
  },

  // SALES — go through Express API (pooled PG), Supabase as fallback
  async getSales(token?: string) {
    return withSupabaseFallback(
      async () => {
        const res = await fetch(`${API_BASE}/sales`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        return Array.isArray(payload) ? payload : (payload?.data ?? []);
      },
      () => getSupabaseSales()
    );
  },

  async getSaleById(id: number, token?: string) {
    return withSupabaseFallback(
      async () => {
        const res = await fetch(`${API_BASE}/sales/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      },
      () => getSupabaseSaleById(id)
    );
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
    return withSupabaseFallback(
      async () => {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (status && status !== 'all') params.set('status', status);
        const res = await fetch(`${API_BASE}/ai/contents?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch content');
        return data;
      },
      () => getSupabaseContent(status, page)
    );
  },

  async getContentCount(status?: string) {
    return withSupabaseFallback(
      async () => {
        const params = new URLSearchParams({ page: '1', limit: '100' });
        if (status && status !== 'all') params.set('status', status);
        const res = await fetchWithTimeout(`${API_BASE}/ai/contents?${params}`, undefined, FAST_OPTIONAL_TIMEOUT_MS);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to count content');
        return Number(data?.total ?? (Array.isArray(data?.data) ? data.data.length : 0));
      },
      async () => {
        let query = supabase
          .from('ai_contents')
          .select('id', { count: 'exact', head: true });
        if (status && status !== 'all') query = query.eq('status', status);
        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return count ?? 0;
      }
    );
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
        promptText: string;
        promptProvider: GenerationProvider | null;
        outputMode: string;
        providers: GenerationProviders;
        status: string;
      };
      message: string | null;
    };
  },

  async generateAutoMarketingPrompt(body: {
    productId: number;
    product?: AutoPromptProduct;
    contentType?: string;
    tone?: string;
    platform: string;
    outputMode: string;
    referenceImageUrl?: string;
  }) {
    try {
      const res = await fetch(`${API_ROOT}/api/ai/auto-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 404) {
          return {
            ok: true,
            data: {
              promptText: buildLocalAutoMarketingPrompt(body),
              provider: 'fallback' as GenerationProvider,
            },
            message: null,
          };
        }

        throw new Error(data?.message || 'Failed to generate auto prompt');
      }

      return data as {
        ok: boolean;
        data: {
          promptText: string;
          provider: GenerationProvider;
        };
        message: string | null;
      };
    } catch (error) {
      console.warn('[api] auto prompt endpoint unavailable, using local fallback', error);
      return {
        ok: true,
        data: {
          promptText: buildLocalAutoMarketingPrompt(body),
          provider: 'fallback' as GenerationProvider,
        },
        message: null,
      };
    }
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
    return withSupabaseFallback(
      async () => {
        const res = await fetch(`${API_BASE}/ai/contents?page=1&limit=50`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch content feed');
        // Express returns { data: [], total, page } — wrap to match expected shape
        return {
          ok: true,
          data: Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []),
          message: null,
        };
      },
      () => getSupabaseAiContentFeed()
    );
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
    return { ok: true, data: (await getSupabaseAnalytics(days)).trend, message: null } as {
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
    try {
      const res = await fetchWithTimeout(`${API_BASE}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      return { data: (Array.isArray(data?.data) ? data.data : []).map(normalizeApiUser) };
    } catch (error) {
      console.warn('[api] users endpoint unavailable, using local user fallback', error);
      return { data: readLocalUsers(token) };
    }
  },

  async createUser(
    body: { name: string; email: string; password: string; role: 'admin' | 'staff' },
    token: string
  ) {
    let allowLocalFallback = true;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      allowLocalFallback = res.status >= 500;
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      return { data: normalizeApiUser(data.data) };
    } catch (error) {
      if (!allowLocalFallback) throw error;
      console.warn('[api] create user endpoint unavailable, using local user fallback', error);
      return { data: createLocalUser(body, token) };
    }
  },

  async updateUser(id: number, body: { name?: string; role?: 'admin' | 'staff' }, token: string) {
    let allowLocalFallback = true;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      allowLocalFallback = res.status >= 500;
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      return { data: normalizeApiUser(data.data) };
    } catch (error) {
      if (!allowLocalFallback) throw error;
      console.warn('[api] update user endpoint unavailable, using local user fallback', error);
      return { data: updateLocalUser(id, body, token) };
    }
  },

  async deleteUser(id: number, token: string) {
    let allowLocalFallback = true;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      allowLocalFallback = res.status >= 500;
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      deleteLocalUser(id, token);
      return data as { success: boolean };
    } catch (error) {
      if (!allowLocalFallback) throw error;
      console.warn('[api] delete user endpoint unavailable, using local user fallback', error);
      deleteLocalUser(id, token);
      return { success: true };
    }
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
    return withSupabaseFallback(
      async () => {
        const res = await fetch(`${API_BASE}/scheduled-posts`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load scheduled posts');
        return data;
      },
      getSupabaseScheduledPosts
    );
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
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to schedule post');
    return payload;
  },

  updatePostStatus: async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/scheduled-posts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to update post status');
    return payload;
  },

  deleteScheduledPost: async (id: number) => {
    const res = await fetch(`${API_BASE}/scheduled-posts/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to cancel scheduled post');
    return payload;
  },

};
