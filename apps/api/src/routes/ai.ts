import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool";

export const aiRouter = Router();

const FACEBOOK_PLATFORM = "facebook";
const GENERATED_CONTENT_STATUS = "draft";
const PENDING_APPROVAL_STATUS = "pending";
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const REFERENCE_IMAGE_FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_GEMINI_IMAGE_TIMEOUT_MS = 30_000;

type GenerateRequestBody = {
  productId?: number | string;
  promptText?: string;
  contentType?: string;
  tone?: string;
  platform?: string;
  outputMode?: string;
  referenceImageUrl?: string | null;
  asyncImage?: boolean | string | number | null;
  promptMode?: string | null;
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

type ImageGenerationStatus = "none" | "pending" | "complete" | "fallback";

type ProductRecord = {
  id: number;
  name: string;
  category: string | null;
  price: number | string | null;
  description: string | null;
  image_url: string | null;
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

type ContentFeedRow = {
  id: number;
  title: string | null;
  content: string | null;
  platform: string | null;
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

function isAdminRequest(req: Request) {
  const roleHeader = req.header("x-user-role");
  return typeof roleHeader === "string" && roleHeader.trim().toLowerCase() === "admin";
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
    `Reference image provided: ${isReferenceImageProvided(referenceImageUrl) ? "yes" : "no"}`,
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

  const hasReferenceImage = isReferenceImageProvided(referenceImageUrl);
  const category = product.category?.trim() || "beauty";
  const userBrief = normalizeImageCreativeBrief(promptText);
  const subject = hasReferenceImage
    ? "the referenced product shown in the uploaded image"
    : `a premium ${category.toLowerCase()} product`;

  return [
    `Generate a vertical 4:5 Facebook product poster featuring ${subject}.`,
    `Visual direction: ${userBrief}.`,
    `Product category: ${category}.`,
    `Tone: ${tone || "fun"}.`,
    "Use premium studio lighting, a clean luxury beauty-ad composition, and a clear hero product placement.",
    "Do not add readable words, price text, captions, watermarks, or extra product labels unless the visual direction explicitly asks for text.",
    hasReferenceImage
      ? "Use the uploaded image as the product identity source. Preserve the same product packaging, shape, label placement, and dominant product colors. Apply the visual direction mainly to the background, lighting, scene, props, and layout."
      : "No reference image is attached, so create a plausible premium beauty-product hero shot from the category and visual direction.",
  ].join("\n");
}

function normalizeImageCreativeBrief(promptText: string) {
  let brief = normalizeWhitespace(promptText).slice(0, 500);
  if (!brief) {
    brief = "premium beauty campaign styling with an elegant background";
  }

  brief = brief
    .replace(/\bmake\s+(tt?he|the)\s+background\s+red\b/gi, "use a warm scarlet studio backdrop and red color palette")
    .replace(/\bred\s+background\b/gi, "warm scarlet studio backdrop")
    .replace(/\bbackground\s+red\b/gi, "warm scarlet studio backdrop");

  if (brief.length < 48) {
    brief = `${brief}; premium studio lighting, clean centered composition, luxury beauty campaign mood`;
  }

  return brief;
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

function isReferenceImageProvided(value?: string | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return Boolean(trimmed && (parseDataUrl(trimmed) || /^https?:\/\//i.test(trimmed)));
}

async function resolveReferenceImagePayload(value?: string | null): Promise<DataUrlPayload | null> {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;

  const parsedDataUrl = parseDataUrl(trimmed);
  if (parsedDataUrl) return parsedDataUrl;
  if (!/^https?:\/\//i.test(trimmed)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFERENCE_IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
    });

    if (!response.ok) {
      throw new Error(`Reference image request failed with status ${response.status}`);
    }

    const contentType = (response.headers.get("content-type") || "image/png").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      throw new Error(`Reference URL did not return an image (${contentType || "unknown type"})`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_REFERENCE_IMAGE_BYTES) {
      throw new Error("Reference image is too large");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      throw new Error("Reference image is too large");
    }

    return {
      mimeType: contentType,
      data: Buffer.from(arrayBuffer).toString("base64"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "";
}

function getOpenAiCaptionModel() {
  return process.env.OPENAI_CAPTION_MODEL?.trim() || "gpt-4o-mini";
}

function getOpenAiPromptModel() {
  return process.env.OPENAI_PROMPT_MODEL?.trim() || getOpenAiCaptionModel();
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

function getGeminiImageModel() {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-lite-image";
}

function getGeminiImageTimeoutMs() {
  const value = Number(process.env.GEMINI_IMAGE_TIMEOUT_MS ?? DEFAULT_GEMINI_IMAGE_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 15_000 ? value : DEFAULT_GEMINI_IMAGE_TIMEOUT_MS;
}

function getImagenFallbackModel() {
  return process.env.IMAGEN_FALLBACK_MODEL?.trim() || "imagen-4.0-fast-generate-001";
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || "";
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

async function supabaseRest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    // Try to parse Supabase error JSON for a cleaner message
    let parsed: { message?: string; code?: string } | null = null;
    try { parsed = JSON.parse(responseText); } catch { /* ignore */ }

    if (response.status === 503 || parsed?.code === "PGRST002") {
      throw new Error("Database schema cache is reloading. Please retry in a moment.");
    }

    const msg = parsed?.message || responseText || response.statusText;
    throw new Error(JSON.stringify(parsed ?? msg));
  }

  return (responseText ? JSON.parse(responseText) : null) as T;
}

function aiContentPath(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return `/ai_contents?${search.toString()}`;
}

const AI_CONTENT_LIST_COLUMNS = [
  "id",
  "title",
  "content",
  "platform",
  "prompt_text",
  "hashtags",
  "output_mode",
  "reference_image_url",
  "generated_image_url",
  "status",
  "created_at",
  "approved_at",
  "scheduled_at",
  "published_at",
].join(",");

function serializeContentListRow(row: ContentListRow) {
  return {
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
  };
}

function contentListSelectSql() {
  return `
    SELECT
      id,
      product_id,
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
  `;
}

async function getProductForGeneration(productId: number): Promise<ProductRecord | null> {
  const result = await pool.query<ProductRecord>(
    `SELECT id, name, category, price, description, image_url FROM products WHERE id = $1 LIMIT 1`,
    [productId]
  );

  return result.rows[0] ?? null;
}

async function saveGeneratedContent(payload: {
  product: ProductRecord;
  title: string;
  content: string;
  contentType: string;
  tone: string;
  platform: string;
  promptText: string;
  outputMode: OutputMode;
  referenceImageUrl: string | null;
  generatedImageUrl: string | null;
  imagePrompt: string | null;
  hashtags: string;
}) {
  const result = await pool.query<{ id: number; status: string | null }>(
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
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING id, status
    `,
    [
      payload.product.id,
      payload.title,
      payload.content,
      payload.contentType,
      payload.tone,
      payload.platform,
      payload.promptText,
      payload.outputMode,
      payload.referenceImageUrl,
      payload.generatedImageUrl,
      payload.imagePrompt,
      payload.hashtags,
      GENERATED_CONTENT_STATUS,
    ]
  );

  return result.rows[0] ?? null;
}

async function updateGeneratedContentImage(
  contentId: number,
  generatedImageUrl: string,
  captionText: string | null
) {
  await pool.query(
    `
    UPDATE ai_contents
    SET generated_image_url = $2,
        content = CASE
          WHEN output_mode = 'image' AND NULLIF($3, '') IS NOT NULL THEN $3
          ELSE content
        END
    WHERE id = $1
    `,
    [contentId, generatedImageUrl, captionText?.trim() || null]
  );
}

function completeImageGenerationInBackground(options: {
  contentId: number;
  imagePrompt: string;
  referenceImageUrl: string | null;
  fallbackImageUrl: string;
  fallbackCaptionText: string | null;
  preferImagen?: boolean;
}) {
  const { contentId, imagePrompt, referenceImageUrl, fallbackImageUrl, fallbackCaptionText, preferImagen = false } = options;

  void (async () => {
    const startedAt = Date.now();
    try {
      console.info(`[POST /api/ai/generate] Async Gemini image started for content ${contentId}`);
      if (preferImagen) {
        console.info(`[POST /api/ai/generate] Using Imagen first for custom content ${contentId}`);
        const imagenResult = await generateImageWithImagen(imagePrompt);
        await updateGeneratedContentImage(contentId, imagenResult.generatedImageUrl, imagenResult.captionText);
        console.info(`[POST /api/ai/generate] Imagen image saved for content ${contentId}`, {
          elapsedMs: Date.now() - startedAt,
        });
        return;
      }

      let imageResult;
      try {
        imageResult = await generateImageWithGemini(imagePrompt, referenceImageUrl);
      } catch (firstErr) {
        if (!referenceImageUrl) {
          throw firstErr;
        }

        console.warn(`[POST /api/ai/generate] Async Gemini image retrying without reference for content ${contentId}`, {
          message: firstErr instanceof Error ? firstErr.message : "Gemini image request failed",
        });
        imageResult = await generateImageWithGemini(
          [
            imagePrompt,
            "No reference image is attached for this retry. Recreate the product as a clean beauty-product hero based on the product name and details.",
          ].join("\n")
        );
      }

      await updateGeneratedContentImage(
        contentId,
        imageResult.generatedImageUrl,
        imageResult.captionText
      );
      console.info(`[POST /api/ai/generate] Async Gemini image completed for content ${contentId}`, {
        elapsedMs: Date.now() - startedAt,
      });
    } catch (err) {
      console.error(`[POST /api/ai/generate] Async Gemini image failed for content ${contentId}`, err);
      try {
        console.info(`[POST /api/ai/generate] Trying Imagen fallback for content ${contentId}`);
        const imagenResult = await generateImageWithImagen(imagePrompt);
        await updateGeneratedContentImage(contentId, imagenResult.generatedImageUrl, imagenResult.captionText);
        console.info(`[POST /api/ai/generate] Imagen fallback image saved for content ${contentId}`, {
          elapsedMs: Date.now() - startedAt,
        });
        return;
      } catch (imagenErr) {
        console.error(`[POST /api/ai/generate] Imagen fallback failed for content ${contentId}`, imagenErr);
      }

      try {
        await updateGeneratedContentImage(contentId, fallbackImageUrl, fallbackCaptionText);
        console.info(`[POST /api/ai/generate] Fallback image saved for content ${contentId}`);
      } catch (fallbackErr) {
        console.error(`[POST /api/ai/generate] Failed to save fallback image for content ${contentId}`, fallbackErr);
      }
    }
  })();
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

async function generateAutoPromptWithOpenAi(options: {
  product: ProductRecord;
  contentType: string;
  tone: string;
  platform: string;
  outputMode: OutputMode;
  referenceImageUrl?: string | null;
}) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY (or AI_API_KEY) is not configured");
  }

  const { product, contentType, tone, platform, outputMode, referenceImageUrl } = options;
  const hasReferenceImage = isReferenceImageProvided(referenceImageUrl);
  const contentLabel = formatLabel(contentType || "caption");
  const modeLabel =
    outputMode === "image"
      ? "image-only poster brief"
      : outputMode === "text_image"
        ? "caption and poster brief"
        : "caption-only brief";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiPromptModel(),
      instructions: [
        "You create compact creative briefs for a Facebook beauty-product marketing generator.",
        "Return only one plain-text prompt.",
        "Do not write the final caption, hashtags, JSON, bullets, labels, or quotation marks.",
        "Make the prompt directly usable as the primary instruction for a downstream AI content generator.",
      ].join(" "),
      input: [
        `Platform: ${platform || FACEBOOK_PLATFORM}`,
        `Content type: ${contentLabel}`,
        `Tone: ${tone || "fun"}`,
        `Output mode: ${modeLabel}`,
        `Product name: ${product.name}`,
        `Category: ${product.category?.trim() || "Beauty"}`,
        `Price: PHP ${Number(product.price ?? 0).toFixed(2)}`,
        `Description: ${product.description?.trim() || "No description provided."}`,
        `Reference image provided: ${hasReferenceImage ? "yes" : "no"}`,
        "Requirements:",
        "- Keep it concise at 2 to 4 sentences.",
        "- Align the message angle with the selected content type.",
        "- Match the selected tone exactly.",
        "- Include a clear CTA direction.",
        outputMode === "text"
          ? "- Focus on copy direction, audience intent, and the strongest conversion angle."
          : "- Include visual direction for a Facebook beauty poster: composition, mood, lighting, and on-brand styling.",
        hasReferenceImage
          ? "- Use the reference image as the visual source of truth; preserve the product identity, packaging, label placement, and dominant colors."
          : "- If no reference image is available, keep the direction grounded in the product name, category, price, and description.",
        "- Stay grounded in the provided product facts and do not invent claims.",
        "- Keep the brand feel premium, beauty-focused, and suitable for a Filipino audience.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI prompt request failed: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const content = extractOpenAiText(data);
  if (!content) {
    throw new Error("OpenAI returned an empty auto prompt");
  }

  return normalizeWhitespace(content);
}

async function generateImageWithGemini(prompt: string, referenceImageUrl?: string | null) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const parsedReferenceImage = await resolveReferenceImagePayload(referenceImageUrl);
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
  const timeoutMs = getGeminiImageTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiImageModel()}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
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
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Gemini image request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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

async function generateImageWithImagen(prompt: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const timeoutMs = getGeminiImageTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${getImagenFallbackModel()}:predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt: buildImagenPrompt(prompt) }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
          },
        }),
      }
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Imagen fallback request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Imagen fallback request failed: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
  const image = predictions.find((prediction: any) => typeof prediction?.bytesBase64Encoded === "string");
  if (!image?.bytesBase64Encoded) {
    throw new Error("Imagen fallback did not return an image");
  }

  const mimeType =
    typeof image.mimeType === "string" && image.mimeType.trim()
      ? image.mimeType.trim()
      : "image/png";

  return {
    generatedImageUrl: `data:${mimeType};base64,${image.bytesBase64Encoded}`,
    captionText: null,
  };
}

function buildImagenPrompt(prompt: string) {
  return [
    normalizeWhitespace(prompt)
      .replace(/\bthe referenced product shown in the uploaded image\b/gi, "a premium beauty product")
      .replace(/\bUse the uploaded image as the product identity source\.[\s\S]*$/i, ""),
    "Create a premium product advertising image. No readable text, no watermark, no extra labels.",
  ].join(" ");
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
  deferImage?: boolean;
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
    deferImage = false,
  } = options;
  const useOpenAiCaption = shouldGenerateCaptionWithOpenAi(outputMode);
  const useGeminiImage = shouldGeneratePosterWithGemini(outputMode);
  const providers: GenerationProviderInfo = {
    text: useOpenAiCaption ? "fallback" : "none",
    image: useGeminiImage && !deferImage ? "fallback" : "none",
    usedReferenceImage: useGeminiImage && isReferenceImageProvided(referenceImageUrl),
  };
  const imageGenerationStatus: ImageGenerationStatus =
    useGeminiImage && deferImage ? "pending" : useGeminiImage ? "fallback" : "none";

  let content = useOpenAiCaption
    ? buildFakeContent(product, promptText, contentType, tone, platform, outputMode)
    : buildImageOnlyPlaceholderContent(product, promptText);
  let generatedImageUrl: string | null =
    useGeminiImage && !deferImage ? buildFallbackImageDataUrl(product, promptText, tone, outputMode) : null;

  const captionPromise = (async () => {
    try {
      if (useOpenAiCaption && getOpenAiApiKey()) {
        return {
          content: await generateCaptionWithOpenAi(prompt),
          provider: "openai" as GenerationProvider,
        };
      }
    } catch (err) {
      console.error("[POST /api/ai/generate] OpenAI caption fallback", err);
    }
    return null;
  })();

  const imagePromise = (async () => {
    try {
      if (!deferImage && useGeminiImage && imagePrompt && getGeminiApiKey()) {
        const geminiResult = await generateImageWithGemini(imagePrompt, referenceImageUrl);
        return {
          ...geminiResult,
          provider: "gemini" as GenerationProvider,
        };
      }
    } catch (err) {
      console.error("[POST /api/ai/generate] Gemini image fallback", err);
    }
    return null;
  })();

  const [captionResult, imageResult] = await Promise.all([captionPromise, imagePromise]);

  if (captionResult) {
    content = captionResult.content;
    providers.text = captionResult.provider;
  }

  if (imageResult) {
    generatedImageUrl = imageResult.generatedImageUrl;
    providers.image = imageResult.provider;
    if (!useOpenAiCaption && imageResult.captionText) {
      content = imageResult.captionText;
      providers.text = "gemini";
    }
  }

  return {
    content,
    generatedImageUrl,
    providers,
    imageGenerationStatus: imageResult ? "complete" as ImageGenerationStatus : imageGenerationStatus,
  };
}

function buildAutoPrompt(
  product: ProductRecord,
  contentType: string,
  tone: string,
  platform: string,
  outputMode: OutputMode,
  referenceImageUrl?: string | null
): string {
  const category = product.category?.trim() || "beauty";
  const description = product.description?.trim();
  const price = Number(product.price ?? 0).toFixed(2);
  const contentLabel = formatLabel(contentType || "caption");
  const hasReferenceImage = isReferenceImageProvided(referenceImageUrl);
  const modeInstruction =
    outputMode === "text"
      ? "Write a caption brief with a specific hook, benefit angle, emotional trigger, and clear shop-now CTA."
      : "Write a poster-generation brief with product hero placement, composition, background, lighting, props, minimal readable text, and premium Facebook 4:5 styling.";
  const referenceInstruction = hasReferenceImage
    ? "Use the provided reference image as the visual source of truth: preserve the product identity, packaging, label placement, and dominant colors while improving the campaign styling around it."
    : "No reference image is provided, so base the concept only on the product name, category, price, and description.";

  const parts: string[] = [
    `Create a ${tone || "fun"} Facebook ${contentLabel} creative prompt for ${product.name}, a ${category} product priced at PHP ${price}.`,
  ];

  if (description) {
    parts.push(`Use these product facts only as source material, not as the full prompt: ${description}.`);
  }

  parts.push(
    `Platform: ${platform || FACEBOOK_PLATFORM}.`,
    modeInstruction,
    referenceInstruction,
    "Keep the tone conversion-focused for a Filipino beauty audience.",
    "Make the product name clear and keep the brief grounded in the provided product details.",
  );

  return parts.join(" ");
}

async function resolveAutoPrompt(options: {
  product: ProductRecord;
  contentType: string;
  tone: string;
  platform: string;
  outputMode: OutputMode;
  referenceImageUrl?: string | null;
}) {
  try {
    if (getOpenAiApiKey()) {
      return {
        promptText: await generateAutoPromptWithOpenAi(options),
        provider: "openai" as GenerationProvider,
      };
    }
  } catch (err) {
    console.error("[POST /api/ai/auto-prompt] OpenAI prompt fallback", err);
  }

  return {
    promptText: buildAutoPrompt(
      options.product,
      options.contentType,
      options.tone,
      options.platform,
      options.outputMode,
      options.referenceImageUrl
    ),
    provider: "fallback" as GenerationProvider,
  };
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
  const promptMode = typeof body.promptMode === "string" && body.promptMode.trim().toLowerCase() === "custom"
    ? "custom"
    : "auto";
  const referenceImageUrl =
    typeof body.referenceImageUrl === "string" && body.referenceImageUrl.trim()
      ? body.referenceImageUrl.trim()
      : null;
  const asyncImage =
    body.asyncImage === true ||
    body.asyncImage === 1 ||
    (typeof body.asyncImage === "string" && ["1", "true", "yes"].includes(body.asyncImage.trim().toLowerCase()));

  const productIdNum = Number(body.productId);
  if (!productIdNum || !Number.isFinite(productIdNum) || !Number.isInteger(productIdNum) || productIdNum <= 0) {
    return null;
  }

  return {
    productId: productIdNum,
    promptText,
    contentType: contentType || "caption",
    tone: tone || "fun",
    platform: FACEBOOK_PLATFORM,
    outputMode,
    promptMode,
    referenceImageUrl,
    asyncImage,
  };
}

aiRouter.post("/auto-prompt", async (req: Request, res: Response) => {
  try {
    const parsed = validateGenerateBody(req.body ?? {});
    if (!parsed) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "productId is required and must be a valid product id",
      });
    }

    const product = await getProductForGeneration(parsed.productId);
    if (!product) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }
    const referenceImageUrl = parsed.referenceImageUrl || product.image_url || null;

    const autoPrompt = await resolveAutoPrompt({
      product,
      contentType: parsed.contentType,
      tone: parsed.tone,
      platform: parsed.platform,
      outputMode: parsed.outputMode,
      referenceImageUrl,
    });

    return res.json({
      ok: true,
      data: {
        promptText: autoPrompt.promptText,
        provider: autoPrompt.provider,
      },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to generate auto prompt",
    });
  }
});

aiRouter.post("/generate", async (req: Request, res: Response) => {
  try {
    const parsed = validateGenerateBody(req.body ?? {});
    if (!parsed) {
      return res.status(400).json({
        ok: false,
        data: null,
        message: "productId is required and must be a valid product id",
      });
    }

    const product = await getProductForGeneration(parsed.productId);
    if (!product) {
      return res.status(404).json({ ok: false, data: null, message: "Product not found" });
    }
    const referenceImageUrl = parsed.referenceImageUrl || product.image_url || null;

    let effectivePromptText = parsed.promptText;
    let promptProvider: GenerationProvider | null = null;

    if (!effectivePromptText) {
      const autoPrompt = await resolveAutoPrompt({
        product,
        contentType: parsed.contentType,
        tone: parsed.tone,
        platform: parsed.platform,
        outputMode: parsed.outputMode,
        referenceImageUrl,
      });
      effectivePromptText = autoPrompt.promptText;
      promptProvider = autoPrompt.provider;
    }

    const prompt = buildPrompt(
      product,
      effectivePromptText,
      parsed.contentType,
      parsed.tone,
      parsed.platform,
      parsed.outputMode,
      referenceImageUrl
    );
    const title = buildTitle(product, parsed.contentType, parsed.tone);
    const imagePrompt = buildImagePrompt(
      product,
      effectivePromptText,
      parsed.tone,
      parsed.platform,
      parsed.outputMode,
      referenceImageUrl
    );
    const hashtags = buildFakeHashtags(product, parsed.contentType, parsed.tone, parsed.platform);
    const shouldDeferImage =
      parsed.asyncImage &&
      shouldGeneratePosterWithGemini(parsed.outputMode) &&
      Boolean(imagePrompt) &&
      Boolean(getGeminiApiKey());
    const { content, generatedImageUrl, providers, imageGenerationStatus } = await generateMarketingAssets({
      product,
      prompt,
      promptText: effectivePromptText,
      contentType: parsed.contentType,
      tone: parsed.tone,
      platform: parsed.platform,
      outputMode: parsed.outputMode,
      imagePrompt,
      referenceImageUrl,
      deferImage: shouldDeferImage,
    });

    const savedContent = await saveGeneratedContent({
      product,
      title,
      content,
      contentType: parsed.contentType,
      tone: parsed.tone,
      platform: parsed.platform,
      promptText: effectivePromptText,
      outputMode: parsed.outputMode,
      referenceImageUrl,
      generatedImageUrl,
      imagePrompt,
      hashtags,
    });
    if (!savedContent?.id) {
      throw new Error("Generated content was not saved");
    }
    const savedContentId = Number(savedContent.id);

    if (shouldDeferImage && imagePrompt) {
      completeImageGenerationInBackground({
        contentId: savedContentId,
        imagePrompt,
        referenceImageUrl,
        fallbackImageUrl: buildFallbackImageDataUrl(product, effectivePromptText, parsed.tone, parsed.outputMode),
        fallbackCaptionText: content,
        preferImagen: parsed.promptMode === "custom",
      });
    }

    return res.json({
      ok: true,
      data: {
        id: savedContentId,
        title,
        caption: content,
        hashtags,
        generatedImageUrl,
        referenceImageUrl,
        promptText: effectivePromptText,
        promptProvider,
        outputMode: parsed.outputMode,
        providers,
        imageGenerationStatus,
        status: String(savedContent?.status ?? GENERATED_CONTENT_STATUS),
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
    const feedStatuses = ["published", "scheduled", "approved"];
    const result = await pool.query<ContentFeedRow>(
      `
      SELECT
        id,
        title,
        content,
        platform,
        status,
        created_at,
        approved_at,
        scheduled_at,
        published_at
      FROM ai_contents
      WHERE status = ANY($1::text[])
      ORDER BY
        CASE status
          WHEN 'published' THEN 1
          WHEN 'scheduled' THEN 2
          WHEN 'approved' THEN 3
          ELSE 4
        END,
        COALESCE(published_at, scheduled_at, approved_at, created_at) DESC,
        id DESC
      LIMIT 100
      `,
      [feedStatuses]
    );
    const rows = result.rows;

    return res.json({
      ok: true,
      data: rows
        .map((row) => ({
          id: Number(row.id),
          title: String(row.title ?? "Untitled Content"),
          content: String(row.content ?? ""),
          product_name: null,
          platform: row.platform ? String(row.platform) : FACEBOOK_PLATFORM,
          status: String(row.status),
          created_at: row.created_at,
          approved_at: row.approved_at,
          scheduled_at: row.scheduled_at,
          published_at: row.published_at,
          created_by_name: "Staff",
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

    const values: unknown[] = [];
    const where: string[] = [];
    if (status && status !== "all") {
      values.push(status);
      where.push(`status = $${values.length}`);
    }

    values.push(limit);
    const limitParam = values.length;
    values.push(offset);
    const offsetParam = values.length;

    const result = await pool.query<ContentListRow>(
      `
      ${contentListSelectSql()}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
      `,
      values
    );
    const rows = result.rows;

    return res.json({
      ok: true,
      data: rows.map(serializeContentListRow),
      total: rows.length,
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

aiRouter.get("/contents/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const result = await pool.query<ContentListRow>(
      `
      ${contentListSelectSql()}
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({
      ok: true,
      data: serializeContentListRow(row),
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      data: null,
      message: e?.message || "Failed to load content",
    });
  }
});

aiRouter.patch("/contents/:id/submit", async (req: Request, res: Response) => {
  try {
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
      LIMIT 1
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

    const updateResult = await pool.query<{
      id: number;
      title: string | null;
      content: string | null;
      platform: string | null;
      hashtags: string | null;
      status: string;
      created_at: string;
    }>(
      `
      UPDATE ai_contents
      SET title = $2,
          content = $3,
          platform = $4,
          hashtags = $5,
          status = $6
      WHERE id = $1
      RETURNING id, title, content, platform, hashtags, status, created_at
      `,
      [id, title, content, platform, hashtags, PENDING_APPROVAL_STATUS]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({
      ok: true,
      data: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        platform: updated.platform,
        hashtags: updated.hashtags,
        status: updated.status,
        createdAt: updated.created_at,
      },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to submit content" });
  }
});

aiRouter.patch("/contents/:id/status", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    if (!["approved", "rejected", "published", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid status" });
    }

    const updateResult = await pool.query<{
      id: number;
      title: string | null;
      status: string;
      approved_at: string | null;
      published_at: string | null;
    }>(
      `
      UPDATE ai_contents
      SET status = $2,
          approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE approved_at END,
          published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END
      WHERE id = $1
      RETURNING id, title, status, approved_at, published_at
      `,
      [id, status]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({
      ok: true,
      data: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        approvedAt: updated.approved_at,
        publishedAt: updated.published_at,
      },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to update content status" });
  }
});

aiRouter.delete("/contents/:id", async (req: Request, res: Response) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ ok: false, data: null, message: "Admin access required" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid id" });
    }

    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM ai_contents WHERE id = $1 LIMIT 1`,
      [id]
    );
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

    const updateResult = await pool.query<{
      id: number;
      title: string | null;
      status: string;
      scheduled_at: string | null;
    }>(
      `
      UPDATE ai_contents
      SET status = 'scheduled',
          scheduled_at = $2
      WHERE id = $1
      RETURNING id, title, status, scheduled_at
      `,
      [id, scheduledAt.toISOString()]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      return res.status(404).json({ ok: false, data: null, message: "Content not found" });
    }

    return res.json({
      ok: true,
      data: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        scheduledAt: updated.scheduled_at,
      },
      message: null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, data: null, message: e?.message || "Failed to schedule content" });
  }
});
