import { Router } from "express";
import { pool } from "../db/pool";

export const salesRouter = Router();

type SaleRequestBody = {
  customerName?: string;
  staffName?: string;
  staffEmail?: string;
  createdBy?: number | string;
  created_by?: number | string;
  createdByClerkId?: string;
  created_by_clerk_id?: string;
  discountType?: "%" | "PHP" | string;
  discountValue?: number | string;
  items?: Array<{
    productId?: number | string;
    qty?: number | string;
    unitPrice?: number | string;
  }>;
};

let salesSchemaReady = false;
let salesSchemaPromise: Promise<void> | null = null;

function ensureSalesSchema() {
  if (salesSchemaReady) return Promise.resolve();
  if (salesSchemaPromise) return salesSchemaPromise;

  salesSchemaPromise = (async () => {
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS staff_name TEXT`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_type TEXT`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0`);
    salesSchemaReady = true;
  })().catch((err) => {
    salesSchemaPromise = null;
    throw err;
  });

  return salesSchemaPromise;
}

async function ensureDevAdminUser(client: any): Promise<number> {
  const upsert = await client.query(
    `
    INSERT INTO users (clerk_id, name, email, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (clerk_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role
    RETURNING id
    `,
    ["admin_001", "Admin User", "admin@bellah.test", "admin"]
  );

  return Number(upsert.rows[0].id);
}

async function resolveCreatedBy(
  client: any,
  body: SaleRequestBody
): Promise<{ id: number; source: "id" | "clerk_id" | "email" | "dev_admin" }> {
  const createdByNum = Number(body.createdBy ?? body.created_by);
  if (Number.isFinite(createdByNum) && createdByNum > 0) {
    const byId = await client.query(`SELECT id FROM users WHERE id = $1`, [createdByNum]);
    if (byId.rows.length) return { id: createdByNum, source: "id" };
  }

  const clerkIdRaw = body.createdByClerkId ?? body.created_by_clerk_id;
  const clerkId = typeof clerkIdRaw === "string" ? clerkIdRaw.trim() : "";
  if (clerkId) {
    const byClerk = await client.query(`SELECT id FROM users WHERE clerk_id = $1`, [clerkId]);
    if (byClerk.rows.length) return { id: Number(byClerk.rows[0].id), source: "clerk_id" };
  }

  const staffEmail = typeof body.staffEmail === "string" ? body.staffEmail.trim() : "";
  if (staffEmail) {
    const byEmail = await client.query(`SELECT id FROM users WHERE email = $1`, [staffEmail]);
    if (byEmail.rows.length) return { id: Number(byEmail.rows[0].id), source: "email" };
  }

  const adminId = await ensureDevAdminUser(client);
  return { id: adminId, source: "dev_admin" };
}

salesRouter.get("/", async (_req, res) => {
  try {
    await ensureSalesSchema();

    const result = await pool.query(
      `
      WITH line_items AS (
        SELECT
          s.id AS sale_id,
          si.id AS sale_item_id,
          to_char(s.created_at, 'YYYY-MM-DD') AS date,
          p.name AS product_name,
          COALESCE(p.category, 'Uncategorized') AS category,
          COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer') AS customer_name,
          si.qty,
          si.unit_price,
          COALESCE(p.cost, 0) AS unit_cost,
          COALESCE(NULLIF(TRIM(s.staff_name), ''), u.name, 'Staff') AS staff_name,
          COALESCE(
            NULLIF(s.discount_amount, 0),
            GREATEST(
              COALESCE(NULLIF(s.subtotal, 0), SUM(si.unit_price * si.qty) OVER (PARTITION BY s.id)) - s.total,
              0
            ),
            0
          ) AS sale_discount_amount,
          (si.unit_price * si.qty) AS line_subtotal,
          SUM(si.unit_price * si.qty) OVER (PARTITION BY s.id) AS sale_subtotal
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.id
        JOIN products p ON p.id = si.product_id
        LEFT JOIN users u ON u.id = s.created_by
      )
      SELECT
        (sale_id::text || '-' || sale_item_id::text) AS id,
        sale_id AS "saleId",
        date,
        product_name AS "productName",
        category,
        customer_name AS "customerName",
        qty AS quantity,
        unit_price AS "unitPrice",
        ROUND(
          (
            CASE WHEN sale_subtotal > 0
              THEN sale_discount_amount * (line_subtotal / sale_subtotal)
              ELSE 0
            END
          )::numeric,
          2
        ) AS "discountAmount",
        ROUND(
          (
            line_subtotal -
            CASE WHEN sale_subtotal > 0
              THEN sale_discount_amount * (line_subtotal / sale_subtotal)
              ELSE 0
            END
          )::numeric,
          2
        ) AS total,
        ROUND(
          (
            ((unit_price - unit_cost) * qty) -
            CASE WHEN sale_subtotal > 0
              THEN sale_discount_amount * (line_subtotal / sale_subtotal)
              ELSE 0
            END
          )::numeric,
          2
        ) AS profit,
        staff_name AS "staffName"
      FROM line_items
      ORDER BY "saleId" DESC, id DESC
      `
    );

    const rows = result.rows.map((r) => ({
      id: String(r.id),
      saleId: Number(r.saleId),
      date: String(r.date),
      productName: String(r.productName),
      category: String(r.category ?? "Uncategorized"),
      customerName: String(r.customerName ?? "Walk-in Customer"),
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
      discountAmount: Number(r.discountAmount ?? 0),
      total: Number(r.total),
      profit: Number(r.profit),
      staffName: String(r.staffName ?? "Staff"),
    }));

    return res.json({ ok: true, data: rows, message: null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to load sales" });
  }
});

salesRouter.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    await ensureSalesSchema();

    const body: SaleRequestBody = req.body ?? {};
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const staffName = typeof body.staffName === "string" ? body.staffName.trim() : "";

    const discountType: "%" | "PHP" = body.discountType === "%" ? "%" : "PHP";
    const discountValueRaw = Number(body.discountValue);
    const discountValue = Number.isFinite(discountValueRaw) && discountValueRaw > 0 ? discountValueRaw : 0;

    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, data: null, message: "Items are required" });
    }

    const item = items[0];
    const productId = Number(item?.productId);
    const qty = Number(item?.qty);
    const unitPrice = Number(item?.unitPrice);

    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid productId" });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid qty" });
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid unitPrice" });
    }

    await client.query("BEGIN");

    const prodRes = await client.query(
      `
      SELECT id, name, stock, low_stock_threshold
      FROM products
      WHERE id = $1
      FOR UPDATE
      `,
      [productId]
    );

    if (!prodRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    const product = prodRes.rows[0];
    const currentStock = Number(product.stock);

    if (currentStock < qty) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, data: null, message: "Insufficient stock" });
    }

    const subtotal = unitPrice * qty;
    const discountAmount =
      discountValue <= 0
        ? 0
        : discountType === "%"
        ? Math.min(subtotal * (discountValue / 100), subtotal)
        : Math.min(discountValue, subtotal);

    const total = subtotal - discountAmount;
    const { id: createdBy, source: createdBySource } = await resolveCreatedBy(client, body);

    const saleRes = await client.query(
      `
      INSERT INTO sales (
        total,
        created_by,
        created_at,
        customer_name,
        staff_name,
        subtotal,
        discount_type,
        discount_value,
        discount_amount
      )
      VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
      RETURNING id, total, created_by, created_at
      `,
      [
        total,
        createdBy,
        customerName || "Walk-in Customer",
        staffName || "Staff",
        subtotal,
        discountType,
        discountValue,
        discountAmount,
      ]
    );

    const saleId = Number(saleRes.rows[0].id);

    await client.query(
      `
      INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
      VALUES ($1, $2, $3, $4)
      `,
      [saleId, productId, qty, unitPrice]
    );

    await client.query(
      `
      UPDATE products
      SET stock = stock - $1, updated_at = NOW()
      WHERE id = $2
      `,
      [qty, productId]
    );

    const newStock = currentStock - qty;
    const lowStockThreshold = Number(product.low_stock_threshold);

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      data: {
        saleId,
        total,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        customerName: customerName || "Walk-in Customer",
        staffName: staffName || "Staff",
        createdBy,
        createdBySource,
        item: {
          productId,
          productName: product.name,
          qty,
          unitPrice,
        },
        stock: {
          before: currentStock,
          after: newStock,
          lowStockThreshold,
          isLowStock: newStock <= lowStockThreshold,
        },
      },
      message: null,
    });
  } catch (e: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to record sale",
    });
  } finally {
    client.release();
  }
});
