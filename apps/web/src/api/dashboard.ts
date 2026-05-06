import { api } from '../lib/api';

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

export type StaffTodaySales = {
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

export async function getDashboardSummary(start?: string, end?: string) {
  return api.getDashboardSummary(start, end) as Promise<{
    ok: boolean;
    summary: DashboardSummary;
    lowStockProducts: LowStockProduct[];
    salesTrend: Array<{
      date: string;
      revenue: number;
      profit: number;
    }>;
  }>;
}

export async function getStaffTodaySales(): Promise<StaffTodaySales> {
  const response = await api.getStaffTodaySales();
  return response.todaySales;
}
