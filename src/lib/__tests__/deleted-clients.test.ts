import { describe, it, expect, beforeEach } from 'vitest';
import {
  markClientDeleted,
  unmarkClientDeleted,
  isClientDeleted,
  deletedClientIds,
} from '@/lib/deleted-clients';

describe('TrexoERP Deleted Clients Memory Tracker', () => {
  beforeEach(() => {
    deletedClientIds.clear();
  });

  it('marks a client as deleted and checks status', () => {
    const testId = 'client-xyz-123';
    expect(isClientDeleted(testId)).toBe(false);

    markClientDeleted(testId);
    expect(isClientDeleted(testId)).toBe(true);
  });

  it('unmarks a restored client correctly', () => {
    const testId = 'client-xyz-456';
    markClientDeleted(testId);
    expect(isClientDeleted(testId)).toBe(true);

    unmarkClientDeleted(testId);
    expect(isClientDeleted(testId)).toBe(false);
  });

  it('handles multiple clients independently', () => {
    markClientDeleted('c1');
    markClientDeleted('c2');

    expect(isClientDeleted('c1')).toBe(true);
    expect(isClientDeleted('c2')).toBe(true);
    expect(isClientDeleted('c3')).toBe(false);

    unmarkClientDeleted('c1');
    expect(isClientDeleted('c1')).toBe(false);
    expect(isClientDeleted('c2')).toBe(true);
  });
});
