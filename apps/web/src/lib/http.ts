export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  if (!contentType.includes('application/json')) {
    const snippet = raw.trim().slice(0, 120);
    throw new Error(
      snippet.startsWith('<')
        ? 'API returned HTML instead of JSON. Check VITE_API_URL and make sure the API server is running.'
        : 'API returned a non-JSON response.'
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('API returned invalid JSON.');
  }
}
