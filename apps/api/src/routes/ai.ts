import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool";
import { publishSystemContent } from "../services/facebook";

export const aiRouter = Router();

const FACEBOOK_PLATFORM = "facebook";
const GENERATED_CONTENT_STATUS = "draft";
const PENDING_APPROVAL_STATUS = "pending";

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

type DataUrlPayload = {
  mimeType: string;
  data: string;
};

type GenerationProvider = "openai" | "gemini" | "fallback" | "none";

type GenerationProviderInfo = {
  text: GenerationProvider;
  image: GenerationProvider;
  usedReferenceImage: boolean;
};

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

type SubmitTargetRow = {
  id: number;
  output_mode: string | null;
  generated_image_url: string | null;
  content: string | null;
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        scheduled_at TIMESTAMPTZ
      )
    `);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS title TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS prompt_text TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS output_mode TEXT NOT NULL DEFAULT 'text'`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS reference_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS generated_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS image_prompt TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS hashtags TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_post_id TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_page_id TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_permalink_url TEXT`);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN approved_at TYPE TIMESTAMPTZ USING approved_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ USING scheduled_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC'
    `);

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
    "You are writing a Facebook marketing caption for a beauty product.",
    "Return only the final caption text. Do not include hashtags, quotation marks, labels, or notes.",
    `Primary instructions: ${promptText}`,
    `Product name: ${product.name}`,
    `Category: ${product.category?.trim() || "Uncategorized"}`,
    `Price: PHP ${Number(product.price ?? 0).toFixed(2)}`,
    `Description: ${product.description?.trim() || "No description provided."}`,
    `Platform: ${platform || FACEBOOK_PLATFORM}`,
    `Tone: ${tone || "fun"}`,
    `Content type: ${contentType || "caption"}`,
    `Output mode: ${outputMode}`,
    `Reference image provided: ${parseDataUrl(referenceImageUrl)?.mimeType ? "yes" : "no"}`,
    "Rules:",
    "- Keep it short at 1 to 3 sentences, natural for Facebook.",
    "- Make it engaging and conversion-focused.",
    "- Include a clear call-to-action.",
    "- Do not invent fake product details.",
    "- Match the requested tone.",
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

  const hasReferenceImage = Boolean(parseDataUrl(referenceImageUrl));

  return [
    `Create a polished Facebook product poster for ${product.name}.`,
    `Follow this creative brief closely: ${normalizeWhitespace(promptText)}`,
    `Product category: ${product.category?.trim() || "Beauty"}.`,
    `Price: PHP ${Number(product.price ?? 0).toFixed(2)}.`,
    `Product description: ${product.description?.trim() || "No description provided."}.`,
    `Tone: ${tone || "fun"}.`,
    `Platform: ${platform || FACEBOOK_PLATFORM}.`,
    "Use a vertical 4:5 marketing layout suitable for Facebook.",
    "Make the product the clear hero subject with premium beauty-brand styling and a clean composition.",
    "Follow the user's requested colors, styling, props, lighting, background, and composition as long as they do not change the product identity.",
    "If you include text, keep it minimal, readable, and relevant to the product and prompt.",
    hasReferenceImage
      ? "Reference image rules: the uploaded product image is the source of truth. Preserve the same product identity, packaging, container shape, label placement, logo area, and dominant product colors from the uploaded image. Do not replace it with a different bottle, jar, tube, box, or brand. Apply the prompt mainly to the scene, styling, background, lighting, props, camera angle, and layout around the product. If the prompt conflicts with the product identity in the reference image, preserve the reference product and adapt the scene around it. Only show multiple products if the prompt explicitly asks for multiples."
      : "No reference image was provided, so generate the full poster from the prompt and product details.",
  ].join("\n");
}

function shouldGenerateCaptionWithOpenAi(outputMode: OutputMode) {
  return outputMode === "text" || outputMode === "text_image";
}

function shouldGeneratePosterWithGemini(outputMode: OutputMode) {
  return outputMode === "image" || outputMode === "text_image";
}

function buildImageOnlyPlaceholderContent(product: ProductRecord, promptText: string) {
  const promptSummary = normalizeWhitespace(promptText);
  return [
    `${product.name} poster generated and ready for review.`,
    `${promptSummary}${/[.!?]$/.test(promptSummary) ? "" : "."}`,
  ].join(" ");
}

function buildFallbackImageDataUrl(product: ProductRecord, promptText: string, tone: string, outputMode: OutputMode) {
  const accent = tone === "professional" ? "#1F2937" : tone === "romantic" ? "#BE185D" : tone === "urgent" ? "#DC2626" : "#EC4899";
  const secondary = tone === "professional" ? "#CBD5E1" : "#FDE7EF";
  const modeLabel = outputMode === "image" ? "Image Preview Mode" : "Text + Image Preview Mode";
  const summary = normalizeWhitespace(promptText).slice(0, 72) || "Fallback poster preview";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFF7FB" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)" />
      <rect x="70" y="70" width="940" height="1210" rx="42" fill="#FFFFFF" opacity="0.96" />
      <rect x="130" y="150" width="820" height="520" rx="36" fill="${accent}" opacity="0.10" />
      <circle cx="540" cy="410" r="160" fill="${accent}" opacity="0.16" />
      <text x="540" y="260" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${accent}">
        BellahBeatrix Poster Preview
      </text>
      <text x="540" y="340" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#111827">
        ${escapeXml(product.name)}
      </text>
      <text x="540" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#4B5563">
        ${escapeXml(modeLabel)}
      </text>
      <text x="540" y="780" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#111827">
        Fallback image generated for testing
      </text>
      <text x="540" y="840" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#6B7280">
        ${escapeXml(summary)}
      </text>
      <text x="540" y="900" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#6B7280">
        Safe preview for posting and scheduling checks
      </text>
      <rect x="320" y="1010" width="440" height="88" rx="44" fill="${accent}" />
      <text x="540" y="1065" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF">
        Preview CTA Placeholder
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hasNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDataUrl(value?: string | null): DataUrlPayload | null {
  if (!value) return null;

  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "";
}

function getOpenAiCaptionModel() {
  return process.env.OPENAI_CAPTION_MODEL?.trim() || "gpt-4o-mini";
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

function getGeminiImageModel() {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image-preview";
}

function extractOpenAiText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const textParts = output.flatMap((item: any) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    return content
      .map((part: any) => {
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.output_text === "string") return part.output_text;
        return "";
      })
      .filter(Boolean);
  });

  return textParts.join("\n").trim() || null;
}

async function generateCaptionWithOpenAi(prompt: string) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY (or AI_API_KEY) is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiCaptionModel(),
      instructions: "Write concise, polished Facebook marketing captions for beauty products.",
      input: prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI caption request failed: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const content = extractOpenAiText(data);
  if (!content) {
    throw new Error("OpenAI returned an empty caption");
  }

  return content;
}

async function generateImageWithGemini(prompt: string, referenceImageUrl?: string | null) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const parsedReferenceImage = parseDataUrl(referenceImageUrl);
  if (parsedReferenceImage) {
    const parts: Array<Record<string, unknown>> = [{
      inlineData: {
        mimeType: parsedReferenceImage.mimeType,
        data: parsedReferenceImage.data,
      },
    }];

    parts.push({
      text: "The uploaded image is the exact product reference. Preserve the product identity from that image while following the creative brief.",
    });

    parts.push({ text: prompt });

    return generateGeminiImage(parts, apiKey);
  }

  return generateGeminiImage([{ text: prompt }], apiKey);
}

async function generateGeminiImage(parts: Array<Record<string, unknown>>, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiImageModel()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          imageConfig: {
            aspectRatio: "4:5",
            imageSize: "1K",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini image request failed: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const partsFromResponse = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
  const imagePart = partsFromResponse.find((part: any) => typeof part?.inlineData?.data === "string");
  const captionText = partsFromResponse
    .map((part: any) => (typeof part?.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!imagePart?.inlineData?.data) {
    throw new Error(
      captionText
        ? `Gemini did not return an image: ${captionText}`
        : "Gemini did not return an image"
    );
  }

  const mimeType =
    typeof imagePart.inlineData.mimeType === "string" && imagePart.inlineData.mimeType.trim()
      ? imagePart.inlineData.mimeType.trim()
      : "image/png";

  return {
    generatedImageUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    captionText: captionText || null,
  };
}

async function generateMarketingAssets(options: {
  product: ProductRecord;
  prompt: string;
  promptText: string;
  contentType: string;
  tone: string;
  platform: string;
  outputMode: OutputMode;
  imagePrompt: string | null;
  referenceImageUrl?: string | null;
}) {
  const {
    product,
    prompt,
    promptText,
    contentType,
    tone,
    platform,
    outputMode,
    imagePrompt,
    referenceImageUrl,
  } = options;
  const useOpenAiCaption = shouldGenerateCaptionWithOpenAi(outputMode);
  const useGeminiImage = shouldGeneratePosterWithGemini(outputMode);
  const providers: GenerationProviderInfo = {
    text: useOpenAiCaption ? "fallback" : "none",
    image: useGeminiImage ? "fallback" : "none",
    usedReferenceImage: Boolean(parseDataUrl(referenceImageUrl)),
  };

  let content = useOpenAiCaption
    ? buildFakeContent(product, promptText, contentType, tone, platform, outputMode)
    : buildImageOnlyPlaceholderContent(product, promptText);
  let generatedImageUrl: string | null =
    useGeminiImage ? buildFallbackImageDataUrl(product, promptText, tone, outputMode) : null;

  try {
    if (useOpenAiCaption && getOpenAiApiKey()) {
      content = await generateCaptionWithOpenAi(prompt);
      providers.text = "openai";
    }
  } catch (err) {
    console.error("[POST /api/ai/generate] OpenAI caption fallback", err);
  }

  if (useGeminiImage && imagePrompt) {
    try {
      if (getGeminiApiKey()) {
        const geminiResult = await generateImageWithGemini(imagePrompt, referenceImageUrl);
        generatedImageUrl = geminiResult.generatedImageUrl;
        providers.image = "gemini";
        if (!useOpenAiCaption && geminiResult.captionText) {
          content = geminiResult.captionText;
          providers.text = "gemini";
        }
      }
    } catch (err) {
      console.error("[POST /api/ai/generate] Gemini image fallback", err);
    }
  }

  return { content, generatedImageUrl, providers };
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
    const { content, generatedImageUrl, providers } = await generateMarketingAssets({
      product,
      prompt,
      promptText: parsed.promptText,
      contentType: parsed.contentType,
      tone: parsed.tone,
      platform: parsed.platform,
      outputMode: parsed.outputMode,
      imagePrompt,
      referenceImageUrl: parsed.referenceImageUrl,
    });

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        GENERATED_CONTENT_STATUS,
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
        providers,
        status: String(insertResult.rows[0].status ?? GENERATED_CONTENT_STATUS),
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

    const existingResult = await pool.query<SubmitTargetRow>(
      `
      SELECT id, output_mode, generated_image_url, content
      FROM ai_contents
      WHERE id = $1
      `,
      [id]
    );

    if (!existingResult.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    const existing = existingResult.rows[0];
    const isImageOnly = (existing.output_mode ?? "text").trim() === "image";
    const hasGeneratedImage = hasNonEmptyString(existing.generated_image_url);
    const allowBlankContent = isImageOnly && hasGeneratedImage;

    if (!title) {
      return res.status(400).json({ ok: false, data: null, message: "title is required" });
    }

    if (!content && !allowBlankContent) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "content is required unless this is an image-only post with a generated image",
      });
    }

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        title = $1,
        content = $2,
        platform = $3,
        hashtags = $4,
        status = $5
      WHERE id = $6
      RETURNING id, title, content, platform, hashtags, status, created_at AS "createdAt"
      `,
      [title, content, platform, hashtags, PENDING_APPROVAL_STATUS, id]
    );

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

    if (status === "published") {
      // Publish through the backend so the system captures the real Facebook
      // post ID and immediately marks the generated content as analytics-ready.
      const published = await publishSystemContent(id);

      return res.json({
        ok: true,
        data: {
          id: published.contentId,
          title: published.title,
          status: published.status,
          publishMode: published.publishMode,
          approvedAt: published.approvedAt,
          publishedAt: published.publishedAt,
          facebookPostId: published.facebookPostId,
          facebookPageId: published.facebookPageId,
          facebookPermalinkUrl: published.facebookPermalinkUrl,
          initialMetricsSynced: published.initialMetricsSynced,
        },
        message: null,
      });
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
      [scheduledAt, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({ ok: true, data: result.rows[0], message: null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to schedule content" });
  }
});
