/**
 * Mock Data Generator with Randomization
 * Generates realistic test data for all API endpoints
 */

import crypto from 'crypto';

// Utility functions
function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(): string {
  return crypto.randomUUID();
}

function randomDate(daysAgo: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - random(0, daysAgo));
  return date.toISOString();
}

function randomEmail(): string {
  const names = ['john', 'jane', 'alex', 'sam', 'taylor', 'morgan', 'casey', 'jordan'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
  return `${randomElement(names)}${random(1, 999)}@${randomElement(domains)}`;
}

// Product categories and names
const categories = ['Skincare', 'Haircare', 'Makeup', 'Wellness', 'Supplements'];
const productNames = [
  'Premium Skincare Set', 'Face Moisturizer', 'Facial Cleanser', 'Eye Cream',
  'Anti-Aging Serum', 'Face Mask', 'Toner', 'Sunscreen SPF 50',
  'Shampoo', 'Conditioner', 'Hair Oil', 'Hair Mask',
  'Foundation', 'Lipstick', 'Eye Shadow', 'Mascara',
  'Vitamin C Supplement', 'Collagen Powder', 'Biotin Tablets', 'Omega-3 Oil'
];

// Generate Products
export function generateProduct(id: number = random(1, 10000)) {
  const name = randomElement(productNames);
  const category = randomElement(categories);
  const cost = random(300, 2000) / 100;
  const price = Math.round(cost * random(150, 300)) / 100;
  const stock = random(5, 500);
  
  return {
    id,
    sku: `SKU-${String(id).padStart(5, '0')}`,
    name: `${name} ${random(1, 5)}`,
    price,
    cost,
    stock,
    lowStockThreshold: 20,
    category,
    description: `High quality ${category.toLowerCase()} product with premium ingredients`,
    imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(name)}`,
    createdAt: randomDate(180),
    updatedAt: randomDate(30),
  };
}

export function generateProducts(count: number = 50) {
  return Array.from({ length: count }, (_, i) => generateProduct(i + 1));
}

// Generate Sales
export function generateSale(id: number = random(1, 100000)) {
  const items = random(1, 15);
  const itemTotal = random(5000, 50000);
  
  return {
    id,
    customerId: random(1, 1000),
    customerName: `Customer ${random(1, 5000)}`,
    staffName: randomElement(['John Smith', 'Jane Doe', 'Alex Johnson', 'Sam Wilson']),
    items,
    total: itemTotal,
    discount: random(0, 20) / 100,
    taxRate: 0.1,
    taxAmount: itemTotal * 0.1,
    profit: random(1000, 10000),
    paymentMethod: randomElement(['Credit Card', 'Debit Card', 'Cash', 'Mobile Payment']),
    status: randomElement(['completed', 'pending', 'cancelled']),
    createdAt: randomDate(90),
    updatedAt: randomDate(30),
  };
}

export function generateSales(count: number = 100) {
  return Array.from({ length: count }, (_, i) => generateSale(i + 1));
}

// Generate Sale Lines
export function generateSaleLine(saleId: number, index: number, products: any[]) {
  const product = randomElement(products);
  const quantity = random(1, 20);
  const unitPrice = product.price;
  const total = quantity * unitPrice;
  
  return {
    id: randomId(),
    saleId,
    productId: product.id,
    productName: product.name,
    category: product.category,
    quantity,
    unitPrice,
    total,
    profit: (unitPrice - product.cost) * quantity,
    date: randomDate(90),
    createdAt: randomDate(90),
    customerName: `Customer ${random(1, 5000)}`,
    staffName: randomElement(['John Smith', 'Jane Doe', 'Alex Johnson', 'Sam Wilson']),
  };
}

export function generateSaleLines(sales: any[], products: any[]) {
  const lines: any[] = [];
  sales.forEach(sale => {
    for (let i = 0; i < sale.items; i++) {
      lines.push(generateSaleLine(sale.id, i, products));
    }
  });
  return lines;
}

// Generate AI Content
export function generateAIContent(id: number = random(1, 10000)) {
  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
  const contentTypes = ['post', 'carousel', 'reel', 'story', 'article'];
  
  return {
    id,
    platform: randomElement(platforms),
    contentType: randomElement(contentTypes),
    title: `Content Post ${id}`,
    content: `This is an AI-generated social media post with randomized content. ${randomElement(['Share this with your audience!', 'Engage with your followers today!', 'Boost your online presence now!'])}`,
    output: `This is an AI-generated social media post with randomized content. ${randomElement(['Share this with your audience!', 'Engage with your followers today!', 'Boost your online presence now!'])}`,
    imageUrl: `https://via.placeholder.com/600x400?text=Post+${id}`,
    hashtags: ['#marketing', '#socialmedia', '#ecommerce', '#business', '#trending'].slice(0, random(2, 5)).join(' '),
    engagementScore: random(1, 100),
    status: randomElement(['draft', 'published', 'scheduled']),
    scheduledFor: randomDate(30),
    createdAt: randomDate(90),
    updatedAt: randomDate(30),
  };
}

export function generateAIContents(count: number = 50) {
  return Array.from({ length: count }, (_, i) => generateAIContent(i + 1));
}

// Generate Campaigns
export function generateCampaign(id: number = random(1, 1000)) {
  const startDate = new Date(randomDate(60));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + random(7, 90));
  
  return {
    id,
    name: `Campaign ${id}`,
    description: `Marketing campaign targeting ${randomElement(['new customers', 'loyal customers', 'seasonal sales', 'product launch'])}`,
    platform: randomElement(['facebook', 'instagram', 'email', 'sms']),
    status: randomElement(['active', 'paused', 'completed', 'scheduled']),
    budget: random(50000, 500000) / 100,
    spent: random(10000, 400000) / 100,
    reach: random(1000, 100000),
    clicks: random(50, 10000),
    conversions: random(5, 1000),
    roas: (random(150, 800) / 100),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    createdAt: randomDate(180),
    updatedAt: randomDate(30),
  };
}

export function generateCampaigns(count: number = 20) {
  return Array.from({ length: count }, (_, i) => generateCampaign(i + 1));
}

// Generate Scheduled Posts
export function generateScheduledPost(id: number = random(1, 10000)) {
  const scheduleDate = new Date();
  scheduleDate.setDate(scheduleDate.getDate() + random(1, 60));
  
  return {
    id,
    content: `Scheduled post content for ${randomElement(['product launch', 'seasonal promotion', 'customer engagement'])}`,
    platform: randomElement(['facebook', 'instagram', 'twitter', 'linkedin']),
    mediaUrl: `https://via.placeholder.com/600x400?text=Scheduled+${id}`,
    scheduledTime: scheduleDate.toISOString(),
    status: randomElement(['scheduled', 'published', 'failed']),
    createdAt: randomDate(90),
    updatedAt: randomDate(30),
  };
}

export function generateScheduledPosts(count: number = 30) {
  return Array.from({ length: count }, (_, i) => generateScheduledPost(i + 1));
}

// Generate Users
export function generateUser(id: number = random(1, 10000)) {
  return {
    id,
    email: randomEmail(),
    name: randomElement(['John Smith', 'Jane Doe', 'Alex Johnson', 'Sam Wilson', 'Taylor Brown']),
    role: randomElement(['admin', 'manager', 'staff', 'viewer']),
    status: randomElement(['active', 'inactive']),
    department: randomElement(['Sales', 'Marketing', 'Operations', 'Management']),
    createdAt: randomDate(365),
    lastLogin: randomDate(7),
  };
}

export function generateUsers(count: number = 10) {
  return Array.from({ length: count }, (_, i) => generateUser(i + 1));
}

// Generate Analytics Data
export function generateAnalyticsTrend() {
  const trends = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      likes: random(200, 1000),
      comments: random(20, 300),
      shares: random(5, 150),
      reach: random(2000, 20000),
      engagementRate: random(500, 3000) / 100,
    });
  }
  return trends;
}

export function generateAnalyticsSummary() {
  return {
    likes: random(5000, 50000),
    comments: random(1000, 10000),
    shares: random(200, 5000),
    reach: random(50000, 500000),
    engagementRate: random(500, 3000) / 100,
    postCount: random(10, 100),
    lastSyncedAt: new Date().toISOString(),
  };
}

// Generate Dashboard Data
export function generateDashboardData(products: any[], sales: any[], saleLines: any[]) {
  const topProduct = randomElement(products);
  const recentSales = sales.slice(0, 5).map(s => ({
    id: s.id,
    total: s.total,
    items: s.items,
    createdAt: s.createdAt,
  }));
  
  return {
    totalSales: sales.reduce((sum, s) => sum + s.total, 0),
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock < p.lowStockThreshold).length,
    topProduct: {
      id: topProduct.id,
      name: topProduct.name,
      sales: random(50, 500),
      revenue: random(5000, 50000),
    },
    recentSales,
  };
}

// Initialize all mock data
export function generateAllMockData() {
  const products = generateProducts(50);
  const sales = generateSales(100);
  const saleLines = generateSaleLines(sales, products);
  
  return {
    products,
    sales,
    saleLines,
    aiContent: generateAIContents(50),
    campaigns: generateCampaigns(20),
    scheduledPosts: generateScheduledPosts(30),
    users: generateUsers(10),
    analyticsTrend: generateAnalyticsTrend(),
    analyticsSummary: generateAnalyticsSummary(),
  };
}
