import localforage from 'localforage';

const imageStore = localforage.createInstance({
  name: 'bellah-system',
  storeName: 'images',
  description: 'Cached product and generated image blobs',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
});

function keyForUrl(url: string): string {
  return `img:${url}`;
}

export async function getCachedImageBlobUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  const key = keyForUrl(url);
  try {
    const hit = await imageStore.getItem<Blob | string>(key);
    if (!hit) return null;
    if (typeof hit === 'string') {
      return hit.startsWith('blob:') ? hit : null;
    }
    return URL.createObjectURL(hit);
  } catch {
    return null;
  }
}

export async function putCachedImageFromUrl(url: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const key = keyForUrl(url);
  try {
    const existing = await imageStore.getItem(key);
    if (existing) {
      if (typeof existing === 'string' && existing.startsWith('blob:')) return existing;
      if (existing instanceof Blob) return URL.createObjectURL(existing);
    }
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    await imageStore.setItem(key, blob);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function clearImageCache(): Promise<void> {
  await imageStore.clear();
}
