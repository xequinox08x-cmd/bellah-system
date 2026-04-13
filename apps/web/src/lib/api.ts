export const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const API_BASE = `${API_ROOT}/api`;

export const api = {
  // PRODUCTS
  async getProducts() {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  // SALES
  async getSales() {
    const res = await fetch(`${API_BASE}/sales`);
    if (!res.ok) throw new Error('Failed to fetch sales');
    return res.json();
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
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    return res.json();
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
        status: string;
      };
      message: string | null;
    };
  },

  async getAiContentFeed() {
    const res = await fetch(`${API_BASE}/ai/contents/feed`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to load content feed');
    }

    return data as {
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
    };
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
    const res = await fetch(`${API_BASE}/analytics/summary`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load analytics summary');
    return data as {
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
    const params = new URLSearchParams({ days: String(days) });
    const res = await fetch(`${API_BASE}/analytics/trend?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load analytics trend');
    return data as {
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
    const res = await fetch(`${API_BASE}/analytics/posts`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load analytics posts');
    return data as {
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
