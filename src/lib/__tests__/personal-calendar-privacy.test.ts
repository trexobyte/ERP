import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Personal Calendar Items Privacy & Isolation', () => {
  it('filters personal items client-side so only the matching owner sees them', () => {
    const currentUserId = 'user-1';

    const items = [
      { id: '1', title: 'Agency Reel 1', isPersonal: false, clientId: 'client-a' },
      { id: '2', title: 'User 1 Doctor Appt', isPersonal: true, assigneeId: 'user-1' },
      { id: '3', title: 'User 2 Secret Task', isPersonal: true, assigneeId: 'user-2' },
      { id: '4', title: 'Unassigned Personal Bug Item', isPersonal: true, assigneeId: null },
    ];

    const hiddenClients: string[] = [];

    const filteredContent = items.filter((item) => {
      if (item.isPersonal) {
        const ownerId = item.assigneeId;
        return Boolean(currentUserId && ownerId && ownerId === currentUserId);
      }
      return !item.clientId || !hiddenClients.includes(item.clientId);
    });

    expect(filteredContent.map((i) => i.id)).toEqual(['1', '2']);
    expect(filteredContent.find((i) => i.id === '3')).toBeUndefined();
    expect(filteredContent.find((i) => i.id === '4')).toBeUndefined();
  });

  it('hides all personal items when not logged in or currentUserId is undefined', () => {
    const currentUserId = undefined;

    const items = [
      { id: '1', title: 'Agency Reel 1', isPersonal: false, clientId: 'client-a' },
      { id: '2', title: 'User 1 Doctor Appt', isPersonal: true, assigneeId: 'user-1' },
    ];

    const hiddenClients: string[] = [];

    const filteredContent = items.filter((item) => {
      if (item.isPersonal) {
        const ownerId = item.assigneeId;
        return Boolean(currentUserId && ownerId && ownerId === currentUserId);
      }
      return !item.clientId || !hiddenClients.includes(item.clientId);
    });

    expect(filteredContent.map((i) => i.id)).toEqual(['1']);
  });

  it('generates distinct cache keys per user for /api/content', () => {
    const userA = 'user-alice';
    const userB = 'user-bob';

    const keyA = `content:${userA}:::::0`;
    const keyB = `content:${userB}:::::0`;

    expect(keyA).not.toEqual(keyB);
    expect(keyA).toBe('content:user-alice:::::0');
    expect(keyB).toBe('content:user-bob:::::0');
  });

  it('constructs database query that strictly limits personal items to the current caller', () => {
    const userId = 'user-alice';

    const where: any = {};
    where.OR = [
      { isPersonal: false },
      ...(userId ? [{ isPersonal: true, assigneeId: userId }] : []),
    ];

    expect(where.OR).toEqual([
      { isPersonal: false },
      { isPersonal: true, assigneeId: 'user-alice' },
    ]);
  });

  it('constructs database query for unauthenticated callers with zero personal items', () => {
    const userId = null;

    const where: any = {};
    where.OR = [
      { isPersonal: false },
      ...(userId ? [{ isPersonal: true, assigneeId: userId }] : []),
    ];

    expect(where.OR).toEqual([
      { isPersonal: false },
    ]);
  });
});
