import { Router } from 'express';
import { pool } from '../db/pool';

export const salesRouter = Router();

// POST /api/sales  (when mounted under /api -> route is /sales)
salesRouter.post('/sales', async (req, res) => {
  const { items } = req.body as {
    items?: Array<{ productId: number; qty: number; unitPrice: number }>;
  };

  // Validate
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items must be a non-empty array' });
  }
  for (const [i, it] of items.entries()) {
    if (typeof it.productId !== 'number') {
      return res.status(400).json({ message: `items[${i}].productId must be a number` });
    }
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      return res.status(400).json({ message: `items[${i}].qty must be an integer > 0` });
    }
    if (typeof it.unitPrice !== 'number' || it.unitPrice < 0) {
      return res.status(400).json({ message: `items[${i}].unitPrice must be a number >= 0` });
    }
  }

  const total = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Insert into sales
    const saleResult = await client.query(
      `INSERT INTO sales (total) VALUES ($1) RETURNING id, total, created_at`,
      [total]
    );
    const sale = saleResult.rows[0];

    // 2) Insert sale_items + 3) decrement stock
    const createdItems: any[] = [];

    for (const it of items) {
      // Lock product row
      const stockRes = await client.query(
        `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
        [it.productId]
      );

      if (stockRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Product not found: ${it.productId}` });
      }

      const currentStock = Number(stockRes.rows[0].stock);
      if (currentStock - it.qty < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Insufficient stock for product ${it.productId}`,
          productId: it.productId,
          currentStock,
          requestedQty: it.qty,
        });
      }

      const itemResult = await client.query(
        `
        INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
        VALUES ($1, $2, $3, $4)
        RETURNING id, sale_id AS "saleId", product_id AS "productId", qty, unit_price AS "unitPrice"
        `,
        [sale.id, it.productId, it.qty, it.unitPrice]
      );
      createdItems.push(itemResult.rows[0]);

      await client.query(
        `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
        [it.qty, it.productId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({ sale, items: createdItems });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ message: 'Failed to create sale', error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/sales
salesRouter.get('/sales', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, total, created_at FROM sales ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch sales', error: err.message });
  }
});

// GET /api/sales/:id
salesRouter.get('/sales/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const saleResult = await pool.query(
      `SELECT id, total, created_at FROM sales WHERE id = $1`,
      [id]
    );
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const itemsResult = await pool.query(
      `
      SELECT
        si.id,
        si.sale_id AS "saleId",
        si.product_id AS "productId",
        p.sku,
        p.name,
        si.qty,
        si.unit_price AS "unitPrice"
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
      ORDER BY si.id ASC
      `,
      [id]
    );

    res.json({ sale: saleResult.rows[0], items: itemsResult.rows });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch sale', error: err.message });
  }
});