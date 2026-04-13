import { Router } from "express";
import { pool } from "../db/pool";

export const productsRouter = Router();

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

function hasInvalidNumber(values: unknown[]): boolean {
  return values.some((value) => value !== undefined && Number.isNaN(Number(value)));
}

// GET /api/products?search=&category=&lowStock=true
productsRouter.get("/", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const lowStock = req.query.lowStock === "true";

    const where: string[] = [`is_active = TRUE`];
    const params: unknown[] = [];

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
    const { sku, name, category, price, cost, stock, lowStockThreshold, description } = req.body ?? {};

    if (!sku || !name) {
      return res.status(400).json({ ok: false, data: null, message: "sku and name are required" });
    }

    if (hasInvalidNumber([price, cost, stock, lowStockThreshold])) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "price, cost, stock, and lowStockThreshold must be numbers",
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
    if (e?.code === "23505") {
      return res.status(400).json({ ok: false, data: null, message: "SKU already exists" });
    }

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

    const { sku, name, category, price, cost, stock, lowStockThreshold, description } = req.body ?? {};

    if (!sku || !name) {
      return res.status(400).json({ ok: false, data: null, message: "sku and name are required" });
    }

    if (hasInvalidNumber([price, cost, stock, lowStockThreshold])) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "price, cost, stock, and lowStockThreshold must be numbers",
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
    if (e?.code === "23505") {
      return res.status(400).json({ ok: false, data: null, message: "SKU already exists" });
    }

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
          UPDATE products
          SET stock = stock + $1, updated_at = NOW()
          WHERE id = $2 AND stock + $1 >= 0
          RETURNING ${selectCols}
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
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const existingProduct = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [id]
    );

    if (!existingProduct.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    const salesUsage = await pool.query(
      "SELECT 1 FROM sale_items WHERE product_id = $1 LIMIT 1",
      [id]
    );

    if (salesUsage.rows.length > 0) {
      const archivedProduct = await pool.query(
        `
        UPDATE products
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      if (!archivedProduct.rows.length) {
        return res.status(404).json({ ok: false, data: null, message: "Product not found" });
      }

      return res.json({
        ok: true,
        data: { id: archivedProduct.rows[0].id, action: "archived" },
        message: "Product archived because it already exists in sales records.",
      });
    }

    try {
      const deletedProduct = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING id",
        [id]
      );

      if (!deletedProduct.rows.length) {
        return res.status(404).json({ ok: false, data: null, message: "Product not found" });
      }

      return res.json({
        ok: true,
        data: { id: deletedProduct.rows[0].id, action: "deleted" },
        message: "Product deleted successfully.",
      });
    } catch (e: any) {
      if (e?.code === "23503") {
        const archivedProduct = await pool.query(
          `
          UPDATE products
          SET is_active = FALSE, updated_at = NOW()
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

        if (!archivedProduct.rows.length) {
          return res.status(404).json({ ok: false, data: null, message: "Product not found" });
        }

        return res.json({
          ok: true,
          data: { id: archivedProduct.rows[0].id, action: "archived" },
          message: "Product archived because it already exists in sales records.",
        });
      }

      throw e;
    }
  } catch (e: any) {
    console.error("[DELETE /api/products/:id] Failed to remove product", e);
    res.status(500).json({
      ok: false,
      data: null,
      message: "Failed to remove product. Please try again.",
    });
  }
});
