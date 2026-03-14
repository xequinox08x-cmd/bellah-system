import { Router } from "express";
import { pool } from "../db/pool";

export const dashboardRouter = Router();

type SummaryRow = {
  total_sales: number;
  revenue_today: string | number;
  low_stock_items: number;
};

type TrendRow = {
  date: string;
  revenue: string | number;
  profit: string | number;
};

type LowStockRow = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number;
  low_stock_threshold: number;
};

type LowStockProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number;
  lowStockThreshold: number;
  status: "critical" | "low";
  ratio: number;
};

type TodaySalesRow = {
  sale_id: number;
  product_id: number;
  product_name: string;
  category: string | null;
  customer_name: string | null;
  qty: number;
  line_total: string | number;
  line_profit: string | number;
};

type TodaySalesItem = {
  saleId: number;
  productId: number;
  productName: string;
  category: string;
  customerName: string;
  qty: number;
  lineTotal: number;
  lineProfit: number;
};

type TodaySalesSummary = {
  transactionCount: number;
  unitsSold: number;
  revenueTotal: number;
  profitTotal: number;
  items: TodaySalesItem[];
};

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(input: Date, days: number): Date {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

dashboardRouter.get("/api/staff/dashboard/today-sales", async (_req, res) => {
  try {
    const result = await pool.query<TodaySalesRow>(
      `
      SELECT
        s.id AS sale_id,
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(p.category, 'Uncategorized') AS category,
        COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer') AS customer_name,
        si.qty,
        (si.qty * si.unit_price) AS line_total,
        (si.qty * (si.unit_price - COALESCE(p.cost, 0))) AS line_profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.created_at::date = CURRENT_DATE
      ORDER BY s.created_at DESC, si.id DESC
      `
    );

    const items: TodaySalesItem[] = result.rows.map((row) => ({
      saleId: Number(row.sale_id),
      productId: Number(row.product_id),
      productName: String(row.product_name),
      category: String(row.category ?? "Uncategorized"),
      customerName: String(row.customer_name ?? "Walk-in Customer"),
      qty: Number(row.qty ?? 0),
      lineTotal: Number(row.line_total ?? 0),
      lineProfit: Number(row.line_profit ?? 0),
    }));

    const summary: TodaySalesSummary = {
      transactionCount: new Set(items.map((item) => item.saleId)).size,
      unitsSold: items.reduce((sum, item) => sum + item.qty, 0),
      revenueTotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
      profitTotal: items.reduce((sum, item) => sum + item.lineProfit, 0),
      items,
    };

    return res.json({
      ok: true,
      todaySales: summary,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Failed to load today's sales",
    });
  }
});

dashboardRouter.get("/api/dashboard/summary", async (req, res) => {
  try {
    const startQuery = typeof req.query.start === "string" ? req.query.start.trim() : "";
    const endQuery = typeof req.query.end === "string" ? req.query.end.trim() : "";

    const today = new Date();
    const defaultEnd = formatDate(today);
    const defaultStart = formatDate(addDays(new Date(`${defaultEnd}T00:00:00.000Z`), -29));

    const startDate = startQuery || defaultStart;
    const endDate = endQuery || defaultEnd;

    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid date range. Use YYYY-MM-DD for start and end.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        ok: false,
        message: "Invalid date range. start must be less than or equal to end.",
      });
    }

    const [summaryResult, trendResult, lowStockResult] = await Promise.all([
      pool.query<SummaryRow>(
        `
        SELECT
          (SELECT COUNT(*)::int
           FROM sales
           WHERE created_at::date BETWEEN $1 AND $2) AS total_sales,
          (SELECT COALESCE(SUM(total), 0)
           FROM sales
           WHERE created_at::date = CURRENT_DATE) AS revenue_today,
          (SELECT COUNT(*)::int
           FROM products
           WHERE low_stock_threshold IS NOT NULL
             AND low_stock_threshold > 0
             AND stock <= low_stock_threshold) AS low_stock_items
        `,
        [startDate, endDate]
      ),
      pool.query<TrendRow>(
        `
        WITH days AS (
          SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS date
        ),
        daily_revenue AS (
          SELECT
            s.created_at::date AS date,
            COALESCE(SUM(s.total), 0) AS revenue
          FROM sales s
          WHERE s.created_at::date BETWEEN $1::date AND $2::date
          GROUP BY s.created_at::date
        ),
        daily_profit AS (
          SELECT
            s.created_at::date AS date,
            COALESCE(SUM(si.qty * (si.unit_price - COALESCE(p.cost, 0))), 0) AS profit
          FROM sales s
          LEFT JOIN sale_items si ON si.sale_id = s.id
          LEFT JOIN products p ON p.id = si.product_id
          WHERE s.created_at::date BETWEEN $1::date AND $2::date
          GROUP BY s.created_at::date
        )
        SELECT
          to_char(d.date, 'YYYY-MM-DD') AS date,
          COALESCE(dr.revenue, 0) AS revenue,
          COALESCE(dp.profit, 0) AS profit
        FROM days d
        LEFT JOIN daily_revenue dr ON dr.date = d.date
        LEFT JOIN daily_profit dp ON dp.date = d.date
        ORDER BY d.date ASC
        `,
        [startDate, endDate]
      ),
      pool.query<LowStockRow>(
        `
        SELECT
          id,
          name,
          sku,
          category,
          stock,
          low_stock_threshold
        FROM products
        WHERE low_stock_threshold IS NOT NULL
          AND low_stock_threshold > 0
          AND stock <= low_stock_threshold
        ORDER BY stock ASC, name ASC
        `
      ),
    ]);

    const summary = summaryResult.rows[0];
    const lowStockProducts: LowStockProduct[] = lowStockResult.rows.map((row) => {
      const lowStockThreshold = Number(row.low_stock_threshold ?? 0);
      const stock = Number(row.stock ?? 0);
      const ratio = lowStockThreshold > 0 ? stock / lowStockThreshold : 0;

      return {
        id: Number(row.id),
        name: row.name,
        sku: row.sku,
        category: row.category,
        stock,
        lowStockThreshold,
        status: stock <= lowStockThreshold * 0.6 ? "critical" : "low",
        ratio,
      };
    });
    const salesTrend = trendResult.rows.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue ?? 0),
      profit: Number(row.profit ?? 0),
    }));

    return res.json({
      ok: true,
      summary: {
        totalSales: Number(summary?.total_sales ?? 0),
        revenueToday: Number(summary?.revenue_today ?? 0),
        lowStockItems: lowStockProducts.length || Number(summary?.low_stock_items ?? 0),
        scheduledPosts: 0,
        engagementRate: 0,
      },
      lowStockProducts,
      salesTrend,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Failed to load dashboard summary",
    });
  }
});
