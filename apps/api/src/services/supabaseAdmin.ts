const SUPABASE_FETCH_TIMEOUT_MS = 15_000; // 15 s — increased for better reliability

function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) throw new Error("SUPABASE_URL is not configured");
  return value.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return value;
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getSupabaseErrorMessage(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload || fallback;
  if (typeof payload !== "object") return fallback;

  const data = payload as Record<string, unknown>;
  const message =
    data.msg ||
    data.message ||
    data.error_description ||
    data.error ||
    data.details;

  return typeof message === "string" && message.trim() ? message : fallback;
}

/** Fetch with an AbortController timeout so network hangs don't block the process. */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = SUPABASE_FETCH_TIMEOUT_MS) {
  // If the caller already supplied a signal, honour it without adding our own.
  if (options.signal) return fetch(url, options);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function supabaseRest<T>(path: string, options: RequestInit = {}) {
  const serviceKey = getSupabaseServiceRoleKey();
  const response = await fetchWithTimeout(`${getSupabaseUrl()}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload, response.statusText || "Supabase request failed"));
  }

  return payload as T;
}

export async function supabaseAuthAdmin<T>(path: string, options: RequestInit = {}) {
  const serviceKey = getSupabaseServiceRoleKey();
  const response = await fetchWithTimeout(`${getSupabaseUrl()}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload, response.statusText || "Supabase auth request failed"));
  }

  return payload as T;
}
