import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * POST /api/sales
 * Create sale with transaction + stock deduction
 */
router.post("/", async (req, res) => {
  const { items } = req.body as {
    items?: { productId: number; qty: number; unitPrice: number }[];
  };

  // Validate request body
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Items are required" });
  }

  for (const item of items) {
    if (
      typeof item.productId !== "number" ||
      typeof item.qty !== "number" ||
      typeof item.unitPrice !== "number" ||
      item.qty <= 0 ||
      item.unitPrice < 0
    ) {
      return res.status(400).json({ message: "Invalid item data" });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Lock all product rows first (prevents race conditions)
    const productIds = items.map((i) => i.productId);
    const lockResult = await client.query(
      `SELECT id, stock 
       FROM products 
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      [productIds]
    );

    if (lockResult.rows.length !== productIds.length) {
      throw new Error("One or more products not found");
    }

    // 2) Check stock + calculate total
    let total = 0;

    for (const item of items) {
      const row = lockResult.rows.find((r) => r.id === item.productId);
      if (!row) throw new Error(`Product ${item.productId} not found`);

      if (row.stock < item.qty) {
        throw new Error(
          `Insufficient stock for product ${item.productId} (current: ${row.stock}, requested: ${item.qty})`
        );
      }

      total += item.qty * item.unitPrice;
    }

    // 3) Insert sale
    const saleResult = await client.query(
      `INSERT INTO sales (total, created_at)
       VALUES ($1, NOW())
       RETURNING id, total, created_at`,
      [total]
    );

    const sale = saleResult.rows[0];

    // 4) Insert sale_items + decrement stock (safe update)
    const createdItems: any[] = [];

    for (const item of items) {
      const saleItemRes = await client.query(
        `INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sale_id, product_id, qty, unit_price`,
        [sale.id, item.productId, item.qty, item.unitPrice]
      );

      const updateRes = await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1`,
        [item.qty, item.productId]
      );

      // Extra safety: if update didn't happen, rollback
      if (updateRes.rowCount !== 1) {
        throw new Error(`Stock update failed for product ${item.productId}`);
      }

      createdItems.push(saleItemRes.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      sale,
      items: createdItems,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/sales
 * List all sales
 */
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, total, created_at FROM sales ORDER BY created_at DESC"
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch sales" });
  }
});

/**
 * GET /api/sales/:id
 * Get sale with items + product info
 */
router.get("/:id", async (req, res) => {
  const saleId = Number(req.params.id);
  if (!Number.isFinite(saleId)) {
    return res.status(400).json({ message: "Invalid sale id" });
  }

  try {
    const saleResult = await pool.query(
      "SELECT id, total, created_at FROM sales WHERE id = $1",
      [saleId]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const itemsResult = await pool.query(
      `SELECT 
          si.product_id,
          si.qty,
          si.unit_price,
          p.name,
          p.sku
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1
       ORDER BY si.id ASC`,
      [saleId]
    );

    return res.json({
      sale: saleResult.rows[0],
      items: itemsResult.rows,
    });
  } catch {
    return res.status(500).json({ message: "Failed to fetch sale" });
  }
});

export default router;