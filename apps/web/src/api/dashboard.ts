const BASE_URL = "http://localhost:4000";

export type DashboardSummary = {
  totalSales: number;
  revenueToday: number;
  lowStockItems: number;
  scheduledPosts: number;
  engagementRate: number;
};

export type DashboardTrendPoint = {
  date: string;
  revenue: number;
  profit: number;
};

export type LowStockProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number;
  lowStockThreshold: number;
  status: "critical" | "low";
  ratio: number;
};

export type StaffTodaySalesItem = {
  saleId: number;
  productId: number;
  productName: string;
  category: string;
  customerName: string;
  qty: number;
  lineTotal: number;
  lineProfit: number;
};

export type StaffTodaySales = {
  transactionCount: number;
  unitsSold: number;
  revenueTotal: number;
  profitTotal: number;
  items: StaffTodaySalesItem[];
};

type DashboardSummaryResponse = {
  ok: boolean;
  summary: DashboardSummary;
  lowStockProducts?: LowStockProduct[];
  salesTrend: DashboardTrendPoint[];
  message?: string;
};

export async function getDashboardSummary(start: string, end: string): Promise<{
  summary: DashboardSummary;
  lowStockProducts: LowStockProduct[];
  salesTrend: DashboardTrendPoint[];
}> {
  const params = new URLSearchParams({ start, end });
  const res = await fetch(`${BASE_URL}/api/dashboard/summary?${params.toString()}`);
  const json: DashboardSummaryResponse = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.message || "Failed to load dashboard summary");
  }

  return {
    summary: {
      totalSales: Number(json.summary.totalSales ?? 0),
      revenueToday: Number(json.summary.revenueToday ?? 0),
      lowStockItems: Number(json.summary.lowStockItems ?? 0),
      scheduledPosts: Number(json.summary.scheduledPosts ?? 0),
      engagementRate: Number(json.summary.engagementRate ?? 0),
    },
    lowStockProducts: (json.lowStockProducts ?? []).map((product) => ({
      id: Number(product.id),
      name: product.name,
      sku: product.sku ?? null,
      category: product.category ?? null,
      stock: Number(product.stock ?? 0),
      lowStockThreshold: Number(product.lowStockThreshold ?? 0),
      status: product.status === "critical" ? "critical" : "low",
      ratio: Number(product.ratio ?? 0),
    })),
    salesTrend: (json.salesTrend ?? []).map((point) => ({
      date: point.date,
      revenue: Number(point.revenue ?? 0),
      profit: Number(point.profit ?? 0),
    })),
  };
}

type StaffTodaySalesResponse = {
  ok: boolean;
  todaySales?: StaffTodaySales;
  message?: string;
};

export async function getStaffTodaySales(): Promise<StaffTodaySales> {
  const res = await fetch(`${BASE_URL}/api/staff/dashboard/today-sales`);
  const json: StaffTodaySalesResponse = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.message || "Failed to load today's sales");
  }

  return {
    transactionCount: Number(json.todaySales?.transactionCount ?? 0),
    unitsSold: Number(json.todaySales?.unitsSold ?? 0),
    revenueTotal: Number(json.todaySales?.revenueTotal ?? 0),
    profitTotal: Number(json.todaySales?.profitTotal ?? 0),
    items: (json.todaySales?.items ?? []).map((item) => ({
      saleId: Number(item.saleId),
      productId: Number(item.productId),
      productName: item.productName,
      category: item.category,
      customerName: item.customerName || "Walk-in Customer",
      qty: Number(item.qty ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      lineProfit: Number(item.lineProfit ?? 0),
    })),
  };
}
