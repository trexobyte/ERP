import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCached,
  setCached,
  invalidateCache,
  clearAllCache,
  MemoryCacheStore,
  UpstashRedisCacheStore,
  setCacheStoreForTesting,
} from '@/lib/cache';

describe('TrexoERP In-Process Cache System (Memory Store)', () => {
  beforeEach(async () => {
    setCacheStoreForTesting(new MemoryCacheStore());
    await clearAllCache();
  });

  afterEach(() => {
    setCacheStoreForTesting(null);
  });

  it('stores and retrieves cached data', async () => {
    const payload = { id: 'client-1', name: 'Sky Park Resort' };
    await setCached('clients:1', payload, 60);

    const retrieved = await getCached<typeof payload>('clients:1');
    expect(retrieved).toEqual(payload);
  });

  it('returns null for cache miss', async () => {
    expect(await getCached('nonexistent-key')).toBeNull();
  });

  it('does NOT cache empty arrays to allow immediate retry on next request', async () => {
    await setCached('tasks:empty', [], 60);
    expect(await getCached('tasks:empty')).toBeNull();
  });

  it('caches non-empty arrays properly', async () => {
    const arrayData = [{ id: 'task-1' }, { id: 'task-2' }];
    await setCached('tasks:list', arrayData, 60);
    expect(await getCached('tasks:list')).toEqual(arrayData);
  });

  it('expires items after TTL expires', async () => {
    vi.useFakeTimers();
    try {
      await setCached('short-lived', { value: 42 }, 5); // 5 seconds TTL
      expect(await getCached('short-lived')).toEqual({ value: 42 });

      // Fast forward 6 seconds
      vi.advanceTimersByTime(6000);
      expect(await getCached('short-lived')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidates entries matching a specific prefix without affecting others', async () => {
    await setCached('content:client-1', { reels: 5 }, 60);
    await setCached('content:client-2', { reels: 2 }, 60);
    await setCached('tasks:urgent', [{ id: 't1' }], 60);
    await setCached('billing:summary', { total: 100000 }, 60);

    await invalidateCache('content');

    // Content keys should be purged
    expect(await getCached('content:client-1')).toBeNull();
    expect(await getCached('content:client-2')).toBeNull();

    // Other keys remain intact
    expect(await getCached('tasks:urgent')).toEqual([{ id: 't1' }]);
    expect(await getCached('billing:summary')).toEqual({ total: 100000 });
  });

  it('clears all cache entries on clearAllCache()', async () => {
    await setCached('key1', 'val1', 60);
    await setCached('key2', 'val2', 60);

    await clearAllCache();

    expect(await getCached('key1')).toBeNull();
    expect(await getCached('key2')).toBeNull();
  });
});

describe('Upstash Redis Distributed Cache Adapter (QR-03)', () => {
  const mockUrl = 'https://mock-redis.upstash.io';
  const mockToken = 'mock-bearer-token';
  let memoryFallback: MemoryCacheStore;
  let redisStore: UpstashRedisCacheStore;

  beforeEach(() => {
    vi.restoreAllMocks();
    memoryFallback = new MemoryCacheStore();
    redisStore = new UpstashRedisCacheStore(mockUrl, mockToken, memoryFallback);
  });

  it('retrieves and deserializes JSON from Upstash REST API', async () => {
    const payload = { agency: 'TrexoByte', activeClients: 12 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: JSON.stringify(payload) }),
    });

    const result = await redisStore.get('dashboard:metrics');
    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
        body: JSON.stringify(['get', 'dashboard:metrics']),
      })
    );
  });

  it('serializes and stores data to Upstash with TTL', async () => {
    const payload = [{ id: 'c1', name: 'Client 1' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'OK' }),
    });

    await redisStore.set('clients:all', payload, 45);

    expect(global.fetch).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(['set', 'clients:all', JSON.stringify(payload), 'ex', 45]),
      })
    );
  });

  it('invalidates matching keys via keys query and del command', async () => {
    global.fetch = vi.fn()
      // First call for keys query
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: ['content:1', 'content:2'] }),
      })
      // Second call for del command
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 2 }),
      });

    await redisStore.invalidate('content');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      mockUrl,
      expect.objectContaining({
        body: JSON.stringify(['keys', 'content*']),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      mockUrl,
      expect.objectContaining({
        body: JSON.stringify(['del', 'content:1', 'content:2']),
      })
    );
  });

  it('falls back seamlessly to in-memory store if network request fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Upstash fetch rejects with network error
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

    // Populate in-memory fallback directly
    await memoryFallback.set('resilient-key', { fallback: true }, 60);

    const result = await redisStore.get('resilient-key');
    expect(result).toEqual({ fallback: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Upstash Redis request failed, falling back to in-memory store:'),
      expect.any(Error)
    );
  });
});
