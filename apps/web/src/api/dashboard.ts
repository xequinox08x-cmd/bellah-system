import { offlineStore } from '../lib/offlineStore';
import { getProducts, getSalesRecords } from '../lib/dashboardData';

export type DashboardSummary = {
  totalSales: number;
  revenueToday: number;
  lowStockItems: number;
  scheduledPosts: number;
  engagementRate: number;
};

export type LowStockProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number;
  lowStockThreshold: number;
  status: 'critical' | 'low';
  ratio: number;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDashboardSummary(start?: string, end?: string) {
  const startDate = start || todayIso();
  const endDate = end || todayIso();
  const sales = getSalesRecords().filter((sale) => sale.date >= startDate && sale.date <= endDate);
  const products = getProducts();
  const lowStockProducts = products
    .filter((product) => product.lowStockThreshold > 0 && product.stock <= product.lowStockThreshold)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: (product.stock <= product.lowStockThreshold * 0.6 ? 'critical' : 'low') as 'critical' | 'low',
      ratio: product.lowStockThreshold > 0 ? product.stock / product.lowStockThreshold : 0,
    }));

  const salesTrendMap = new Map<string, { revenue: number; profit: number }>();
  getSalesRecords().forEach((sale) => {
    const current = salesTrendMap.get(sale.date) || { revenue: 0, profit: 0 };
    current.revenue += sale.total;
    current.profit += sale.profit;
    salesTrendMap.set(sale.date, current);
  });

  return {
    ok: true,
    summary: {
      totalSales: sales.length,
      revenueToday: sales.reduce((sum, sale) => sum + sale.total, 0),
      lowStockItems: lowStockProducts.length,
      scheduledPosts: 0,
      engagementRate: 0,
    },
    lowStockProducts,
    salesTrend: Array.from(salesTrendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values })),
  };
}

export function getDashboardSalesRecords() {
  return { data: getSalesRecords() };
}
