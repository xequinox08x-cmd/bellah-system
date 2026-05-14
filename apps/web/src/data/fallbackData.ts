/**
 * DEFENSE MODE: Fallback Data System
 * 
 * Provides mock data when API fails or network is unavailable
 * Used as emergency fallback during demo
 */

export const FALLBACK_DASHBOARD_DATA = {
  ok: true,
  data: {
    totalSales: 45230,
    totalProducts: 324,
    lowStockCount: 12,
    topProduct: {
      id: 1,
      name: 'Premium Skincare Set',
      sales: 1250,
      revenue: 18750,
    },
    recentSales: [
      { id: 101, total: 2500, items: 5, createdAt: new Date().toISOString() },
      { id: 102, total: 1800, items: 3, createdAt: new Date().toISOString() },
      { id: 103, total: 3200, items: 8, createdAt: new Date().toISOString() },
    ],
  },
  message: null,
};

export const FALLBACK_ANALYTICS_SUMMARY = {
  ok: true,
  data: {
    likes: 15420,
    comments: 3240,
    shares: 892,
    reach: 125640,
    engagementRate: 12.5,
    postCount: 42,
    lastSyncedAt: new Date().toISOString(),
  },
  message: null,
};

export const FALLBACK_ANALYTICS_TREND = {
  ok: true,
  data: [
    { date: '2024-05-01', label: 'May 1', likes: 450, comments: 89, shares: 23, reach: 3500, engagementRate: 12.5 },
    { date: '2024-05-02', label: 'May 2', likes: 520, comments: 102, shares: 31, reach: 4200, engagementRate: 13.2 },
    { date: '2024-05-03', label: 'May 3', likes: 380, comments: 65, shares: 18, reach: 2800, engagementRate: 11.8 },
    { date: '2024-05-04', label: 'May 4', likes: 610, comments: 128, shares: 42, reach: 5100, engagementRate: 14.6 },
    { date: '2024-05-05', label: 'May 5', likes: 720, comments: 156, shares: 51, reach: 6200, engagementRate: 15.8 },
    { date: '2024-05-06', label: 'May 6', likes: 590, comments: 115, shares: 38, reach: 5400, engagementRate: 14.2 },
    { date: '2024-05-07', label: 'May 7', likes: 840, comments: 178, shares: 62, reach: 7100, engagementRate: 16.5 },
  ],
  message: null,
};

export const FALLBACK_PRODUCTS = {
  ok: true,
  data: [
    {
      id: 1,
      sku: 'SKU-001',
      name: 'Premium Skincare Set',
      price: 15.00,
      cost: 8.00,
      stock: 250,
      lowStockThreshold: 20,
      category: 'Skincare',
      description: 'Premium quality skincare products',
      imageUrl: 'https://via.placeholder.com/300x300?text=Skincare+Set',
    },
    {
      id: 2,
      sku: 'SKU-002',
      name: 'Face Moisturizer',
      price: 12.50,
      cost: 6.00,
      stock: 180,
      lowStockThreshold: 20,
      category: 'Skincare',
      description: 'Hydrating face moisturizer with SPF',
      imageUrl: 'https://via.placeholder.com/300x300?text=Moisturizer',
    },
    {
      id: 3,
      sku: 'SKU-003',
      name: 'Facial Cleanser',
      price: 9.99,
      cost: 4.50,
      stock: 15,
      lowStockThreshold: 20,
      category: 'Skincare',
      description: 'Gentle daily facial cleanser',
      imageUrl: 'https://via.placeholder.com/300x300?text=Cleanser',
    },
    {
      id: 4,
      sku: 'SKU-004',
      name: 'Eye Cream',
      price: 18.00,
      cost: 9.00,
      stock: 95,
      lowStockThreshold: 15,
      category: 'Skincare',
      description: 'Anti-aging eye cream formula',
      imageUrl: 'https://via.placeholder.com/300x300?text=Eye+Cream',
    },
  ],
  message: null,
};

export const FALLBACK_SALES_SUMMARY = {
  ok: true,
  data: {
    totalSales: 1245,
    totalRevenue: 45230,
    averageOrderValue: 36.36,
    topProduct: { name: 'Premium Skincare Set', quantity: 128 },
    recentSales: [
      { id: 1, total: 125.50, items: 3, createdAt: new Date().toISOString() },
      { id: 2, total: 89.99, items: 2, createdAt: new Date().toISOString() },
      { id: 3, total: 234.75, items: 5, createdAt: new Date().toISOString() },
    ],
  },
  message: null,
};

export const FALLBACK_CAMPAIGNS = {
  ok: true,
  data: [
    {
      id: 1,
      name: 'Spring Skincare Sale',
      status: 'active',
      startDate: '2024-05-01',
      endDate: '2024-05-31',
      content: [1, 2, 3],
    },
    {
      id: 2,
      name: 'Summer Collection Launch',
      status: 'planned',
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      content: [],
    },
  ],
  message: null,
};

export const FALLBACK_AI_CONTENT = {
  ok: true,
  data: [
    {
      id: 1,
      title: 'Summer Skincare Tips',
      prompt: 'Generate engaging summer skincare tips',
      output: 'As temperatures rise, keeping your skin cool and protected is essential...',
      status: 'approved',
      platform: 'facebook',
      hashtags: '#skincare #summer #beautytips',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Product Highlight',
      prompt: 'Create engaging product description for moisturizer',
      output: 'Introducing our revolutionary hydrating moisturizer formula...',
      status: 'draft',
      platform: 'instagram',
      hashtags: '#moisturizer #skincare #hydration',
      createdAt: new Date().toISOString(),
    },
  ],
  message: null,
};

export const FALLBACK_FORECAST = {
  ok: true,
  data: {
    forecast: [
      { date: '2024-05-08', value: 1250, accuracy: 92 },
      { date: '2024-05-09', value: 1320, accuracy: 90 },
      { date: '2024-05-10', value: 1180, accuracy: 88 },
      { date: '2024-05-11', value: 1450, accuracy: 91 },
      { date: '2024-05-12', value: 1380, accuracy: 89 },
    ],
  },
  message: null,
};

/**
 * Get fallback data for a given endpoint
 */
export function getFallbackData(endpoint: string): any {
  const fallbacks: { [key: string]: any } = {
    '/dashboard': FALLBACK_DASHBOARD_DATA,
    '/analytics/summary': FALLBACK_ANALYTICS_SUMMARY,
    '/analytics/trend': FALLBACK_ANALYTICS_TREND,
    '/products': FALLBACK_PRODUCTS,
    '/sales': FALLBACK_SALES_SUMMARY,
    '/campaigns': FALLBACK_CAMPAIGNS,
    '/ai-content': FALLBACK_AI_CONTENT,
    '/forecast': FALLBACK_FORECAST,
  };

  return fallbacks[endpoint] || {
    ok: false,
    data: null,
    message: 'No fallback data available',
  };
}

/**
 * Check if should use fallback
 */
export function shouldUseFallback(error: any): boolean {
  if (!error) return false;

  // Use fallback for network errors
  const networkErrors = [
    'Network error',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'Connection timeout',
    'ERR_NETWORK',
  ];

  const errorMessage = error.message || String(error);
  return networkErrors.some(err => errorMessage.includes(err));
}