const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export const api = {
  // PRODUCTS
  async getProducts() {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },

  // SALES LIST
  async getSales() {
    const res = await fetch(`${API_BASE}/sales`);
    if (!res.ok) throw new Error("Failed to fetch sales");
    return res.json();
  },

  // GET SALE BY ID
  async getSaleById(id: number) {
    const res = await fetch(`${API_BASE}/sales/${id}`);
    if (!res.ok) throw new Error("Failed to fetch sale");
    return res.json();
  },

  // CREATE SALE
  async createSale(data: {
    items: { productId: number; qty: number; unitPrice: number }[];
  }) {
    const res = await fetch(`${API_BASE}/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create sale");
    }

    return res.json();
  },
  // AI CONTENT — get list, optional status filter
  async getContent(status?: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status && status !== 'all') params.set('status', status);
    const res = await fetch(`${API_BASE}/ai-content?${params}`);
    if (!res.ok) throw new Error('Failed to fetch content');
    return res.json();
  },

  // AI CONTENT — save a draft
  async createContent(body: {
    title?: string;
    prompt: string;
    output: string;
    platform?: string;
    hashtags?: string;
  }) {
    const res = await fetch(`${API_BASE}/ai-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to save content');
    return res.json();
  },

  // AI CONTENT — approve or reject
  async updateContentStatus(id: number, status: 'approved' | 'rejected') {
    const res = await fetch(`${API_BASE}/ai-content/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  // AI CONTENT — generate (stub for now)
  async generateContent(prompt: string) {
    const res = await fetch(`${API_BASE}/ai-content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    return res.json();
  },

  // ─── Campaigns ──────────────────────────────────────────────────────────────

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
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
    });
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

  // Scheduled Posts
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
  const res = await fetch(`${API_BASE}/scheduled-posts/${id}`, {
    method: 'DELETE',
  });
  return res.json();
},

};