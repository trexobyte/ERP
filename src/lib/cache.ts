type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

// Global in-memory cache shared across API routes in the same Node.js process
const globalCache = globalThis as unknown as {
  __apiCache?: Map<string, CacheEntry<any>>;
};

if (!globalCache.__apiCache) {
  globalCache.__apiCache = new Map<string, CacheEntry<any>>();
}

const cache = globalCache.__apiCache;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 30): void {
  if (Array.isArray(data) && data.length === 0) {
    // Never cache empty results - allows immediate retry on next request
    return;
  }
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearAllCache(): void {
  cache.clear();
}
