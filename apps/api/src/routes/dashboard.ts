import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Revenue calculations
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE), 0) as today,
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as week,
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as month
      FROM sales
    `;
    const revenueRes = await pool.query(revenueQuery);
    const { today, week, month } = revenueRes.rows[0];

    // 2. Top Products (last 30 days)
    const topProductsQuery = `
      SELECT 
        p.name,
        p.category,
        SUM(si.qty) as total_qty,
        SUM(si.qty * si.unit_price) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
      LIMIT 5
    `;
    const topProductsRes = await pool.query(topProductsQuery);

    // 3. Low Stock Items
    const lowStockRes = await pool.query(`
      SELECT id, name, sku, category, stock, low_stock_threshold
      FROM products
      WHERE stock <= low_stock_threshold
      ORDER BY stock ASC
      LIMIT 10
    `);

    res.json({
      data: {
        today: parseFloat(today),
        week: parseFloat(week),
        month: parseFloat(month),
        topProducts: topProductsRes.rows.map(r => ({
          ...r,
          total_qty: parseInt(r.total_qty),
          total_revenue: parseFloat(r.total_revenue)
        })),
        lowStock: lowStockRes.rows
      }
    });
  } catch (err) {
    console.error('Dashboard Summary Error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

export default router;
