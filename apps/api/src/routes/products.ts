import { Router } from 'express';
import { pool } from '../db/pool';

export const productsRouter = Router();

// GET /api/products
productsRouter.get('/api/products', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id, sku, name, category, price, cost, stock,
        low_stock_threshold AS "lowStockThreshold",
        description, created_at, updated_at
      FROM products
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/products]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products
productsRouter.post('/api/products', async (req, res) => {
  try {
    const { sku, name, category, price, cost, stock, lowStockThreshold, description } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: 'SKU and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO products (sku, name, category, price, cost, stock, low_stock_threshold, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING
         id, sku, name, category, price, cost, stock,
         low_stock_threshold AS "lowStockThreshold",
         description, created_at, updated_at`,
      [
        sku, name,
        category ?? 'Skincare',
        price ?? 0,
        cost ?? 0,
        stock ?? 0,
        lowStockThreshold ?? 20,
        description ?? '',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // Duplicate SKU — return a friendly error instead of crashing
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('[POST /api/products]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id
productsRouter.put('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { sku, name, category, price, cost, stock, lowStockThreshold, description } = req.body;

    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!sku || !name) return res.status(400).json({ error: 'SKU and name are required' });

    const result = await pool.query(
      `UPDATE products
       SET
         sku = $1, name = $2, category = $3, price = $4,
         cost = $5, stock = $6, low_stock_threshold = $7,
         description = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING
         id, sku, name, category, price, cost, stock,
         low_stock_threshold AS "lowStockThreshold",
         description, created_at, updated_at`,
      [
        sku, name,
        category ?? 'Skincare',
        price ?? 0,
        cost ?? 0,
        stock ?? 0,
        lowStockThreshold ?? 20,
        description ?? '',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    // Duplicate SKU on update
    if (err.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('[PUT /api/products/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/products/:id
productsRouter.delete('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ ok: true, deletedId: result.rows[0].id });
  } catch (err) {
    console.error('[DELETE /api/products/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});