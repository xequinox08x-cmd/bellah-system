import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

// Moving average forecast: uses last 30 days of sales per product
// Returns predicted daily revenue for the next 7 days
async function generateForecast(productId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(SUM(si.qty * si.unit_price), 0) AS daily_revenue
     FROM sales s
     JOIN sale_items si ON si.sale_id = s.id
     WHERE si.product_id = $1
       AND s.created_at >= NOW() - INTERVAL '30 days'`,
    [productId]
  );
  const totalRevenue = parseFloat(result.rows[0].daily_revenue);
  // Average daily revenue over 30 days
  return parseFloat((totalRevenue / 30).toFixed(2));
}

// ── POST /api/forecasts/generate ─────────────────────────────────────────────
// Generates 7-day forecast for all products with sales history
router.post('/generate', async (_req: Request, res: Response) => {
  try {
    // Get all products
    const products = await pool.query(`SELECT id, name FROM products`);

    const forecasts = [];

    for (const product of products.rows) {
      const dailyForecast = await generateForecast(product.id);

      // Insert 7 days of forecast rows
      for (let i = 1; i <= 7; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        const dateStr = forecastDate.toISOString().split('T')[0];

        // Upsert — if forecast already exists for this product+date, update it
        const row = await pool.query(
          `INSERT INTO ai_forecast (product_id, forecast_date, forecast_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, forecast_date)
           DO UPDATE SET forecast_value = EXCLUDED.forecast_value, created_at = NOW()
           RETURNING *`,
          [product.id, dateStr, dailyForecast]
        );
        forecasts.push(row.rows[0]);
      }
    }

    res.json({ message: `Generated forecasts for ${products.rowCount} products`, data: forecasts });
  } catch (err) {
    console.error('POST /api/forecasts/generate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/forecasts ────────────────────────────────────────────────────────
// Returns all forecasts with product name
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        f.id,
        f.product_id,
        f.forecast_date,
        f.forecast_value,
        f.actual_value,
        f.accuracy,
        f.created_at,
        p.name AS product_name
       FROM ai_forecast f
       JOIN products p ON p.id = f.product_id
       ORDER BY f.forecast_date ASC, p.name ASC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/forecasts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/forecasts/alerts ─────────────────────────────────────────────────
// Returns products where actual sales today are below 50% of forecast
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(si.qty * si.unit_price), 0) AS actual_today,
        f.forecast_value,
        CASE
          WHEN f.forecast_value > 0
          THEN ROUND((COALESCE(SUM(si.qty * si.unit_price), 0) / f.forecast_value) * 100, 1)
          ELSE 0
        END AS pct_of_forecast
       FROM products p
       LEFT JOIN ai_forecast f
         ON f.product_id = p.id
         AND f.forecast_date = CURRENT_DATE
       LEFT JOIN sale_items si ON si.product_id = p.id
       LEFT JOIN sales s
         ON s.id = si.sale_id
         AND s.created_at >= CURRENT_DATE
       WHERE f.forecast_value IS NOT NULL
         AND f.forecast_value > 0
       GROUP BY p.id, p.name, f.forecast_value
       HAVING COALESCE(SUM(si.qty * si.unit_price), 0) < f.forecast_value * 0.5
       ORDER BY pct_of_forecast ASC`
    );
    res.json({ data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('GET /api/forecasts/alerts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;