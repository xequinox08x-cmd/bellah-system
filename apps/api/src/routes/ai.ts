import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool";

export const aiRouter = Router();

const FACEBOOK_PLATFORM = "facebook";

type GenerateRequestBody = {
  productId?: number | string;
  promptText?: string;
  contentType?: string;
  tone?: string;
  platform?: string;
  outputMode?: string;
  referenceImageUrl?: string | null;
};

type OutputMode = "text" | "image" | "text_image";

type ProductRecord = {
  id: number;
  name: string;
  category: string | null;
  price: number | string | null;
  description: string | null;
};

type FeedRow = {
  id: number;
  title: string | null;
  content: string;
  product_name: string | null;
  platform: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_by_name: string | null;
};

type ContentListRow = {
  id: number;
  title: string | null;
  content: string;
  platform: string | null;
  prompt_text: string | null;
  hashtags: string | null;
  output_mode: string | null;
  reference_image_url: string | null;
  generated_image_url: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
};

type SubmitContentBody = {
  title?: string;
  content?: string;
  output?: string;
  platform?: string;
  hashtags?: string;
};

type ScheduleContentBody = {
  scheduledAt?: string;
  scheduled_at?: string;
};

let aiSchemaReady = false;
let aiSchemaPromise: Promise<void> | null = null;

function isAdminRequest(req: Request) {
  const roleHeader = req.header("x-user-role");
  return typeof roleHeader === "string" && roleHeader.trim().toLowerCase() === "admin";
}

function ensureAiSchema() {
  if (aiSchemaReady) return Promise.resolve();
  if (aiSchemaPromise) return aiSchemaPromise;

  aiSchemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_contents (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        tone TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMP,
        scheduled_at TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS title TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS prompt_text TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS output_mode TEXT NOT NULL DEFAULT 'text'`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS reference_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS generated_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS image_prompt TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS hashtags TEXT`);

    aiSchemaReady = true;
  })().catch((err) => {
    aiSchemaPromise = null;
    throw err;
  });

  return aiSchemaPromise;
}

export function buildPrompt(
  product: ProductRecord,
  promptText: string,
  contentType: string,
  tone: string,
  platform: string,
  outputMode: OutputMode,
  referenceImageUrl?: string | null
) {
  return [
    "Write marketing content for this product.",
    `Primary instructions: ${promptText}`,
    `Product name: ${product.name}`,
    `Category: ${product.category?.trim() || "Uncategorized"}`,
    `Price: PHP ${Number(product.price ?? 0).toFixed(2)}`,
    `Description: ${product.description?.trim() || "No description provided."}`,
    `Platform: ${platform || FACEBOOK_PLATFORM}`,
    `Tone: ${tone || "fun"}`,
    `Content type: ${contentType || "caption"}`,
    `Output mode: ${outputMode}`,
    `Reference image provided: ${referenceImageUrl ? "yes" : "no"}`,
    "Rules:",
    "- Keep it short at 1 to 3 sentences.",
    "- Make it engaging.",
    "- Include a clear call-to-action.",
    "- Do not invent fake product details.",
  ].join("\n");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function toHashtag(value: string) {
  const words = value.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return `#${words.map((word) => capitalize(word.toLowerCase())).join("")}`;
}

function buildFakeContent(
  product: ProductRecord,
  promptText: string,
  contentType: string,
  tone: string,
  platform: string,
  outputMode: OutputMode
) {
  const promptSummary = normalizeWhitespace(promptText);
  const toneOpeners: Record<string, string> = {
    fun: `Glow-up alert for ${product.name}!`,
    professional: `${product.name} delivers polished results you can trust.`,
    romantic: `${product.name} brings soft, radiant beauty to the spotlight.`,
    urgent: `${product.name} is ready to move now while the offer is fresh.`,
  };
  const modeLabel =
    outputMode === "image" ? "poster-first concept" : outputMode === "text_image" ? "caption and poster concept" : "caption-first concept";

  return [
    toneOpeners[tone] ?? `${product.name} is ready to stand out.`,
    `${promptSummary}${/[.!?]$/.test(promptSummary) ? "" : "."}`,
    `Tailored for ${formatLabel(contentType)} on ${platform} as a ${modeLabel}.`,
    "Shop now and make it part of your routine.",
  ].join(" ");
}

function buildTitle(product: ProductRecord, contentType: string, tone: string) {
  return `${product.name} - ${formatLabel(contentType || "custom prompt")} (${tone || "custom"})`;
}

function buildFakeHashtags(product: ProductRecord, contentType: string, tone: string, platform: string) {
  const tags = [
    "#BellahBeatrix",
    toHashtag(product.name),
    toHashtag(product.category?.trim() || "Beauty"),
    toHashtag(formatLabel(contentType || "caption")),
    toHashtag(tone || "fun"),
    toHashtag(platform || FACEBOOK_PLATFORM),
  ].filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 6).join(" ");
}

function buildImagePrompt(
  product: ProductRecord,
  promptText: string,
  tone: string,
  platform: string,
  outputMode: OutputMode,
  referenceImageUrl?: string | null
) {
  if (outputMode === "text") return null;

  return [
    `Create a product poster for ${product.name}.`,
    `Visual direction: ${normalizeWhitespace(promptText)}`,
    `Tone: ${tone || "fun"}.`,
    `Platform: ${platform || FACEBOOK_PLATFORM}.`,
    referenceImageUrl ? "Use the uploaded product image as the main visual reference." : "No reference image was provided.",
  ].join(" ");
}

async function generateWithAi(prompt: string) {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}

function validateGenerateBody(body: GenerateRequestBody) {
  const productId = Number(body.productId);
  const promptText = typeof body.promptText === "string" ? body.promptText.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "caption";
  const tone = typeof body.tone === "string" ? body.tone.trim() : "fun";
  const outputModeRaw = typeof body.outputMode === "string" ? body.outputMode.trim() : "text";
  const outputMode = ["text", "image", "text_image"].includes(outputModeRaw)
    ? (outputModeRaw as OutputMode)
    : "text";
  const referenceImageUrl =
    typeof body.referenceImageUrl === "string" && body.referenceImageUrl.trim()
      ? body.referenceImageUrl.trim()
      : null;

  if (!Number.isInteger(productId) || productId <= 0 || !promptText) {
    return null;
  }

  return {
    productId,
    promptText,
    contentType: contentType || "caption",
    tone: tone || "fun",
    platform: FACEBOOK_PLATFORM,
    outputMode,
    referenceImageUrl,
  };
}

aiRouter.post("/generate", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const parsed = validateGenerateBody(req.body ?? {});
    if (!parsed) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "productId and promptText are required",
      });
    }

    const productResult = await pool.query<ProductRecord>(
      `
      SELECT id, name, category, price, description
      FROM products
      WHERE id = $1
      `,
      [parsed.productId]
    );

    if (!productResult.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }

    const product = productResult.rows[0];
    const prompt = buildPrompt(
      product,
      parsed.promptText,
      parsed.contentType,
      parsed.tone,
      parsed.platform,
      parsed.outputMode,
      parsed.referenceImageUrl
    );
    const title = buildTitle(product, parsed.contentType, parsed.tone);
    const imagePrompt = buildImagePrompt(
      product,
      parsed.promptText,
      parsed.tone,
      parsed.platform,
      parsed.outputMode,
      parsed.referenceImageUrl
    );
    const hashtags = buildFakeHashtags(product, parsed.contentType, parsed.tone, parsed.platform);
    const generatedImageUrl = null;

    let content = buildFakeContent(
      product,
      parsed.promptText,
      parsed.contentType,
      parsed.tone,
      parsed.platform,
      parsed.outputMode
    );
    try {
      const aiContent = await generateWithAi(prompt);
      if (aiContent) {
        content = aiContent;
      }
    } catch (err) {
      console.error("[POST /api/ai/generate] AI fallback to fake content", err);
    }

    const insertResult = await pool.query(
      `
      INSERT INTO ai_contents (
        product_id,
        title,
        content,
        content_type,
        tone,
        platform,
        prompt_text,
        output_mode,
        reference_image_url,
        generated_image_url,
        image_prompt,
        hashtags,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
      RETURNING id, status
      `,
      [
        product.id,
        title,
        content,
        parsed.contentType,
        parsed.tone,
        parsed.platform,
        parsed.promptText,
        parsed.outputMode,
        parsed.referenceImageUrl,
        generatedImageUrl,
        imagePrompt,
        hashtags,
      ]
    );

    return res.json({
      ok: true,
      data: {
        id: Number(insertResult.rows[0].id),
        title,
        caption: content,
        hashtags,
        generatedImageUrl,
        referenceImageUrl: parsed.referenceImageUrl,
        outputMode: parsed.outputMode,
        status: String(insertResult.rows[0].status ?? "draft"),
      },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to generate content",
    });
  }
});

aiRouter.get("/contents/feed", async (_req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const result = await pool.query<FeedRow>(
      `
      SELECT
        ac.id,
        COALESCE(ac.title, p.name, 'Untitled Content') AS title,
        ac.content,
        p.name AS product_name,
        ac.platform,
        ac.status,
        ac.created_at,
        ac.approved_at,
        ac.scheduled_at,
        ac.published_at,
        u.name AS created_by_name
      FROM ai_contents ac
      LEFT JOIN products p ON p.id = ac.product_id
      LEFT JOIN users u ON u.id = ac.created_by
      WHERE ac.status IN ('published', 'scheduled', 'approved')
      ORDER BY
        CASE ac.status
          WHEN 'published' THEN 1
          WHEN 'scheduled' THEN 2
          WHEN 'approved' THEN 3
          ELSE 4
        END,
        COALESCE(ac.published_at, ac.scheduled_at, ac.approved_at, ac.created_at) DESC,
        ac.id DESC
      `
    );

    return res.json({
      ok: true,
      data: result.rows.map((row) => ({
        id: Number(row.id),
        title: String(row.title ?? "Untitled Content"),
        content: String(row.content ?? ""),
        product_name: row.product_name ? String(row.product_name) : null,
        platform: row.platform ? String(row.platform) : FACEBOOK_PLATFORM,
        status: String(row.status),
        created_at: row.created_at,
        approved_at: row.approved_at,
        scheduled_at: row.scheduled_at,
        published_at: row.published_at,
        created_by_name: row.created_by_name ? String(row.created_by_name) : "Staff",
      })),
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to load content feed",
    });
  }
});

aiRouter.get("/contents", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

    const params: unknown[] = [];
    const where: string[] = [];

    if (status && status !== "all") {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ai_contents ${whereSql}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query<ContentListRow>(
      `
      SELECT
        id,
        title,
        content,
        platform,
        prompt_text,
        hashtags,
        output_mode,
        reference_image_url,
        generated_image_url,
        status,
        created_at,
        approved_at,
        scheduled_at,
        published_at
      FROM ai_contents
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return res.json({
      ok: true,
      data: result.rows.map((row) => ({
        id: Number(row.id),
        title: String(row.title ?? "Untitled Content"),
        prompt: String(row.prompt_text ?? ""),
        output: String(row.content ?? ""),
        platform: String(row.platform ?? FACEBOOK_PLATFORM),
        hashtags: String(row.hashtags ?? ""),
        outputMode: String(row.output_mode ?? "text"),
        referenceImageUrl: row.reference_image_url ? String(row.reference_image_url) : null,
        generatedImageUrl: row.generated_image_url ? String(row.generated_image_url) : null,
        status: String(row.status),
        createdAt: row.created_at,
        approvedAt: row.approved_at,
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at,
      })),
      total: Number(countResult.rows[0]?.count ?? 0),
      page,
      limit,
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to load contents",
    });
  }
});

aiRouter.patch("/contents/:id/submit", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const body: SubmitContentBody = req.body ?? {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const contentRaw = typeof body.content === "string" ? body.content : typeof body.output === "string" ? body.output : "";
    const content = contentRaw.trim();
    const platform = FACEBOOK_PLATFORM;
    const hashtags = typeof body.hashtags === "string" ? body.hashtags.trim() : "";

    if (!title || !content) {
      return res.status(400).json({ ok: false, data: null, message: "title and content are required" });
    }

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        title = $1,
        content = $2,
        platform = $3,
        hashtags = $4,
        status = 'pending'
      WHERE id = $5
      RETURNING id, title, content, platform, hashtags, status, created_at AS "createdAt"
      `,
      [title, content, platform, hashtags, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to submit content" });
  }
});

aiRouter.patch("/contents/:id/status", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const id = Number(req.params.id);
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    if (!["approved", "rejected", "published", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid status" });
    }

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        status = $1,
        approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
        published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END
      WHERE id = $2
      RETURNING id, title, status, approved_at AS "approvedAt", published_at AS "publishedAt"
      `,
      [status, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to update content status" });
  }
});

aiRouter.delete("/contents/:id", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    if (!isAdminRequest(req)) {
      return res.status(403).json({ ok: false, data: null, message: "Admin access required" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const existing = await pool.query(`SELECT id FROM ai_contents WHERE id = $1`, [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    await pool.query(`DELETE FROM ai_contents WHERE id = $1`, [id]);

    return res.json({
      ok: true,
      data: { id },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to delete content",
    });
  }
});

aiRouter.patch("/contents/:id/approve", async (_req: Request, res: Response) => {
  return res.status(501).json({ ok: false, data: null, message: "Not implemented yet" });
});

aiRouter.patch("/contents/:id/reject", async (_req: Request, res: Response) => {
  return res.status(501).json({ ok: false, data: null, message: "Not implemented yet" });
});

aiRouter.patch("/contents/:id/schedule", async (req: Request, res: Response) => {
  try {
    await ensureAiSchema();

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const body: ScheduleContentBody = req.body ?? {};
    const scheduledAtRaw =
      typeof body.scheduledAt === "string"
        ? body.scheduledAt.trim()
        : typeof body.scheduled_at === "string"
        ? body.scheduled_at.trim()
        : "";

    if (!scheduledAtRaw) {
      return res.status(400).json({ ok: false, data: null, message: "scheduledAt is required" });
    }

    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid scheduledAt" });
    }

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        status = 'scheduled',
        scheduled_at = $1
      WHERE id = $2
      RETURNING
        id,
        title,
        status,
        scheduled_at AS "scheduledAt"
      `,
      [scheduledAt.toISOString(), id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to schedule content" });
  }
});
