import { getRedisConfig } from '@/lib/env';

export type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlSeconds?: number): Promise<void>;
  invalidate(prefix: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory cache store shared across API routes in the same Node.js process.
 * Standard default for development, testing, and single-instance deployments.
 */
export class MemoryCacheStore implements CacheStore {
  private map: Map<string, CacheEntry<any>>;

  constructor() {
    const globalCache = globalThis as unknown as {
      __apiCache?: Map<string, CacheEntry<any>>;
    };
    if (!globalCache.__apiCache) {
      globalCache.__apiCache = new Map<string, CacheEntry<any>>();
    }
    this.map = globalCache.__apiCache;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 30): Promise<void> {
    if (Array.isArray(data) && data.length === 0) {
      // Never cache empty results - allows immediate retry on next request
      return;
    }
    this.map.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async invalidate(prefix: string): Promise<void> {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) {
        this.map.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  getSync<T>(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.data as T;
  }

  setSync<T>(key: string, data: T, ttlSeconds: number = 30): void {
    if (Array.isArray(data) && data.length === 0) return;
    this.map.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

/**
 * Upstash Redis REST cache store using native fetch.
 * Decouples cache state across multi-instance serverless deployments
 * without requiring persistent TCP sockets or heavy native redis dependencies.
 */
export class UpstashRedisCacheStore implements CacheStore {
  private url: string;
  private token: string;
  public memoryFallback: MemoryCacheStore;

  constructor(url: string, token: string, fallback?: MemoryCacheStore) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
    this.memoryFallback = fallback || new MemoryCacheStore();
  }

  private async executeCommand<R = any>(command: any[]): Promise<R | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout safety

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`Upstash Redis HTTP error: ${res.status} ${res.statusText}`);
        return null;
      }

      const json = await res.json();
      return (json?.result ?? null) as R;
    } catch (err) {
      console.warn('Upstash Redis request failed, falling back to in-memory store:', err);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.executeCommand<string | null>(['get', key]);
      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
        return raw as T;
      }
    } catch {
      // Fall through to memory fallback
    }
    return this.memoryFallback.get<T>(key);
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 30): Promise<void> {
    if (Array.isArray(data) && data.length === 0) return;

    // Immediately cache in local memory fallback
    await this.memoryFallback.set(key, data, ttlSeconds);

    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      await this.executeCommand(['set', key, serialized, 'ex', ttlSeconds]);
    } catch {
      // Local memory already updated
    }
  }

  async invalidate(prefix: string): Promise<void> {
    await this.memoryFallback.invalidate(prefix);

    try {
      const keys = await this.executeCommand<string[]>(['keys', `${prefix}*`]);
      if (Array.isArray(keys) && keys.length > 0) {
        await this.executeCommand(['del', ...keys]);
      }
    } catch {
      // Local memory already invalidated
    }
  }

  async clear(): Promise<void> {
    await this.memoryFallback.clear();
    try {
      await this.executeCommand(['flushdb']);
    } catch {
      // Local memory already cleared
    }
  }
}

let activeStore: CacheStore | null = null;

export function getCacheStore(): CacheStore {
  if (activeStore) return activeStore;

  const redisConfig = getRedisConfig();
  if (redisConfig.url && redisConfig.token) {
    activeStore = new UpstashRedisCacheStore(redisConfig.url, redisConfig.token);
  } else {
    activeStore = new MemoryCacheStore();
  }
  return activeStore;
}

export function setCacheStoreForTesting(store: CacheStore | null): void {
  activeStore = store;
}

export async function getCached<T>(key: string): Promise<T | null> {
  return getCacheStore().get<T>(key);
}

export async function setCached<T>(key: string, data: T, ttlSeconds: number = 30): Promise<void> {
  return getCacheStore().set<T>(key, data, ttlSeconds);
}

export async function invalidateCache(prefix: string): Promise<void> {
  return getCacheStore().invalidate(prefix);
}

export async function clearAllCache(): Promise<void> {
  return getCacheStore().clear();
}
