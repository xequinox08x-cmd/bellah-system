const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export interface ApiUser {
  id: number;
  auth_id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export const api = {
  // PRODUCTS
  async getProducts(token: string) {
    const res = await fetch(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(data: any, token: string) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create product');
    return json;
  },

  async updateProduct(id: number, data: any, token: string) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update product');
    return json;
  },

  async deleteProduct(id: number, token: string) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete product');
    return json;
  },

  // SALES
  async getSales(token: string) {
    const res = await fetch(`${API_BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch sales');
    return res.json();
  },

  async getSaleById(id: number, token: string) {
    const res = await fetch(`${API_BASE}/sales/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch sale');
    return res.json();
  },

  async createSale(data: { items: { productId: number; qty: number; unitPrice: number }[] }, token: string) {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create sale');
    }
    return res.json();
  },

  // DASHBOARD
  async getDashboardSummary(token: string) {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  // AI CONTENT
  async getContent(token: string, status?: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status && status !== 'all') params.set('status', status);
    const res = await fetch(`${API_BASE}/ai-content?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch content');
    return res.json();
  },

  async createContent(body: any, token: string) {
    const res = await fetch(`${API_BASE}/ai-content`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to save content');
    return res.json();
  },

  async updateContentStatus(id: number, status: 'approved' | 'rejected', token: string) {
    const res = await fetch(`${API_BASE}/ai-content/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  // CAMPAIGNS
  getCampaigns: async (token: string) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  // SCHEDULED POSTS
  getScheduledPosts: async (token: string) => {
    const res = await fetch(`${API_BASE}/scheduled-posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  // FORECASTS
  generateForecasts: async (token: string) => {
    const res = await fetch(`${API_BASE}/forecasts/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  getForecastAlerts: async (token: string) => {
    const res = await fetch(`${API_BASE}/forecasts/alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  // USERS
  getUsers: async (token: string) => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    return data;
  },

  createUser: async (body: any, token: string) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data;
  },

  updateUser: async (id: number, body: any, token: string) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    return data;
  },

  deleteUser: async (id: number, token: string) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data;
  },
};