import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCached, setCached, invalidateCache, clearAllCache } from '@/lib/cache';

describe('TrexoERP In-Process Cache System', () => {
  beforeEach(() => {
    clearAllCache();
  });

  it('stores and retrieves cached data', () => {
    const payload = { id: 'client-1', name: 'Sky Park Resort' };
    setCached('clients:1', payload, 60);

    const retrieved = getCached<typeof payload>('clients:1');
    expect(retrieved).toEqual(payload);
  });

  it('returns null for cache miss', () => {
    expect(getCached('nonexistent-key')).toBeNull();
  });

  it('does NOT cache empty arrays to allow immediate retry on next request', () => {
    setCached('tasks:empty', [], 60);
    expect(getCached('tasks:empty')).toBeNull();
  });

  it('caches non-empty arrays properly', () => {
    const arrayData = [{ id: 'task-1' }, { id: 'task-2' }];
    setCached('tasks:list', arrayData, 60);
    expect(getCached('tasks:list')).toEqual(arrayData);
  });

  it('expires items after TTL expires', () => {
    vi.useFakeTimers();
    try {
      setCached('short-lived', { value: 42 }, 5); // 5 seconds TTL
      expect(getCached('short-lived')).toEqual({ value: 42 });

      // Fast forward 6 seconds
      vi.advanceTimersByTime(6000);
      expect(getCached('short-lived')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidates entries matching a specific prefix without affecting others', () => {
    setCached('content:client-1', { reels: 5 }, 60);
    setCached('content:client-2', { reels: 2 }, 60);
    setCached('tasks:urgent', [{ id: 't1' }], 60);
    setCached('billing:summary', { total: 100000 }, 60);

    invalidateCache('content');

    // Content keys should be purged
    expect(getCached('content:client-1')).toBeNull();
    expect(getCached('content:client-2')).toBeNull();

    // Other keys remain intact
    expect(getCached('tasks:urgent')).toEqual([{ id: 't1' }]);
    expect(getCached('billing:summary')).toEqual({ total: 100000 });
  });

  it('clears all cache entries on clearAllCache()', () => {
    setCached('key1', 'val1', 60);
    setCached('key2', 'val2', 60);

    clearAllCache();

    expect(getCached('key1')).toBeNull();
    expect(getCached('key2')).toBeNull();
  });
});
