import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { migrateUserPermissions } from '@/lib/migrate-user-permissions';

describe('User Permissions Data Migration', () => {
  it('safely migrates existing users to individual permissions matching their roles', async () => {
    const res = await migrateUserPermissions();
    expect(res.total).toBeGreaterThan(0);

    const users = await prisma.user.findMany({ include: { role: true } });
    for (const u of users) {
      expect(u.permissions).toBeTruthy();
      const parsed = JSON.parse(u.permissions!);
      expect(parsed).toBeTypeOf('object');
      expect(parsed.dashboard).toBeDefined();
      expect(parsed.calendar).toBeDefined();
    }
  }, 20000);
});
