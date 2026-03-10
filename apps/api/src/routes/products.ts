import { Router } from "express";
import { pool } from "../db/pool";

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
const selectCols = `
  id,
  sku,
  name,
  category,
  price,
  cost,
  stock,
  low_stock_threshold AS "lowStockThreshold",
  description,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// GET /api/products?search=&category=&lowStock=true
productsRouter.get("/", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const lowStock = req.query.lowStock === "true";

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }

    if (lowStock) {
      where.push(`stock <= low_stock_threshold`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT ${selectCols} FROM products ${whereSql} ORDER BY id DESC`,
      params
    );

    res.json({ ok: true, data: result.rows, message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to load products" });
  }
});

// GET /api/products/:id
productsRouter.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const result = await pool.query(`SELECT ${selectCols} FROM products WHERE id = $1`, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to load product" });
  }
});

// POST /api/products
productsRouter.post("/", async (req, res) => {
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
      return res.status(400).json({ ok: false, data: null, message: "sku and name are required" });
    }

    if ([price, cost, stock, lowStockThreshold].some(v => v !== undefined && Number.isNaN(Number(v)))) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "price, cost, stock, and lowStockThreshold must be numbers"
    });
  }

    const result = await pool.query(
      `
      INSERT INTO products (sku, name, category, price, cost, stock, low_stock_threshold, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING ${selectCols}
      `,
      [
        sku,
        name,
        category ?? "Skincare",
        Number(price ?? 0),
        Number(cost ?? 0),
        Number(stock ?? 0),
        Number(lowStockThreshold ?? 20),
        description ?? "",
      ]
    );

    res.status(201).json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to create product" });
  }
});

// PUT /api/products/:id
productsRouter.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const { sku, name, category, price, cost, stock, lowStockThreshold, description } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ ok: false, data: null, message: "sku and name are required" });
    }

    if ([price, cost, stock, lowStockThreshold].some(v => v !== undefined && Number.isNaN(Number(v)))) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "price, cost, stock, and lowStockThreshold must be numbers"
    });
  }

    const result = await pool.query(
      `
      UPDATE products
      SET
        sku = $1,
        name = $2,
        category = $3,
        price = $4,
        cost = $5,
        stock = $6,
        low_stock_threshold = $7,
        description = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING ${selectCols}
      `,
      [
        sku,
        name,
        category ?? "Skincare",
        Number(price ?? 0),
        Number(cost ?? 0),
        Number(stock ?? 0),
        Number(lowStockThreshold ?? 20),
        description ?? "",
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to update product" });
  }
});

// PATCH /api/products/:id/stock  body: { delta?: number } or { stock?: number }
productsRouter.patch("/:id/stock", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const { delta, stock } = req.body ?? {};

    // Exactly one of them should be provided
    const hasDelta = typeof delta === "number";
    const hasStock = typeof stock === "number";

    if (hasDelta === hasStock) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "Provide either { delta: number } or { stock: number }",
      });
    }

    const result = hasDelta
      ? await pool.query(
          `
          UUPDATE products
          SET stock = stock + $1, updated_at = NOW()
          WHERE id = $2 AND stock + $1 >= 0
          RETURNING ... ${selectCols}
          `,
          [delta, id]
        )
      : await pool.query(
          `
          UPDATE products
          SET stock = GREATEST($1, 0), updated_at = NOW()
          WHERE id = $2
          RETURNING ${selectCols}
          `,
          [stock, id]
        );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to update stock" });
  }
});

// DELETE /api/products/:id
productsRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    res.json({ ok: true, data: { deletedId: result.rows[0].id }, message: null });
  } catch (e: any) {
    res.status(500).json({ ok: false, data: null, message: e.message || "Failed to delete product" });
  }
});